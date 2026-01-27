import { Controller, Get, Post, Param, UseGuards, Query, HttpCode, HttpStatus, ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { TokenPayloadParam } from '../auth/param/token-payload.param';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';

@UseGuards(AuthTokenGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @Get()
  findAll(@TokenPayloadParam() tokenPayload: PayloadTokenDto) {
    return this.notificationService.getNotificationsForUser(
      Number(tokenPayload.sub_id),
      Number(tokenPayload.user_id)
    );
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  markAllAsRead(@TokenPayloadParam() tokenPayload: PayloadTokenDto) {
    return this.notificationService.markAsViewed(
      Number(tokenPayload.sub_id),
      Number(tokenPayload.user_id)
    );
  }

  @Post('clear-all')
  @HttpCode(HttpStatus.OK)
  clearAllNotifications(@TokenPayloadParam() tokenPayload: PayloadTokenDto) {
    return this.notificationService.clearAll(
      Number(tokenPayload.sub_id),
      Number(tokenPayload.user_id)
    );
  }

  @Post('trigger')
  triggerManualCheck(
    @Query('subscriber_id') subscriberId?: string
  ) {
    return this.notificationService.triggerManualCheck(
      subscriberId ? Number(subscriberId) : undefined
    );
  }

  /**
   * Retorna todas as notificações com informações de quem visualizou
   * Apenas para admin_manager
   */
  @Get('views')
  async getNotificationViews(@TokenPayloadParam() tokenPayload: PayloadTokenDto) {
    if (tokenPayload.role !== 'admin_manager') {
      throw new ForbiddenException('Apenas admin_manager pode acessar este recurso');
    }

    return this.notificationService.getNotificationViews(
      Number(tokenPayload.sub_id)
    );
  }

  /**
   * Retorna detalhes de visualização de uma notificação específica
   * Apenas para admin_manager
   */
  @Get('views/:id')
  async getNotificationViewDetails(
    @TokenPayloadParam() tokenPayload: PayloadTokenDto,
    @Param('id') id: string
  ) {
    if (tokenPayload.role !== 'admin_manager') {
      throw new ForbiddenException('Apenas admin_manager pode acessar este recurso');
    }

    const result = await this.notificationService.getNotificationViewDetails(
      Number(tokenPayload.sub_id),
      Number(id)
    );

    if (!result) {
      throw new NotFoundException('Notificação não encontrada');
    }

    return result;
  }
}
