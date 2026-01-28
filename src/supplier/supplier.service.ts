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
        name: createSupplierDto.name,
        tradeName: createSupplierDto.trade_name,
        cnpj: createSupplierDto.cnpj,
        postalCode: createSupplierDto.postal_code,
        city: createSupplierDto.city,
        state: createSupplierDto.state,
        subscriberId: subscriber_id,
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
        { tradeName: { contains: term, mode: 'insensitive' } },
        { cnpj: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        select: {
          id: true,
          uuid: true,
          name: true,
          tradeName: true,
          cnpj: true,
        },
        take: safeLimit,
        skip: skip,
        orderBy: { name: 'asc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async searchSimples(subscriber_id: number, term: string) {

    return this.prisma.supplier.findMany({
      where: {
        subscriberId: subscriber_id,
        deletedAt: null,
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { tradeName: { contains: term, mode: 'insensitive' } },
          { cnpj: { contains: term, mode: 'insensitive' } },
        ],
      },
      include: {
        regulations: {
          select: { id: true, idCode: true, status: true },
        },
      },
      take: 10,
      skip: 0,
      orderBy: { name: 'asc' },
    });
  }
  async findAll(subscriber_id: number) {
    return this.prisma.supplier.findMany({
      where: { subscriberId: subscriber_id, deletedAt: null },
      // include: { regulations: true }, // Removed to optimize
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, subscriber_id: number) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id, subscriberId: subscriber_id },
      include: { regulations: true },
    });

    if (!supplier) throw new NotFoundException(`Supplier #${id} not found`);
    return supplier;
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto, subscriber_id: number) {
    await this.findOne(id, subscriber_id);
    return this.prisma.supplier.update({
      where: { id, subscriberId: subscriber_id },
      data: {
        name: updateSupplierDto.name,
        tradeName: updateSupplierDto.trade_name,
        cnpj: updateSupplierDto.cnpj,
        postalCode: updateSupplierDto.postal_code,
        city: updateSupplierDto.city,
        state: updateSupplierDto.state,
      },
    });
  }

  async remove(id: number, subscriber_id: number) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!supplier || supplier.deletedAt) {
      throw new NotFoundException(`Supplier #${id} not found`);
    }

    return this.prisma.supplier.update({
      where: { id, subscriberId: subscriber_id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: number, subscriber_id: number) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!supplier) {
      throw new NotFoundException(`Supplier #${id} not found`);
    }
    if (!supplier.deletedAt) {
      throw new BadRequestException(`Supplier #${id} is not deleted`);
    }

    return this.prisma.supplier.update({
      where: { id, subscriberId: subscriber_id },
      data: { deletedAt: null },
    });
  }

  async hardDelete(id: number, subscriber_id: number) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id, subscriberId: subscriber_id } });
    if (!supplier) {
      throw new NotFoundException(`Supplier #${id} not found`);
    }

    return this.prisma.supplier.delete({
      where: { id, subscriberId: subscriber_id },
    });
  }

  async findAllDeleted(subscriber_id: number) {
    return this.prisma.supplier.findMany({
      where: { subscriberId: subscriber_id, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      select: {
        id: true,
        name: true,
        cnpj: true,
        deletedAt: true,
        tradeName: true,
      },
    });
  }
}
