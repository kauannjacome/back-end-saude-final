import { NotificationType } from '@prisma/client';

export class Notification {
  id: number;
  uuid: string;
  subscriberId: number;
  regulationId: number | null;
  professionalId: number | null;
  title: string;
  message: string;
  type: NotificationType;
  milestone: string | null;
  patientName: string | null;
  caresSummary: string | null;
  daysCount: number | null;
  scheduledDate: Date | null;
  priority: string | null;
  isRead: boolean;
  readAt: Date | null;
  viewedBy: any;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
