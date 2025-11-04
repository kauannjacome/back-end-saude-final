import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRegulationDto } from './dto/create-regulation.dto';
import { UpdateRegulationDto } from './dto/update-regulation.dto';
import { generateRegulationPdf } from './pdf/divided-regulation-pdf';
import { PageRegulationPdf } from './pdf/page-regulation-pdf';
import { RequestRegulationPdf } from './pdf/authorization-regulation-pdf';


@Injectable()
export class RegulationService {
  constructor(private prisma: PrismaService) {}

  async create(createRegulationDto: CreateRegulationDto) {
    const { cares, ...regulationData } = createRegulationDto;

    const regulation = await this.prisma.regulation.create({
      data: {
        ...regulationData,
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

  
async generatePdf(id: number, copies: number = 1) {

      const regulation = await this.prisma.regulation.findUnique({
      where: { id },
      include: {
        patient: true,
        folder: true,
        supplier: true,
        creator: true,
        analyzer:true,
        subscriber:true,
        cares: {
          include: { care: true },
        },
      },
    });



  // const pdfBuffer = await generateRegulationPdf(regulation, copies);
  const pdfBuffer = await generateRegulationPdf(regulation, copies);
  return pdfBuffer; // você pode retornar direto ou salvar num arquivo temporário
}


async requestPdf(id: number) {
  // 1️⃣ Busca o registro atual
  const existing = await this.prisma.regulation.findUnique({
    where: { id },
    select: { request_date: true },
  });

  // 2️⃣ Atualiza apenas se não tiver data
  if (!existing?.request_date) {
    await this.prisma.regulation.update({
      where: { id },
      data: { request_date: new Date() },
    });
  }

  // 3️⃣ Agora carrega os dados completos para gerar o PDF
  const regulation = await this.prisma.regulation.findUnique({
    where: { id },
    include: {
      patient: true,
      folder: true,
      supplier: true,
      creator: true,
      analyzer: true,
      subscriber: true,
      cares: { include: { care: true } },
    },
  });

  const pdfBuffer = await RequestRegulationPdf(regulation);
  return pdfBuffer;
}

async update(id: number, updateRegulationDto: UpdateRegulationDto) {
  const existingRegulation = await this.prisma.regulation.findUnique({
    where: { id },
  });

  if (!existingRegulation) {
    throw new NotFoundException(`Regulation #${id} not found`);
  }

  const updatedRegulation = await this.prisma.regulation.update({
    where: { id },
    data: {
      subscriber_id: updateRegulationDto.subscriber_id ?? existingRegulation.subscriber_id,
      id_code: updateRegulationDto.id_code ?? existingRegulation.id_code,
      patient_id: updateRegulationDto.patient_id ?? existingRegulation.patient_id,
      request_date: updateRegulationDto.request_date ?? existingRegulation.request_date,
      scheduled_date: updateRegulationDto.scheduled_date ?? existingRegulation.scheduled_date,
      status: updateRegulationDto.status ?? existingRegulation.status,
      notes: updateRegulationDto.notes ?? existingRegulation.notes,
      url_requirement: updateRegulationDto.url_requirement ?? existingRegulation.url_requirement,
      url_pre_document: updateRegulationDto.url_pre_document ?? existingRegulation.url_pre_document,
      url_current_document: updateRegulationDto.url_current_document ?? existingRegulation.url_current_document,
      folder_id: updateRegulationDto.folder_id ?? existingRegulation.folder_id,
      relationship: updateRegulationDto.relationship ?? existingRegulation.relationship,
      priority: updateRegulationDto.priority ?? existingRegulation.priority,
      caregiver_id: updateRegulationDto.caregiver_id ?? existingRegulation.caregiver_id,
      creator_id: updateRegulationDto.creator_id ?? existingRegulation.creator_id,
      analyzed_id: updateRegulationDto.analyzed_id ?? existingRegulation.analyzed_id,
      printer_id: updateRegulationDto.printer_id ?? existingRegulation.printer_id,
      supplier_id: updateRegulationDto.supplier_id ?? existingRegulation.supplier_id,
      history: updateRegulationDto.history ?? existingRegulation.history,
      version_document: updateRegulationDto.version_document ?? existingRegulation.version_document,
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

  return updatedRegulation;
}


  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.regulation.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
