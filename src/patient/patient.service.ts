import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { normalizeText } from 'src/common/utils/normalize-text';

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createPatientDto: CreatePatientDto) {
    const normalizedName = normalizeText(createPatientDto.full_name);
    const birthDate = new Date(createPatientDto.birth_date);
    const acceptedTermsAt = createPatientDto.accepted_terms_at
      ? new Date(createPatientDto.accepted_terms_at)
      : null;

    return this.prisma.patient.create({
      data: {
        ...createPatientDto,
        name_normalized: normalizedName,
        birth_date: birthDate,
        accepted_terms_at: acceptedTermsAt,
      },
    });
  }


  async findAll(subscriber_id: number) {
    return this.prisma.patient.findMany({
      where: {
        subscriber_id,
        deleted_at: null,
      },
      include: {
        regulations: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async search(subscriber_id: number, term?: string) {
    const searchTerm = term?.trim();
    const whereClause: {
      subscriber_id: number;
      deleted_at: null;
      OR?: Array<{
        name_normalized?: { contains: string; mode: 'insensitive' };
        full_name?: { contains: string; mode: 'insensitive' };
        cpf?: { contains: string; mode: 'insensitive' };
      }>;
    } = {
      subscriber_id,
      deleted_at: null,
    };

    if (searchTerm) {
      whereClause.OR = [
        {
          name_normalized: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          full_name: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          cpf: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
      ];
    }

    return this.prisma.patient.findMany({
      where: whereClause,
      take: 10,
      skip: 0,
      orderBy: {
        full_name: 'asc',
      },
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
        updated_at: true,
      },
    });
  }

  async findOne(id: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: { regulations: true },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    return patient;
  }

  async update(id: number, updatePatientDto: UpdatePatientDto) {
    await this.findOne(id);

    const updateData: {
      name_normalized?: string | null;
      birth_date?: Date;
      accepted_terms_at?: Date | null;
    } & Partial<UpdatePatientDto> = {
      ...updatePatientDto,
    };

    if (updatePatientDto.full_name) {
      updateData.name_normalized = normalizeText(updatePatientDto.full_name);
    }

    if (updatePatientDto.birth_date) {
      updateData.birth_date = new Date(updatePatientDto.birth_date);
    }

    if (updatePatientDto.accepted_terms_at !== undefined) {
      updateData.accepted_terms_at = updatePatientDto.accepted_terms_at
        ? new Date(updatePatientDto.accepted_terms_at)
        : null;
    }

    return this.prisma.patient.update({
      where: { id },
      data: updateData,
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
