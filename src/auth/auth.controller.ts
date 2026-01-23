import { Body, Controller, Post, UseGuards, UnauthorizedException } from '@nestjs/common';
import { SignInDto } from './dto/signin.dto';
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
}
