import { Module } from '@nestjs/common';
import { DeclarationService } from './declaration.service';
import { DeclarationController } from './declaration.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports:[PrismaModule],
  controllers: [DeclarationController],
  providers: [DeclarationService],
})
export class DeclarationModule {}
