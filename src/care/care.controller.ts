import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { CareService } from './care.service';
import { CreateCareDto } from './dto/create-care.dto';
import { UpdateCareDto } from './dto/update-care.dto';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { TokenPayloadParam } from '../auth/param/token-payload.param';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';

@UseGuards(AuthTokenGuard)
@Controller('care')
export class CareController {
  constructor(private readonly careService: CareService) { }

  @Post()
  create(@Body() createCareDto: CreateCareDto, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.careService.create(createCareDto, Number(TokenPayload.sub_id));
  }

  // 🚀 Endpoint de sugestão inicial (mais usados)
  @Get()
  findTopUsed(@TokenPayloadParam() tokenPayload: PayloadTokenDto) {
    return this.careService.findTopUsed(Number(tokenPayload.sub_id), Number(tokenPayload.user_id));
  }

  // 🖱️ Endpoint para registrar uso (manual/teste)
  @Post(':id/use')
  registerUsage(@Param('id') id: string, @TokenPayloadParam() tokenPayload: PayloadTokenDto) {
    return this.careService.registerUsage(
      Number(tokenPayload.sub_id),
      Number(id),
      Number(tokenPayload.user_id)
    );
  }

  // 🔍 Endpoint de busca
  @Get('search')
  search(
    @Query('term') term: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @TokenPayloadParam() TokenPayload: PayloadTokenDto
  ) {
    return this.careService.search(
      Number(TokenPayload.sub_id),
      term,
      Number(page) || 1,
      Number(limit) || 10
    );
  }

  @Get('min-deadline/check')
  checkMinDeadline(
    @Query('care_id') careId: string,
    @Query('patient_id') patientId: string,
    @TokenPayloadParam() tokenPayload: PayloadTokenDto
  ) {
    return this.careService.checkMinDeadline(
      Number(careId),
      Number(patientId),
      Number(tokenPayload.sub_id)
    );
  }

  @Get('deleted/list')
  findAllDeleted(@TokenPayloadParam() tokenPayload: PayloadTokenDto) {
    return this.careService.findAllDeleted(Number(tokenPayload.sub_id));
  }

  // @Get()
  // findAll(@TokenPayloadParam() tokenPayload: PayloadTokenDto) {
  //   return this.careService.findAll(Number(tokenPayload.sub_id));
  // }

  @Get(':id')
  findOne(@Param('id') id: string, @TokenPayloadParam() tokenPayload: PayloadTokenDto) {
    return this.careService.findOne(+id, Number(tokenPayload.sub_id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCareDto: UpdateCareDto, @TokenPayloadParam() tokenPayload: PayloadTokenDto) {
    return this.careService.update(+id, updateCareDto, Number(tokenPayload.sub_id));
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string, @TokenPayloadParam() tokenPayload: PayloadTokenDto) {
    return this.careService.restore(+id, Number(tokenPayload.sub_id));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TokenPayloadParam() tokenPayload: PayloadTokenDto) {
    return this.careService.remove(+id, Number(tokenPayload.sub_id));
  }

  @Delete(':id/hard')
  hardDelete(@Param('id') id: string, @TokenPayloadParam() tokenPayload: PayloadTokenDto) {
    if (tokenPayload.role !== 'admin_manager') {
      throw new ForbiddenException('Apenas admin_manager pode remover itens permanentemente.');
    }
    return this.careService.hardDelete(+id, Number(tokenPayload.sub_id));
  }
}
