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
          name: createPatientDto.name,
          socialName: createPatientDto.social_name,
          cpf: createPatientDto.cpf,
          cns: createPatientDto.cns,
          gender: createPatientDto.gender,
          race: createPatientDto.race,
          sex: createPatientDto.sex as any, // Cast if needed or validate enum
          birthDate: new Date(createPatientDto.birth_date),
          deathDate: createPatientDto.death_date ? new Date(createPatientDto.death_date) : null,
          motherName: createPatientDto.mother_name,
          fatherName: createPatientDto.father_name,
          phone: createPatientDto.phone,
          email: createPatientDto.email,
          postalCode: createPatientDto.postal_code,
          state: createPatientDto.state,
          city: createPatientDto.city,
          address: createPatientDto.address,
          number: createPatientDto.number,
          complement: createPatientDto.complement,
          neighborhood: createPatientDto.neighborhood,
          nationality: createPatientDto.nationality,
          naturalness: createPatientDto.naturalness,
          maritalStatus: createPatientDto.marital_status,
          bloodType: createPatientDto.blood_type,
          passwordHash: createPatientDto.password_hash,
          isPasswordTemp: createPatientDto.is_password_temp,
          numberTry: createPatientDto.number_try,
          isBlocked: createPatientDto.is_blocked,
          acceptedTerms: createPatientDto.accepted_terms,
          acceptedTermsAt: createPatientDto.accepted_terms_at
            ? new Date(createPatientDto.accepted_terms_at)
            : null,
          acceptedTermsVersion: createPatientDto.accepted_terms_version,
          subscriberId: subscriber_id,
          nameNormalized: normalizeText(createPatientDto.name),
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
      where: { subscriberId: subscriber_id, deletedAt: null },
      include: { regulations: true },
      orderBy: { createdAt: 'desc' },
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

    const where: Prisma.PatientWhereInput = {
      subscriberId: subscriber_id,
      deletedAt: null,
    };

    if (term) {
      where.OR = [
        {
          nameNormalized: {
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
          subscriberId: true,
          cpf: true,
          cns: true,
          name: true,
          socialName: true,
          gender: true,
          race: true,
          sex: true,
          birthDate: true,
          deathDate: true,
          motherName: true,
          fatherName: true,
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
      where: { id, subscriberId: subscriber_id },
      include: { regulations: true },
    });

    if (!patient) throw new NotFoundException(`Patient #${id} not found`);
    return patient;
  }

  async update(id: number, updatePatientDto: UpdatePatientDto, subscriber_id: number) {
    const patient = await this.findOne(id, subscriber_id);
    const { subscriber_id: _subscriberId, ...data } = updatePatientDto;

    try {
      return this.prisma.patient.update({
        where: { id, subscriberId: subscriber_id },
        data: {
          name: data.name,
          socialName: data.social_name,
          cpf: data.cpf,
          cns: data.cns,
          gender: data.gender,
          race: data.race,
          sex: data.sex as any,
          birthDate: data.birth_date ? new Date(data.birth_date) : undefined,
          deathDate: data.death_date ? new Date(data.death_date) : undefined,
          motherName: data.mother_name,
          fatherName: data.father_name,
          phone: data.phone,
          email: data.email,
          postalCode: data.postal_code,
          state: data.state,
          city: data.city,
          address: data.address,
          number: data.number,
          complement: data.complement,
          neighborhood: data.neighborhood,
          nationality: data.nationality,
          naturalness: data.naturalness,
          maritalStatus: data.marital_status,
          bloodType: data.blood_type,
          passwordHash: data.password_hash,
          isPasswordTemp: data.is_password_temp,
          numberTry: data.number_try,
          isBlocked: data.is_blocked,
          acceptedTerms: data.accepted_terms,
          acceptedTermsAt: data.accepted_terms_at ? new Date(data.accepted_terms_at) : undefined,
          acceptedTermsVersion: data.accepted_terms_version,
          ...(data.name && {
            nameNormalized: normalizeText(data.name),
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
    const patient = await this.prisma.patient.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!patient || patient.deletedAt) {
      throw new NotFoundException(`Patient #${id} not found`);
    }

    return this.prisma.patient.update({
      where: { id, subscriberId: subscriber_id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: number, subscriber_id: number) {
    const patient = await this.prisma.patient.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!patient) {
      throw new NotFoundException(`Patient #${id} not found`);
    }
    if (!patient.deletedAt) {
      throw new BadRequestException(`Patient #${id} is not deleted`);
    }

    return this.prisma.patient.update({
      where: { id, subscriberId: subscriber_id },
      data: { deletedAt: null },
    });
  }

  async hardDelete(id: number, subscriber_id: number) {
    const patient = await this.prisma.patient.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!patient) {
      throw new NotFoundException(`Patient #${id} not found`);
    }

    // 🔥 Manual Cascade: Delete related regulations
    await this.prisma.regulation.deleteMany({
      where: {
        OR: [
          { patientId: id },
          { responsibleId: id }
        ],
        subscriberId: subscriber_id
      }
    });

    return this.prisma.patient.delete({
      where: { id, subscriberId: subscriber_id },
    });
  }

  async findAllDeleted(subscriber_id: number) {
    return this.prisma.patient.findMany({
      where: { subscriberId: subscriber_id, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      select: {
        id: true,
        name: true,
        cpf: true,
        birthDate: true,
        deletedAt: true,
        email: true,
      },
    });
  }
}
