import { IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { status } from '@prisma/client';

export class UpdateStatusRegulationDto {
  @IsEnum(status, { message: 'Status inválido' })
  status: status;

  @IsOptional()
  @IsBoolean()
  sendMessage?: boolean;
}
