import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  IsDateString,
  IsInt,
  IsPositive,
  IsNumberString,
} from 'class-validator';
import { status, resource_origin, unit_measure, priority } from '@prisma/client';

export class CreateCareDto {
  @IsInt()
  @IsPositive()
  subscriber_id: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  acronym?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  authorization_id?: string;

  @IsOptional()
  @IsEnum(status)
  status?: status;

  @IsOptional()
  @IsEnum(resource_origin)
  resource?: resource_origin;

  @IsEnum(unit_measure)
  unit_measure: unit_measure;

  @IsOptional()
  @IsEnum(priority)
  priority?: priority;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsInt()
  amount?: number;

  @IsOptional()
  @IsInt()
  group_id?: number;

  @IsOptional()
  @IsInt()
  professional_id?: number;

  @IsOptional()
  @IsDateString()
  created_at?: Date;

  @IsOptional()
  @IsDateString()
  updated_at?: Date;

  @IsOptional()
  @IsDateString()
  deleted_at?: Date;
}
