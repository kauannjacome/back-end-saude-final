import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { UnitService } from './unit.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { TokenPayloadParam } from '../auth/param/token-payload.param';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';

@UseGuards(AuthTokenGuard)
@Controller('unit')
export class UnitController {
  constructor(private readonly unitService: UnitService) { }

  @Post()
  create(@Body() createUnitDto: CreateUnitDto) {
    return this.unitService.create(createUnitDto);
  }

  @Get('deleted/list')
  findAllDeleted(@TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    if (TokenPayload.role !== 'ADMIN_MANAGER') {
      throw new ForbiddenException('Apenas ADMIN_MANAGER pode listar itens deletados.');
    }
    return this.unitService.findAllDeleted(Number(TokenPayload.sub_id));
  }

  @Get('search')
  search(
    @Query('term') term: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @TokenPayloadParam() TokenPayload: PayloadTokenDto
  ) {
    return this.unitService.search(
      Number(TokenPayload.sub_id),
      term,
      Number(page) || 1,
      Number(limit) || 10
    );
  }

  @Get()
  findAll(@TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.unitService.findAll(Number(TokenPayload.sub_id));
  }
  @Get(':id')
  findOne(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.unitService.findOne(+id, Number(TokenPayload.sub_id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUnitDto: UpdateUnitDto, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.unitService.update(+id, updateUnitDto, Number(TokenPayload.sub_id));
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    if (TokenPayload.role !== 'ADMIN_MANAGER') {
      throw new ForbiddenException('Apenas ADMIN_MANAGER pode restaurar itens.');
    }
    return this.unitService.restore(+id, Number(TokenPayload.sub_id));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.unitService.remove(+id, Number(TokenPayload.sub_id));
  }

  @Delete(':id/hard')
  hardDelete(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    if (TokenPayload.role !== 'ADMIN_MANAGER') {
      throw new ForbiddenException('Apenas ADMIN_MANAGER pode remover itens permanentemente.');
    }
    return this.unitService.hardDelete(+id, Number(TokenPayload.sub_id));
  }
}
