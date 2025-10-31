import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';

@Injectable()
export class ProfessionalService {
  constructor(private prisma: PrismaService) {}

  async create(createProfessionalDto: CreateProfessionalDto) {
    return this.prisma.professional.create({
      data: createProfessionalDto,
    });
  }

  async findAll(subscriber_id: number) {
    return this.prisma.professional.findMany({
      where: { subscriber_id, deleted_at: null },
      include: {
        cares: true,
        audit_logs: true,
        regulations_created: true,
        regulations_analyzed: true,
        regulations_printed: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
      include: {
        cares: true,
        audit_logs: true,
        regulations_created: true,
        regulations_analyzed: true,
        regulations_printed: true,
      },
    });

    if (!professional) throw new NotFoundException(`Professional #${id} not found`);
    return professional;
  }

  async update(id: number, updateProfessionalDto: UpdateProfessionalDto) {
    await this.findOne(id);
    return this.prisma.professional.update({
      where: { id },
      data: updateProfessionalDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.professional.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
