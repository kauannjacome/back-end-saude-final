import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateAdminUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(11, 14) // Verifica CPF/CNPJ se a regra for essa, ou só CPF
  cpf: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 20)
  password: string;
}
