import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsInt,
} from 'class-validator';
import { status, resource_origin, unit_measure, priority, type_declaration } from '@prisma/client';

export class CreateCareDto {

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  acronym?: string;

  @IsOptional()
  @IsString()
  description?: string;


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
  @IsEnum(type_declaration)  
  type_declaration?: type_declaration;

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
  @IsInt()
  supplier_id?: number;

}
