import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { folderPdf } from './pdf/folder-pdf';

@Injectable()
export class FolderService {
  constructor(private prisma: PrismaService) { }

  async create(createFolderDto: CreateFolderDto, subscriber_id: number) {
    return this.prisma.folder.create({
      data: {
        ...createFolderDto,
        subscriber_id: subscriber_id,
        start_date: createFolderDto.start_date ? new Date(createFolderDto.start_date) : null,
        end_date: createFolderDto.end_date ? new Date(createFolderDto.end_date) : null,
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
      this.prisma.folder.findMany({
        where,
        select: {
          id: true,
          uuid: true,
          name: true,
          responsible: {
            select: {
              id: true,
              uuid: true,
              cpf: true,
              name: true,
              name_normalized: true,
              cargo: true,
              sex: true,
            }
          },
        },
        take: safeLimit,
        skip: skip,
        orderBy: { name: 'asc' },
      }),
      this.prisma.folder.count({ where }),
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
    return this.prisma.folder.findMany({
      where: { subscriber_id, deleted_at: null },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        // responsible: { select: { name: true } } // Optional: keep if frontend displays responsible name in list
      }
    }); // Keeping it simple as requested: "sem informações amais"
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
            clinical_indication: true,
            priority: true,
            type_declaration: true,

            patient: {
              select: {
                cpf: true,
                cns: true,
                name: true,
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
      include: { regulations: true, responsible: true, subscriber: true },
    });

    // const pdfBuffer = await generateRegulationPdf(regulation, copies);
    const pdfBuffer = await folderPdf(folder);
    return pdfBuffer; // você pode retornar direto ou salvar num arquivo temporário
  }

  async findOne(id: number, subscriber_id: number) {
    const folder = await this.prisma.folder.findUnique({
      where: { id, subscriber_id },
      include: { regulations: true, responsible: true, },
    });

    if (!folder) throw new NotFoundException(`Folder #${id} not found`);
    return folder;
  }

  async update(id: number, updateFolderDto: UpdateFolderDto, subscriber_id: number) {
    await this.findOne(id, subscriber_id);
    return this.prisma.folder.update({
      where: { id, subscriber_id },
      data: updateFolderDto,
    });
  }

  async remove(id: number, subscriber_id: number) {
    const folder = await this.prisma.folder.findUnique({ where: { id, subscriber_id } });
    if (!folder || folder.deleted_at) {
      throw new NotFoundException(`Folder #${id} not found`);
    }

    return this.prisma.folder.update({
      where: { id, subscriber_id },
      data: { deleted_at: new Date() },
    });
  }

  async restore(id: number, subscriber_id: number) {
    const folder = await this.prisma.folder.findUnique({ where: { id, subscriber_id } });
    if (!folder) {
      throw new NotFoundException(`Folder #${id} not found`);
    }
    if (!folder.deleted_at) {
      throw new BadRequestException(`Folder #${id} is not deleted`);
    }

    return this.prisma.folder.update({
      where: { id, subscriber_id },
      data: { deleted_at: null },
    });
  }

  async hardDelete(id: number, subscriber_id: number) {
    const folder = await this.prisma.folder.findUnique({ where: { id, subscriber_id } });
    if (!folder) {
      throw new NotFoundException(`Folder #${id} not found`);
    }

    return this.prisma.folder.delete({
      where: { id, subscriber_id },
    });
  }

  async findAllDeleted(subscriber_id: number) {
    return this.prisma.folder.findMany({
      where: { subscriber_id, deleted_at: { not: null } },
      orderBy: { deleted_at: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        deleted_at: true,
        responsible: { select: { name: true } },
      },
    });
  }
}
