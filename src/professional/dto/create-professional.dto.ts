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
