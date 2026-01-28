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
        name: createFolderDto.name,
        idCode: createFolderDto.id_code,
        description: createFolderDto.description,
        responsibleId: createFolderDto.responsible_id,
        subscriberId: subscriber_id,
        startDate: createFolderDto.start_date ? new Date(createFolderDto.start_date) : null,
        endDate: createFolderDto.end_date ? new Date(createFolderDto.end_date) : null,
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
              nameNormalized: true,
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
      where: { subscriberId: subscriber_id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
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
        subscriberId: true,
        name: true,
        idCode: true,
        description: true,
        responsibleId: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,

        responsible: {
          select: {
            id: true,
            name: true,
            cargo: true,
            role: true,
          },
        },

        regulations: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          select: {
            idCode: true,
            patientId: true,
            status: true,
            notes: true,
            clinicalIndication: true,
            priority: true,
            typeDeclaration: true,

            patient: {
              select: {
                cpf: true,
                cns: true,
                name: true,
                socialName: true,
              },
            },

            cares: {
              select: {
                id: true,
                careId: true,
                regulationId: true,
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
      where: { id, subscriberId: subscriber_id },
      include: { regulations: true, responsible: true, },
    });

    if (!folder) throw new NotFoundException(`Folder #${id} not found`);
    return folder;
  }

  async update(id: number, updateFolderDto: UpdateFolderDto, subscriber_id: number) {
    await this.findOne(id, subscriber_id);
    return this.prisma.folder.update({
      where: { id, subscriberId: subscriber_id },
      data: {
        name: updateFolderDto.name,
        idCode: updateFolderDto.id_code,
        description: updateFolderDto.description,
        responsibleId: updateFolderDto.responsible_id,
        subscriberId: updateFolderDto.subscriber_id,
        startDate: updateFolderDto.start_date ? new Date(updateFolderDto.start_date) : undefined,
        endDate: updateFolderDto.end_date ? new Date(updateFolderDto.end_date) : undefined,
      },
    });
  }

  async remove(id: number, subscriber_id: number) {
    const folder = await this.prisma.folder.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!folder || folder.deletedAt) {
      throw new NotFoundException(`Folder #${id} not found`);
    }

    return this.prisma.folder.update({
      where: { id, subscriberId: subscriber_id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: number, subscriber_id: number) {
    const folder = await this.prisma.folder.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!folder) {
      throw new NotFoundException(`Folder #${id} not found`);
    }
    if (!folder.deletedAt) {
      throw new BadRequestException(`Folder #${id} is not deleted`);
    }

    return this.prisma.folder.update({
      where: { id, subscriberId: subscriber_id },
      data: { deletedAt: null },
    });
  }

  async hardDelete(id: number, subscriber_id: number) {
    const folder = await this.prisma.folder.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!folder) {
      throw new NotFoundException(`Folder #${id} not found`);
    }

    return this.prisma.folder.delete({
      where: { id, subscriberId: subscriber_id },
    });
  }

  async findAllDeleted(subscriber_id: number) {
    return this.prisma.folder.findMany({
      where: { subscriberId: subscriber_id, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        deletedAt: true,
        responsible: { select: { name: true } },
      },
    });
  }
}
