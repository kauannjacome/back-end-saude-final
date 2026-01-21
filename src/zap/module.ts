import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ZapController } from './controller';
import { ZapService } from './service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, HttpModule],
  controllers: [ZapController],
  providers: [ZapService],
  exports: [ZapService],
})
export class ZapModule { }
