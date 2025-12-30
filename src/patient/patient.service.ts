import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPaginationDto } from './dto/search-pagination-dto';
import { normalizeText } from 'src/common/utils/normalize-text';
@Injectable()
export class PatientService {
  constructor(private prisma: PrismaService) { }

  async create(createPatientDto: CreatePatientDto) {
    return this.prisma.patient.create({
      data: {
        ...createPatientDto,
        name_normalized: normalizeText(createPatientDto.full_name),
        subscriber_id: 1,
        birth_date: new Date(createPatientDto.birth_date),
        accepted_terms_at: createPatientDto.accepted_terms_at
          ? new Date(createPatientDto.accepted_terms_at)
          : null,
      },
    });
  }


  async findAll(subscriber_id: number) {
    return this.prisma.patient.findMany({
      where: { subscriber_id, deleted_at: null },
      include: { regulations: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async search(subscriber_id: number, term?: string) {
    console.log('📥 subscriber_id:', subscriber_id);

    return this.prisma.patient.findMany({

      where: {
        subscriber_id,
        deleted_at: null,
        OR: [
          {
            full_name: {
              contains: term,
              mode: 'insensitive', // <-- ignora maiúsculas/minúsculas
            },
          },
          {
            cpf: {
              contains: term,
              mode: 'insensitive', // <-- idem para CPF
            },
          },
        ],
      },
      take: 10,
      skip: 0,
      orderBy: { full_name: 'asc' },
      select: {
        id: true,
        uuid: true,
        subscriber_id: true,
        cpf: true,
        cns: true,
        full_name: true,
        social_name: true,
        gender: true,
        race: true,
        sex: true,
        birth_date: true,
        death_date: true,
        mother_name: true,
        father_name: true,
        phone: true,
        email: true,
        postal_code: true,
        state: true,
        city: true,
        address: true,
        number: true,
        complement: true,
        neighborhood: true,
        nationality: true,
        naturalness: true,
        marital_status: true,
        blood_type: true,
        created_at: true,
        updated_at: true
      },
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
