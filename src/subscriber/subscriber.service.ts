import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import { CreateSubscriberWithAdminDto } from './dto/create-subscriber-with-admin.dto';
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

  async search(term: string) {
    console.log('📥 term:', term);

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
      take: 10,
      skip: 0,
      orderBy: { name: 'asc' },
    });
  }


  async findAll() {
    return this.prisma.subscriber.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        uuid: true,
        name: true,
        municipality_name: true,
        cnpj: true,
        // se quiser incluir created_at também:
        // created_at: true,
      },
    });
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
