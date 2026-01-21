import { Controller, Get, Post, Delete, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { ZapService } from './service';
import { SendMessageDto } from './dto/send-message.dto';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';
import { REQUEST_TOKEN_PAYLOAD_NAME } from '../auth/common/auth.constants';

@UseGuards(AuthTokenGuard)
@Controller('zap')
export class ZapController {
  constructor(private readonly zapService: ZapService) { }

  @Get('status')
  async getStatus(@Req() req) {
    try {
      const user = req[REQUEST_TOKEN_PAYLOAD_NAME] as PayloadTokenDto;
      return await this.zapService.getInstanceStatus(user.sub_id);
    } catch (error) {
      throw new BadRequestException(`Erro STATUS: ${error.message}`);
    }
  }

  @Post('connect')
  async connect(@Req() req) {
    try {
      const user = req[REQUEST_TOKEN_PAYLOAD_NAME] as PayloadTokenDto;
      return await this.zapService.connectInstance(user.sub_id);
    } catch (error) {
      // Log detalhado para o console do backend
      console.error('ERRO CONNECT:', error);
      throw new BadRequestException(`Erro CONNECT: ${error.message || error}`);
    }
  }

  @Delete('disconnect')
  async disconnect(@Req() req) {
    try {
      const user = req[REQUEST_TOKEN_PAYLOAD_NAME] as PayloadTokenDto;
      return await this.zapService.logoutInstance(user.sub_id);
    } catch (error) {
      throw new BadRequestException(`Erro DISCONNECT: ${error.message}`);
    }
  }

  @Post('send')
  async sendMessage(@Req() req, @Body() dto: SendMessageDto) {
    try {
      const user = req[REQUEST_TOKEN_PAYLOAD_NAME] as PayloadTokenDto;
      return await this.zapService.sendMessage(user.sub_id, dto.phone, dto.message);
    } catch (error) {
      throw new BadRequestException(`Erro SEND: ${error.message}`);
    }
  }
}
