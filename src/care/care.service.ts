import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCareDto } from './dto/create-care.dto';
import { UpdateCareDto } from './dto/update-care.dto';
import { Prisma } from '@prisma/client';
import { normalizeText } from '../common/utils/normalize-text';

@Injectable()
export class CareService {
  constructor(private prisma: PrismaService) { }

  /**
   * Cria um novo registro de cuidado (care)
   */
  async create(createCareDto: CreateCareDto, subscriber_id: number) {
    console.log(createCareDto)
    try {
      return await this.prisma.care.create({
        data: {
          ...createCareDto,
          subscriber_id: subscriber_id,
          name_normalized: normalizeText(createCareDto.name),
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException('Chave estrangeira inválida (ex: subscriber_id, group_id, etc.)');
      }
      throw error;
    }
  }

  /**
   * Retorna todos os cuidados ativos (soft delete aplicado)
   */
  async findAll(subscriber_id: number) {
    return this.prisma.care.findMany({
      where: { subscriber_id, deleted_at: null },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        acronym: true,
      },
    });
  }


  async search(subscriber_id: number, term: string) {
    console.log('📥 subscriber_id:', subscriber_id);
    console.log('📥 term:', term);
    return this.prisma.care.findMany({
      where: {
        subscriber_id,
        deleted_at: null,
        OR: [
          { name: { contains: term, mode: 'insensitive' } },   // ✅ ignora maiúsculas/minúsculas
          { name_normalized: { contains: term, mode: 'insensitive' } },
          { acronym: { contains: term, mode: 'insensitive' } } // ✅ idem
        ],
      },
      take: 10,
      skip: 0,
      orderBy: { name: 'asc' },
      include: {
        group: { select: { name: true } },
        professional: { select: { name: true } },
      },
    });
  }

  /**
   * Retorna um único cuidado pelo ID
   */
  async findOne(id: number, subscriber_id: number) {
    const care = await this.prisma.care.findUnique({
      where: { id, subscriber_id },
      include: {
        subscriber: { select: { name: true } },
        group: { select: { name: true } },
        professional: { select: { name: true } },
      },
    });

    if (!care || care.deleted_at) {
      throw new NotFoundException(`Care #${id} não encontrado.`);
    }

    return care;
  }

  /**
   * Atualiza um cuidado existente
   */
  async update(id: number, updateCareDto: UpdateCareDto, subscriber_id: number) {
    const care = await this.prisma.care.findUnique({ where: { id, subscriber_id } });
    if (!care || care.deleted_at) {
      throw new NotFoundException(`Care #${id} não encontrado.`);
    }

    return this.prisma.care.update({
      where: { id },
      data: {
        ...updateCareDto,
        ...(updateCareDto.name && {
          name_normalized: normalizeText(updateCareDto.name),
        }),
      },
    });
  }

  /**
   * Realiza soft delete de um cuidado
   */
  async remove(id: number, subscriber_id: number) {
    const care = await this.prisma.care.findUnique({ where: { id, subscriber_id } });
    if (!care || care.deleted_at) {
      throw new NotFoundException(`Care #${id} não encontrado.`);
    }

    return this.prisma.care.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    // Para excluir definitivamente:
    // return this.prisma.care.delete({ where: { id } });
  }
}
