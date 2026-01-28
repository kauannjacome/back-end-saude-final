import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { ViewedByEntry } from './dto/viewed-by.dto';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private readonly FORTALEZA_TZ = 'America/Fortaleza';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) { }

  onModuleInit() {
    this.setupDynamicCron();
  }

  private setupDynamicCron() {
    const cronTime = this.configService.get<string>('NOTIFICATION_CRON_TIME') || '22:00';
    const [hour, minute] = cronTime.split(':').map(Number);

    const validHour = isNaN(hour) ? 22 : hour;
    const validMinute = isNaN(minute) ? 0 : minute;

    // Cron expression: minute hour * * * (todos os dias)
    const cronExpression = `${validMinute} ${validHour} * * *`;

    this.logger.log(`Configurando notificações para rodar às ${validHour}:${String(validMinute).padStart(2, '0')} (${this.FORTALEZA_TZ})`);

    const job = new CronJob(
      cronExpression,
      () => this.handleDailyNotifications(),
      null,
      true,
      this.FORTALEZA_TZ
    );

    try {
      this.schedulerRegistry.addCronJob('daily-notifications', job);
    } catch {
      // Job já existe, atualizar
      this.schedulerRegistry.deleteCronJob('daily-notifications');
      this.schedulerRegistry.addCronJob('daily-notifications', job);
    }

    job.start();
  }

  async handleDailyNotifications() {
    this.logger.log('Iniciando verificação diária de notificações...');
    await this.processNotifications();
    this.logger.log('Verificação diária de notificações finalizada.');
  }

  async processNotifications(targetSubscriberId?: number) {
    const subscriberFilter = targetSubscriberId ? { id: targetSubscriberId } : {};

    // 1. Notificações de Prazo (Scheduled Date)
    await this.checkScheduledDates(subscriberFilter);

    // 2. Notificações de Prioridade (Urgência/Emergência)
    await this.checkPriorities(subscriberFilter);
  }

  /**
   * Retorna os profissionais que devem receber notificação:
   * - admin_municipal do subscriber
   * - O profissional responsável pela análise (analyzed_id) da regulation
   */
  private async getTargetProfessionals(subscriberId: number, analyzedId?: number | null): Promise<number[]> {
    const professionalIds: number[] = [];

    // Buscar todos os admin_municipal do subscriber
    const adminMunicipals = await this.prisma.professional.findMany({
      where: {
        subscriberId: subscriberId,
        role: 'ADMIN_MUNICIPAL',
        deletedAt: null,
      },
      select: { id: true }
    });

    professionalIds.push(...adminMunicipals.map(p => p.id));

    // Adicionar o analyzed_id se existir e não for duplicado
    if (analyzedId && !professionalIds.includes(analyzedId)) {
      professionalIds.push(analyzedId);
    }

    return professionalIds;
  }

  private async checkScheduledDates(subscriberFilter: any) {
    const regulations = await this.prisma.regulation.findMany({
      where: {
        scheduledDate: { not: null },
        status: { in: ['IN_PROGRESS', 'APPROVED'] },
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
      if (!reg.scheduledDate) continue;

      const today = dayjs().tz(this.FORTALEZA_TZ).startOf('day');
      const scheduled = dayjs(reg.scheduledDate).tz(this.FORTALEZA_TZ).startOf('day');
      const diffDays = scheduled.diff(today, 'day');

      if (daysToNotify.includes(diffDays)) {
        const milestone = `prazo_${diffDays}_dias`;
        const title = diffDays === 0 ? `Prazo vence hoje` : `Prazo vence em ${diffDays} dias`;
        const caresSummary = (reg as any).cares?.map((c: any) => c.care.name).join(', ') || 'Sem procedimentos';
        const patientName = (reg as any).patient?.name || 'Paciente não identificado';
        const message = `${patientName} - ${caresSummary}`;

        // Buscar profissionais alvo
        const targetProfessionals = await this.getTargetProfessionals(reg.subscriberId, reg.analyzedId);

        // Criar notificação para cada profissional alvo
        for (const professionalId of targetProfessionals) {
          await this.createNotificationIfNotExists({
            subscriberId: reg.subscriberId,
            regulationId: reg.id,
            title,
            message,
            type: NotificationType.PRAZO,
            professionalId,
            patientName,
            daysCount: diffDays,
            scheduledDate: reg.scheduledDate
          });
        }
      }
    }
  }

  private async checkPriorities(subscriberFilter: any) {
    const regulations = await this.prisma.regulation.findMany({
      where: {
        priority: { in: ['URGENCY', 'EMERGENCY'] },
        status: { in: ['IN_PROGRESS'] },
        subscriber: subscriberFilter,
      },
      include: {
        patient: { select: { id: true, name: true } },
        cares: { include: { care: { select: { id: true, name: true } } } }
      }
    });

    const daysToNotify = [15, 30, 45, 60, 75, 90];

    for (const reg of regulations) {
      const today = dayjs().tz(this.FORTALEZA_TZ).startOf('day');
      const created = dayjs(reg.createdAt).tz(this.FORTALEZA_TZ).startOf('day');
      const diffDays = today.diff(created, 'day');

      if (daysToNotify.includes(diffDays)) {
        const milestone = `prioridade_${diffDays}_dias`;
        const title = `Urgência pendente há ${diffDays} dias`;
        const caresSummary = (reg as any).cares?.map((c: any) => c.care.name).join(', ') || 'Sem procedimentos';
        const patientName = (reg as any).patient?.name || 'Paciente não identificado';
        const message = `${patientName} - ${caresSummary}`;

        // Buscar profissionais alvo
        const targetProfessionals = await this.getTargetProfessionals(reg.subscriberId, reg.analyzedId);

        // Criar notificação para cada profissional alvo
        for (const professionalId of targetProfessionals) {
          await this.createNotificationIfNotExists({
            subscriberId: reg.subscriberId,
            regulationId: reg.id,
            title,
            message,
            type: NotificationType.PRIORIDADE,
            professionalId,
            patientName,
            daysCount: diffDays,
            priority: reg.priority ?? undefined
          });
        }
      }
    }
  }

  private async createNotificationIfNotExists(params: {
    subscriberId: number;
    regulationId: number;
    title: string;
    message: string;
    type: NotificationType;
    professionalId: number;
    patientName?: string;
    daysCount?: number;
    scheduledDate?: Date;
    priority?: Prisma.NotificationCreateInput['priority'];
  }) {
    const exists = await this.prisma.notification.findFirst({
      where: {
        regulationId: params.regulationId,
        daysCount: params.daysCount,
        type: params.type,
        professionalId: params.professionalId
      },
    });

    if (!exists) {
      await this.prisma.notification.create({
        data: {
          subscriberId: params.subscriberId,
          regulationId: params.regulationId,
          professionalId: params.professionalId,
          title: params.title,
          message: params.message,
          type: params.type,
          patientName: params.patientName,
          daysCount: params.daysCount,
          scheduledDate: params.scheduledDate,
          priority: params.priority,
          readAt: null,
        },
      });
      this.logger.log(`Notificação criada para regulation ${params.regulationId} - professional ${params.professionalId}`);
    }
  }

  async getNotificationsForUser(subscriberId: number, professionalId: number) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        subscriberId: subscriberId,
        deletedAt: null,
        professionalId: professionalId,
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        uuid: true,
        title: true,
        message: true,
        type: true,
        createdAt: true,
        readAt: true,
        patientName: true,
        daysCount: true,
        scheduledDate: true,
        priority: true
      }
    });

    return { notifications };
  }

  async markAsViewed(subscriberId: number, professionalId: number) {
    // Buscar dados do profissional para o registro de visualização
    const professional = await this.prisma.professional.findUnique({
      where: { id: professionalId },
      select: { id: true, name: true }
    });

    if (!professional) {
      return { count: 0 };
    }

    // Buscar notificações não lidas
    const unreadNotifications = await this.prisma.notification.findMany({
      where: {
        subscriberId: subscriberId,
        professionalId: professionalId,
        readAt: null
      },
      select: { id: true }
    });

    const now = new Date();

    // Atualizar cada notificação marcando como lida
    for (const notification of unreadNotifications) {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          readAt: now,
        }
      });
    }

    return { count: unreadNotifications.length };
  }

  async clearAll(subscriberId: number, professionalId: number) {
    const result = await this.prisma.notification.updateMany({
      where: {
        subscriberId: subscriberId,
        professionalId: professionalId,
        deletedAt: null
      },
      data: {
        deletedAt: new Date()
      }
    });
    return { success: true, count: result.count };
  }

  async triggerManualCheck(subscriberId?: number) {
    this.logger.log(`Trigger manual iniciado${subscriberId ? ` para subscriber ${subscriberId}` : ''}`);
    await this.processNotifications(subscriberId);
    return { success: true, message: 'Processamento de notificações iniciado manualmente.' };
  }

  /**
   * Retorna todas as notificações com informações de quem visualizou
   * Apenas para admin_manager
   */
  async getNotificationViews(subscriberId: number) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        subscriberId: subscriberId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        uuid: true,
        title: true,
        type: true,
        createdAt: true,
        readAt: true,
        patientName: true,
        professional: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    return {
      notifications: notifications.map(n => {
        const viewedBy: ViewedByEntry[] = [];
        if (n.readAt) {
          viewedBy.push({
            professional_id: n.professional.id,
            name: n.professional.name || 'Sem nome',
            viewed_at: n.readAt.toISOString()
          });
        }

        return {
          ...n,
          viewed_by: viewedBy,
          views_count: viewedBy.length
        };
      })
    };
  }

  /**
   * Retorna detalhes de visualização de uma notificação específica
   * Apenas para admin_manager
   */
  async getNotificationViewDetails(subscriberId: number, notificationId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        subscriberId: subscriberId,
      },
      select: {
        id: true,
        uuid: true,
        message: true,
        type: true,
        createdAt: true,
        readAt: true,
        professional: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    if (!notification) {
      return null;
    }

    const viewedBy: ViewedByEntry[] = [];
    if (notification.readAt) {
      viewedBy.push({
        professional_id: notification.professional.id,
        name: notification.professional.name || 'Sem nome',
        viewed_at: notification.readAt.toISOString()
      });
    }

    return {
      ...notification,
      viewed_by: viewedBy,
      views_count: viewedBy.length
    };
  }
}
