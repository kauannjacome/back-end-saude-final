import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRegulationDto } from './dto/create-regulation.dto';
import { UpdateRegulationDto } from './dto/update-regulation.dto';
import { generateRegulationPdf } from './pdf/divided-regulation-pdf';
import { PageRegulationPdf } from './pdf/page-regulation-pdf';
import { RequestRegulationPdf } from './pdf/authorization-regulation-pdf';
import { customAlphabet } from 'nanoid'

@Injectable()
export class RegulationService {
  constructor(private prisma: PrismaService) { }

  async create(createRegulationDto: CreateRegulationDto) {
    const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUXYZ', 10)
    const { cares, ...regulationData } = createRegulationDto;

    const regulation = await this.prisma.regulation.create({
      data: {
        ...regulationData,
        id_code:nanoid() ,
        history: regulationData.history ?? 1,
        version_document: regulationData.version_document ?? 1,
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

  async search(subscriber_id: number, term: string) {
    console.log('📥 subscriber_id:', subscriber_id);
    console.log('📥 term:', term);

    return this.prisma.regulation.findMany({
      where: {
        subscriber_id,
        deleted_at: null,
        OR: [
          { id_code: { contains: term, mode: 'insensitive' } },
          { notes: { contains: term, mode: 'insensitive' } },
          { requesting_professional: { contains: term, mode: 'insensitive' } },
        ],
      },
      include: {
        patient: { select: { full_name: true } },
        supplier: { select: { name: true } },
        cares: {
          include: { care: { select: { name: true } } },
        },
      },
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


    const data = Object.fromEntries(
      Object.entries(updateRegulationDto).filter(([_, v]) => v !== undefined),
    );
    const updatedRegulation = await this.prisma.regulation.update({
      where: { id },
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


  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.regulation.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
