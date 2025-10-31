import { Module } from '@nestjs/common';
import { RegulationService } from './regulation.service';
import { RegulationController } from './regulation.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports:[PrismaModule],
  controllers: [RegulationController],
  providers: [RegulationService],
})
export class RegulationModule {}
