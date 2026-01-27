import {
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  IsBoolean,
  IsInt,
} from 'class-validator';

export class CreatePatientDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  social_name?: string;

  @IsString()
  cpf: string;

  @IsOptional()
  @IsString()
  cns?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  race?: string;

  @IsOptional()
  @IsString()
  sex?: string;

  @IsDateString()
  birth_date: string;

  @IsOptional()
  @IsDateString()
  death_date?: string;

  @IsOptional()
  @IsString()
  mother_name?: string;

  @IsOptional()
  @IsString()
  father_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  postal_code?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  naturalness?: string;

  @IsOptional()
  @IsString()
  marital_status?: string;

  @IsOptional()
  @IsString()
  blood_type?: string;

  @IsOptional()
  @IsString()
  password_hash?: string;

  @IsOptional()
  @IsBoolean()
  is_password_temp?: boolean;

  @IsOptional()
  @IsInt()
  number_try?: number;

  @IsOptional()
  @IsBoolean()
  is_blocked?: boolean;

  @IsOptional()
  @IsBoolean()
  accepted_terms?: boolean;

  @IsOptional()
  @IsDateString()
  accepted_terms_at?: string;

  @IsOptional()
  @IsString()
  accepted_terms_version?: string;

  @IsOptional()
  @IsInt()
  subscriber_id: number;
}
