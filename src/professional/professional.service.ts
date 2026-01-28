import { HttpException, Injectable, NotFoundException, HttpStatus, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client'; // 👈 IMPORTANTE!
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { normalizeText } from '../common/utils/normalize-text';
import { HashingServiceProtocol } from '../auth/hash/hashing.service';
import { ConfigService } from '@nestjs/config';
import { Env } from '../common/env/env';

@Injectable()
export class ProfessionalService {
  constructor(
    private prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol,
    private readonly configService: ConfigService<Env, true>
  ) { }

  // ✅ CRIAR PROFISSIONAL (alinhado ao CreateProfessionalDto)
  async create(createProfessionalDto: CreateProfessionalDto) {
    const passwordHash = await this.hashingService.hash(createProfessionalDto.password_hash)

    return this.prisma.professional.create({
      data: {
        subscriberId: createProfessionalDto.subscriber_id,
        cpf: createProfessionalDto.cpf,

        name: createProfessionalDto.name,
        nameNormalized: createProfessionalDto.name
          ? normalizeText(createProfessionalDto.name)
          : null,

        cargo: createProfessionalDto.cargo,
        sex: createProfessionalDto.sex,

        birthDate: createProfessionalDto.birth_date
          ? new Date(createProfessionalDto.birth_date)
          : null,

        phoneNumber: createProfessionalDto.phone_number,
        email: createProfessionalDto.email,

        role: createProfessionalDto.role || 'TYPIST',

        // Novos Campos
        socialName: createProfessionalDto.social_name,
        gender: createProfessionalDto.gender,
        race: createProfessionalDto.race,
        isDisabled: createProfessionalDto.is_disabled ?? false,
        deathDate: createProfessionalDto.death_date
          ? new Date(createProfessionalDto.death_date)
          : null,

        motherName: createProfessionalDto.mother_name,
        fatherName: createProfessionalDto.father_name,

        postalCode: createProfessionalDto.postal_code,
        state: createProfessionalDto.state,
        city: createProfessionalDto.city,
        address: createProfessionalDto.address,
        number: createProfessionalDto.number,
        complement: createProfessionalDto.complement,
        neighborhood: createProfessionalDto.neighborhood,

        nationality: createProfessionalDto.nationality,
        naturalness: createProfessionalDto.naturalness,
        maritalStatus: createProfessionalDto.marital_status,

        passwordHash: passwordHash,

        isPasswordTemp: false,
        numberTry: 0,
        isBlocked: false,

        acceptedTerms: createProfessionalDto.accepted_terms,
        acceptedTermsAt: createProfessionalDto.accepted_terms_at
          ? new Date(createProfessionalDto.accepted_terms_at)
          : null,

        acceptedTermsVersion: createProfessionalDto.accepted_terms_version,

        employments: {
          create: {
            subscriberId: createProfessionalDto.subscriber_id,
            role: createProfessionalDto.role || 'TYPIST',
            isActive: true,
            isPrimary: true,
          }
        }
      },
    });
  }


  async searchSimple(subscriber_id: number, term?: string) {
    const where: Prisma.ProfessionalWhereInput = {
      subscriberId: subscriber_id,
      deletedAt: null,
      OR: [
        { name: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { nameNormalized: { contains: term, mode: Prisma.QueryMode.insensitive } },
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

  async search(subscriber_id: number, term?: string, page: number = 1, limit: number = 10) {
    try {
      const safePage = page && page > 0 ? page : 1;
      const safeLimit = limit && limit > 0 ? limit : 10;
      const skip = (safePage - 1) * safeLimit;

      const where: Prisma.ProfessionalWhereInput = {
        subscriberId: subscriber_id,
        deletedAt: null,
      };

      if (term) {
        where.OR = [
          { name: { contains: term, mode: Prisma.QueryMode.insensitive } },
          { nameNormalized: { contains: term, mode: Prisma.QueryMode.insensitive } },
          { cpf: { contains: term, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: term, mode: Prisma.QueryMode.insensitive } },
          { cargo: { contains: term, mode: Prisma.QueryMode.insensitive } },
        ];
      }

      const [data, total] = await Promise.all([
        this.prisma.professional.findMany({
          where,
          take: safeLimit,
          skip: skip,
          orderBy: { name: 'asc' },
          select: {
            id: true,
            uuid: true,
            name: true,
            nameNormalized: true,
            email: true,
            cpf: true,
            cargo: true,
            role: true,
            sex: true,
            birthDate: true,
            phoneNumber: true,
            createdAt: true,
            updatedAt: true,
            isBlocked: true,
            acceptedTerms: true,

            // Novos Campos
            socialName: true,
            gender: true,
            race: true,
            isDisabled: true,
            deathDate: true,
            motherName: true,
            fatherName: true,
            postalCode: true,
            state: true,
            city: true,
            address: true,
            number: true,
            complement: true,
            neighborhood: true,
            nationality: true,
            naturalness: true,
            maritalStatus: true,
          },
        }),
        this.prisma.professional.count({ where }),
      ]);

      return {
        data,
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      };
    } catch (error) {
      console.error('❌ Erro no ProfessionalService.search:', error);
      throw new HttpException(
        { message: 'Erro ao buscar profissionais', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async resetAdminPassword(secret: string, email: string, newPassword: string) {
    // 1. Validar Secret
    const envSecret = this.configService.get<string>('ADMIN_RESET_SECRET');
    if (secret !== envSecret) {
      throw new BadRequestException('Chave de segurança inválida.');
    }

    // 2. Buscar Admin
    // Busca por role 'admin_manager' E email fornecido
    const admin = await this.prisma.professional.findFirst({
      where: {
        role: 'ADMIN_MANAGER',
        email: email
      },
    });

    if (!admin) {
      throw new NotFoundException('Administrador não encontrado com este e-mail.');
    }

    // 3. Hash Senha
    const passwordHash = await this.hashingService.hash(newPassword);

    // 4. Update
    await this.prisma.professional.update({
      where: { id: admin.id },
      data: {
        passwordHash: passwordHash,
      },
    });

    return { message: 'Senha do administrador redefinida com sucesso.' };
  }

  // ✅ LISTAR TODOS (retornando apenas id, name e cargo)
  async findAll(subscriber_id: number) {
    return this.prisma.professional.findMany({
      where: {
        subscriberId: subscriber_id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        cargo: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }


  // ✅ BUSCAR POR ID
  async findOne(id: number, subscriber_id: number) {
    const professional = await this.prisma.professional.findUnique({
      where: { id, subscriberId: subscriber_id },
      include: {
        cares: true,
        auditLogs: true,
        regulationsCreated: true,
        regulationsAnalyzed: true,
        regulationsPrinted: true,
        employments: true,
      },
    });

    if (!professional) throw new NotFoundException(`Professional #${id} not found`);
    return professional;
  }

  // ✅ ATUALIZAR
  async update(id: number, updateProfessionalDto: UpdateProfessionalDto, subscriber_id: number) {
    try {
      const professional = await this.prisma.professional.findUnique({
        where: { id, subscriberId: subscriber_id },
      });

      if (!professional) {
        throw new HttpException(
          'Profissional não encontrado!',
          HttpStatus.BAD_REQUEST,
        );
      }

      const dataProfessional: any = {
        subscriberId: updateProfessionalDto.subscriber_id ?? professional.subscriberId,
        cpf: updateProfessionalDto.cpf ?? professional.cpf,

        name: updateProfessionalDto.name ?? professional.name,
        nameNormalized: updateProfessionalDto.name
          ? normalizeText(updateProfessionalDto.name)
          : professional.nameNormalized,

        cargo: updateProfessionalDto.cargo ?? professional.cargo,
        sex: updateProfessionalDto.sex ?? professional.sex,

        birthDate: updateProfessionalDto.birth_date
          ? new Date(updateProfessionalDto.birth_date)
          : professional.birthDate,

        phoneNumber: updateProfessionalDto.phone_number ?? professional.phoneNumber,
        email: updateProfessionalDto.email ?? professional.email,

        role: updateProfessionalDto.role ?? professional.role,

        // Novos Campos
        socialName: updateProfessionalDto.social_name ?? professional.socialName,
        gender: updateProfessionalDto.gender ?? professional.gender,
        race: updateProfessionalDto.race ?? professional.race,
        isDisabled: updateProfessionalDto.is_disabled ?? professional.isDisabled,
        deathDate: updateProfessionalDto.death_date
          ? new Date(updateProfessionalDto.death_date)
          : professional.deathDate,

        motherName: updateProfessionalDto.mother_name ?? professional.motherName,
        fatherName: updateProfessionalDto.father_name ?? professional.fatherName,

        postalCode: updateProfessionalDto.postal_code ?? professional.postalCode,
        state: updateProfessionalDto.state ?? professional.state,
        city: updateProfessionalDto.city ?? professional.city,
        address: updateProfessionalDto.address ?? professional.address,
        number: updateProfessionalDto.number ?? professional.number,
        complement: updateProfessionalDto.complement ?? professional.complement,
        neighborhood: updateProfessionalDto.neighborhood ?? professional.neighborhood,

        nationality: updateProfessionalDto.nationality ?? professional.nationality,
        naturalness: updateProfessionalDto.naturalness ?? professional.naturalness,
        maritalStatus: updateProfessionalDto.marital_status ?? professional.maritalStatus,

        acceptedTerms:
          updateProfessionalDto.accepted_terms ?? professional.acceptedTerms,

        acceptedTermsAt: updateProfessionalDto.accepted_terms_at
          ? new Date(updateProfessionalDto.accepted_terms_at)
          : professional.acceptedTermsAt,

        acceptedTermsVersion:
          updateProfessionalDto.accepted_terms_version ??
          professional.acceptedTermsVersion,
      };

      // 🔐 Atualiza senha apenas se enviada
      if (updateProfessionalDto.password_hash) {
        dataProfessional.passwordHash =
          await this.hashingService.hash(updateProfessionalDto.password_hash);

        dataProfessional.isPasswordTemp = false;
        dataProfessional.numberTry = 0;
        dataProfessional.isBlocked = false;
      }

      return await this.prisma.professional.update({
        where: { id, subscriberId: subscriber_id },
        data: dataProfessional,
        select: {
          id: true,
          uuid: true,
          name: true,
          email: true,
          role: true,
          updatedAt: true,
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
  // ✅ REMOVER (soft delete)
  async remove(id: number, subscriber_id: number) {
    const professional = await this.prisma.professional.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!professional || professional.deletedAt) {
      throw new NotFoundException(`Professional #${id} not found`);
    }

    return this.prisma.professional.update({
      where: { id, subscriberId: subscriber_id },
      data: { deletedAt: new Date() },
    });
  }

  // ✅ RESTAURAR (apenas admin_manager)
  async restore(id: number, subscriber_id: number) {
    const professional = await this.prisma.professional.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!professional) {
      throw new NotFoundException(`Professional #${id} not found`);
    }
    if (!professional.deletedAt) {
      throw new BadRequestException(`Professional #${id} is not deleted`);
    }

    return this.prisma.professional.update({
      where: { id, subscriberId: subscriber_id },
      data: { deletedAt: null },
    });
  }

  // ✅ DELETAR DE VEZ (apenas admin_manager)
  async hardDelete(id: number, subscriber_id: number) {
    const professional = await this.prisma.professional.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!professional) {
      throw new NotFoundException(`Professional #${id} not found`);
    }

    return this.prisma.professional.delete({
      where: { id, subscriberId: subscriber_id },
    });
  }

  // ✅ LISTAR DELETADOS (apenas admin_manager)
  async findAllDeleted(subscriber_id: number) {
    return this.prisma.professional.findMany({
      where: { subscriberId: subscriber_id, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      select: {
        id: true,
        name: true,
        cpf: true,
        email: true,
        deletedAt: true,
        role: true,
        cargo: true,
        birthDate: true,
      },
    });
  }

  // ✅ CRIAR SENHA TEMPORÁRIA (admin_municipal ou admin_manager)
  async setTemporaryPassword(
    professionalId: number,
    temporaryPassword: string,
    subscriber_id: number,
    adminRole: string
  ) {
    // Verificar permissão
    if (adminRole !== 'ADMIN_MANAGER' && adminRole !== 'ADMIN_MUNICIPAL') {
      throw new HttpException(
        'Apenas administradores podem criar senhas temporárias',
        HttpStatus.FORBIDDEN
      );
    }

    // Buscar profissional
    const professional = await this.prisma.professional.findFirst({
      where: {
        id: professionalId,
        subscriberId: subscriber_id,
        deletedAt: null
      }
    });

    if (!professional) {
      throw new NotFoundException(`Profissional #${professionalId} não encontrado`);
    }

    // Apenas typist pode receber senha temporária de admin_municipal
    if (adminRole === 'ADMIN_MUNICIPAL' && professional.role !== 'TYPIST') {
      throw new HttpException(
        'Admin municipal só pode criar senha temporária para digitadores',
        HttpStatus.FORBIDDEN
      );
    }

    // Hash da senha temporária
    const passwordHash = await this.hashingService.hash(temporaryPassword);

    // Atualizar profissional com senha temporária
    await this.prisma.professional.update({
      where: { id: professionalId },
      data: {
        passwordHash: passwordHash,
        isPasswordTemp: true,
        numberTry: 0,
        numberUnlock: 0,
        isBlocked: false
      }
    });

    return {
      message: 'Senha temporária criada com sucesso',
      professional_id: professionalId,
      professional_name: professional.name
    };
  }
}
