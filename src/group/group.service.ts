import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupService {
  constructor(private prisma: PrismaService) { }

  async create(createGroupDto: CreateGroupDto, subscriber_id: number) {
    return this.prisma.group.create({
      data: {
        ...createGroupDto,
        subscriber_id: subscriber_id
      },
    });
  }

  async search(subscriber_id: number, term: string) {

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
      },
      take: 10,
      skip: 0,
      orderBy: { name: 'asc' },
    });
  }

  async findMinimal(subscriber_id: number, term: string) {

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
      },
      take: 10,
      skip: 0,
      orderBy: { name: 'asc' },
    });
  }

  async findAll(subscriber_id: number) {
    return this.prisma.group.findMany({
      where: {
        subscriber_id,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }


  async findOne(id: number, subscriber_id: number) {
    const group = await this.prisma.group.findUnique({
      where: { id, subscriber_id },
      include: { cares: true },
    });

    if (!group) throw new NotFoundException(`Group #${id} not found`);
    return group;
  }

  async update(id: number, updateGroupDto: UpdateGroupDto, subscriber_id: number) {
    await this.findOne(id, subscriber_id);
    return this.prisma.group.update({
      where: { id, subscriber_id },
      data: updateGroupDto,
    });
  }

  async remove(id: number, subscriber_id: number) {
    await this.findOne(id, subscriber_id);
    return this.prisma.group.update({
      where: { id, subscriber_id },
      data: { deleted_at: new Date() },
    });
  }
}
