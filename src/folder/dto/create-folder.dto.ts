import { IsString, IsOptional, IsEnum, IsInt, IsDateString } from 'class-validator';
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
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsInt()
  care_id?: number;

  @IsOptional()
  @IsInt()
  group_id?: number;

  @IsOptional()
  @IsInt()
  sub_group_id?: number;

  @IsInt()
  subscriber_id: number;
}
