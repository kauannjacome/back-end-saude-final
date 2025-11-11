import { IsString, IsOptional, IsEnum, IsInt, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { folder_type } from '@prisma/client';

export class CreateFolderDto {
  @IsString()
  name: string;

  @IsEnum(folder_type)
  type: folder_type;

  @IsOptional()
  @IsString()
  id_code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  responsible_id?: number;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : null))
  start_date?: Date;     // ✅ Agora vira Date automaticamente

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : null))
  end_date?: Date;       // ✅ Agora vira Date automaticamente

  @IsOptional()
  @IsInt()
  care_id?: number;

  @IsOptional()
  @IsInt()
  group_id?: number;

  @IsOptional()
  @IsInt()
  sub_group_id?: number;

  @IsOptional()
  @IsInt()
  subscriber_id: number;
}
