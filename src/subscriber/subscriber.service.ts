import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';

@Injectable()
export class SubscriberService {
  private readonly logger = new Logger(SubscriberService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createSubscriberDto: CreateSubscriberDto) {
    return this.prisma.subscriber.create({
      data: createSubscriberDto,
    });
  }

  async search(term?: string) {
    const searchTerm = term?.trim();
    const whereClause: {
      deleted_at: null;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        municipality_name?: { contains: string; mode: 'insensitive' };
        email?: { contains: string; mode: 'insensitive' };
        cnpj?: { contains: string; mode: 'insensitive' };
      }>;
    } = {
      deleted_at: null,
    };

    if (searchTerm) {
      whereClause.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        {
          municipality_name: { contains: searchTerm, mode: 'insensitive' },
        },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { cnpj: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    return this.prisma.subscriber.findMany({
      where: whereClause,
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
        id:true,
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
      throw new NotFoundException(`Subscriber with ID ${id} not found`);
    }

    return subscriber;
  }

  async update(id: number, updateSubscriberDto: UpdateSubscriberDto) {
    const subscriber = await this.prisma.subscriber.findUnique({ where: { id } });
    if (!subscriber) {
      throw new NotFoundException(`Subscriber with ID ${id} not found`);
    }

    return this.prisma.subscriber.update({
      where: { id },
      data: updateSubscriberDto,
    });
  }

  async remove(id: number) {
    const subscriber = await this.prisma.subscriber.findUnique({ where: { id } });
    if (!subscriber) {
      throw new NotFoundException(`Subscriber with ID ${id} not found`);
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
