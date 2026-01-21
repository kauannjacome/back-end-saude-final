import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ProfessionalService } from './professional.service';
import { ResetAdminPasswordDto } from './dto/reset-admin-password.dto';

@Controller('professional/admin')
export class ProfessionalPublicController {
  constructor(private readonly professionalService: ProfessionalService) { }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetAdminPasswordDto) {
    if (body.newPassword !== body.confirmPassword) {
      throw new Error('As senhas não conferem.');
    }
    return this.professionalService.resetAdminPassword(body.secret, body.email, body.newPassword);
  }
}
