import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppProviderRegistry } from '../zap/registry/provider.registry';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@Injectable()
export class ZapAdminService {
  private readonly logger = new Logger(ZapAdminService.name);
  private readonly globalKey = process.env.EVOLUTION_API_GLOBAL_KEY || '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: WhatsAppProviderRegistry,
    @InjectQueue('whatsapp') private readonly whatsappQueue: Queue,
  ) { }

  private getApiKey(configKey?: string | null): string {
    return configKey || this.globalKey;
  }

  // Lista todas as instâncias de WhatsApp de todos os subscribers
  async listAllInstances() {
    const configs = await this.prisma.whatsapp_config.findMany({
      include: {
        subscriber: {
          select: {
            id: true,
            name: true,
            municipality_name: true,
            cnpj: true,
            is_blocked: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Para cada config, buscar status da instância
    const instances = await Promise.all(
      configs.map(async (config) => {
        let status = 'unknown';
        let connected = false;

        try {
          const provider = this.providerRegistry.getProvider(config.provider);
          const statusResult = await provider.checkStatus(
            config.instance_name,
            this.getApiKey(config.api_key)
          );
          status = statusResult?.state || statusResult?.status || 'unknown';
          connected = status === 'open' || status === 'connected';
        } catch (error) {
          status = 'error';
          this.logger.warn(`Erro ao verificar status da instância ${config.instance_name}: ${error.message}`);
        }

        return {
          id: config.id,
          uuid: config.uuid,
          subscriber_id: config.subscriber_id,
          subscriber_name: config.subscriber?.name,
          municipality_name: config.subscriber?.municipality_name,
          instance_name: config.instance_name,
          provider: config.provider,
          is_active: config.is_active,
          status,
          connected,
          created_at: config.created_at,
          updated_at: config.updated_at
        };
      })
    );

    return instances;
  }

  // Busca uma instância específica por subscriber_id
  async getInstance(subscriberId: number) {
    const config = await this.prisma.whatsapp_config.findUnique({
      where: { subscriber_id: subscriberId },
      include: {
        subscriber: {
          select: {
            id: true,
            name: true,
            municipality_name: true,
            cnpj: true,
            is_blocked: true
          }
        }
      }
    });

    if (!config) {
      throw new NotFoundException('Configuração de WhatsApp não encontrada para este assinante');
    }

    let status = 'unknown';
    let connected = false;
    let qrCode = null;

    try {
      const provider = this.providerRegistry.getProvider(config.provider);
      const statusResult = await provider.checkStatus(
        config.instance_name,
        this.getApiKey(config.api_key)
      );
      status = statusResult?.state || statusResult?.status || 'unknown';
      connected = status === 'open' || status === 'connected';
      qrCode = statusResult?.qrcode?.base64 || null;
    } catch (error) {
      status = 'error';
      this.logger.warn(`Erro ao verificar status: ${error.message}`);
    }

    return {
      id: config.id,
      uuid: config.uuid,
      subscriber_id: config.subscriber_id,
      subscriber_name: config.subscriber?.name,
      municipality_name: config.subscriber?.municipality_name,
      instance_name: config.instance_name,
      provider: config.provider,
      is_active: config.is_active,
      credentials: config.credentials,
      status,
      connected,
      qrCode,
      created_at: config.created_at,
      updated_at: config.updated_at
    };
  }

  // Conecta uma instância específica (gera QR Code)
  async connectInstance(subscriberId: number) {
    const config = await this.prisma.whatsapp_config.findUnique({
      where: { subscriber_id: subscriberId }
    });

    if (!config) {
      throw new NotFoundException('Configuração de WhatsApp não encontrada');
    }

    const provider = this.providerRegistry.getProvider(config.provider);
    this.logger.log(`[ADMIN] Conectando instância: ${config.instance_name} via ${provider.name}`);
    return provider.connect(config.instance_name, this.getApiKey(config.api_key));
  }

  // Desconecta uma instância específica
  async disconnectInstance(subscriberId: number) {
    const config = await this.prisma.whatsapp_config.findUnique({
      where: { subscriber_id: subscriberId }
    });

    if (!config) {
      throw new NotFoundException('Configuração de WhatsApp não encontrada');
    }

    const provider = this.providerRegistry.getProvider(config.provider);
    this.logger.log(`[ADMIN] Desconectando instância: ${config.instance_name}`);
    return provider.disconnect(config.instance_name, this.getApiKey(config.api_key));
  }

  // Atualiza configurações de uma instância
  async updateInstance(subscriberId: number, data: {
    provider?: string;
    is_active?: boolean;
    credentials?: any;
  }) {
    const config = await this.prisma.whatsapp_config.findUnique({
      where: { subscriber_id: subscriberId }
    });

    if (!config) {
      throw new NotFoundException('Configuração de WhatsApp não encontrada');
    }

    const updated = await this.prisma.whatsapp_config.update({
      where: { id: config.id },
      data: {
        provider: data.provider || config.provider,
        is_active: data.is_active ?? config.is_active,
        credentials: data.credentials ?? config.credentials
      }
    });

    this.logger.log(`[ADMIN] Configuração atualizada para subscriber ${subscriberId}`);
    return updated;
  }

  // Envia mensagem como admin (para qualquer subscriber)
  async sendMessageAsAdmin(subscriberId: number, phone: string, message: string) {
    const config = await this.prisma.whatsapp_config.findUnique({
      where: { subscriber_id: subscriberId }
    });

    if (!config) {
      throw new NotFoundException('Configuração de WhatsApp não encontrada');
    }

    if (!config.is_active) {
      throw new ForbiddenException('Instância de WhatsApp está desativada');
    }

    const job = await this.whatsappQueue.add('send-message', {
      phone,
      message,
      instanceId: config.instance_name,
      token: this.getApiKey(config.api_key)
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false
    });

    this.logger.log(`[ADMIN] Mensagem para ${phone} enfileirada via subscriber ${subscriberId}: Job ID ${job.id}`);

    return {
      status: 'QUEUED',
      jobId: job.id,
      provider: config.provider,
      subscriber_id: subscriberId
    };
  }

  // Regenera API Key de uma instância
  async regenerateApiKey(subscriberId: number) {
    const config = await this.prisma.whatsapp_config.findUnique({
      where: { subscriber_id: subscriberId }
    });

    if (!config) {
      throw new NotFoundException('Configuração de WhatsApp não encontrada');
    }

    const newKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const updated = await this.prisma.whatsapp_config.update({
      where: { id: config.id },
      data: { api_key: newKey }
    });

    this.logger.log(`[ADMIN] API Key regenerada para subscriber ${subscriberId}`);

    return {
      message: 'API Key regenerada com sucesso',
      api_key: newKey
    };
  }

  // Estatísticas da fila de mensagens
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.whatsappQueue.getWaitingCount(),
      this.whatsappQueue.getActiveCount(),
      this.whatsappQueue.getCompletedCount(),
      this.whatsappQueue.getFailedCount(),
      this.whatsappQueue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed
    };
  }

  // Lista jobs com falha
  async getFailedJobs(limit: number = 50) {
    const jobs = await this.whatsappQueue.getFailed(0, limit);

    return jobs.map(job => ({
      id: job.id,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn
    }));
  }

  // Reprocessa um job com falha
  async retryFailedJob(jobId: string) {
    const job = await this.whatsappQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException('Job não encontrado');
    }

    await job.retry();
    this.logger.log(`[ADMIN] Job ${jobId} reenfileirado`);

    return { message: 'Job reenfileirado com sucesso', jobId };
  }

  // Limpa jobs com falha
  async clearFailedJobs() {
    await this.whatsappQueue.clean(0, 'failed');
    this.logger.log('[ADMIN] Jobs com falha limpos');
    return { message: 'Jobs com falha limpos com sucesso' };
  }
}
