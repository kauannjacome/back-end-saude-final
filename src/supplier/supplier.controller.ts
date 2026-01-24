import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { TokenPayloadParam } from '../auth/param/token-payload.param';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';

@UseGuards(AuthTokenGuard)
@Controller('supplier')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) { }

  @Post()
  create(@Body() createSupplierDto: CreateSupplierDto, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.supplierService.create(createSupplierDto, Number(TokenPayload.sub_id));
  }

  @Get('deleted/list')
  findAllDeleted(@TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    if (TokenPayload.role !== 'admin_manager') {
      throw new ForbiddenException('Apenas admin_manager pode listar itens deletados.');
    }
    return this.supplierService.findAllDeleted(Number(TokenPayload.sub_id));
  }

  @Get('search')
  search(
    @Query('term') term: string,
    @TokenPayloadParam() TokenPayload: PayloadTokenDto
  ) {
    return this.supplierService.search(Number(TokenPayload.sub_id), term);
  }

  @Get('search/simples')
  searchSimples(
    @Query('term') term: string,
    @TokenPayloadParam() TokenPayload: PayloadTokenDto
  ) {
    return this.supplierService.searchSimples(Number(TokenPayload.sub_id), term);
  }

  @Get()
  findAll(@TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.supplierService.findAll(Number(TokenPayload.sub_id));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.supplierService.findOne(+id, Number(TokenPayload.sub_id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.supplierService.update(+id, updateSupplierDto, Number(TokenPayload.sub_id));
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    if (TokenPayload.role !== 'admin_manager') {
      throw new ForbiddenException('Apenas admin_manager pode restaurar itens.');
    }
    return this.supplierService.restore(+id, Number(TokenPayload.sub_id));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.supplierService.remove(+id, Number(TokenPayload.sub_id));
  }

  @Delete(':id/hard')
  hardDelete(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    if (TokenPayload.role !== 'admin_manager') {
      throw new ForbiddenException('Apenas admin_manager pode remover itens permanentemente.');
    }
    return this.supplierService.hardDelete(+id, Number(TokenPayload.sub_id));
  }
}
