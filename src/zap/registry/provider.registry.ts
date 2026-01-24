import { Injectable } from '@nestjs/common';
import { EvolutionApiProvider } from '../providers/evolution-api.provider';
import { OfficialWhatsappProvider } from '../providers/official-whatsapp.provider';
import { MockWhatsAppProvider } from '../providers/mock.provider';
import type { IWhatsAppProvider } from '../interfaces/whatsapp-provider.interface';

@Injectable()
export class WhatsAppProviderRegistry {
  private providers: Map<string, IWhatsAppProvider> = new Map();

  constructor(
    private readonly evolution: EvolutionApiProvider,
    private readonly official: OfficialWhatsappProvider,
    private readonly mock: MockWhatsAppProvider,
  ) {
    this.register(evolution);
    this.register(official);
    this.register(mock);
  }

  private register(provider: IWhatsAppProvider) {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): IWhatsAppProvider {
    const provider = this.providers.get(name);
    // Fallback to evolution if not found or if name is null/undefined
    if (!provider) {
      return this.evolution;
    }
    return provider;
  }
}
