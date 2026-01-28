import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitService {
  constructor(private prisma: PrismaService) { }

  async create(createUnitDto: CreateUnitDto) {
    return this.prisma.unit.create({
      data: {
        name: createUnitDto.name,
        subscriberId: createUnitDto.subscriber_id,
      },
    });
  }
  async search(subscriber_id: number, term: string, page: number = 1, limit: number = 10) {
    const safePage = page && page > 0 ? page : 1;
    const safeLimit = limit && limit > 0 ? limit : 10;
    const skip = (safePage - 1) * safeLimit;

    const where: any = {
      subscriberId: subscriber_id,
      deletedAt: null,
    };

    if (term) {
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        take: safeLimit,
        skip: skip,
        orderBy: { name: 'asc' },
      }),
      this.prisma.unit.count({ where }),
    ]);

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async findAll(subscriber_id: number) {
    return this.prisma.unit.findMany({
      where: { subscriberId: subscriber_id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, subscriber_id: number) {
    const unit = await this.prisma.unit.findUnique({
      where: { id, subscriberId: subscriber_id },
    });

    if (!unit) throw new NotFoundException(`Unit #${id} not found`);
    return unit;
  }

  async update(id: number, updateUnitDto: UpdateUnitDto, subscriber_id: number) {
    await this.findOne(id, subscriber_id);
    return this.prisma.unit.update({
      where: { id, subscriberId: subscriber_id },
      data: {
        name: updateUnitDto.name,
        subscriberId: updateUnitDto.subscriber_id
      },
    });
  }

  async remove(id: number, subscriber_id: number) {
    const unit = await this.prisma.unit.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!unit || unit.deletedAt) {
      throw new NotFoundException(`Unit #${id} not found`);
    }

    return this.prisma.unit.update({
      where: { id, subscriberId: subscriber_id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: number, subscriber_id: number) {
    const unit = await this.prisma.unit.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!unit) {
      throw new NotFoundException(`Unit #${id} not found`);
    }
    if (!unit.deletedAt) {
      throw new BadRequestException(`Unit #${id} is not deleted`);
    }

    return this.prisma.unit.update({
      where: { id, subscriberId: subscriber_id },
      data: { deletedAt: null },
    });
  }

  async hardDelete(id: number, subscriber_id: number) {
    const unit = await this.prisma.unit.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!unit) {
      throw new NotFoundException(`Unit #${id} not found`);
    }

    return this.prisma.unit.delete({
      where: { id, subscriberId: subscriber_id },
    });
  }

  async findAllDeleted(subscriber_id: number) {
    return this.prisma.unit.findMany({
      where: { subscriberId: subscriber_id, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      select: {
        id: true,
        name: true,
        deletedAt: true,
      },
    });
  }
}
