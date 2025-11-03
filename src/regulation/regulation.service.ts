import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRegulationDto } from './dto/create-regulation.dto';
import { UpdateRegulationDto } from './dto/update-regulation.dto';
import { generateRegulationPdf } from './pdf/divided-regulation-pdf';
import { PageRegulationPdf } from './pdf/page-regulation-pdf';


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




async update(id: number, updateRegulationDto: UpdateRegulationDto) {
  await this.findOne(id);

  return this.prisma.regulation.update({
    where: { id },
    data: updateRegulationDto as any, 
  });
}

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.regulation.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
