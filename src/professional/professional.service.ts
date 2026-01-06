import {
  HttpException,
  Injectable,
  NotFoundException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { normalizeText } from '../common/utils/normalize-text';
import { HashingServiceProtocol } from '../auth/hash/hashing.service';

@Injectable()
export class ProfessionalService {
  private readonly logger = new Logger(ProfessionalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol,
  ) {}

  // ✅ CRIAR PROFISSIONAL (alinhado ao CreateProfessionalDto)
  async create(createProfessionalDto: CreateProfessionalDto) {
    const passwordHash = await this.hashingService.hash(createProfessionalDto.password_hash)

    return this.prisma.professional.create({
      data: {
        subscriber_id: createProfessionalDto.subscriber_id,
        cpf: createProfessionalDto.cpf,

        name: createProfessionalDto.name,
        name_normalized: createProfessionalDto.name
          ? normalizeText(createProfessionalDto.name)
          : null,

        cargo: createProfessionalDto.cargo,
        sex: createProfessionalDto.sex,

        birth_date: createProfessionalDto.birth_date
          ? new Date(createProfessionalDto.birth_date)
          : null,

        phone_number: createProfessionalDto.phone_number,
        email: createProfessionalDto.email,

        role: createProfessionalDto.role,
        password_hash: passwordHash,

        is_password_temp: false,
        number_try: 0,
        is_blocked: false,

        accepted_terms: createProfessionalDto.accepted_terms,
        accepted_terms_at: createProfessionalDto.accepted_terms_at
          ? new Date(createProfessionalDto.accepted_terms_at)
          : null,

        accepted_terms_version: createProfessionalDto.accepted_terms_version,
      },
    });
  }


  async searchSimple(subscriber_id: number, term?: string) {
    const where: Prisma.professionalWhereInput = {
      subscriber_id,
      deleted_at: null,
      OR: [
        { name: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { name_normalized: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { cpf: { contains: term, mode: Prisma.QueryMode.insensitive } },
      ],
    };

    return this.prisma.professional.findMany({
      where,
      take: 10,
      skip: 0,
      orderBy: { name: 'asc' },

      select: {
        id: true,
        name: true,
        cargo: true
      },
    });
  }

  async search(subscriber_id: number, term?: string) {
    try {
      const searchTerm = term?.trim();
      const where: Prisma.professionalWhereInput = {
        subscriber_id,
        deleted_at: null,
      };

      if (searchTerm) {
        where.OR = [
          { name: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
          {
            name_normalized: {
              contains: searchTerm,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          { cpf: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
          {
            email: { contains: searchTerm, mode: Prisma.QueryMode.insensitive },
          },
          {
            cargo: { contains: searchTerm, mode: Prisma.QueryMode.insensitive },
          },
        ];
      }

      return await this.prisma.professional.findMany({
        where,
        take: 10,
        skip: 0,
        orderBy: { name: 'asc' },
        include: {
          cares: true,
          audit_logs: true,
          regulations_created: true,
          regulations_analyzed: true,
          regulations_printed: true,
        },
      });
    } catch (error) {
      this.logger.error('Error searching professionals', error);
      throw new HttpException(
        { message: 'Erro ao buscar profissionais', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ LISTAR TODOS
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

  // ✅ BUSCAR POR ID
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

// ✅ ATUALIZAR
async update(id: number, updateProfessionalDto: UpdateProfessionalDto) {
  try {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
    });

    if (!professional) {
      throw new HttpException(
        'Profissional não encontrado!',
        HttpStatus.BAD_REQUEST,
      );
    }

    const dataProfessional: any = {
      subscriber_id: updateProfessionalDto.subscriber_id ?? professional.subscriber_id,
      cpf: updateProfessionalDto.cpf ?? professional.cpf,

      name: updateProfessionalDto.name ?? professional.name,
      name_normalized: updateProfessionalDto.name
        ? normalizeText(updateProfessionalDto.name)
        : professional.name_normalized,

      cargo: updateProfessionalDto.cargo ?? professional.cargo,
      sex: updateProfessionalDto.sex ?? professional.sex,

      birth_date: updateProfessionalDto.birth_date
        ? new Date(updateProfessionalDto.birth_date)
        : professional.birth_date,

      phone_number: updateProfessionalDto.phone_number ?? professional.phone_number,
      email: updateProfessionalDto.email ?? professional.email,

      role: updateProfessionalDto.role ?? professional.role,

      accepted_terms:
        updateProfessionalDto.accepted_terms ?? professional.accepted_terms,

      accepted_terms_at: updateProfessionalDto.accepted_terms_at
        ? new Date(updateProfessionalDto.accepted_terms_at)
        : professional.accepted_terms_at,

      accepted_terms_version:
        updateProfessionalDto.accepted_terms_version ??
        professional.accepted_terms_version,
    };

    // 🔐 Atualiza senha apenas se enviada
    if (updateProfessionalDto.password_hash) {
      dataProfessional.password_hash =
        await this.hashingService.hash(updateProfessionalDto.password_hash);

      dataProfessional.is_password_temp = false;
      dataProfessional.number_try = 0;
      dataProfessional.is_blocked = false;
    }

    return await this.prisma.professional.update({
      where: { id },
      data: dataProfessional,
      select: {
        id: true,
        uuid: true,
        name: true,
        email: true,
        role: true,
        updated_at: true,
      },
    });
  } catch (err) {
    console.error(err);
    throw new HttpException(
      'Falha ao atualizar profissional!',
      HttpStatus.BAD_REQUEST,
    );
  }
}

  // ✅ REMOVER (soft delete)
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.professional.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
