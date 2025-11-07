import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupService {
  constructor(private prisma: PrismaService) {}

  async create(createGroupDto: CreateGroupDto) {
    return this.prisma.group.create({
      data: createGroupDto,
    });
  }

  async search(subscriber_id: number, term: string) {
  console.log('📥 subscriber_id:', subscriber_id);
  console.log('📥 term:', term);

  return this.prisma.group.findMany({
    where: {
      subscriber_id,
      deleted_at: null,
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ],
    },
    include: {
      cares: { select: { name: true } },
      folders: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });
}

  async findAll(subscriber_id: number) {
    return this.prisma.group.findMany({
      where: { subscriber_id, deleted_at: null },
      include: {
        cares: true,
        folders: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: { cares: true, folders: true },
    });

    if (!group) throw new NotFoundException(`Group #${id} not found`);
    return group;
  }

  async update(id: number, updateGroupDto: UpdateGroupDto) {
    await this.findOne(id);
    return this.prisma.group.update({
      where: { id },
      data: updateGroupDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.group.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
