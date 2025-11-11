import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@Injectable()
export class FolderService {
  constructor(private prisma: PrismaService) {}

  async create(createFolderDto: CreateFolderDto) {
      const subscriberMockId = 1;
    return this.prisma.folder.create({
    data: {
      ...createFolderDto,
      subscriber_id: subscriberMockId,
            start_date: createFolderDto.start_date ? new Date(createFolderDto.start_date) :null,
      end_date: createFolderDto.end_date ? new Date(createFolderDto.end_date) : null,
    },
    });
  }
async search(subscriber_id: number, term: string) {
  console.log('📥 subscriber_id:', subscriber_id);
  console.log('📥 term:', term);

  return this.prisma.folder.findMany({
    where: {
      subscriber_id,
      deleted_at: null,
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ],
    },
    include: {
      care: { select: { name: true } },
      group: { select: { name: true } },
      regulations: true,
    },
    orderBy: { name: 'asc' },
  });
}


  async findAll(subscriber_id: number) {
    return this.prisma.folder.findMany({
      where: { subscriber_id, deleted_at: null },
      include: {
        care: true,
        group: true,
        regulations: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      include: { care: true, group: true, regulations: true },
    });

    if (!folder) throw new NotFoundException(`Folder #${id} not found`);
    return folder;
  }

  async update(id: number, updateFolderDto: UpdateFolderDto) {
    await this.findOne(id);
    return this.prisma.folder.update({
      where: { id },
      data: updateFolderDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.folder.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
