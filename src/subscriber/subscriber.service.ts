import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';

@Injectable()
export class SubscriberService {
  constructor(private prisma: PrismaService) {}

  async create(createSubscriberDto: CreateSubscriberDto) {
    return this.prisma.subscriber.create({
      data: createSubscriberDto,
    });
  }

  async findAll() {
    return this.prisma.subscriber.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
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
