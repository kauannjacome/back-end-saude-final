import { IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateStatusRegulationDto {
  @IsEnum(Status, { message: 'Status inválido' })
  status: Status;

  @IsOptional()
  @IsBoolean()
  sendMessage?: boolean;
}
