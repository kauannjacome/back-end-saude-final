import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { WhatsAppProviderRegistry } from './registry/provider.registry';

@Injectable()
export class ZapService {
  private readonly logger = new Logger(ZapService.name);
  private readonly globalKey = process.env.EVOLUTION_API_GLOBAL_KEY || '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: WhatsAppProviderRegistry,
    @InjectQueue('whatsapp') private readonly whatsappQueue: Queue,
  ) { }

  // Busca ou cria config
  async getOrCreateConfig(subscriberId: number) {
    let config = await this.prisma.whatsAppConfig.findUnique({
      where: { subscriberId: subscriberId },
    });

    if (!config) {
      const subscriber = await this.prisma.subscriber.findUnique({ where: { id: subscriberId } });
      if (!subscriber) throw new NotFoundException('Assinante não encontrado');

      config = await this.prisma.whatsAppConfig.create({
        data: {
          subscriberId: subscriberId,
          instanceName: subscriber.uuid,
          apiKey: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
          provider: 'evolution' // Default
        } as any,
      });
    } else if (!config.apiKey) {
      // Se existe mas não tem API Key, vamos gerar e atualizar
      const newKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      config = await this.prisma.whatsAppConfig.update({
        where: { id: config.id },
        data: { apiKey: newKey }
      });
    }
    return config;
  }

  private getApiKey(configKey?: string | null): string {
    return configKey || this.globalKey;
  }

  // Verifica status da instância
  async getInstanceStatus(subscriberId: number) {
    const config = await this.getOrCreateConfig(subscriberId);
    const provider = this.providerRegistry.getProvider((config as any).provider);
    return provider.checkStatus(config.instanceName, this.getApiKey(config.apiKey));
  }

  // Cria instância na Evolution (se não existir) e retorna QR Code
  async connectInstance(subscriberId: number) {
    const config = await this.getOrCreateConfig(subscriberId);
    const provider = this.providerRegistry.getProvider((config as any).provider);
    this.logger.log(`Conectando instância: ${config.instanceName} via ${provider.name}`);
    return provider.connect(config.instanceName, this.getApiKey(config.apiKey));
  }

  async logoutInstance(subscriberId: number) {
    const config = await this.getOrCreateConfig(subscriberId);
    const provider = this.providerRegistry.getProvider((config as any).provider);
    return provider.disconnect(config.instanceName, this.getApiKey(config.apiKey));
  }

  async sendMessage(subscriberId: number, phone: string, message: string) {
    const config = await this.getOrCreateConfig(subscriberId);

    // Enfileira a mensagem para envio resiliente
    const job = await this.whatsappQueue.add('send-message', {
      phone,
      message,
      instanceId: config.instanceName,
      token: this.getApiKey(config.apiKey)
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false
    });

    this.logger.log(`Mensagem para ${phone} enfileirada: Job ID ${job.id}`);

    return {
      status: 'QUEUED',
      jobId: job.id,
      provider: (config as any).provider
    };
  }

  // ===========================================================================
  // ADMIN METHODS (Merged from ZapAdminService)
  // ===========================================================================

  // Lista todas as instâncias de WhatsApp de todos os subscribers
  async adminListAllInstances() {
    const configs = await this.prisma.whatsAppConfig.findMany({
      include: {
        subscriber: {
          select: {
            id: true,
            name: true,
            municipalityName: true,
            cnpj: true,
            isBlocked: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Para cada config, buscar status da instância
    const instances = await Promise.all(
      configs.map(async (config) => {
        let status = 'unknown';
        let connected = false;

        try {
          const provider = this.providerRegistry.getProvider(config.provider);
          const statusResult = await provider.checkStatus(
            config.instanceName,
            this.getApiKey(config.apiKey)
          );
          status = statusResult?.state || statusResult?.status || 'unknown';
          connected = status === 'open' || status === 'connected';
        } catch (error) {
          status = 'error';
          this.logger.warn(`Erro ao verificar status da instância ${config.instanceName}: ${error.message}`);
        }

        return {
          id: config.id,
          uuid: config.uuid,
          subscriberId: config.subscriberId,
          subscriberName: config.subscriber?.name,
          municipalityName: config.subscriber?.municipalityName,
          instanceName: config.instanceName,
          provider: config.provider,
          isActive: config.isActive,
          status,
          connected,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt
        };
      })
    );

    return instances;
  }

  // Busca uma instância específica por subscriber_id
  async adminGetInstance(subscriberId: number) {
    const config = await this.prisma.whatsAppConfig.findUnique({
      where: { subscriberId: subscriberId },
      include: {
        subscriber: {
          select: {
            id: true,
            name: true,
            municipalityName: true,
            cnpj: true,
            isBlocked: true
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
        config.instanceName,
        this.getApiKey(config.apiKey)
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
      subscriberId: config.subscriberId,
      subscriberName: config.subscriber?.name,
      municipalityName: config.subscriber?.municipalityName,
      instanceName: config.instanceName,
      provider: config.provider,
      isActive: config.isActive,
      credentials: config.credentials,
      status,
      connected,
      qrCode,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt
    };
  }

  // Conecta uma instância específica (gera QR Code) via Admin
  async adminConnectInstance(subscriberId: number) {
    const config = await this.prisma.whatsAppConfig.findUnique({
      where: { subscriberId: subscriberId }
    });

    if (!config) {
      throw new NotFoundException('Configuração de WhatsApp não encontrada');
    }

    const provider = this.providerRegistry.getProvider(config.provider);
    this.logger.log(`[ADMIN] Conectando instância: ${config.instanceName} via ${provider.name}`);
    return provider.connect(config.instanceName, this.getApiKey(config.apiKey));
  }

  // Desconecta uma instância específica via Admin
  async adminDisconnectInstance(subscriberId: number) {
    const config = await this.prisma.whatsAppConfig.findUnique({
      where: { subscriberId: subscriberId }
    });

    if (!config) {
      throw new NotFoundException('Configuração de WhatsApp não encontrada');
    }

    const provider = this.providerRegistry.getProvider(config.provider);
    this.logger.log(`[ADMIN] Desconectando instância: ${config.instanceName}`);
    return provider.disconnect(config.instanceName, this.getApiKey(config.apiKey));
  }

  // Atualiza configurações de uma instância
  async adminUpdateInstance(subscriberId: number, data: {
    provider?: string;
    isActive?: boolean;
    credentials?: any;
  }) {
    const config = await this.prisma.whatsAppConfig.findUnique({
      where: { subscriberId: subscriberId }
    });

    if (!config) {
      throw new NotFoundException('Configuração de WhatsApp não encontrada');
    }

    const updated = await this.prisma.whatsAppConfig.update({
      where: { id: config.id },
      data: {
        provider: data.provider || config.provider,
        isActive: data.isActive ?? config.isActive,
        credentials: data.credentials ?? config.credentials
      }
    });

    this.logger.log(`[ADMIN] Configuração atualizada para subscriber ${subscriberId}`);
    return updated;
  }

  // Envia mensagem como admin (para qualquer subscriber)
  async adminSendMessage(subscriberId: number, phone: string, message: string) {
    const config = await this.prisma.whatsAppConfig.findUnique({
      where: { subscriberId: subscriberId }
    });

    if (!config) {
      throw new NotFoundException('Configuração de WhatsApp não encontrada');
    }

    if (!config.isActive) {
      throw new ForbiddenException('Instância de WhatsApp está desativada');
    }

    const job = await this.whatsappQueue.add('send-message', {
      phone,
      message,
      instanceId: config.instanceName,
      token: this.getApiKey(config.apiKey)
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
      subscriberId: subscriberId
    };
  }

  // Regenera API Key de uma instância via Admin
  async adminRegenerateApiKey(subscriberId: number) {
    const config = await this.prisma.whatsAppConfig.findUnique({
      where: { subscriberId: subscriberId }
    });

    if (!config) {
      throw new NotFoundException('Configuração de WhatsApp não encontrada');
    }

    const newKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const updated = await this.prisma.whatsAppConfig.update({
      where: { id: config.id },
      data: { apiKey: newKey }
    });

    this.logger.log(`[ADMIN] API Key regenerada para subscriber ${subscriberId}`);

    return {
      message: 'API Key regenerada com sucesso',
      apiKey: newKey
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

