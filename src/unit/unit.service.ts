import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitService {
  constructor(private prisma: PrismaService) {}

  async create(createUnitDto: CreateUnitDto) {
    return this.prisma.unit.create({
      data: createUnitDto,
    });
  }
async search(subscriber_id: number, term: string) {
  console.log('📥 subscriber_id:', subscriber_id);
  console.log('📥 term:', term);

  return this.prisma.unit.findMany({
    where: {
      subscriber_id,
      deleted_at: null,
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
      ],
    },
    orderBy: { name: 'asc' },
  });
}

  async findAll(subscriber_id: number) {
    return this.prisma.unit.findMany({
      where: { subscriber_id, deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
    });

    if (!unit) throw new NotFoundException(`Unit #${id} not found`);
    return unit;
  }

  async update(id: number, updateUnitDto: UpdateUnitDto) {
    await this.findOne(id);
    return this.prisma.unit.update({
      where: { id },
      data: updateUnitDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.unit.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
