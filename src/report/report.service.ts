import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportFilterPriorityStatusCareDto } from './dto/report-filter-priority-status-care.dto';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  create(createReportDto: CreateReportDto) {
    return 'This action adds a new report';
  }

  findAll() {
    return `This action returns all report`;
  }

  async getRegulationReport(filters: ReportFilterPriorityStatusCareDto) {
    const { subscriber_id, status, care_id, priority, start_date, end_date } =
      filters;
    // ponto de partida do filtro
    const where: any = {
      deleted_at: null,
    };
    if (priority) {
      // 👈 adiciona prioridade apenas se for informada
      where.priority = priority;
    }
    if (subscriber_id) where.subscriber_id = subscriber_id;
    if (status) where.status = status;

    if (care_id) {
      // filtra regulações que tenham o care_id informado
      where.cares = {
        some: {
          care_id: care_id,
        },
      };
    }
    // 👇 Filtro de data (intervalo)
    if (start_date || end_date) {
      where.created_at = {};

      if (start_date) {
        where.created_at.gte = new Date(start_date); // >= data inicial
      }

      if (end_date) {
        // Ajusta para incluir o dia inteiro
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        where.created_at.lte = end; // <= data final
      }
    }

    const regulations = await this.prisma.regulation.findMany({
      where,
      include: {
        cares: {
          include: {
            care: true,
          },
        },
        patient: true,
        supplier: true,
      },
      take: 10,
      skip: 0,
    });

    return regulations;
  }

  async findOne(id: number) {
    const regulation = await this.prisma.regulation.findUnique({
      where: { id },
      include: {
        patient: true,
        folder: true,
        supplier: true,
        creator: true,
        analyzer: true,
        printer: true,
        cares: {
          include: { care: true },
        },
      },
    });

    if (!regulation) {
      throw new NotFoundException(`Regulation with ID ${id} not found`);
    }
    return regulation;
  }

  update(id: number, updateReportDto: UpdateReportDto) {
    return `This action updates a #${id} report`;
  }

  remove(id: number) {
    return `This action removes a #${id} report`;
  }
}
