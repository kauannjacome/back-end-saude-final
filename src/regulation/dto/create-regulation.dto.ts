import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Status, Relationship, Priority, TypeDeclaration } from '@prisma/client';

class CareRegulationDto {
  @IsInt()
  care_id: number;

  @IsInt()
  quantity: number;
}

export class CreateRegulationDto {




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
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  clinical_indication?: string;

  @IsOptional()
  @IsString()
  requesting_professional?: string;

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
  @IsEnum(Relationship)
  relationship?: Relationship;

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
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsEnum(TypeDeclaration)
  type_declaration?: TypeDeclaration;

  @IsOptional()
  @IsInt()
  history?: number;



  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareRegulationDto)
  cares?: CareRegulationDto[];
}
