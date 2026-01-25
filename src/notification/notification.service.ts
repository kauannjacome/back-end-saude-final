import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { notification_type, Prisma } from '@prisma/client';
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
        status: { in: ['in_progress', 'approved'] }, // Include approved for AGENDAMENTO check if needed, but here is PRAZO
        subscriber: subscriberFilter,
      },
      include: {
        subscriber: true,
        patient: { select: { id: true, name: true } },
        cares: { include: { care: { select: { id: true, name: true } } } }
      },
    });

    const daysToNotify = [5, 4, 3, 2, 1, 0];

    for (const reg of regulations) {
      if (!reg.scheduled_date) continue;

      const today = dayjs().startOf('day');
      const scheduled = dayjs(reg.scheduled_date).startOf('day');
      const diffDays = scheduled.diff(today, 'day');

      if (daysToNotify.includes(diffDays)) {
        const milestone = `prazo_${diffDays}_dias`;
        const title = diffDays === 0 ? `⏰ Prazo vence hoje` : `⏰ Prazo vence em ${diffDays} dias`;
        const caresSummary = reg.cares?.map(c => c.care.name).join(', ') || 'Sem procedimentos';
        const patientName = reg.patient?.name || 'Paciente não identificado';
        const message = `${patientName} - ${caresSummary}`;

        const metadata = {
          regulation_uuid: reg.uuid,
          patient_id: reg.patient_id,
          patient_name: patientName,
          days_remaining: diffDays,
          scheduled_date: reg.scheduled_date,
          scheduled_date_formatted: dayjs(reg.scheduled_date).format('DD/MM/YYYY'),
          cares_summary: caresSummary
        };

        await this.createNotificationIfNotExists(
          reg.subscriber_id,
          reg.id,
          title,
          message,
          notification_type.PRAZO,
          milestone,
          reg.responsible_id ?? undefined,
          metadata
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
      include: {
        patient: { select: { id: true, name: true } },
        cares: { include: { care: { select: { id: true, name: true } } } }
      }
    });

    const daysToNotify = [15, 30, 45, 60, 75, 90];

    for (const reg of regulations) {
      const today = dayjs().startOf('day');
      const created = dayjs(reg.created_at).startOf('day');
      const diffDays = today.diff(created, 'day');

      if (daysToNotify.includes(diffDays)) {
        const milestone = `prioridade_${diffDays}_dias`;
        const title = `⚠️ Urgência pendente`; // Or specific logic
        const caresSummary = reg.cares?.map(c => c.care.name).join(', ') || 'Sem procedimentos';
        const patientName = reg.patient?.name || 'Paciente não identificado';
        const message = `${patientName} - ${caresSummary} (${diffDays} dias)`;

        const metadata = {
          regulation_uuid: reg.uuid,
          patient_id: reg.patient_id,
          patient_name: patientName,
          days_pending: diffDays,
          priority: reg.priority,
          cares_summary: caresSummary
        };

        await this.createNotificationIfNotExists(
          reg.subscriber_id,
          reg.id,
          title,
          message,
          notification_type.PRIORIDADE,
          milestone,
          reg.responsible_id ?? undefined,
          metadata
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
    professionalId?: number,
    metadata?: any
  ) {
    const exists = await this.prisma.notification.findFirst({
      where: {
        regulation_id: regulationId,
        milestone: milestone,
        professional_id: professionalId // Unique per professional now
      },
    });

    if (!exists) {
      await this.prisma.notification.create({
        data: {
          subscriber_id: subscriberId,
          regulation_id: regulationId,
          professional_id: professionalId,
          title,
          message,
          type,
          milestone,
          metadata: metadata ?? Prisma.JsonNull,
          is_read: false,
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
        professional_id: professionalId, // Direct filtering
      },
      orderBy: {
        created_at: 'desc'
      },
      select: {
        id: true,
        uuid: true,
        title: true,
        message: true,
        type: true,
        milestone: true,
        created_at: true,
        is_read: true,
        metadata: true
      }
    });

    return {
      notifications: notifications.map(n => ({
        ...n,
        // Ensure metadata is object, handle potential nulls from DB if needed
        metadata: n.metadata as any
      }))
    };
  }

  async markAsViewed(subscriberId: number, professionalId: number) {
    // Mark ALL unread notifications for this professional as read
    const result = await this.prisma.notification.updateMany({
      where: {
        subscriber_id: subscriberId,
        professional_id: professionalId,
        is_read: false
      },
      data: {
        is_read: true,
        read_at: new Date()
      }
    });

    return { count: result.count };
  }

  async clearAll(subscriberId: number, professionalId: number) {
    // Soft delete or just mark as read? User asked to clear. 
    // Usually clear means 'hide' or 'delete'. Let's assume soft delete for now based on 'deleted_at' availability
    // Or just fully read/archived.
    // Based on previous code 'cleared_at' was used. Now let's use deleted_at to hide from list.
    const result = await this.prisma.notification.updateMany({
      where: {
        subscriber_id: subscriberId,
        professional_id: professionalId,
        deleted_at: null
      },
      data: {
        deleted_at: new Date()
      }
    });
    return { success: true, count: result.count };
  }

  async triggerManualCheck(subscriberId?: number) {
    this.logger.log(`Manual trigger initiated${subscriberId ? ` for subscriber ${subscriberId}` : ''}`);
    await this.processNotifications(subscriberId);
    return { success: true, message: 'Processamento de notificações iniciado manually.' };
  }
}
