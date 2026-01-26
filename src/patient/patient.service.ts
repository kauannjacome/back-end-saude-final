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

  async search(
    subscriber_id: number,
    term?: string,
    page: number = 1,
    limit: number = 10
  ) {
    // Resilience: Ensure defaults even if DTO fails or direct call is made
    const safePage = page && page > 0 ? page : 1;
    const safeLimit = limit && limit > 0 ? limit : 10;
    const skip = (safePage - 1) * safeLimit;

    const where: Prisma.patientWhereInput = {
      subscriber_id,
      deleted_at: null,
    };

    if (term) {
      where.OR = [
        {
          name_normalized: {
            contains: term,
            mode: 'insensitive',
          }
        },
        {
          name: {
            contains: term,
            mode: 'insensitive',
          },
        },
        {
          cpf: {
            contains: term,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        take: safeLimit,
        skip: skip,
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
        },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
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
    const patient = await this.prisma.patient.findUnique({ where: { id, subscriber_id } });
    if (!patient || patient.deleted_at) {
      throw new NotFoundException(`Patient #${id} not found`);
    }

    return this.prisma.patient.update({
      where: { id, subscriber_id },
      data: { deleted_at: new Date() },
    });
  }

  async restore(id: number, subscriber_id: number) {
    const patient = await this.prisma.patient.findUnique({ where: { id, subscriber_id } });
    if (!patient) {
      throw new NotFoundException(`Patient #${id} not found`);
    }
    if (!patient.deleted_at) {
      throw new BadRequestException(`Patient #${id} is not deleted`);
    }

    return this.prisma.patient.update({
      where: { id, subscriber_id },
      data: { deleted_at: null },
    });
  }

  async hardDelete(id: number, subscriber_id: number) {
    const patient = await this.prisma.patient.findUnique({ where: { id, subscriber_id } });
    if (!patient) {
      throw new NotFoundException(`Patient #${id} not found`);
    }

    // 🔥 Manual Cascade: Delete related regulations
    await this.prisma.regulation.deleteMany({
      where: {
        OR: [
          { patient_id: id },
          { responsible_id: id }
        ],
        subscriber_id
      }
    });

    return this.prisma.patient.delete({
      where: { id, subscriber_id },
    });
  }

  async findAllDeleted(subscriber_id: number) {
    return this.prisma.patient.findMany({
      where: { subscriber_id, deleted_at: { not: null } },
      orderBy: { deleted_at: 'desc' },
      select: {
        id: true,
        name: true,
        cpf: true,
        birth_date: true,
        deleted_at: true,
        email: true,
      },
    });
  }
}
