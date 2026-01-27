import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../prisma/prisma.service';
import { notification_type, Prisma } from '@prisma/client';
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
        subscriber_id: subscriberId,
        role: 'admin_municipal',
        deleted_at: null,
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
        scheduled_date: { not: null },
        status: { in: ['in_progress', 'approved'] },
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

      const today = dayjs().tz(this.FORTALEZA_TZ).startOf('day');
      const scheduled = dayjs(reg.scheduled_date).tz(this.FORTALEZA_TZ).startOf('day');
      const diffDays = scheduled.diff(today, 'day');

      if (daysToNotify.includes(diffDays)) {
        const milestone = `prazo_${diffDays}_dias`;
        const title = diffDays === 0 ? `Prazo vence hoje` : `Prazo vence em ${diffDays} dias`;
        const caresSummary = reg.cares?.map(c => c.care.name).join(', ') || 'Sem procedimentos';
        const patientName = reg.patient?.name || 'Paciente não identificado';
        const message = `${patientName} - ${caresSummary}`;

        // Buscar profissionais alvo
        const targetProfessionals = await this.getTargetProfessionals(reg.subscriber_id, reg.analyzed_id);

        // Criar notificação para cada profissional alvo
        for (const professionalId of targetProfessionals) {
          await this.createNotificationIfNotExists({
            subscriberId: reg.subscriber_id,
            regulationId: reg.id,
            title,
            message,
            type: notification_type.PRAZO,
            milestone,
            professionalId,
            patientName,
            caresSummary,
            daysCount: diffDays,
            scheduledDate: reg.scheduled_date
          });
        }
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
      const today = dayjs().tz(this.FORTALEZA_TZ).startOf('day');
      const created = dayjs(reg.created_at).tz(this.FORTALEZA_TZ).startOf('day');
      const diffDays = today.diff(created, 'day');

      if (daysToNotify.includes(diffDays)) {
        const milestone = `prioridade_${diffDays}_dias`;
        const title = `Urgência pendente há ${diffDays} dias`;
        const caresSummary = reg.cares?.map(c => c.care.name).join(', ') || 'Sem procedimentos';
        const patientName = reg.patient?.name || 'Paciente não identificado';
        const message = `${patientName} - ${caresSummary}`;

        // Buscar profissionais alvo
        const targetProfessionals = await this.getTargetProfessionals(reg.subscriber_id, reg.analyzed_id);

        // Criar notificação para cada profissional alvo
        for (const professionalId of targetProfessionals) {
          await this.createNotificationIfNotExists({
            subscriberId: reg.subscriber_id,
            regulationId: reg.id,
            title,
            message,
            type: notification_type.PRIORIDADE,
            milestone,
            professionalId,
            patientName,
            caresSummary,
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
    type: notification_type;
    milestone: string;
    professionalId: number;
    patientName?: string;
    caresSummary?: string;
    daysCount?: number;
    scheduledDate?: Date;
    priority?: Prisma.notificationCreateInput['priority'];
  }) {
    const exists = await this.prisma.notification.findFirst({
      where: {
        regulation_id: params.regulationId,
        milestone: params.milestone,
        professional_id: params.professionalId
      },
    });

    if (!exists) {
      await this.prisma.notification.create({
        data: {
          subscriber_id: params.subscriberId,
          regulation_id: params.regulationId,
          professional_id: params.professionalId,
          title: params.title,
          message: params.message,
          type: params.type,
          milestone: params.milestone,
          patient_name: params.patientName,
          cares_summary: params.caresSummary,
          days_count: params.daysCount,
          scheduled_date: params.scheduledDate,
          priority: params.priority,
          is_read: false,
          viewed_by: [],
        },
      });
      this.logger.log(`Notificação criada para regulation ${params.regulationId} - professional ${params.professionalId} - ${params.milestone}`);
    }
  }

  async getNotificationsForUser(subscriberId: number, professionalId: number) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        subscriber_id: subscriberId,
        deleted_at: null,
        professional_id: professionalId,
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
        patient_name: true,
        cares_summary: true,
        days_count: true,
        scheduled_date: true,
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
        subscriber_id: subscriberId,
        professional_id: professionalId,
        is_read: false
      },
      select: { id: true, viewed_by: true }
    });

    const now = dayjs().tz(this.FORTALEZA_TZ).toISOString();

    // Atualizar cada notificação adicionando o registro de visualização
    for (const notification of unreadNotifications) {
      const currentViewedBy = (notification.viewed_by as unknown as ViewedByEntry[]) || [];

      // Verificar se já existe registro deste profissional
      const alreadyViewed = currentViewedBy.some(v => v.professional_id === professionalId);

      if (!alreadyViewed) {
        currentViewedBy.push({
          professional_id: professionalId,
          name: professional.name || 'Sem nome',
          viewed_at: now
        });
      }

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          is_read: true,
          read_at: new Date(),
          viewed_by: currentViewedBy as unknown as Prisma.InputJsonValue
        }
      });
    }

    return { count: unreadNotifications.length };
  }

  async clearAll(subscriberId: number, professionalId: number) {
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
        subscriber_id: subscriberId,
        deleted_at: null,
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
        created_at: true,
        is_read: true,
        viewed_by: true,
        patient_name: true,
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
        const viewedBy = (n.viewed_by as unknown as ViewedByEntry[]) || [];
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
        subscriber_id: subscriberId,
      },
      select: {
        id: true,
        uuid: true,
        title: true,
        message: true,
        type: true,
        created_at: true,
        viewed_by: true,
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

    const viewedBy = (notification.viewed_by as unknown as ViewedByEntry[]) || [];
    return {
      ...notification,
      viewed_by: viewedBy,
      views_count: viewedBy.length
    };
  }
}
