import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientService {
  constructor(private prisma: PrismaService) {}

  async create(createPatientDto: CreatePatientDto) {
    return this.prisma.patient.create({
      data: createPatientDto,
    });
  }

  async findAll(subscriber_id: number) {
    return this.prisma.patient.findMany({
      where: { subscriber_id, deleted_at: null },
      include: { regulations: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async search(subscriber_id: number, term: string) {
  return this.prisma.patient.findMany({
    where: {
      subscriber_id,
      deleted_at: null,
      OR: [
        { full_name: { contains: term } },
        { cpf: { contains: term} },
      ],
    },
    orderBy: { full_name: 'asc' },
  });
}

  async findOne(id: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: { regulations: true },
    });

    if (!patient) throw new NotFoundException(`Patient #${id} not found`);
    return patient;
  }

  async update(id: number, updatePatientDto: UpdatePatientDto) {
    await this.findOne(id);
    return this.prisma.patient.update({
      where: { id },
      data: updatePatientDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.patient.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
