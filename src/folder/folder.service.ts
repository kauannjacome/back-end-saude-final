import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { folderPdf } from './pdf/folder-pdf';

@Injectable()
export class FolderService {
  private readonly logger = new Logger(FolderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createFolderDto: CreateFolderDto) {
    return this.prisma.folder.create({
      data: {
        ...createFolderDto,
        start_date: createFolderDto.start_date
          ? new Date(createFolderDto.start_date)
          : null,
        end_date: createFolderDto.end_date
          ? new Date(createFolderDto.end_date)
          : null,
      },
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

    return this.prisma.folder.findMany({
      where: whereClause,
      include: {
        regulations: true,
        responsible: true,
      },
      take: 10,
      skip: 0,
      orderBy: { name: 'asc' },
    });
  }


  async findAll(subscriber_id: number) {
    return this.prisma.folder.findMany({
      where: { subscriber_id, deleted_at: null },
      include: {
        regulations: true,
        responsible: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }


  async findFolderAllRegulation(uuid: string) {
    const folder = await this.prisma.folder.findUnique({
      where: { uuid },
      select: {
        id: true,
        uuid: true,
        subscriber_id: true,
        name: true,
        id_code: true,
        description: true,
        responsible_id: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true,

        responsible: {
          select: {
            id: true,
            name: true,
            cargo: true,
            role: true,
          },
        },

        regulations: {
          where: { deleted_at: null },
          orderBy: { created_at: 'desc' },
          select: {
            id_code: true,
            patient_id: true,
            status: true,
            notes: true,
            justification: true,
            priority: true,
            type_declaration: true,

            patient: {
              select: {
                cpf: true,
                cns: true,
                full_name: true,
                social_name: true,
              },
            },

            cares: {
              select: {
                id: true,
                care_id: true,
                regulation_id: true,
                quantity: true,
                care: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!folder) {
      throw new NotFoundException(`Folder #${uuid} not found`);
    }

    return folder;
  }

  async folderPdfService(id: number) {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      include: {
        regulations: true,
        responsible: true,
        subscriber: true,
      },
    });

    if (!folder) {
      throw new NotFoundException(`Folder with ID ${id} not found`);
    }

    const pdfBuffer = await folderPdf(folder);
    return pdfBuffer;
  }

  async findOne(id: number) {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      include: {
        regulations: true,
        responsible: true,
      },
    });

    if (!folder) {
      throw new NotFoundException(`Folder with ID ${id} not found`);
    }
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
