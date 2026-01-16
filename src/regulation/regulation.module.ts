import { Module } from '@nestjs/common';
import { RegulationService } from './regulation.service';
import { RegulationController } from './regulation.controller';
import { PrismaModule } from '../prisma/prisma.module';

import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [RegulationController],
  providers: [RegulationService],
})
export class RegulationModule { }
