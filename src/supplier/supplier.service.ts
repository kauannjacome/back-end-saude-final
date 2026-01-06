import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createSupplierDto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: createSupplierDto,
    });
  }

  async search(subscriber_id: number, term?: string) {
    const searchTerm = term?.trim();
    const whereClause: {
      subscriber_id: number;
      deleted_at: null;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        trade_name?: { contains: string; mode: 'insensitive' };
        cnpj?: { contains: string; mode: 'insensitive' };
      }>;
    } = {
      subscriber_id,
      deleted_at: null,
    };

    if (searchTerm) {
      whereClause.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { trade_name: { contains: searchTerm, mode: 'insensitive' } },
        { cnpj: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    return this.prisma.supplier.findMany({
      where: whereClause,
      include: {
        regulations: {
          select: { id: true, id_code: true, status: true },
        },
      },
      take: 10,
      skip: 0,
      orderBy: { name: 'asc' },
    });
  }

  async searchSimples(subscriber_id: number, term?: string) {
    const searchTerm = term?.trim();
    const whereClause: {
      subscriber_id: number;
      deleted_at: null;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        trade_name?: { contains: string; mode: 'insensitive' };
        cnpj?: { contains: string; mode: 'insensitive' };
      }>;
    } = {
      subscriber_id,
      deleted_at: null,
    };

    if (searchTerm) {
      whereClause.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { trade_name: { contains: searchTerm, mode: 'insensitive' } },
        { cnpj: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    return this.prisma.supplier.findMany({
      where: whereClause,
      include: {
        regulations: {
          select: { id: true, id_code: true, status: true },
        },
      },
      take: 10,
      skip: 0,
      orderBy: { name: 'asc' },
    });
  }
  async findAll(subscriber_id: number) {
    return this.prisma.supplier.findMany({
      where: { subscriber_id, deleted_at: null },
      include: { regulations: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: { regulations: true },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    return supplier;
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto) {
    await this.findOne(id);
    return this.prisma.supplier.update({
      where: { id },
      data: updateSupplierDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.supplier.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
