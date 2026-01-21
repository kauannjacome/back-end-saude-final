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
    console.log('📥 [ProfessionalService.search] subscriber_id:', subscriber_id);
    console.log('📥 [ProfessionalService.search] term:', term);

    try {


      const where: Prisma.professionalWhereInput = {
        subscriber_id,
        deleted_at: null,
        OR: [
          { name: { contains: term, mode: Prisma.QueryMode.insensitive } },
          { name_normalized: { contains: term, mode: Prisma.QueryMode.insensitive } },
          { cpf: { contains: term, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: term, mode: Prisma.QueryMode.insensitive } },
          { cargo: { contains: term, mode: Prisma.QueryMode.insensitive } },
        ],
      };

      console.log('🔍 Prisma where:', JSON.stringify(where, null, 2));

      const results = await this.prisma.professional.findMany({
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

      console.log(`✅ ${results.length} profissionais encontrados`);
      return results;
    } catch (error) {
      console.error('❌ Erro detalhado no ProfessionalService.search:');
      console.error('Mensagem:', error.message);
      console.error('Stack:', error.stack);
      console.error('Detalhes Prisma:', error);
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
        role: 'admin_manager',
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
        password_hash: passwordHash,
      },
    });

    return { message: 'Senha do administrador redefinida com sucesso.' };
  }

  // ✅ LISTAR TODOS (retornando apenas id, name e cargo)
  async findAll(subscriber_id: number) {
    return this.prisma.professional.findMany({
      where: {
        subscriber_id,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        cargo: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }


  // ✅ BUSCAR POR ID
  async findOne(id: number, subscriber_id: number) {
    const professional = await this.prisma.professional.findUnique({
      where: { id, subscriber_id },
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
  async update(id: number, updateProfessionalDto: UpdateProfessionalDto, subscriber_id: number) {
    try {
      const professional = await this.prisma.professional.findUnique({
        where: { id, subscriber_id },
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
        where: { id, subscriber_id },
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
  async remove(id: number, subscriber_id: number) {
    await this.findOne(id, subscriber_id);
    return this.prisma.professional.update({
      where: { id, subscriber_id },
      data: { deleted_at: new Date() },
    });
  }
}
