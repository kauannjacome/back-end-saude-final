import { IsString, MinLength, IsEmail } from 'class-validator';

export class ResetAdminPasswordDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @IsString()
  secret: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  newPassword: string;

  @IsString()
  confirmPassword: string;
}
