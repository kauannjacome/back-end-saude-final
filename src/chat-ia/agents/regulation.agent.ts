import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface RegulationSearchParams {
  patientId?: number;
  idCode?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  priority?: string;
  examType?: string;
  cnpj?: string;
  query?: string;
}

export interface RegulationResult {
  id: number;
  idCode?: string;
  patientName?: string;
  clinicalIndication?: string;
  priority?: string;
  status?: string;
  createdAt: Date;
}

@Injectable()
export class RegulationAgent {
  private readonly logger = new Logger(RegulationAgent.name);

  constructor(private readonly prisma: PrismaService) { }

  async search(subscriberId: number, params: RegulationSearchParams): Promise<RegulationResult[]> {
    this.logger.debug(`🔍 Procurando regulação: ${JSON.stringify(params)}`);

    const where: any = { subscriber_id: subscriberId, deleted_at: null };

    if (params.patientId) where.patient_id = params.patientId;
    if (params.idCode) where.id_code = params.idCode;
    if (params.status) where.status = params.status;
    if (params.priority) where.priority = params.priority;

    // CNPJ search - join with supplier table
    if (params.cnpj) {
      const normalizedCnpj = params.cnpj.replace(/\D/g, '');
      where.supplier = {
        cnpj: normalizedCnpj
      };
    }

    if (params.dateFrom || params.dateTo) {
      where.created_at = {};
      if (params.dateFrom) where.created_at.gte = new Date(params.dateFrom);
      if (params.dateTo) where.created_at.lte = new Date(params.dateTo);
    }

    if (params.examType && params.examType.length >= 3) {
      where.clinical_indication = { contains: params.examType, mode: 'insensitive' };
    }

    if (params.query && params.query.length >= 3) {
      where.OR = [
        { clinical_indication: { contains: params.query, mode: 'insensitive' } },
        { notes: { contains: params.query, mode: 'insensitive' } },
      ];
    }

    const regs = await this.prisma.regulation.findMany({
      where,
      include: {
        patient: { select: { name: true } },
        supplier: { select: { name: true, cnpj: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    return regs.map(r => ({
      id: r.id,
      idCode: r.id_code || undefined,
      patientName: r.patient?.name || undefined,
      clinicalIndication: r.clinical_indication || undefined,
      priority: r.priority || undefined,
      status: r.status || undefined,
      createdAt: r.created_at,
    }));
  }
}
