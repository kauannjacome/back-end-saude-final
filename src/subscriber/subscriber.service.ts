import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import { CreateSubscriberWithAdminDto } from './dto/create-subscriber-with-admin.dto';
import { SearchSubscriberDto } from './dto/search-subscriber.dto';
import { HashingServiceProtocol } from '../auth/hash/hashing.service';

@Injectable()
export class SubscriberService {
  constructor(
    private prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol
  ) { }

  async create(createSubscriberDto: CreateSubscriberDto) {
    return this.prisma.subscriber.create({
      data: createSubscriberDto,
    });
  }

  async createWithAdmin(dto: CreateSubscriberWithAdminDto) {
    const { subscriber, admin } = dto;

    // 1. Verificar se já existe professional com esse email ou cpf (validação prévia para evitar falha na transação)
    const existingAdmin = await this.prisma.professional.findFirst({
      where: {
        OR: [
          { email: admin.email },
          { cpf: admin.cpf }
        ]
      }
    });

    if (existingAdmin) {
      throw new BadRequestException('Já existe um usuário cadastrado com este E-mail ou CPF.');
    }

    const existingSubscriber = await this.prisma.subscriber.findUnique({
      where: { cnpj: subscriber.cnpj }
    });

    if (existingSubscriber) {
      throw new BadRequestException('Já existe um assinante com este CNPJ.');
    }

    // 2. Transação: Criar Subscriber + Professional (Admin)
    return this.prisma.$transaction(async (tx) => {
      // a) Criar Assinante
      const newSubscriber = await tx.subscriber.create({
        data: subscriber
      });

      // b) Hash da senha
      const passwordHash = await this.hashingService.hash(admin.password);

      // c) Criar Admin
      const newAdmin = await tx.professional.create({
        data: {
          name: admin.name,
          cpf: admin.cpf,
          email: admin.email,
          password_hash: passwordHash,
          role: 'admin_manager', // Papel de Admin Local
          subscriber_id: newSubscriber.id,
          // Outros campos obrigatórios ou defaults
          sex: 'nao_informado', // Default safe
        }
      });

      return {
        subscriber: newSubscriber,
        admin: {
          id: newAdmin.id,
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role
        }
      };
    });
  }

  async findAll(filters?: SearchSubscriberDto) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { deleted_at: null };

    if (filters?.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }
    if (filters?.city) {
      where.municipality_name = { contains: filters.city, mode: 'insensitive' };
    }
    if (filters?.state) {
      where.state_acronym = { contains: filters.state, mode: 'insensitive' };
    }
    if (filters?.payment !== undefined) {
      where.payment = filters.payment;
    }
    if (filters?.is_blocked !== undefined) {
      where.is_blocked = filters.is_blocked;
    }

    const [total, data] = await Promise.all([
      this.prisma.subscriber.count({ where }),
      this.prisma.subscriber.findMany({
        where,
        take: Number(limit),
        skip: Number(skip),
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          uuid: true,
          name: true,
          municipality_name: true,
          cnpj: true,
          payment: true,
          is_blocked: true,
          created_at: true,
          _count: {
            select: {
              patients: true,
              regulations: true
            }
          }
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        last_page: Math.ceil(total / Number(limit)),
      },
    };
  }

  // Mantendo o search simples para retrocompatibilidade ou uso rápido se necessário, mas o findAll agora cobre tudo
  async search(term: string) {
    // ... existing search logic if you want to keep it, but findAll is better
    return this.prisma.subscriber.findMany({
      where: {
        deleted_at: null,
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { municipality_name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
          { cnpj: { contains: term, mode: 'insensitive' } },
        ],
      },
      take: 20, // increased defaults
      orderBy: { name: 'asc' },
    });
  }

  async getStats() {
    const [
      total,
      active,
      blocked,
      pending,
      totalRegulations,
      totalPatients
    ] = await Promise.all([
      this.prisma.subscriber.count({ where: { deleted_at: null } }),
      this.prisma.subscriber.count({ where: { is_blocked: false, payment: true, deleted_at: null } }),
      this.prisma.subscriber.count({ where: { is_blocked: true, deleted_at: null } }),
      this.prisma.subscriber.count({ where: { payment: false, is_blocked: false, deleted_at: null } }),
      this.prisma.regulation.count(),
      this.prisma.patient.count()
    ]);

    return {
      totalSubscribers: total,
      activeSubscribers: active,
      blockedSubscribers: blocked,
      pendingSubscribers: pending,
      totalRegulations,
      totalPatients
    };
  }

  async findOne(id: number) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { id },
    });

    if (!subscriber) {
      throw new NotFoundException(`Subscriber #${id} não encontrado.`);
    }

    return subscriber;
  }

  async update(id: number, updateSubscriberDto: UpdateSubscriberDto) {
    const subscriber = await this.prisma.subscriber.findUnique({ where: { id } });
    if (!subscriber) {
      throw new NotFoundException(`Subscriber #${id} não encontrado.`);
    }

    return this.prisma.subscriber.update({
      where: { id },
      data: updateSubscriberDto,
    });
  }

  async remove(id: number) {
    const subscriber = await this.prisma.subscriber.findUnique({ where: { id } });
    if (!subscriber) {
      throw new NotFoundException(`Subscriber #${id} não encontrado.`);
    }

    // Soft delete (recomendado)
    return this.prisma.subscriber.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    // Caso queira deletar de verdade:
    // return this.prisma.subscriber.delete({ where: { id } });
  }
}
