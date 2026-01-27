import { Body, Controller, Post, Patch, Get, UseGuards, UnauthorizedException } from '@nestjs/common';
import { SignInDto } from './dto/signin.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { AuthService } from './auth.service';
import { AuthTokenGuard } from './guard/auth-token-guard';
import { TokenPayloadParam } from './param/token-payload.param';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService
  ) { }

  @Post()
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.authenticate(signInDto)
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password);
  }

  // =============================================
  // ROTAS DE DESBLOQUEIO POR EMAIL
  // =============================================
  @Post('request-unlock-email')
  requestUnlockByEmail(@Body() body: { email: string }) {
    return this.authService.requestUnlockByEmail(body.email);
  }

  @Post('confirm-unlock-email')
  confirmUnlockByEmail(@Body() body: { token: string }) {
    return this.authService.confirmUnlockByEmail(body.token);
  }

  // =============================================
  // ROTAS DE DESBLOQUEIO POR WHATSAPP
  // =============================================
  @Post('request-unlock-whatsapp')
  requestUnlockByWhatsApp(@Body() body: { email: string }) {
    return this.authService.requestUnlockByWhatsApp(body.email);
  }

  @Post('confirm-unlock-whatsapp')
  confirmUnlockByWhatsApp(@Body() body: { email: string; code: string }) {
    return this.authService.confirmUnlockByWhatsApp(body.email, body.code);
  }

  // =============================================
  // ROTA DE DESBLOQUEIO POR ADMIN
  // =============================================
  @UseGuards(AuthTokenGuard)
  @Post('admin-unlock')
  async adminUnlock(
    @Body() body: { professional_id: number },
    @TokenPayloadParam() payload: any
  ) {
    if (payload.role !== 'admin_manager' && payload.role !== 'admin_municipal') {
      throw new UnauthorizedException('Apenas administradores podem desbloquear contas.');
    }
    return this.authService.adminUnlock(body.professional_id, payload.role);
  }

  @UseGuards(AuthTokenGuard)
  @Post('impersonate')
  async impersonate(
    @Body() body: { subscriber_id: number; role?: string },
    @TokenPayloadParam() payload: any
  ) {
    if (payload.role !== 'admin_manager') {
      throw new UnauthorizedException('Apenas Super Admins podem realizar esta ação.');
    }
    return this.authService.impersonate(body.subscriber_id, body.role, payload.user_id);
  }

  @UseGuards(AuthTokenGuard)
  @Post('verify-password')
  async verifyPassword(
    @Body() body: { password: string },
    @TokenPayloadParam() payload: any
  ) {
    const isValid = await this.authService.verifyPassword(payload.user_id, body.password);
    if (!isValid) {
      throw new UnauthorizedException('Senha incorreta.');
    }
    return { success: true };
  }

  @UseGuards(AuthTokenGuard)
  @Patch('update-password')
  async updatePassword(
    @Body() updatePasswordDto: UpdatePasswordDto,
    @TokenPayloadParam() payload: any
  ) {
    return this.authService.updatePassword(
      payload.user_id,
      updatePasswordDto.currentPassword,
      updatePasswordDto.newPassword
    );
  }

  @UseGuards(AuthTokenGuard)
  @Post('accept-terms')
  async acceptTerms(
    @Body() body: { version: string },
    @TokenPayloadParam() payload: any
  ) {
    return this.authService.acceptTerms(payload.user_id, body.version);
  }

  @UseGuards(AuthTokenGuard)
  @Get('terms-status')
  async getTermsStatus(@TokenPayloadParam() payload: any) {
    return this.authService.getTermsStatus(payload.user_id);
  }
}
