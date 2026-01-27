import { Module } from '@nestjs/common';
import { ZapAdminController } from './zap-admin.controller';
import { ZapAdminService } from './zap-admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ZapModule } from '../zap/module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    PrismaModule,
    ZapModule,
    BullModule.registerQueue({
      name: 'whatsapp',
    }),
  ],
  controllers: [ZapAdminController],
  providers: [ZapAdminService],
  exports: [ZapAdminService],
})
export class ZapAdminModule { }
