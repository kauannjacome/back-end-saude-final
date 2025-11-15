import { IsString, IsOptional, IsEnum, IsInt, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';


export class CreateFolderDto {
  @IsString()
  name: string;



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
  @IsDateString() // ✅ Agora só valida string ISO
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;


  @IsOptional()
  @IsInt()
  subscriber_id: number;
}
