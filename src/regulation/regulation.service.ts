import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRegulationDto } from './dto/create-regulation.dto';
import { UpdateRegulationDto } from './dto/update-regulation.dto';
import { generateRegulationPdf } from './pdf/divided-regulation-pdf';
import { PageRegulationPdf } from './pdf/page-regulation-pdf';
import { customAlphabet } from 'nanoid'
import { status, Prisma } from '@prisma/client';
import { SearchRegulationDto } from './dto/search-regulation.dto';
import { ZapService } from '../zap/service';
import { sendRegulationStatusMessage } from '../common/utils/send-regulation-message';
import { QueueService } from '../common/queue/queue.service';

@Injectable()
export class RegulationService {
  constructor(
    private prisma: PrismaService,
    private zapService: ZapService,
    private queueService: QueueService
  ) { }

  // ... (existing methods until updateStatus)

  async updateStatus(id: number, status: status, subscriber_id: number, sendMessage?: boolean) {
    const updated = await this.prisma.regulation.update({
      where: { id, subscriber_id },
      data: { status },
      include: { patient: true, cares: { include: { care: true } } }
    });

    if (sendMessage) {
      this.queueService.addJob(() => sendRegulationStatusMessage(updated, status, subscriber_id, this.zapService));
    }

    return updated;
  }

  async create(createRegulationDto: CreateRegulationDto, subscriber_id: number) {
    const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUXYZ', 10)
    const { cares, ...regulationData } = createRegulationDto;

    const regulation = await this.prisma.regulation.create({
      data: {
        ...regulationData,
        id_code: nanoid(),
        subscriber_id: subscriber_id,
        history: regulationData.history ?? 1,
        version_document: 1,
        cares: cares
          ? {
            create: cares.map((c) => ({
              care: { connect: { id: c.care_id } },
              quantity: c.quantity,
            })),
          }
          : undefined,
      },
      include: {
        patient: true,
        cares: {
          include: {
            care: true,
          },
        },
      },
    });

    return regulation;
  }
  async findByPatient(patient_id: number) {
    return this.prisma.regulation.findMany({
      where: {
        patient_id,
        deleted_at: null,
      },
      include: {
        patient: true,
        supplier: true,
        cares: {
          include: { care: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async search(subscriber_id: number, filters: SearchRegulationDto) {
    console.log('📥 subscriber_id:', subscriber_id);
    console.log('📥 filters:', filters);

    const where: Prisma.regulationWhereInput = {
      subscriber_id,
      deleted_at: null,
    };

    if (filters.idCode) {
      where.id_code = { contains: filters.idCode, mode: 'insensitive' };
    }

    if (filters.notes) {
      where.notes = { contains: filters.notes, mode: 'insensitive' };
    }

    if (filters.requestingProfessional) {
      where.requesting_professional = { contains: filters.requestingProfessional, mode: 'insensitive' };
    }

    if (filters.patientName) {
      const normalizedName = filters.patientName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      where.patient = {
        OR: [
          { name: { contains: filters.patientName, mode: 'insensitive' } },
          { name_normalized: { contains: normalizedName, mode: 'insensitive' } },
        ],
      };
    }



    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.analyzerId) {
      where.analyzed_id = filters.analyzerId;
    }

    if (filters.creatorId) {
      where.creator_id = filters.creatorId;
    }

    if (filters.patientId) {
      where.patient_id = filters.patientId;
    }

    if (filters.responsibleId) {
      where.responsible_id = filters.responsibleId;
    }

    if (filters.careIds && filters.careIds.length > 0) {
      where.cares = {
        some: {
          care_id: { in: filters.careIds },
        },
      };
    }

    if (filters.startDate || filters.endDate) {
      where.created_at = {};
      if (filters.startDate) {
        where.created_at.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.created_at.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.regulation.findMany({
      where,
      include: {
        patient: { select: { name: true } },
        supplier: { select: { name: true } },
        cares: {
          include: { care: { select: { name: true } } },
        },
      },
      take: 10,
      skip: 0,
      orderBy: { created_at: 'desc' },
    });
  }


  async findAll(subscriber_id: number) {
    return this.prisma.regulation.findMany({
      where: { subscriber_id, deleted_at: null },
      include: {
        patient: true,
        cares: {
          include: {
            care: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOnePublicPerson(uuid: string) {
    const regulation = await this.prisma.regulation.findUnique({
      where: {
        uuid,
        deleted_at: null
      },
      include: {
        patient: true,
        cares: {
          include: { care: true },
        },
      },
    });
    if (!regulation)
      throw new NotFoundException(`Regulation #${uuid} not found`);
    return regulation;
  }
  async findOne(id: number, subscriber_id: number) {
    const regulation = await this.prisma.regulation.findUnique({
      where: { id, subscriber_id },
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


  async generatePdf(id: number, copies: number = 1) {

    const regulation = await this.prisma.regulation.findUnique({
      where: { id },
      include: {
        patient: true,
        folder: true,
        supplier: true,
        creator: true,
        analyzer: true,
        subscriber: true,
        cares: {
          include: { care: true },
        },
      },
    });



    // const pdfBuffer = await generateRegulationPdf(regulation, copies);
    const pdfBuffer = await generateRegulationPdf(regulation, copies);
    return pdfBuffer; // você pode retornar direto ou salvar num arquivo temporário
  }





  async update(id: number, updateRegulationDto: UpdateRegulationDto, subscriber_id: number) {
    const existingRegulation = await this.prisma.regulation.findUnique({
      where: { id, subscriber_id },
    });

    if (!existingRegulation) {
      throw new NotFoundException(`Regulation #${id} not found`);
    }


    const data = Object.fromEntries(
      Object.entries(updateRegulationDto).filter(([_, v]) => v !== undefined),
    );
    const updatedRegulation = await this.prisma.regulation.update({
      where: { id, subscriber_id },
      data,
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

    return updatedRegulation;
  }


  async remove(id: number, subscriber_id: number) {
    await this.findOne(id, subscriber_id);
    return this.prisma.regulation.update({
      where: { id, subscriber_id },
      data: { deleted_at: new Date() },
    });
  }
}
