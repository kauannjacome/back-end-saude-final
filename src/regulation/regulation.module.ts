import { Module } from '@nestjs/common';
import { RegulationService } from './regulation.service';
import { RegulationController } from './regulation.controller';
import { PrismaModule } from '../prisma/prisma.module';

import { UploadModule } from '../upload/upload.module';

import { ZapModule } from '../zap/module';

@Module({
  imports: [PrismaModule, UploadModule, ZapModule],
  controllers: [RegulationController],
  providers: [RegulationService],
})
export class RegulationModule { }
