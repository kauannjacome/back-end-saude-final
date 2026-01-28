import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupService {
  constructor(private prisma: PrismaService) { }

  async create(createGroupDto: CreateGroupDto, subscriber_id: number) {
    return this.prisma.group.create({
      data: {
        name: createGroupDto.name,
        description: createGroupDto.description,
        subscriberId: createGroupDto.subscriber_id,
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
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
        },
        take: safeLimit,
        skip: skip,
        orderBy: { name: 'asc' },
      }),
      this.prisma.group.count({ where }),
    ]);

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async findMinimal(subscriber_id: number, term: string) {

    return this.prisma.group.findMany({
      where: {
        subscriberId: subscriber_id,
        deletedAt: null,
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
        subscriberId: subscriber_id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }


  async findOne(id: number, subscriber_id: number) {
    const group = await this.prisma.group.findUnique({
      where: { id, subscriberId: subscriber_id },
      include: { cares: true },
    });

    if (!group) throw new NotFoundException(`Group #${id} not found`);
    return group;
  }

  async update(id: number, updateGroupDto: UpdateGroupDto, subscriber_id: number) {
    await this.findOne(id, subscriber_id);
    return this.prisma.group.update({
      where: { id, subscriberId: subscriber_id },
      data: {
        name: updateGroupDto.name,
        description: updateGroupDto.description,
        subscriberId: updateGroupDto.subscriber_id,
      },
    });
  }

  async remove(id: number, subscriber_id: number) {
    const group = await this.prisma.group.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!group || group.deletedAt) {
      throw new NotFoundException(`Group #${id} not found`);
    }

    return this.prisma.group.update({
      where: { id, subscriberId: subscriber_id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: number, subscriber_id: number) {
    const group = await this.prisma.group.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!group) {
      throw new NotFoundException(`Group #${id} not found`);
    }
    if (!group.deletedAt) {
      throw new BadRequestException(`Group #${id} is not deleted`);
    }

    return this.prisma.group.update({
      where: { id, subscriberId: subscriber_id },
      data: { deletedAt: null },
    });
  }

  async hardDelete(id: number, subscriber_id: number) {
    const group = await this.prisma.group.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!group) {
      throw new NotFoundException(`Group #${id} not found`);
    }

    return this.prisma.group.delete({
      where: { id, subscriberId: subscriber_id },
    });
  }

  async findAllDeleted(subscriber_id: number) {
    return this.prisma.group.findMany({
      where: { subscriberId: subscriber_id, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        deletedAt: true,
      },
    });
  }
}
