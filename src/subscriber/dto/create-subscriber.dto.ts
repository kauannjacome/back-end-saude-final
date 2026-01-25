import { IsString, IsBoolean, IsOptional, IsEmail } from 'class-validator';

export class CreateSubscriberDto {
  @IsString()
  name: string;

  @IsString()
  municipality_name: string;

  @IsEmail()
  email: string;

  @IsString()
  telephone: string;

  @IsString()
  cnpj: string;

  @IsString()
  postal_code: string;

  @IsString()
  city: string;

  @IsString()
  neighborhood: string;

  @IsString()
  street: string;

  @IsString()
  number: string;

  @IsString()
  state_name: string;

  @IsString()
  state_acronym: string;

  @IsOptional()
  @IsString()
  state_logo?: string;

  @IsOptional()
  @IsString()
  municipal_logo?: string;

  @IsOptional()
  @IsString()
  administration_logo?: string;

  @IsOptional()
  @IsBoolean()
  payment?: boolean;

  @IsOptional()
  @IsBoolean()
  is_blocked?: boolean;
}
