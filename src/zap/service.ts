import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
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
          api_key: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
          provider: 'evolution' // Default
        } as any,
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

  private getApiKey(configKey?: string | null): string {
    return configKey || this.globalKey;
  }

  // Verifica status da instância
  async getInstanceStatus(subscriberId: number) {
    const config = await this.getOrCreateConfig(subscriberId);
    const provider = this.providerRegistry.getProvider((config as any).provider);
    return provider.checkStatus(config.instance_name, this.getApiKey(config.api_key));
  }

  // Cria instância na Evolution (se não existir) e retorna QR Code
  async connectInstance(subscriberId: number) {
    const config = await this.getOrCreateConfig(subscriberId);
    const provider = this.providerRegistry.getProvider((config as any).provider);
    this.logger.log(`Conectando instância: ${config.instance_name} via ${provider.name}`);
    return provider.connect(config.instance_name, this.getApiKey(config.api_key));
  }

  async logoutInstance(subscriberId: number) {
    const config = await this.getOrCreateConfig(subscriberId);
    const provider = this.providerRegistry.getProvider((config as any).provider);
    return provider.disconnect(config.instance_name, this.getApiKey(config.api_key));
  }

  async sendMessage(subscriberId: number, phone: string, message: string) {
    const config = await this.getOrCreateConfig(subscriberId);

    // Enfileira a mensagem para envio resiliente
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

    this.logger.log(`Mensagem para ${phone} enfileirada: Job ID ${job.id}`);

    return {
      status: 'QUEUED',
      jobId: job.id,
      provider: (config as any).provider
    };
  }
}
