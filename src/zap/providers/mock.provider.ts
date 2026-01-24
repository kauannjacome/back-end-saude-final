import { Injectable, Logger } from '@nestjs/common';
import { IWhatsAppProvider } from '../interfaces/whatsapp-provider.interface';

@Injectable()
export class MockWhatsAppProvider implements IWhatsAppProvider {
  private readonly logger = new Logger(MockWhatsAppProvider.name);
  public readonly name = 'mock';

  async checkStatus(instanceId: string, token: string): Promise<any> {
    this.logger.log(`[Mock] Check Status for ${instanceId}`);
    return { status: 'CONNECTED', mock: true };
  }

  async connect(instanceId: string, token: string): Promise<any> {
    this.logger.log(`[Mock] Connect for ${instanceId}`);
    return {
      status: 'CONNECTED',
      qrCode: 'mock-qr-code',
      mock: true
    };
  }

  async disconnect(instanceId: string, token: string): Promise<void> {
    this.logger.log(`[Mock] Disconnect for ${instanceId}`);
  }

  async sendMessage(phone: string, message: string, instanceId: string, token: string): Promise<any> {
    this.logger.log(`[Mock] Send Message to ${phone} via ${instanceId}: ${message}`);
    return { id: 'mock-message-id', status: 'SENT' };
  }
}
