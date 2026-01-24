import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { notification_type } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) { }

  @Cron('0 21 * * *', { timeZone: 'America/Sao_Paulo' })

  async handleDailyNotifications() {
    this.logger.log('Starting daily notification check...');
    await this.processNotifications();
    this.logger.log('Daily notification check configuration finished.');
  }

  async processNotifications(targetSubscriberId?: number) {
    const subscriberFilter = targetSubscriberId ? { id: targetSubscriberId } : {};

    // 1. Scheduled Date Notifications (Prazo)
    await this.checkScheduledDates(subscriberFilter);

    // 2. Priority Notifications (Urgência/Emergência)
    await this.checkPriorities(subscriberFilter);
  }

  private async checkScheduledDates(subscriberFilter: any) {
    const regulations = await this.prisma.regulation.findMany({
      where: {
        scheduled_date: { not: null },
        status: { in: ['in_progress'] },
        subscriber: subscriberFilter,
      },
      include: { subscriber: true },
    });

    const daysToNotify = [5, 4, 3, 2, 1, 0];

    for (const reg of regulations) {
      if (!reg.scheduled_date) continue;

      const today = dayjs().startOf('day');
      const scheduled = dayjs(reg.scheduled_date).startOf('day');
      const diffDays = scheduled.diff(today, 'day');

      if (daysToNotify.includes(diffDays)) {
        const milestone = `prazo_${diffDays}_dias`;
        const title = `Regulação Vencendo nos Próximos Dias`; // Adjust title logic as needed
        const message = `A regulação #${reg.id} vence em ${diffDays === 0 ? 'hoje' : diffDays + ' dias'}.`;

        await this.createNotificationIfNotExists(
          reg.subscriber_id,
          reg.id,
          title,
          message,
          notification_type.PRAZO,
          milestone,
        );
      }
    }
  }

  private async checkPriorities(subscriberFilter: any) {
    const regulations = await this.prisma.regulation.findMany({
      where: {
        priority: { in: ['urgencia', 'emergencia'] },
        status: { in: ['in_progress'] },
        subscriber: subscriberFilter,
      },
    });

    const daysToNotify = [15, 30, 45, 60, 75, 90];

    for (const reg of regulations) {
      const today = dayjs().startOf('day');
      const created = dayjs(reg.created_at).startOf('day');
      const diffDays = today.diff(created, 'day');

      if (daysToNotify.includes(diffDays)) {
        const milestone = `prioridade_${diffDays}_dias`;
        const title = `Regulação Prioritária Pendente`;
        const message = `A regulação prioritária #${reg.id} está pendente há ${diffDays} dias.`;

        await this.createNotificationIfNotExists(
          reg.subscriber_id,
          reg.id,
          title,
          message,
          notification_type.PRIORIDADE,
          milestone,
        );
      }
    }
  }

  private async createNotificationIfNotExists(
    subscriberId: number,
    regulationId: number,
    title: string,
    message: string,
    type: notification_type,
    milestone: string,
  ) {
    const exists = await this.prisma.notification.findFirst({
      where: {
        regulation_id: regulationId,
        milestone: milestone,
      },
    });

    if (!exists) {
      await this.prisma.notification.create({
        data: {
          subscriber_id: subscriberId,
          regulation_id: regulationId,
          title,
          message,
          type,
          milestone,
        },
      });
      this.logger.log(`Notification created for regulation ${regulationId} - ${milestone}`);
    }
  }






  async getNotificationsForUser(
    subscriberId: number,
    professionalId: number
  ) {
    /**
     * Regra:
     * - Retorna notificações do subscriber
     * - Exclui notificações que foram "limpas" (cleared_at != null) para o profissional
     * - Inclui:
     *   - Regulação
     *   - Paciente da regulação
     *   - Cuidados da regulação
     * - Indica se a notificação está lida (is_read)
     */

    const notifications = await this.prisma.notification.findMany({
      where: {
        subscriber_id: subscriberId,
        deleted_at: null,
        reads: {
          none: {
            professional_id: professionalId,
            cleared_at: { not: null }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      include: {
        regulation: {
          include: {
            patient: {
              select: {
                id: true,
                name: true
              }
            },
            cares: {
              include: {
                care: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        reads: {
          where: {
            professional_id: professionalId
          },
          select: {
            read_at: true
          }
        }
      }
    });

    /**
     * Normalização da resposta:
     * - is_read: boolean
     * - remove array "reads" da resposta final
     * - mantém estrutura previsível para o frontend
     */

    return notifications.map(notification => {
      const isRead =
        notification.reads.length > 0 &&
        notification.reads[0].read_at !== null;

      return {
        id: notification.id,
        uuid: notification.uuid,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        milestone: notification.milestone,
        created_at: notification.created_at,
        is_read: isRead,

        regulation: notification.regulation
          ? {
            id: notification.regulation.id,
            uuid: notification.regulation.uuid,
            status: notification.regulation.status,
            scheduled_date: notification.regulation.scheduled_date,

            patient: notification.regulation.patient
              ? {
                id: notification.regulation.patient.id,
                name: notification.regulation.patient.name
              }
              : null,

            cares: notification.regulation.cares.map(cr => ({
              id: cr.care.id,
              name: cr.care.name,
              quantity: cr.quantity
              // Se futuramente existir validade:
              // validity_date: cr.validity_date
            }))
          }
          : null
      };
    });
  }





  async markAsViewed(subscriberId: number, professionalId: number) {
    // Marca como LIDA (read_at = now) todas as não lidas visíveis (badge reset)
    // Find notifications that don't have a read record OR have read_at=null
    const unread = await this.prisma.notification.findMany({
      where: {
        subscriber_id: subscriberId,
        reads: {
          none: {
            professional_id: professionalId,
            read_at: { not: null }
          }
        }
      },
      select: { id: true }
    });

    for (const n of unread) {
      // Upsert logic: if exists (but read_at null? uncommon) update, else create
      // Simplest: use upsert or just create/update
      const exists = await this.prisma.notification_read.findUnique({
        where: {
          notification_id_professional_id: {
            notification_id: n.id,
            professional_id: professionalId
          }
        }
      });

      if (exists) {
        await this.prisma.notification_read.update({
          where: { id: exists.id },
          data: { read_at: new Date() }
        });
      } else {
        await this.prisma.notification_read.create({
          data: {
            notification_id: n.id,
            professional_id: professionalId,
            subscriber_id: subscriberId,
            read_at: new Date()
          }
        });
      }
    }
    return { count: unread.length };
  }

  async clearAll(subscriberId: number, professionalId: number) {
    // Sets cleared_at = now for ALL active notifications for this user
    // Similar loop logic
    const active = await this.prisma.notification.findMany({
      where: { subscriber_id: subscriberId },
      select: { id: true }
    });

    for (const n of active) {
      const exists = await this.prisma.notification_read.findUnique({
        where: {
          notification_id_professional_id: {
            notification_id: n.id,
            professional_id: professionalId
          }
        }
      });

      if (exists) {
        await this.prisma.notification_read.update({
          where: { id: exists.id },
          data: { cleared_at: new Date() }
        });
      } else {
        await this.prisma.notification_read.create({
          data: {
            notification_id: n.id,
            professional_id: professionalId,
            subscriber_id: subscriberId,
            cleared_at: new Date(),
            read_at: new Date() // implicitly read if cleared
          }
        });
      }
    }
    return { success: true };
  }

  async triggerManualCheck(subscriberId?: number) {
    this.logger.log(`Manual trigger initiated${subscriberId ? ` for subscriber ${subscriberId}` : ''}`);
    await this.processNotifications(subscriberId);
    return { success: true, message: 'Processamento de notificações iniciado manually.' };
  }
}
