import { IsOptional, IsString, IsNumber, IsEnum, IsDateString, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { priority } from '@prisma/client';

export class SearchRegulationDto {

  @IsOptional()
  @IsString()
  idCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  requestingProfessional?: string;

  @IsOptional()
  @IsString()
  patientName?: string;


  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(priority)
  priority?: priority;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(v => Number(v.trim()));
    }
    if (Array.isArray(value)) {
      return value.map(v => Number(v));
    }
    return value;
  })
  @IsArray()
  @IsNumber({}, { each: true })
  careIds?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  analyzerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  creatorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  patientId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  responsibleId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number = 0;
}
