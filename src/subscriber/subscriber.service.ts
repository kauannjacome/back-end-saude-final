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
      data: {
        name: createSubscriberDto.name,
        municipalityName: createSubscriberDto.municipality_name,
        email: createSubscriberDto.email,
        telephone: createSubscriberDto.telephone,
        cnpj: createSubscriberDto.cnpj,
        postalCode: createSubscriberDto.postal_code,
        city: createSubscriberDto.city,
        neighborhood: createSubscriberDto.neighborhood,
        street: createSubscriberDto.street,
        number: createSubscriberDto.number,
        stateName: createSubscriberDto.state_name,
        stateAcronym: createSubscriberDto.state_acronym,
        stateLogo: createSubscriberDto.state_logo,
        municipalLogo: createSubscriberDto.municipal_logo,
        administrationLogo: createSubscriberDto.administration_logo,
        payment: createSubscriberDto.payment ?? true,
        isBlocked: createSubscriberDto.is_blocked ?? false,
      },
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
        data: {
          name: subscriber.name,
          municipalityName: subscriber.municipality_name,
          email: subscriber.email,
          telephone: subscriber.telephone,
          cnpj: subscriber.cnpj,
          postalCode: subscriber.postal_code,
          city: subscriber.city,
          neighborhood: subscriber.neighborhood,
          street: subscriber.street,
          number: subscriber.number,
          stateName: subscriber.state_name,
          stateAcronym: subscriber.state_acronym,
          stateLogo: subscriber.state_logo,
          municipalLogo: subscriber.municipal_logo,
          administrationLogo: subscriber.administration_logo,
          payment: subscriber.payment ?? true,
          isBlocked: subscriber.is_blocked ?? false,
        }
      });

      // b) Hash da senha
      const passwordHash = await this.hashingService.hash(admin.password);

      // c) Criar Admin
      const newAdmin = await tx.professional.create({
        data: {
          name: admin.name,
          cpf: admin.cpf,
          email: admin.email,
          passwordHash: passwordHash,
          role: 'ADMIN_MANAGER', // Papel de Admin Local
          subscriberId: newSubscriber.id,
          // Outros campos obrigatórios ou defaults
          sex: 'NOT_INFORMED', // Default safe
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

    const where: any = { deletedAt: null };

    if (filters?.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }
    if (filters?.city) {
      where.municipalityName = { contains: filters.city, mode: 'insensitive' };
    }
    if (filters?.state) {
      where.stateAcronym = { contains: filters.state, mode: 'insensitive' };
    }
    if (filters?.payment !== undefined) {
      where.payment = filters.payment;
    }
    if (filters?.is_blocked !== undefined) {
      where.isBlocked = filters.is_blocked;
    }

    const [total, data] = await Promise.all([
      this.prisma.subscriber.count({ where }),
      this.prisma.subscriber.findMany({
        where,
        take: Number(limit),
        skip: Number(skip),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          uuid: true,
          name: true,
          municipalityName: true,
          cnpj: true,
          payment: true,
          isBlocked: true,
          createdAt: true,
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
        deletedAt: null,
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { municipalityName: { contains: term, mode: 'insensitive' } },
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
      this.prisma.subscriber.count({ where: { deletedAt: null } }),
      this.prisma.subscriber.count({ where: { isBlocked: false, payment: true, deletedAt: null } }),
      this.prisma.subscriber.count({ where: { isBlocked: true, deletedAt: null } }),
      this.prisma.subscriber.count({ where: { payment: false, isBlocked: false, deletedAt: null } }),
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
      data: {
        name: updateSubscriberDto.name,
        municipalityName: updateSubscriberDto.municipality_name,
        email: updateSubscriberDto.email,
        telephone: updateSubscriberDto.telephone,
        cnpj: updateSubscriberDto.cnpj,
        postalCode: updateSubscriberDto.postal_code,
        city: updateSubscriberDto.city,
        neighborhood: updateSubscriberDto.neighborhood,
        street: updateSubscriberDto.street,
        number: updateSubscriberDto.number,
        stateName: updateSubscriberDto.state_name,
        stateAcronym: updateSubscriberDto.state_acronym,
        stateLogo: updateSubscriberDto.state_logo,
        municipalLogo: updateSubscriberDto.municipal_logo,
        administrationLogo: updateSubscriberDto.administration_logo,
        payment: updateSubscriberDto.payment,
        isBlocked: updateSubscriberDto.is_blocked,
      },
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
      data: { deletedAt: new Date() },
    });

    // Caso queira deletar de verdade:
    // return this.prisma.subscriber.delete({ where: { id } });
  }
}
