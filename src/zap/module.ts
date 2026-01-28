import { Module } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ZapController } from './controller';
import { ZapAdminController } from './admin.controller';
import { ZapService } from './service';
import { PrismaModule } from '../prisma/prisma.module';
import { EvolutionApiProvider } from './providers/evolution-api.provider';
import { OfficialWhatsappProvider } from './providers/official-whatsapp.provider';
import { MockWhatsAppProvider } from './providers/mock.provider';

import { BullModule } from '@nestjs/bull';
import { WhatsAppConsumer } from './consumers/whatsapp.consumer';
import { WhatsAppProviderRegistry } from './registry/provider.registry';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    BullModule.registerQueue({
      name: 'whatsapp',
    }),
  ],
  controllers: [ZapController, ZapAdminController],
  providers: [
    ZapService,
    WhatsAppConsumer,
    EvolutionApiProvider,
    OfficialWhatsappProvider,
    MockWhatsAppProvider,
    WhatsAppProviderRegistry, // Uses logic to choose provider dynamically
  ],
  exports: [ZapService, WhatsAppProviderRegistry],
})
export class ZapModule { }
