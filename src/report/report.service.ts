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
    const where: any = { deleted_at: null };

    if (subscriber_id) where.subscriber_id = subscriber_id;

    // Se IDs foram passados, ignora outros filtros de busca e retorna apenas esses IDs
    if (ids && ids.length > 0) {
      where.id = { in: ids };
      return where;
    }

    // Filtros Normais
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (supplier_id) where.supplier_id = supplier_id;
    if (analyzed_id) where.analyzed_id = analyzed_id;
    if (creator_id) where.creator_id = creator_id;
    if (care_id) where.cares = { some: { care_id } };

    // Filtro de Data
    if (start_date || end_date) {
      const dateFilter: any = {};
      if (start_date) dateFilter.gte = new Date(start_date);
      if (end_date) {
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.created_at = dateFilter;
    }

    return where;
  }

  // --- Core List Logic (JSON) ---
  async findAllRegulations(filters: ReportFilterDto) {
    const where = this.buildRegulationWhere(filters);
    const take = filters.take ? Number(filters.take) : undefined;

    const regulations = await this.prisma.regulation.findMany({
      where,
      take,
      include: {
        patient: { select: { name: true, cpf: true, birth_date: true } },
        cares: { include: { care: { select: { name: true } } } },
        supplier: { select: { name: true } },
      },
      // Ordenação primária por Prioridade e secundária por Data (será refinada em memória se o banco não suportar enum sort direto)
      orderBy: { created_at: 'asc' }
    });

    // Ordenação Customizada: Emergencia (3) > Urgencia (2) > Eletivo (1)
    const priorityWeight = { 'emergencia': 3, 'urgencia': 2, 'eletivo': 1 };

    return regulations.sort((a, b) => {
      const pA = a.priority ? priorityWeight[a.priority] : 0;
      const pB = b.priority ? priorityWeight[b.priority] : 0;
      // Maior peso vem primeiro (3 > 2 > 1)
      if (pA !== pB) return pB - pA;
      // Se peso igual, data mais antiga vem primeiro (FIFO)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }).map(reg => ({
      id: reg.id,
      protocol: reg.id_code || reg.uuid,
      patient_name: reg.patient?.name || 'N/A',
      care_type: reg.cares.map(c => c.care.name).join(', '),
      priority: reg.priority,
      status: reg.status,
      supplier: reg.supplier?.name || '-',
      created_at: reg.created_at,
      wait_time_days: Math.floor((new Date().getTime() - new Date(reg.created_at).getTime()) / (1000 * 3600 * 24))
    }));
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
      doc.text(`Total de Registros: ${data.length}`, { align: 'right' });
      doc.moveDown();

      // Tabela
      const table = {
        title: '',
        headers: ['Protocolo', 'Paciente', 'Cuidado', 'Prioridade', 'Status', 'Data', 'Dias'],
        rows: data.map(item => [
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
