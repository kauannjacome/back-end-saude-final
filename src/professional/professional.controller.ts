import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ProfessionalService } from './professional.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { TokenPayloadParam } from '../auth/param/token-payload.param';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';

@UseGuards(AuthTokenGuard)
@Controller('professional')
export class ProfessionalController {
  constructor(private readonly professionalService: ProfessionalService) { }

  @Post()
  create(@Body() createProfessionalDto: CreateProfessionalDto) {
    return this.professionalService.create(createProfessionalDto);
  }

  @Get('deleted/list')
  findAllDeleted(@TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.professionalService.findAllDeleted(Number(TokenPayload.sub_id));
  }

  @Get('search/simple')
  searchSimple(
    @Query('term') term: string,
    @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.professionalService.searchSimple(Number(TokenPayload.sub_id), term);
  }


  @Get('search')
  search(
    @Query('term') term: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @TokenPayloadParam() TokenPayload: PayloadTokenDto
  ) {
    return this.professionalService.search(
      Number(TokenPayload.sub_id),
      term,
      Number(page) || 1,
      Number(limit) || 10
    );
  }


  @Get()
  findAll(@TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.professionalService.findAll(Number(TokenPayload.sub_id));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.professionalService.findOne(+id, Number(TokenPayload.sub_id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProfessionalDto: UpdateProfessionalDto, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.professionalService.update(+id, updateProfessionalDto, Number(TokenPayload.sub_id));
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.professionalService.restore(+id, Number(TokenPayload.sub_id));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.professionalService.remove(+id, Number(TokenPayload.sub_id));
  }

  @Delete(':id/hard')
  hardDelete(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    if (TokenPayload.role !== 'ADMIN_MANAGER') {
      throw new ForbiddenException('Apenas ADMIN_MANAGER pode remover itens permanentemente.');
    }
    return this.professionalService.hardDelete(+id, Number(TokenPayload.sub_id));
  }

  @Post(':id/temporary-password')
  setTemporaryPassword(
    @Param('id') id: string,
    @Body() body: { password: string },
    @TokenPayloadParam() TokenPayload: PayloadTokenDto
  ) {
    if (TokenPayload.role !== 'ADMIN_MANAGER' && TokenPayload.role !== 'ADMIN_MUNICIPAL') {
      throw new ForbiddenException('Apenas administradores podem criar senhas temporárias.');
    }
    return this.professionalService.setTemporaryPassword(
      +id,
      body.password,
      Number(TokenPayload.sub_id),
      TokenPayload.role
    );
  }
}
