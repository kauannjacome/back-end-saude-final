import { Module } from '@nestjs/common';
import { ProfessionalService } from './professional.service';
import { ProfessionalController } from './professional.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

import { ProfessionalPublicController } from './professional.public.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProfessionalController, ProfessionalPublicController],
  providers: [ProfessionalService],
})
export class ProfessionalModule { }
