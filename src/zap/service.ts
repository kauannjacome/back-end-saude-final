import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { lastValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

@Injectable()
export class ZapService {
  private readonly logger = new Logger(ZapService.name);
  private readonly apiUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
  private readonly globalKey = process.env.EVOLUTION_API_GLOBAL_KEY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) { }

  private getHeaders(apiKey?: string) {
    return {
      'Content-Type': 'application/json',
      'apikey': apiKey || this.globalKey,
    };
  }

  // Busca ou cria config
  async getOrCreateConfig(subscriberId: number) {
    let config = await this.prisma.whatsapp_config.findUnique({
      where: { subscriber_id: subscriberId },
    });

    if (!config) {
      const subscriber = await this.prisma.subscriber.findUnique({ where: { id: subscriberId } });
      if (!subscriber) throw new NotFoundException('Assinante não encontrado');

      config = await this.prisma.whatsapp_config.create({
        data: {
          subscriber_id: subscriberId,
          instance_name: subscriber.uuid,
          api_key: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        },
      });
    } else if (!config.api_key) {
      // Se existe mas não tem API Key, vamos gerar e atualizar
      const newKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      config = await this.prisma.whatsapp_config.update({
        where: { id: config.id },
        data: { api_key: newKey }
      });
    }
    return config;
  }

  // Verifica status da instância
  async getInstanceStatus(subscriberId: number) {
    const config = await this.getOrCreateConfig(subscriberId);

    // Se não tiver URL configurada, retorna erro resiliente
    if (!this.apiUrl) {
      return { status: 'ERROR', message: 'Evolution API não configurada' };
    }

    try {
      const url = `${this.apiUrl}/instance/connectionState/${config.instance_name}`;
      const response = await lastValueFrom(
        this.httpService.get(url, { headers: this.getHeaders(config.api_key || this.globalKey) }).pipe(timeout(5000))
      );

      return response.data; // { instance: { state: 'open', ... } }
    } catch (error) {
      this.logger.error(`Erro ao buscar status zap [${config.instance_name}]: ${error.message}`);
      // Retornar objeto de 'desconectado' ou erro ao invés de lançar exception
      return {
        instance: { state: 'disconnected' },
        error: 'Falha na comunicação com API'
      };
    }
  }

  // Cria instância na Evolution (se não existir) e retorna QR Code
  async connectInstance(subscriberId: number) {
    const config = await this.getOrCreateConfig(subscriberId);

    if (!this.apiUrl) throw new BadRequestException('API URL não configurada');

    try {
      this.logger.log(`Tentando conectar instância: ${config.instance_name}`);
      this.logger.log(`URL: ${this.apiUrl}`);

      // 1. Tentar criar instância
      try {
        const createUrl = `${this.apiUrl}/instance/create`;
        const createBody = {
          instanceName: config.instance_name,
          token: config.api_key,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS"
        };
        this.logger.log(`Criando instância em: ${createUrl}`);
        this.logger.log(`Body: ${JSON.stringify(createBody)}`);

        await lastValueFrom(
          this.httpService.post(createUrl, createBody, { headers: this.getHeaders() })
        );
        this.logger.log('Instância criada com sucesso.');
      } catch (e) {
        // Se for 403 (Forbidden) ou 409 (Conflict, as vezes), significa que já existe.
        // Qualquer outro erro (400, 401, 500) deve ser reportado.
        const status = e.response?.status;
        if (status === 403 || status === 409) {
          this.logger.warn(`Instância já existe (${status}), prosseguindo para conexão.`);
        } else {
          // Recupera mensagem de erro detalhada da criação
          let createError = `Falha ao criar instância: ${e.message}`;
          if (e.response?.data) {
            createError += ` | Detalhe: ${JSON.stringify(e.response.data)}`;
          }
          this.logger.error(createError);
          throw new BadRequestException(createError);
        }
      }

      // 2. Conectar (Gerar QR Code)
      const connectUrl = `${this.apiUrl}/instance/connect/${config.instance_name}`;
      this.logger.log(`Buscando QR Code em: ${connectUrl}`);

      const response = await lastValueFrom(
        this.httpService.get(connectUrl, { headers: this.getHeaders(config.api_key || this.globalKey) })
      );

      // Evolution retorna { base64: "..." } ou { code: "..." }
      this.logger.log(`Resposta Evolution connect: ${JSON.stringify(response.data)}`);
      return response.data;

    } catch (error) {
      this.logger.error(`Erro ao conectar instância [${config.instance_name}]:`);
      if (error.response) {
        this.logger.error(`Status: ${error.response.status}`);
        this.logger.error(`Data: ${JSON.stringify(error.response.data)}`);
      } else {
        this.logger.error(`Message: ${error.message}`);
      }
      let errorMsg = 'Não foi possível conectar ao WhatsApp service.';
      if (error.response?.data?.response?.message) {
        errorMsg += ` Detalhe: ${JSON.stringify(error.response.data.response.message)}`;
      } else if (error.response?.data?.error) {
        errorMsg += ` Erro API: ${error.response.data.error}`;
      } else {
        errorMsg += ` Erro: ${error.message}`;
      }
      throw new BadRequestException(errorMsg);
    }
  }

  async logoutInstance(subscriberId: number) {
    const config = await this.getOrCreateConfig(subscriberId);
    if (!this.apiUrl) return;

    try {
      const url = `${this.apiUrl}/instance/logout/${config.instance_name}`;
      await lastValueFrom(
        this.httpService.delete(url, { headers: this.getHeaders(config.api_key || this.globalKey) })
      );
      // Opcional: delete da base da evolution também?
      const deleteUrl = `${this.apiUrl}/instance/delete/${config.instance_name}`;
      await lastValueFrom(
        this.httpService.delete(deleteUrl, { headers: this.getHeaders(config.api_key || this.globalKey) })
      );

    } catch (error) {
      this.logger.error('Erro ao desconectar', error);
    }
  }

  async sendMessage(subscriberId: number, phone: string, message: string) {
    const config = await this.getOrCreateConfig(subscriberId);

    if (!this.apiUrl) {
      this.logger.warn('Tentativa de envio sem API URL configurada');
      return false;
    }

    try {
      const url = `${this.apiUrl}/message/sendText/${config.instance_name}`;
      const body = {
        number: phone,
        options: {
          delay: 1200,
          presence: 'composing',
        },
        text: message
      };

      const response = await lastValueFrom(
        this.httpService.post(url, body, { headers: this.getHeaders(config.api_key || this.globalKey) })
      );
      return response.data;
    } catch (error) {
      const details = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`Falha envio msg [${phone}]: ${details}`);
      throw new BadRequestException(`Falha ao enviar mensagem WhatsApp: ${details}`);
    }
  }
}
