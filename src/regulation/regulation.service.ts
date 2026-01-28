import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRegulationDto } from './dto/create-regulation.dto';
import { UpdateRegulationDto } from './dto/update-regulation.dto';
import { generateRegulationPdf } from './pdf/divided-regulation-pdf';
import { PageRegulationPdf } from './pdf/page-regulation-pdf';
import { customAlphabet } from 'nanoid'
import { Status, Prisma } from '@prisma/client';
import { SearchRegulationDto } from './dto/search-regulation.dto';
import { ZapService } from '../zap/service';
import { sendRegulationStatusMessage } from '../common/utils/send-regulation-message';
import { QueueService } from '../common/queue/queue.service';
import { RegulationGateway } from './regulation.gateway';

@Injectable()
export class RegulationService {
  constructor(
    private prisma: PrismaService,
    private zapService: ZapService,
    private queueService: QueueService,
    private regulationGateway: RegulationGateway,
  ) { }

  // ... (existing methods until updateStatus)

  async updateStatus(id: number, status: Status, subscriber_id: number, sendMessage?: boolean) {
    const updated = await this.prisma.regulation.update({
      where: { id, subscriberId: subscriber_id },
      data: { status },
      include: { patient: true, cares: { include: { care: true } } }
    });

    if (sendMessage) {
      this.queueService.addJob(() => sendRegulationStatusMessage(updated, status, subscriber_id, this.zapService));
    }

    // Notifica via WebSocket que houve atualização para este assinante
    this.regulationGateway.notifyRegulationUpdate(subscriber_id);

    return updated;
  }

  async create(createRegulationDto: CreateRegulationDto, subscriber_id: number) {
    const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUXYZ', 10)
    const { cares, ...regulationData } = createRegulationDto;

    const regulation = await this.prisma.regulation.create({
      data: {
        status: regulationData.status,
        notes: regulationData.notes,
        clinicalIndication: regulationData.clinical_indication,
        requestingProfessional: regulationData.requesting_professional,
        urlRequirement: regulationData.url_requirement,
        urlPreDocument: regulationData.url_pre_document,
        urlCurrentDocument: regulationData.url_current_document,
        relationship: regulationData.relationship,
        priority: regulationData.priority,
        typeDeclaration: regulationData.type_declaration,
        requestDate: regulationData.request_date ? new Date(regulationData.request_date) : undefined,
        scheduledDate: regulationData.scheduled_date ? new Date(regulationData.scheduled_date) : undefined,
        patientId: regulationData.patient_id,
        folderId: regulationData.folder_id,
        creatorId: regulationData.creator_id,
        analyzedId: regulationData.analyzed_id,
        printerId: regulationData.printer_id,
        supplierId: regulationData.supplier_id,
        history: regulationData.history ?? 1,
        idCode: nanoid(),
        subscriberId: subscriber_id,
        versionDocument: 1,
        cares: cares
          ? {
            create: cares.map((c) => ({
              care: { connect: { id: c.care_id } },
              subscriber: { connect: { id: subscriber_id } },
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



    // Notifica via WebSocket que houve atualização para este assinante
    this.regulationGateway.notifyRegulationUpdate(subscriber_id);

    return regulation;
  }
  async findByPatient(patient_id: number) {
    return this.prisma.regulation.findMany({
      where: {
        patientId: patient_id,
        deletedAt: null,
      },
      include: {
        patient: true,
        supplier: true,
        cares: {
          include: { care: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async search(subscriber_id: number, filters: SearchRegulationDto) {

    const where: Prisma.RegulationWhereInput = {
      subscriberId: subscriber_id,
      deletedAt: null,
    };

    if (filters.idCode) {
      where.idCode = { contains: filters.idCode, mode: 'insensitive' };
    }

    if (filters.notes) {
      where.notes = { contains: filters.notes, mode: 'insensitive' };
    }

    if (filters.requestingProfessional) {
      where.requestingProfessional = { contains: filters.requestingProfessional, mode: 'insensitive' };
    }

    if (filters.patientName) {
      const normalizedName = filters.patientName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      where.patient = {
        OR: [
          { name: { contains: filters.patientName, mode: 'insensitive' } },
          { nameNormalized: { contains: normalizedName, mode: 'insensitive' } },
        ],
      };
    }



    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.analyzerId) {
      where.analyzedId = filters.analyzerId;
    }

    if (filters.creatorId) {
      where.creatorId = filters.creatorId;
    }

    if (filters.patientId) {
      where.patientId = filters.patientId;
    }

    if (filters.responsibleId) {
      where.responsibleId = filters.responsibleId;
    }

    if (filters.careIds && filters.careIds.length > 0) {
      where.cares = {
        some: {
          careId: { in: filters.careIds },
        },
      };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    // Resilience: ensure defaults
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.regulation.findMany({
        where,
        select: {
          id: true,
          uuid: true,
          idCode: true,
          patientId: true,
          scheduledDate: true,
          status: true,
          notes: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
          patient: { select: { name: true } },
          cares: {
            select: {
              id: true,
              quantity: true,
              care: {
                select: {
                  id: true,
                  name: true,
                  acronym: true
                }
              }
            }
          },
        },
        take: limit,
        skip: skip,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.regulation.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }


  async findAll(subscriber_id: number) {
    return this.prisma.regulation.findMany({
      where: { subscriberId: subscriber_id, deletedAt: null },
      include: {
        patient: true,
        cares: {
          include: {
            care: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOnePublicPerson(uuid: string) {
    const regulation = await this.prisma.regulation.findUnique({
      where: {
        uuid,
        deletedAt: null
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
      where: { id, subscriberId: subscriber_id },
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
      where: { id, subscriberId: subscriber_id },
    });

    if (!existingRegulation) {
      throw new NotFoundException(`Regulation #${id} not found`);
    }


    const data = Object.fromEntries(
      Object.entries(updateRegulationDto).filter(([_, v]) => v !== undefined),
    );
    const updatedRegulation = await this.prisma.regulation.update({
      where: { id, subscriberId: subscriber_id },
      data: {
        status: updateRegulationDto.status,
        notes: updateRegulationDto.notes,
        clinicalIndication: updateRegulationDto.clinical_indication,
        requestingProfessional: updateRegulationDto.requesting_professional,
        urlRequirement: updateRegulationDto.url_requirement,
        urlPreDocument: updateRegulationDto.url_pre_document,
        urlCurrentDocument: updateRegulationDto.url_current_document,
        relationship: updateRegulationDto.relationship,
        priority: updateRegulationDto.priority,
        typeDeclaration: updateRegulationDto.type_declaration,
        requestDate: updateRegulationDto.request_date ? new Date(updateRegulationDto.request_date) : undefined,
        scheduledDate: updateRegulationDto.scheduled_date ? new Date(updateRegulationDto.scheduled_date) : undefined,
        patientId: updateRegulationDto.patient_id,
        folderId: updateRegulationDto.folder_id,
        creatorId: updateRegulationDto.creator_id,
        analyzedId: updateRegulationDto.analyzed_id,
        printerId: updateRegulationDto.printer_id,
        supplierId: updateRegulationDto.supplier_id,
      },
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

    // Notifica via WebSocket que houve atualização para este assinante
    this.regulationGateway.notifyRegulationUpdate(subscriber_id);

    return updatedRegulation;
  }


  async remove(id: number, subscriber_id: number) {
    const regulation = await this.prisma.regulation.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!regulation || regulation.deletedAt) {
      throw new NotFoundException(`Regulation #${id} not found`);
    }

    const result = await this.prisma.regulation.update({
      where: { id, subscriberId: subscriber_id },
      data: { deletedAt: new Date() },
    });

    // Notifica via WebSocket que houve atualização para este assinante
    this.regulationGateway.notifyRegulationUpdate(subscriber_id);

    return result;
  }

  async restore(id: number, subscriber_id: number) {
    const regulation = await this.prisma.regulation.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!regulation) {
      throw new NotFoundException(`Regulation #${id} not found`);
    }
    if (!regulation.deletedAt) {
      throw new BadRequestException(`Regulation #${id} is not deleted`);
    }

    const result = await this.prisma.regulation.update({
      where: { id, subscriberId: subscriber_id },
      data: { deletedAt: null },
    });

    // Notifica via WebSocket que houve atualização para este assinante
    this.regulationGateway.notifyRegulationUpdate(subscriber_id);

    return result;
  }

  async hardDelete(id: number, subscriber_id: number) {
    const regulation = await this.prisma.regulation.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!regulation) {
      throw new NotFoundException(`Regulation #${id} not found`);
    }

    // Since cascade delete should handle relations, check schema
    // Assuming Prisma relations are set to cascade or manually handling dependencies might be needed if not.
    // The previous schema edits showed 'onDelete: Cascade' for many relations.
    const result = await this.prisma.regulation.delete({
      where: { id, subscriberId: subscriber_id },
    });

    // Notifica via WebSocket que houve atualização para este assinante
    this.regulationGateway.notifyRegulationUpdate(subscriber_id);

    return result;
  }

  async findAllDeleted(subscriber_id: number) {
    return this.prisma.regulation.findMany({
      where: { subscriberId: subscriber_id, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      include: {
        patient: { select: { name: true } },
        cares: {
          include: {
            care: { select: { name: true } },
          },
        },
      },
    });
  }
}
