import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ReportFilterPriorityStatusCareDto } from './dto/report-filter-priority-status-care.dto';
import { ReportFilterDto } from './dto/report-filters.dto';
import PDFDocument from 'pdfkit-table';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) { }

  // --- Helpers ---
  private buildRegulationWhere(filters: ReportFilterDto) {
    const { subscriber_id, status, care_id, priority, start_date, end_date, supplier_id, ids, analyzed_id, creator_id } = filters;
    const where: any = { deletedAt: null };

    if (subscriber_id) where.subscriberId = subscriber_id;

    // Se IDs foram passados, ignora outros filtros de busca e retorna apenas esses IDs
    if (ids && ids.length > 0) {
      where.id = { in: ids };
      return where;
    }

    // Filtros Normais
    // Adaptação para Status e Priority se necessário (assumindo que DTO envia snake_case mas Prisma usa UPPERCASE ou o DTO já foi ajustado)
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (supplier_id) where.supplierId = supplier_id;
    if (analyzed_id) where.analyzedId = analyzed_id;
    if (creator_id) where.creatorId = creator_id;
    if (care_id) where.cares = { some: { careId: care_id } };

    // Filtro de Data
    if (start_date || end_date) {
      const dateFilter: any = {};
      if (start_date) dateFilter.gte = new Date(start_date);
      if (end_date) {
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.createdAt = dateFilter;
    }

    return where;
  }

  // --- Core List Logic (JSON) ---
  async findAllRegulations(filters: ReportFilterDto) {
    const where = this.buildRegulationWhere(filters);

    // Resilience: ensure defaults
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
    const skip = (page - 1) * limit;

    // Se "ids" for passado (seleção manual), ignoramos paginação e retornamos todos
    const isManualSelection = filters.ids && filters.ids.length > 0;
    const take = isManualSelection ? undefined : limit;
    const skipValue = isManualSelection ? undefined : skip;

    // Se formos paginar no banco, perdemos a ordenação customizada completa (apenas na página).
    // Para manter a ordenação business (Emergencia > Urgencia > Eletivo), teríamos que trazer tudo.
    // Mas para performance, vamos paginar no banco e ordenar o resultado.
    // TODO: Mover ordenação de prioridade para o banco se possívelfuturamente.

    const [regulations, total] = await Promise.all([
      this.prisma.regulation.findMany({
        where,
        take: take,
        skip: skipValue,
        include: {
          patient: { select: { name: true, cpf: true, birthDate: true } },
          cares: { include: { care: { select: { name: true } } } },
          supplier: { select: { name: true } },
        },
        // Ordenação primária por Prioridade e secundária por Data
        // Nota: Prisma ordena enums como strings. Se precisar de ordem customizada, ideal é RawSQL ou Numérico.
        // Aqui mantemos created_at para estabilidade.
        orderBy: [
          { priority: 'asc' }, // A-Z (Eletivo, Emergencia, Urgencia) - Não é o ideal (Emergencia deveria ser topo).
          { createdAt: 'asc' }
        ]
      }),
      this.prisma.regulation.count({ where }),
    ]);

    // Ordenação Customizada em Memória (apenas da página atual)
    const priorityWeight = { 'EMERGENCY': 3, 'URGENCY': 2, 'ELECTIVE': 1 };

    const sortedData = regulations.sort((a, b) => {
      const pA = a.priority ? priorityWeight[a.priority] : 0;
      const pB = b.priority ? priorityWeight[b.priority] : 0;
      if (pA !== pB) return pB - pA;
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeA - timeB;
    }).map(reg => ({
      id: reg.id,
      protocol: reg.idCode || reg.uuid,
      patient_name: (reg as any).patient?.name || 'N/A',
      care_type: (reg as any).cares.map((c: any) => c.care.name).join(', '),
      priority: reg.priority,
      status: reg.status,
      supplier: (reg as any).supplier?.name || '-',
      created_at: reg.createdAt,
      wait_time_days: Math.floor((new Date().getTime() - new Date(reg.createdAt).getTime()) / (1000 * 3600 * 24))
    }));

    return {
      data: sortedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // --- PDF Generation Logic ---
  async generateRegulationPdf(filters: ReportFilterDto): Promise<Buffer> {
    const data = await this.findAllRegulations(filters);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Cabeçalho
      doc.fontSize(18).text('Relatório de Regulações', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'right' });
      doc.text(`Total de Registros: ${data.total}`, { align: 'right' });
      doc.moveDown();

      // Tabela
      const table = {
        title: '',
        headers: ['Protocolo', 'Paciente', 'Cuidado', 'Prioridade', 'Status', 'Data', 'Dias'],
        rows: data.data.map(item => [
          item.protocol.substring(0, 8), // Encurtar protocolo visualmente
          item.patient_name.substring(0, 20),
          item.care_type.substring(0, 20),
          item.priority || '-',
          item.status || '-',
          new Date(item.created_at).toLocaleDateString('pt-BR'),
          item.wait_time_days.toString()
        ]),
      };

      doc.table(table, {
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8),
        prepareRow: (row, i) => doc.font('Helvetica').fontSize(8),
      });

      doc.end();
    });
  }

  // --- Outros Métodos (Manter compatibilidade ou refatorar depois) ---
  create(createReportDto: CreateReportDto) {
    return 'This action adds a new report';
  }

  findAll() {
    return `This action returns all report`;
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

    if (!regulation)
      throw new NotFoundException(`Regulation #${id} not found`);
    return regulation;
  }

  update(id: number, updateReportDto: UpdateReportDto) {
    return `This action updates a #${id} report`;
  }

  remove(id: number) {
    return `This action removes a #${id} report`;
  }

  // --- Mantendo métodos antigos temporariamente para não quebrar contrato se usados em outro lugar ---
  async getRegulationReport(filters: ReportFilterPriorityStatusCareDto) {
    // Reutilizar lógica nova se possível, mas mantendo a assinatura antiga
    return this.findAllRegulations(filters as any);
  }
}
