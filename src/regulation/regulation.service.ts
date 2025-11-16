import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRegulationDto } from './dto/create-regulation.dto';
import { UpdateRegulationDto } from './dto/update-regulation.dto';
import { generateRegulationPdf } from './pdf/divided-regulation-pdf';
import { PageRegulationPdf } from './pdf/page-regulation-pdf';
import { customAlphabet } from 'nanoid'
import { status } from '@prisma/client';

@Injectable()
export class RegulationService {
  constructor(private prisma: PrismaService) { }

  async create(createRegulationDto: CreateRegulationDto) {
    const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUXYZ', 10)
    const { cares, ...regulationData } = createRegulationDto;

    const regulation = await this.prisma.regulation.create({
      data: {
        ...regulationData,
        id_code: nanoid(),
        subscriber_id: 1,
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
    console.log(uuid)
    const regulation = await this.prisma.regulation.findUnique({
      where: { uuid },
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
      throw new NotFoundException(`Regulation #${uuid} not found`);
    return regulation;
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



  async updateStatus(id: number, status: status) {
    return this.prisma.regulation.update({
      where: { id },
      data: { status },
    });
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
