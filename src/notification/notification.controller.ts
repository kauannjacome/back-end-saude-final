import { Controller, Get, Post, Body, UseGuards, Query, HttpCode, HttpStatus } from '@nestjs/common';
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
    // Mantendo nome da rota 'read-all' para compatibilidade, mas chama 'markAsViewed' (Badge reset)
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
}
