import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export enum PriorityEnum {
  eletivo = 'eletivo',
  urgencia = 'urgencia',
  emergencia = 'emergencia',
}

export enum StatusEnum {
  in_progress = 'in_progress',
  approved = 'approved',
  denied = 'denied',
  returned = 'returned',
}

export class ReportFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subscriber_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  professional_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unit_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  care_id?: number;

  @IsOptional()
  @IsEnum(StatusEnum)
  status?: StatusEnum;

  @IsOptional()
  @IsEnum(PriorityEnum)
  priority?: PriorityEnum;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  supplier_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  analyzed_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  creator_id?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  ids?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  take?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  offset?: number = 0;
}
