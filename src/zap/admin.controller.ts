import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
  ParseIntPipe
} from '@nestjs/common';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { TokenPayloadParam } from '../auth/param/token-payload.param';
import { ZapService } from './service';

@UseGuards(AuthTokenGuard)
@Controller('zap-admin')
export class ZapAdminController {
  constructor(private readonly zapService: ZapService) { }

  private checkAdminManager(role: string) {
    if (role !== 'ADMIN_MANAGER') {
      throw new UnauthorizedException('Apenas ADMIN_MANAGER pode acessar esta rota.');
    }
  }

  // =============================================
  // INSTÂNCIAS
  // =============================================

  @Get('instances')
  async listInstances(@TokenPayloadParam() payload: any) {
    this.checkAdminManager(payload.role);
    return this.zapService.adminListAllInstances();
  }

  @Get('instances/:subscriberId')
  async getInstance(
    @Param('subscriberId', ParseIntPipe) subscriberId: number,
    @TokenPayloadParam() payload: any
  ) {
    this.checkAdminManager(payload.role);
    return this.zapService.adminGetInstance(subscriberId);
  }

  @Post('instances/:subscriberId/connect')
  async connectInstance(
    @Param('subscriberId', ParseIntPipe) subscriberId: number,
    @TokenPayloadParam() payload: any
  ) {
    this.checkAdminManager(payload.role);
    return this.zapService.adminConnectInstance(subscriberId);
  }

  @Delete('instances/:subscriberId/disconnect')
  async disconnectInstance(
    @Param('subscriberId', ParseIntPipe) subscriberId: number,
    @TokenPayloadParam() payload: any
  ) {
    this.checkAdminManager(payload.role);
    return this.zapService.adminDisconnectInstance(subscriberId);
  }

  @Patch('instances/:subscriberId')
  async updateInstance(
    @Param('subscriberId', ParseIntPipe) subscriberId: number,
    @Body() body: { provider?: string; is_active?: boolean; credentials?: any },
    @TokenPayloadParam() payload: any
  ) {
    this.checkAdminManager(payload.role);
    return this.zapService.adminUpdateInstance(subscriberId, body);
  }

  @Post('instances/:subscriberId/regenerate-key')
  async regenerateApiKey(
    @Param('subscriberId', ParseIntPipe) subscriberId: number,
    @TokenPayloadParam() payload: any
  ) {
    this.checkAdminManager(payload.role);
    return this.zapService.adminRegenerateApiKey(subscriberId);
  }

  // =============================================
  // MENSAGENS
  // =============================================

  @Post('instances/:subscriberId/send')
  async sendMessage(
    @Param('subscriberId', ParseIntPipe) subscriberId: number,
    @Body() body: { phone: string; message: string },
    @TokenPayloadParam() payload: any
  ) {
    this.checkAdminManager(payload.role);
    return this.zapService.adminSendMessage(subscriberId, body.phone, body.message);
  }

  // =============================================
  // FILA DE MENSAGENS
  // =============================================

  @Get('queue/stats')
  async getQueueStats(@TokenPayloadParam() payload: any) {
    this.checkAdminManager(payload.role);
    return this.zapService.getQueueStats();
  }

  @Get('queue/failed')
  async getFailedJobs(
    @Query('limit') limit: string,
    @TokenPayloadParam() payload: any
  ) {
    this.checkAdminManager(payload.role);
    return this.zapService.getFailedJobs(limit ? parseInt(limit) : 50);
  }

  @Post('queue/retry/:jobId')
  async retryJob(
    @Param('jobId') jobId: string,
    @TokenPayloadParam() payload: any
  ) {
    this.checkAdminManager(payload.role);
    return this.zapService.retryFailedJob(jobId);
  }

  @Delete('queue/failed')
  async clearFailedJobs(@TokenPayloadParam() payload: any) {
    this.checkAdminManager(payload.role);
    return this.zapService.clearFailedJobs();
  }
}
