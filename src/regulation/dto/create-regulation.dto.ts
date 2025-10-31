import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
} from 'class-validator';
import { status, relationship } from '@prisma/client';

export class CreateRegulationDto {
  @IsInt()
  subscriber_id: number;

  @IsOptional()
  @IsString()
  id_code?: string;

  @IsOptional()
  @IsInt()
  patient_id?: number;

  @IsOptional()
  @IsDateString()
  request_date?: string;

  @IsOptional()
  @IsDateString()
  scheduled_date?: string;

  @IsOptional()
  @IsEnum(status)
  status?: status;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  url_requirement?: string;

  @IsOptional()
  @IsString()
  url_pre_document?: string;

  @IsOptional()
  @IsString()
  url_current_document?: string;

  @IsOptional()
  @IsInt()
  folder_id?: number;

  @IsOptional()
  @IsEnum(relationship)
  relationship?: relationship;

  @IsOptional()
  @IsString()
  caregiver_id?: string;

  @IsOptional()
  @IsInt()
  creator_id?: number;

  @IsOptional()
  @IsInt()
  analyzed_id?: number;

  @IsOptional()
  @IsInt()
  printer_id?: number;

  @IsOptional()
  @IsInt()
  supplier_id?: number;

  @IsOptional()
  @IsInt()
  history?: number;

  @IsOptional()
  @IsInt()
  version_document?: number;
}
