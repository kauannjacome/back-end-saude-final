import { IsEnum } from 'class-validator';
import { status } from '@prisma/client';

export class UpdateStatusRegulationDto {
  @IsEnum(status, { message: 'Status inválido' })
  status: status;
}
