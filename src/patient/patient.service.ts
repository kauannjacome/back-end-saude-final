import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPaginationDto } from './dto/search-pagination-dto';
import { normalizeText } from 'src/common/utils/normalize-text';
import { Prisma } from '@prisma/client';
@Injectable()
export class PatientService {
  constructor(private prisma: PrismaService) { }

  async create(createPatientDto: CreatePatientDto, subscriber_id: number) {
    try {
      return this.prisma.patient.create({
        data: {
          ...createPatientDto,
          name_normalized: normalizeText(createPatientDto.name),
          subscriber_id: subscriber_id,
          birth_date: new Date(createPatientDto.birth_date),
          accepted_terms_at: createPatientDto.accepted_terms_at
            ? new Date(createPatientDto.accepted_terms_at)
            : null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('CPF ja cadastrado para este assinante.');
      }
      throw error;
    }
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
            name_normalized: {
              contains: term,
              mode: 'insensitive',
            }
          },
          {
            name: {
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
      orderBy: { name: 'asc' },
      select: {
        id: true,
        uuid: true,
        subscriber_id: true,
        cpf: true,
        cns: true,
        name: true,
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

  async findOne(id: number, subscriber_id: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { id, subscriber_id },
      include: { regulations: true },
    });

    if (!patient) throw new NotFoundException(`Patient #${id} not found`);
    return patient;
  }

  async update(id: number, updatePatientDto: UpdatePatientDto, subscriber_id: number) {
    const patient = await this.findOne(id, subscriber_id);
    const { subscriber_id: _subscriberId, ...data } = updatePatientDto;

    if (data.cpf && data.cpf !== patient.cpf) {
      const existing = await this.prisma.patient.findFirst({
        where: {
          subscriber_id,
          cpf: data.cpf,
          NOT: { id },
        },
        select: { id: true },
      });
      if (existing) {
        throw new BadRequestException('CPF ja cadastrado para este assinante.');
      }
    }

    try {
      return this.prisma.patient.update({
        where: { id, subscriber_id },
        data: {
          ...data,
          ...(data.name && {
            name_normalized: normalizeText(data.name),
          }),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('CPF ja cadastrado para este assinante.');
      }
      throw error;
    }
  }

  async remove(id: number, subscriber_id: number) {
    await this.findOne(id, subscriber_id);
    return this.prisma.patient.update({
      where: { id, subscriber_id },
      data: { deleted_at: new Date() },
    });
  }
}
