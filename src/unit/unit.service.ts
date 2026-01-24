import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitService {
  constructor(private prisma: PrismaService) { }

  async create(createUnitDto: CreateUnitDto) {
    return this.prisma.unit.create({
      data: createUnitDto,
    });
  }
  async search(subscriber_id: number, term: string) {

    return this.prisma.unit.findMany({
      where: {
        subscriber_id,
        deleted_at: null,
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
        ],
      },
      take: 10,
      skip: 0,
      orderBy: { name: 'asc' },
    });
  }

  async findAll(subscriber_id: number) {
    return this.prisma.unit.findMany({
      where: { subscriber_id, deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number, subscriber_id: number) {
    const unit = await this.prisma.unit.findUnique({
      where: { id, subscriber_id },
    });

    if (!unit) throw new NotFoundException(`Unit #${id} not found`);
    return unit;
  }

  async update(id: number, updateUnitDto: UpdateUnitDto, subscriber_id: number) {
    await this.findOne(id, subscriber_id);
    return this.prisma.unit.update({
      where: { id, subscriber_id },
      data: updateUnitDto,
    });
  }

  async remove(id: number, subscriber_id: number) {
    const unit = await this.prisma.unit.findUnique({ where: { id, subscriber_id } });
    if (!unit || unit.deleted_at) {
      throw new NotFoundException(`Unit #${id} not found`);
    }

    return this.prisma.unit.update({
      where: { id, subscriber_id },
      data: { deleted_at: new Date() },
    });
  }

  async restore(id: number, subscriber_id: number) {
    const unit = await this.prisma.unit.findUnique({ where: { id, subscriber_id } });
    if (!unit) {
      throw new NotFoundException(`Unit #${id} not found`);
    }
    if (!unit.deleted_at) {
      throw new BadRequestException(`Unit #${id} is not deleted`);
    }

    return this.prisma.unit.update({
      where: { id, subscriber_id },
      data: { deleted_at: null },
    });
  }

  async hardDelete(id: number, subscriber_id: number) {
    const unit = await this.prisma.unit.findUnique({ where: { id, subscriber_id } });
    if (!unit) {
      throw new NotFoundException(`Unit #${id} not found`);
    }

    return this.prisma.unit.delete({
      where: { id, subscriber_id },
    });
  }

  async findAllDeleted(subscriber_id: number) {
    return this.prisma.unit.findMany({
      where: { subscriber_id, deleted_at: { not: null } },
      orderBy: { deleted_at: 'desc' },
      select: {
        id: true,
        name: true,
        deleted_at: true,
      },
    });
  }
}
