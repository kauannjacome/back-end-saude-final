import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { status, resource_origin, unit_measure, type_declaration, priority } from '@prisma/client';

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
  resource_origin?: resource_origin;

  @IsOptional()
  @IsEnum(resource_origin)
  resource?: resource_origin;

  @IsOptional()
  @IsEnum(priority)
  priority?: priority;

  @IsEnum(unit_measure)
  unit_measure: unit_measure;



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
  @Min(1)
  min_deadline_days?: number;

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
