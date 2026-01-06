import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupService {
  private readonly logger = new Logger(GroupService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createGroupDto: CreateGroupDto) {
    return this.prisma.group.create({
      data: createGroupDto,
    });
  }

  async search(subscriber_id: number, term?: string) {
    const searchTerm = term?.trim();
    const whereClause: {
      subscriber_id: number;
      deleted_at: null;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        description?: { contains: string; mode: 'insensitive' };
      }>;
    } = {
      subscriber_id,
      deleted_at: null,
    };

    if (searchTerm) {
      whereClause.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    return this.prisma.group.findMany({
      where: whereClause,
      include: {
        cares: { select: { name: true } },
      },
      take: 10,
      skip: 0,
      orderBy: { name: 'asc' },
    });
  }

  async findMinimal(subscriber_id: number, term?: string) {
    const searchTerm = term?.trim();
    const whereClause: {
      subscriber_id: number;
      deleted_at: null;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        description?: { contains: string; mode: 'insensitive' };
      }>;
    } = {
      subscriber_id,
      deleted_at: null,
    };

    if (searchTerm) {
      whereClause.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    return this.prisma.group.findMany({
      where: whereClause,
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
      where: { subscriber_id, deleted_at: null },
      include: {
        cares: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: { cares: true },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }
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
