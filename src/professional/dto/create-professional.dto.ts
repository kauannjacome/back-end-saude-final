import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsDateString,
  IsBoolean,
  IsInt,
} from 'class-validator';
import { sex, role } from '@prisma/client';

export class CreateProfessionalDto {
  @IsString()
  cpf: string;

  @IsOptional()
  @IsString()
  name?: string;


  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsEnum(sex)
  sex?: sex;

  @IsOptional()
  @IsDateString()
  birth_date?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  cns?: string;

  @IsOptional()
  @IsString()
  professional_registry?: string;

  @IsOptional()
  @IsString()
  registry_type?: string;

  @IsOptional()
  @IsString()
  registry_number?: string;

  @IsOptional()
  @IsString()
  registry_state?: string;

  // Identificação pessoal
  @IsOptional()
  @IsString()
  social_name?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  race?: string;

  @IsOptional()
  @IsBoolean()
  is_disabled?: boolean;

  @IsOptional()
  @IsDateString()
  death_date?: string;

  // Filiação
  @IsOptional()
  @IsString()
  mother_name?: string;

  @IsOptional()
  @IsString()
  father_name?: string;

  // Endereço
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

  // Dados civis
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
  @IsEnum(role)
  role?: role;

  @IsString()
  password_hash: string;


  @IsOptional()
  @IsBoolean()
  accepted_terms?: boolean;

  @IsOptional()
  @IsDateString()
  accepted_terms_at?: string;

  @IsOptional()
  @IsString()
  accepted_terms_version?: string;

  @IsInt()
  subscriber_id: number;
}
