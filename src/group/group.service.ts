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
        ...createGroupDto,
        subscriber_id: subscriber_id
      },
    });
  }

  async search(subscriber_id: number, term: string, page: number = 1, limit: number = 10) {
    const safePage = page && page > 0 ? page : 1;
    const safeLimit = limit && limit > 0 ? limit : 10;
    const skip = (safePage - 1) * safeLimit;

    const where: any = {
      subscriber_id,
      deleted_at: null,
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
    const group = await this.prisma.group.findUnique({ where: { id, subscriber_id } });
    if (!group || group.deleted_at) {
      throw new NotFoundException(`Group #${id} not found`);
    }

    return this.prisma.group.update({
      where: { id, subscriber_id },
      data: { deleted_at: new Date() },
    });
  }

  async restore(id: number, subscriber_id: number) {
    const group = await this.prisma.group.findUnique({ where: { id, subscriber_id } });
    if (!group) {
      throw new NotFoundException(`Group #${id} not found`);
    }
    if (!group.deleted_at) {
      throw new BadRequestException(`Group #${id} is not deleted`);
    }

    return this.prisma.group.update({
      where: { id, subscriber_id },
      data: { deleted_at: null },
    });
  }

  async hardDelete(id: number, subscriber_id: number) {
    const group = await this.prisma.group.findUnique({ where: { id, subscriber_id } });
    if (!group) {
      throw new NotFoundException(`Group #${id} not found`);
    }

    return this.prisma.group.delete({
      where: { id, subscriber_id },
    });
  }

  async findAllDeleted(subscriber_id: number) {
    return this.prisma.group.findMany({
      where: { subscriber_id, deleted_at: { not: null } },
      orderBy: { deleted_at: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        deleted_at: true,
      },
    });
  }
}
