import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { IWhatsAppProvider } from '../interfaces/whatsapp-provider.interface';

@Injectable()
export class OfficialWhatsappProvider implements IWhatsAppProvider {
  private readonly logger = new Logger(OfficialWhatsappProvider.name);
  public readonly name = 'official';
  private readonly baseUrl = 'https://graph.facebook.com/v17.0'; // Version can be parameterized

  constructor(private readonly httpService: HttpService) { }

  async checkStatus(instanceId: string, token: string): Promise<any> {
    // Official API doesn't have a direct "connection state" like socket based ones.
    // We can check if the token is valid or business account info.
    try {
      const url = `${this.baseUrl}/${instanceId}`; // instanceId here should be PhoneNumberID
      const response = await lastValueFrom(
        this.httpService.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      return { status: 'CONNECTED', details: response.data };
    } catch (error) {
      this.logger.error(`Error checking status for ${instanceId}: ${error.message}`);
      return { status: 'DISCONNECTED', error: error.message };
    }
  }

  async connect(instanceId: string, token: string): Promise<any> {
    // Official API Setup is done in Meta Developer Portal/Business Manager.
    // This method basically validates the credentials.
    this.logger.log(`Validating Official WhatsApp credentials for ID: ${instanceId}`);
    return this.checkStatus(instanceId, token);
  }

  async disconnect(instanceId: string, token: string): Promise<void> {
    // Not applicable for Official API as it's stateless HTTP
    this.logger.log(`Disconnect called for Official API (No-op)`);
  }

  async sendMessage(phone: string, message: string, instanceId: string, token: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/${instanceId}/messages`;
      const body = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message }
      };

      const response = await lastValueFrom(
        this.httpService.post(url, body, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send Official WhatsApp message: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
}
