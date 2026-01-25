import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(private prisma: PrismaService) { }

  async create(createSupplierDto: CreateSupplierDto, subscriber_id: number) {
    return this.prisma.supplier.create({
      data: {
        ...createSupplierDto,
        subscriber_id: subscriber_id
      },
    });
  }
  async search(subscriber_id: number, term: string) {

    return this.prisma.supplier.findMany({
      where: {
        subscriber_id,
        deleted_at: null,
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { trade_name: { contains: term, mode: 'insensitive' } },
          { cnpj: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        uuid: true,
        name: true,
        trade_name: true,
        cnpj: true,
        // postal_code: false, // excluded
        // city: false, // excluded
        // state: false, // excluded
        // created_at: false, // excluded
        // updated_at: false, // excluded
        // deleted_at: false, // excluded
        // regulations: false, // excluded
      },
      take: 10,
      skip: 0,
      orderBy: { name: 'asc' },
    });
  }

  async searchSimples(subscriber_id: number, term: string) {

    return this.prisma.supplier.findMany({
      where: {
        subscriber_id,
        deleted_at: null,
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { trade_name: { contains: term, mode: 'insensitive' } },
          { cnpj: { contains: term, mode: 'insensitive' } },
        ],
      },
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
      // include: { regulations: true }, // Removed to optimize
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number, subscriber_id: number) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id, subscriber_id },
      include: { regulations: true },
    });

    if (!supplier) throw new NotFoundException(`Supplier #${id} not found`);
    return supplier;
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto, subscriber_id: number) {
    await this.findOne(id, subscriber_id);
    return this.prisma.supplier.update({
      where: { id, subscriber_id },
      data: updateSupplierDto,
    });
  }

  async remove(id: number, subscriber_id: number) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id, subscriber_id } });
    if (!supplier || supplier.deleted_at) {
      throw new NotFoundException(`Supplier #${id} not found`);
    }

    return this.prisma.supplier.update({
      where: { id, subscriber_id },
      data: { deleted_at: new Date() },
    });
  }

  async restore(id: number, subscriber_id: number) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id, subscriber_id } });
    if (!supplier) {
      throw new NotFoundException(`Supplier #${id} not found`);
    }
    if (!supplier.deleted_at) {
      throw new BadRequestException(`Supplier #${id} is not deleted`);
    }

    return this.prisma.supplier.update({
      where: { id, subscriber_id },
      data: { deleted_at: null },
    });
  }

  async hardDelete(id: number, subscriber_id: number) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id, subscriber_id } });
    if (!supplier) {
      throw new NotFoundException(`Supplier #${id} not found`);
    }

    return this.prisma.supplier.delete({
      where: { id, subscriber_id },
    });
  }

  async findAllDeleted(subscriber_id: number) {
    return this.prisma.supplier.findMany({
      where: { subscriber_id, deleted_at: { not: null } },
      orderBy: { deleted_at: 'desc' },
      select: {
        id: true,
        name: true,
        cnpj: true,
        deleted_at: true,
        trade_name: true,
      },
    });
  }
}
