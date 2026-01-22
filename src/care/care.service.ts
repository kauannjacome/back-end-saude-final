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
    console.log(createCareDto)
    const {
      priority: _priority,
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

    const {
      priority: _priority,
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

    // Para excluir definitivamente:
    // return this.prisma.care.delete({ where: { id } });
  }
}
