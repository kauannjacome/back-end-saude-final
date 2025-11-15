import { HttpException, Injectable, NotFoundException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client'; // 👈 IMPORTANTE!
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';

@Injectable()
export class ProfessionalService {
  constructor(private prisma: PrismaService) { }

  // ✅ CRIAR PROFISSIONAL
  async create(createProfessionalDto: CreateProfessionalDto) {
    return this.prisma.professional.create({
      data: createProfessionalDto,
    });
  }

async searchSimple(subscriber_id: number, term?: string) {
  const where: Prisma.professionalWhereInput = {
    subscriber_id,
    deleted_at: null,
    OR: [
      { name: { contains: term, mode: Prisma.QueryMode.insensitive } },
      { cpf: { contains: term, mode: Prisma.QueryMode.insensitive } },
    ],
  };

  return this.prisma.professional.findMany({
    where,
    orderBy: { name: 'asc' },

    select: {
      id: true,
      name: true,
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
          { cpf: { contains: term, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: term, mode: Prisma.QueryMode.insensitive } },
          { cargo: { contains: term, mode: Prisma.QueryMode.insensitive } },
        ],
      };

      console.log('🔍 Prisma where:', JSON.stringify(where, null, 2));

      const results = await this.prisma.professional.findMany({
        where,
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
    await this.findOne(id);
    return this.prisma.professional.update({
      where: { id },
      data: updateProfessionalDto,
    });
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
