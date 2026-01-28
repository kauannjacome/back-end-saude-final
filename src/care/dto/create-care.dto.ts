import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';

import { Status, ResourceOrigin, UnitMeasure, TypeDeclaration, Priority } from '@prisma/client';

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
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @IsEnum(ResourceOrigin)
  resource_origin?: ResourceOrigin;

  @IsOptional()
  @IsEnum(ResourceOrigin)
  resource?: ResourceOrigin;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsEnum(UnitMeasure)
  unit_measure: UnitMeasure;



  @IsOptional()
  @IsEnum(TypeDeclaration)
  type_declaration?: TypeDeclaration;

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
