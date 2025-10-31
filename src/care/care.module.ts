import { Module } from '@nestjs/common';
import { CareService } from './care.service';
import { CareController } from './care.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports:[PrismaModule],
  controllers: [CareController],
  providers: [CareService],
})
export class CareModule {}
