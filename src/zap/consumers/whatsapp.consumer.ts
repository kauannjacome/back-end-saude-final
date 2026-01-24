import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { WhatsAppProviderRegistry } from '../registry/provider.registry';

@Processor('whatsapp')
export class WhatsAppConsumer {
  private readonly logger = new Logger(WhatsAppConsumer.name);

  constructor(
    private readonly providerRegistry: WhatsAppProviderRegistry,
  ) { }

  @Process('send-message')
  async handleSendMessage(job: Job<{ phone: string; message: string; instanceId: string; token: string; providerName: string }>) {
    const { phone, message, instanceId, token, providerName } = job.data;
    this.logger.debug(`Processing message for ${phone} via ${instanceId} (Provider: ${providerName})`);

    try {
      // Default to evolution if providerName is missing (backward compatibility)
      const provider = this.providerRegistry.getProvider(providerName || 'evolution');
      const result = await provider.sendMessage(phone, message, instanceId, token);
      this.logger.debug(`Message sent successfully: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      throw error; // Triggers Bull retry
    }
  }
}
