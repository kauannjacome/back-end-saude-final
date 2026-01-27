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
import { ZapAdminService } from './zap-admin.service';

@UseGuards(AuthTokenGuard)
@Controller('zap-admin')
export class ZapAdminController {
  constructor(private readonly zapAdminService: ZapAdminService) { }

  private checkAdminManager(role: string) {
    if (role !== 'admin_manager') {
      throw new UnauthorizedException('Apenas admin_manager pode acessar esta rota.');
    }
  }

  // =============================================
  // INSTÂNCIAS
  // =============================================

  @Get('instances')
  async listInstances(@TokenPayloadParam() payload: any) {
    this.checkAdminManager(payload.role);
    return this.zapAdminService.listAllInstances();
  }

  @Get('instances/:subscriberId')
  async getInstance(
    @Param('subscriberId', ParseIntPipe) subscriberId: number,
    @TokenPayloadParam() payload: any
  ) {
    this.checkAdminManager(payload.role);
    return this.zapAdminService.getInstance(subscriberId);
  }

  @Post('instances/:subscriberId/connect')
  async connectInstance(
    @Param('subscriberId', ParseIntPipe) subscriberId: number,
    @TokenPayloadParam() payload: any
  ) {
    this.checkAdminManager(payload.role);
    return this.zapAdminService.connectInstance(subscriberId);
  }

  @Delete('instances/:subscriberId/disconnect')
  async disconnectInstance(
    @Param('subscriberId', ParseIntPipe) subscriberId: number,
    @TokenPayloadParam() payload: any
  ) {
    this.checkAdminManager(payload.role);
    return this.zapAdminService.disconnectInstance(subscriberId);
  }

  @Patch('instances/:subscriberId')
  async updateInstance(
    @Param('subscriberId', ParseIntPipe) subscriberId: number,
    @Body() body: { provider?: string; is_active?: boolean; credentials?: any },
    @TokenPayloadParam() payload: any
  ) {
    this.checkAdminManager(payload.role);
    return this.zapAdminService.updateInstance(subscriberId, body);
  }

  @Post('instances/:subscriberId/regenerate-key')
  async regenerateApiKey(
    @Param('subscriberId', ParseIntPipe) subscriberId: number,
    @TokenPayloadParam() payload: any
  ) {
    this.checkAdminManager(payload.role);
    return this.zapAdminService.regenerateApiKey(subscriberId);
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
    return this.zapAdminService.sendMessageAsAdmin(subscriberId, body.phone, body.message);
  }

  // =============================================
  // FILA DE MENSAGENS
  // =============================================

  @Get('queue/stats')
  async getQueueStats(@TokenPayloadParam() payload: any) {
    this.checkAdminManager(payload.role);
    return this.zapAdminService.getQueueStats();
  }

  @Get('queue/failed')
  async getFailedJobs(
    @Query('limit') limit: string,
    @TokenPayloadParam() payload: any
  ) {
    this.checkAdminManager(payload.role);
    return this.zapAdminService.getFailedJobs(limit ? parseInt(limit) : 50);
  }

  @Post('queue/retry/:jobId')
  async retryJob(
    @Param('jobId') jobId: string,
    @TokenPayloadParam() payload: any
  ) {
    this.checkAdminManager(payload.role);
    return this.zapAdminService.retryFailedJob(jobId);
  }

  @Delete('queue/failed')
  async clearFailedJobs(@TokenPayloadParam() payload: any) {
    this.checkAdminManager(payload.role);
    return this.zapAdminService.clearFailedJobs();
  }
}
