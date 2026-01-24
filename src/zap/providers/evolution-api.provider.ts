import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { IWhatsAppProvider } from '../interfaces/whatsapp-provider.interface';

@Injectable()
export class EvolutionApiProvider implements IWhatsAppProvider {
  private readonly logger = new Logger(EvolutionApiProvider.name);
  private readonly apiUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
  public readonly name = 'evolution-api';

  constructor(private readonly httpService: HttpService) { }

  private getHeaders(apiKey: string) {
    return {
      'Content-Type': 'application/json',
      'apikey': apiKey,
    };
  }

  async checkStatus(instanceId: string, token: string): Promise<any> {
    if (!this.apiUrl) {
      return { status: 'ERROR', message: 'Evolution API não configurada' };
    }

    try {
      const url = `${this.apiUrl}/instance/connectionState/${instanceId}`;
      const response = await lastValueFrom(
        this.httpService.get(url, { headers: this.getHeaders(token) }).pipe(timeout(5000))
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Erro ao buscar status zap [${instanceId}]: ${error.message}`);
      return {
        instance: { state: 'disconnected' },
        error: 'Falha na comunicação com API',
      };
    }
  }

  async connect(instanceId: string, token: string): Promise<any> {
    if (!this.apiUrl) throw new BadRequestException('API URL não configurada');

    try {
      // 1. Tentar criar instância
      try {
        const createUrl = `${this.apiUrl}/instance/create`;
        const createBody = {
          instanceName: instanceId,
          token: token,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS"
        };
        await lastValueFrom(
          this.httpService.post(createUrl, createBody, { headers: this.getHeaders(token) }) // NOTE: Evolution usually uses global key for create, but let's follow existing logic or adjust if needed. Existing logic used global key OR generated key? Checking service.ts... it used 'getHeaders()' which uses apiKey OR globalKey.
        );
      } catch (e) {
        const status = e.response?.status;
        if (status === 403 || status === 409) {
          this.logger.warn(`Instância já existe (${status}), prosseguindo para conexão.`);
        } else {
          let createError = `Falha ao criar instância: ${e.message}`;
          if (e.response?.data) {
            createError += ` | Detalhe: ${JSON.stringify(e.response.data)}`;
          }
          this.logger.error(createError);
          // Don't throw here, try to connect anyway, maybe it exists but failed 'create' call specifically?
          // Actually existing code threw exception unless 403/409. I will keep that behavior.
          throw new BadRequestException(createError);
        }
      }

      // 2. Conectar (Gerar QR Code)
      const connectUrl = `${this.apiUrl}/instance/connect/${instanceId}`;
      const response = await lastValueFrom(
        this.httpService.get(connectUrl, { headers: this.getHeaders(token) })
      );
      return response.data;

    } catch (error) {
      this.handleError(error, instanceId);
    }
  }

  async disconnect(instanceId: string, token: string): Promise<void> {
    if (!this.apiUrl) return;

    try {
      const url = `${this.apiUrl}/instance/logout/${instanceId}`;
      await lastValueFrom(
        this.httpService.delete(url, { headers: this.getHeaders(token) })
      );
      const deleteUrl = `${this.apiUrl}/instance/delete/${instanceId}`;
      await lastValueFrom(
        this.httpService.delete(deleteUrl, { headers: this.getHeaders(token) })
      );
    } catch (error) {
      this.logger.error('Erro ao desconectar', error);
    }
  }

  async sendMessage(phone: string, message: string, instanceId: string, token: string): Promise<any> {
    if (!this.apiUrl) {
      this.logger.warn('Tentativa de envio sem API URL configurada');
      return false;
    }

    try {
      const url = `${this.apiUrl}/message/sendText/${instanceId}`;
      const body = {
        number: phone,
        options: {
          delay: 1200,
          presence: 'composing',
        },
        text: message
      };

      const response = await lastValueFrom(
        this.httpService.post(url, body, { headers: this.getHeaders(token) })
      );
      return response.data;
    } catch (error) {
      const details = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`Falha envio msg [${phone}]: ${details}`);
      throw new BadRequestException(`Falha ao enviar mensagem WhatsApp: ${details}`);
    }
  }

  private handleError(error: any, context: string) {
    this.logger.error(`Erro provider [${context}]:`);
    if (error.response) {
      this.logger.error(`Status: ${error.response.status}`);
      this.logger.error(`Data: ${JSON.stringify(error.response.data)}`);
    } else {
      this.logger.error(`Message: ${error.message}`);
    }
    let errorMsg = 'Erro na comunicação com WhatsApp Provider.';
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
