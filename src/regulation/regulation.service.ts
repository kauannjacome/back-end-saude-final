import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRegulationDto } from './dto/create-regulation.dto';
import { UpdateRegulationDto } from './dto/update-regulation.dto';

@Injectable()
export class RegulationService {
  constructor(private prisma: PrismaService) {}

  async create(createRegulationDto: CreateRegulationDto) {
    return this.prisma.regulation.create({
      data: createRegulationDto,
    });
  }

  async findAll(subscriber_id: number) {
    return this.prisma.regulation.findMany({
      where: { subscriber_id, deleted_at: null },
      include: {
        patient: true,
        folder: true,
        supplier: true,
        creator: true,
        analyzer: true,
        printer: true,
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
      },
    });

    if (!regulation) throw new NotFoundException(`Regulation #${id} not found`);
    return regulation;
  }

  async update(id: number, updateRegulationDto: UpdateRegulationDto) {
    await this.findOne(id);
    return this.prisma.regulation.update({
      where: { id },
      data: updateRegulationDto,
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
