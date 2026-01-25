import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCareDto } from './dto/create-care.dto';
import { UpdateCareDto } from './dto/update-care.dto';
import { Prisma } from '@prisma/client';
import { normalizeText } from '../common/utils/normalize-text';
import dayjs from 'dayjs';

@Injectable()
export class CareService {
  constructor(private prisma: PrismaService) { }

  async checkMinDeadline(careId: number, patientId: number, subscriber_id: number) {
    if (!Number.isFinite(careId) || !Number.isFinite(patientId)) {
      throw new BadRequestException('care_id e patient_id sao obrigatorios.');
    }

    const care = await this.prisma.care.findFirst({
      where: { id: careId, subscriber_id, deleted_at: null },
      select: { id: true, min_deadline_days: true },
    });

    if (!care) {
      throw new NotFoundException(`Care #${careId} nao encontrado.`);
    }

    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, subscriber_id, deleted_at: null },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException(`Paciente #${patientId} nao encontrado.`);
    }

    const minDeadlineDays = care.min_deadline_days ?? 0;
    if (minDeadlineDays <= 0) {
      return {
        care_id: care.id,
        patient_id: patient.id,
        has_min_deadline: false,
        eligible: true,
        last_regulation: null,
        days_since_last: null,
        days_remaining: null,
        next_allowed_date: null,
      };
    }

    const lastRegulation = await this.prisma.regulation.findFirst({
      where: {
        subscriber_id,
        patient_id: patientId,
        deleted_at: null,
        status: { in: ['in_progress', 'approved'] },
        cares: { some: { care_id: careId } },
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        created_at: true,
        request_date: true,
      },
    });

    if (!lastRegulation) {
      return {
        care_id: care.id,
        patient_id: patient.id,
        has_min_deadline: true,
        min_deadline_days: minDeadlineDays,
        eligible: true,
        last_regulation: null,
        days_since_last: null,
        days_remaining: null,
        next_allowed_date: null,
      };
    }

    const lastDate = lastRegulation.request_date ?? lastRegulation.created_at;
    const today = dayjs().startOf('day');
    const last = dayjs(lastDate).startOf('day');
    const diffDays = today.diff(last, 'day');
    const remaining = minDeadlineDays - diffDays;

    return {
      care_id: care.id,
      patient_id: patient.id,
      has_min_deadline: true,
      min_deadline_days: minDeadlineDays,
      eligible: remaining <= 0,
      last_regulation: {
        id: lastRegulation.id,
        date: lastDate,
      },
      days_since_last: diffDays,
      days_remaining: Math.max(0, remaining),
      next_allowed_date: dayjs(lastDate).add(minDeadlineDays, 'day').toDate(),
    };
  }


  /**
   * Cria um novo registro de cuidado (care)
   */
  async create(createCareDto: CreateCareDto, subscriber_id: number) {
    const {
      resource: legacyResource,
      resource_origin,
      ...data
    } = createCareDto;
    try {
      return await this.prisma.care.create({
        data: {
          ...data,
          resource_origin: resource_origin ?? legacyResource,
          subscriber_id: subscriber_id,
          name_normalized: normalizeText(data.name),
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
        description: true,
        unit_measure: true,
        min_deadline_days: true,
      },
    });
  }


  async search(subscriber_id: number, term: string) {
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
      select: {
        id: true,
        name: true,
        name_normalized: false, // Internal
        acronym: true,
        description: true,
        unit_measure: true,
        status: true,
        // resource_origin: false, // excluded
        // type_declaration: false, // excluded
        // value: false, // excluded
        // amount: false, // excluded
        // min_deadline_days: false, // excluded
        // group_id: false, // excluded
        // professional_id: false, // excluded
        // supplier_id: false, // excluded
        // created_at: false, // excluded
        // updated_at: false, // excluded
        // deleted_at: false, // excluded

        // group: { select: { name: true } }, // excluded relation
        // professional: { select: { name: true } }, // excluded relation
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

    const {
      resource: legacyResource,
      resource_origin,
      ...data
    } = updateCareDto;
    const resolvedResourceOrigin = resource_origin ?? legacyResource;

    return this.prisma.care.update({
      where: { id },
      data: {
        ...data,
        ...(resolvedResourceOrigin && {
          resource_origin: resolvedResourceOrigin,
        }),
        ...(data.name && {
          name_normalized: normalizeText(data.name),
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
  }

  /**
   * Restaura um cuidado deletado (apenas admin_manager)
   */
  async restore(id: number, subscriber_id: number) {
    const care = await this.prisma.care.findUnique({ where: { id, subscriber_id } });
    if (!care) {
      throw new NotFoundException(`Care #${id} não encontrado.`);
    }
    if (!care.deleted_at) {
      throw new BadRequestException(`Care #${id} não está deletado.`);
    }

    return this.prisma.care.update({
      where: { id },
      data: { deleted_at: null },
    });
  }

  /**
   * Remove permanentemente um cuidado (apenas admin_manager)
   */
  async hardDelete(id: number, subscriber_id: number) {
    const care = await this.prisma.care.findUnique({ where: { id, subscriber_id } });
    if (!care) {
      throw new NotFoundException(`Care #${id} não encontrado.`);
    }

    return this.prisma.care.delete({
      where: { id },
    });
  }

  /**
   * Lista apenas cuidados deletados (apenas admin_manager)
   */
  async findAllDeleted(subscriber_id: number) {
    return this.prisma.care.findMany({
      where: { subscriber_id, deleted_at: { not: null } },
      orderBy: { deleted_at: 'desc' },
      select: {
        id: true,
        name: true,
        acronym: true,
        description: true,
        unit_measure: true,
        min_deadline_days: true,
        deleted_at: true,
        priority: true,
        status: true,
      },
    });
  }

  // ==================================================================
  // CARE USAGE RANKING
  // ==================================================================

  /**
   * Retorna os cuidados mais utilizados pelo usuário (ou geral do assinante)
   */
  async findTopUsed(subscriber_id: number, user_id?: number) {
    // Busca ranking específico do usuário
    let ranks = await this.prisma.care_usage_rank.findMany({
      where: {
        subscriber_id,
        user_id: user_id ?? undefined, // se user_id for null/undefined, busca geral?
      },
      orderBy: [
        { usage_count: 'desc' },
        { last_used_at: 'desc' },
      ],
      take: 20,
      include: {
        care: true,
      },
    });

    // Se não tiver ranking suficiente para o usuário, busca o geral (user_id = null)
    if (user_id && ranks.length < 5) {
      const generalRanks = await this.prisma.care_usage_rank.findMany({
        where: {
          subscriber_id,
          user_id: null,
        },
        orderBy: [
          { usage_count: 'desc' },
          { last_used_at: 'desc' },
        ],
        take: 20 - ranks.length,
        include: {
          care: true,
        },
      });

      // Mescla removendo duplicados
      const existingIds = new Set(ranks.map(r => r.care_id));
      for (const r of generalRanks) {
        if (!existingIds.has(r.care_id)) {
          ranks.push(r);
          existingIds.add(r.care_id);
        }
      }
    }

    return ranks.map(r => r.care); // Retorna apenas os objetos care
  }

  /**
   * Registra o uso de um cuidado e atualiza o ranking
   */
  async registerUsage(subscriber_id: number, care_id: number, user_id?: number) {
    // 1. Atualiza/Cria o ranking para o Usuário
    if (user_id) {
      await this.upsertRank(subscriber_id, care_id, user_id);
      await this.pruneRanks(subscriber_id, user_id);
    }

    // 2. Atualiza/Cria o ranking Geral (user_id = null)
    await this.upsertRank(subscriber_id, care_id, null);
    await this.pruneRanks(subscriber_id, null);
  }

  private async upsertRank(subscriber_id: number, care_id: number, user_id: number | null) {
    // Verifica se já existe
    const existing = await this.prisma.care_usage_rank.findFirst({
      where: { subscriber_id, user_id, care_id }
    });

    if (existing) {
      await this.prisma.care_usage_rank.update({
        where: { id: existing.id },
        data: {
          usage_count: { increment: 1 },
          last_used_at: new Date(),
        },
      });
    } else {
      await this.prisma.care_usage_rank.create({
        data: {
          subscriber_id,
          user_id,
          care_id,
          usage_count: 1,
          last_used_at: new Date(),
        },
      });
    }
  }

  private async pruneRanks(subscriber_id: number, user_id: number | null) {
    const count = await this.prisma.care_usage_rank.count({
      where: { subscriber_id, user_id },
    });

    if (count > 20) {
      // Encontra os excedentes (menor usage_count, ou mais antigo)
      const toDelete = await this.prisma.care_usage_rank.findMany({
        where: { subscriber_id, user_id },
        orderBy: [
          { usage_count: 'asc' },
          { last_used_at: 'asc' },
        ],
        take: count - 20,
        select: { id: true },
      });

      if (toDelete.length > 0) {
        await this.prisma.care_usage_rank.deleteMany({
          where: {
            id: { in: toDelete.map(r => r.id) },
          },
        });
      }
    }
  }
}
