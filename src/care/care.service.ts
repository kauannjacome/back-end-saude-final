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
      where: { id: careId, subscriberId: subscriber_id, deletedAt: null },
      select: { id: true, minDeadlineDays: true },
    });

    if (!care) {
      throw new NotFoundException(`Care #${careId} nao encontrado.`);
    }

    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, subscriberId: subscriber_id, deletedAt: null },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException(`Paciente #${patientId} nao encontrado.`);
    }

    const minDeadlineDays = care.minDeadlineDays ?? 0;
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
        subscriberId: subscriber_id,
        patientId: patientId,
        deletedAt: null,
        status: { in: ['IN_PROGRESS', 'APPROVED'] },
        cares: { some: { careId: careId } },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        requestDate: true,
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

    const lastDate = lastRegulation.requestDate ?? lastRegulation.createdAt;
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
          name: data.name,
          acronym: data.acronym,
          description: data.description,
          status: data.status,
          priority: data.priority,
          unitMeasure: data.unit_measure,
          typeDeclaration: data.type_declaration,
          value: data.value,
          amount: data.amount,
          minDeadlineDays: data.min_deadline_days,
          groupId: data.group_id,
          professionalId: data.professional_id,
          supplierId: data.supplier_id,
          resourceOrigin: resource_origin ?? legacyResource,
          subscriberId: subscriber_id,
          nameNormalized: normalizeText(data.name),
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
      where: { subscriberId: subscriber_id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        acronym: true,
        description: true,
        unitMeasure: true,
        minDeadlineDays: true,
      },
    });
  }


  async search(subscriber_id: number, term: string, page: number = 1, limit: number = 10) {
    const safePage = page && page > 0 ? page : 1;
    const safeLimit = limit && limit > 0 ? limit : 10;
    const skip = (safePage - 1) * safeLimit;

    const where: Prisma.CareWhereInput = {
      subscriberId: subscriber_id,
      deletedAt: null,
    };

    if (term) {
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { nameNormalized: { contains: term, mode: 'insensitive' } },
        { acronym: { contains: term, mode: 'insensitive' } }
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.care.findMany({
        where,
        take: safeLimit,
        skip: skip,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          nameNormalized: false,
          acronym: true,
          description: true,
          unitMeasure: true,
          status: true,
        },
      }),
      this.prisma.care.count({ where }),
    ]);

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * Retorna um único cuidado pelo ID
   */
  async findOne(id: number, subscriber_id: number) {
    const care = await this.prisma.care.findUnique({
      where: { id, subscriberId: subscriber_id },
      include: {
        subscriber: { select: { name: true } },
        group: { select: { name: true } },
        professional: { select: { name: true } },
      },
    });

    if (!care || care.deletedAt) {
      throw new NotFoundException(`Care #${id} não encontrado.`);
    }

    return care;
  }

  /**
   * Atualiza um cuidado existente
   */
  async update(id: number, updateCareDto: UpdateCareDto, subscriber_id: number) {
    const care = await this.prisma.care.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!care || care.deletedAt) {
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
        name: data.name,
        acronym: data.acronym,
        description: data.description,
        status: data.status,
        priority: data.priority,
        unitMeasure: data.unit_measure,
        typeDeclaration: data.type_declaration,
        value: data.value,
        amount: data.amount,
        minDeadlineDays: data.min_deadline_days,
        groupId: data.group_id,
        professionalId: data.professional_id,
        supplierId: data.supplier_id,
        ...(resolvedResourceOrigin && {
          resourceOrigin: resolvedResourceOrigin,
        }),
        ...(data.name && {
          nameNormalized: normalizeText(data.name),
        }),
      },
    });
  }

  /**
   * Realiza soft delete de um cuidado
   */
  async remove(id: number, subscriber_id: number) {
    const care = await this.prisma.care.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!care || care.deletedAt) {
      throw new NotFoundException(`Care #${id} não encontrado.`);
    }

    return this.prisma.care.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Restaura um cuidado deletado (apenas admin_manager)
   */
  async restore(id: number, subscriber_id: number) {
    const care = await this.prisma.care.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!care) {
      throw new NotFoundException(`Care #${id} não encontrado.`);
    }
    if (!care.deletedAt) {
      throw new BadRequestException(`Care #${id} não está deletado.`);
    }

    return this.prisma.care.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  /**
   * Remove permanentemente um cuidado (apenas admin_manager)
   */
  async hardDelete(id: number, subscriber_id: number) {
    const care = await this.prisma.care.findUnique({ where: { id, subscriberId: subscriber_id } });
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
      where: { subscriberId: subscriber_id, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      select: {
        id: true,
        name: true,
        acronym: true,
        description: true,
        unitMeasure: true,
        minDeadlineDays: true,
        deletedAt: true,
        priority: true,
        status: true,
      },
    });
  }


}
