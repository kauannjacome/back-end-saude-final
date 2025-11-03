import { IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
export enum PriorityEnum {
  eletivo = 'eletivo',
  urgencia = 'urgencia',
  emergencia = 'emergencia',
}
export class ReportFilterPriorityStatusCareDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subscriber_id?: number;

  @IsOptional()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  care_id?: number;

  @IsOptional()
  @IsEnum(PriorityEnum, {
    message: 'priority must be one of: eletivo, urgencia, emergencia',
  })
  priority?: PriorityEnum; // ✅ restringe aos valores do enum

   @IsOptional()
  @IsDateString()
  start_date?: string; // 👈 data inicial (ISO string, ex: "2025-01-01")

  @IsOptional()
  @IsDateString()
  end_date?: string; // 👈 data final (ISO string, ex: "2025-01-31")
}
