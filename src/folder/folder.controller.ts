import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, UseGuards, ForbiddenException } from '@nestjs/common';
import type { Response } from 'express';
import { FolderService } from './folder.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { TokenPayloadParam } from '../auth/param/token-payload.param';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';

@UseGuards(AuthTokenGuard)
@Controller('folder')
export class FolderController {
  constructor(private readonly folderService: FolderService) { }

  @Post()
  create(@Body() createFolderDto: CreateFolderDto, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.folderService.create(createFolderDto, Number(TokenPayload.sub_id));
  }

  @Get('deleted/list')
  findAllDeleted(@TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.folderService.findAllDeleted(Number(TokenPayload.sub_id));
  }

  // 🔍 Endpoint de busca
  @Get('search')
  search(
    @Query('term') term: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @TokenPayloadParam() TokenPayload: PayloadTokenDto
  ) {
    return this.folderService.search(
      Number(TokenPayload.sub_id),
      term,
      Number(page) || 1,
      Number(limit) || 10
    );
  }


  @Get()
  findAll(@TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.folderService.findAll(Number(TokenPayload.sub_id));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.folderService.findOne(+id, Number(TokenPayload.sub_id));
  }

  @Get('all/regulation/:uuid')
  findFolderAllRegulation(@Param('uuid') uuid: string) {
    return this.folderService.findFolderAllRegulation(uuid);
  }

  @Get('pdf/:id')
  async folderPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.folderService.folderPdfService(Number(id));
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="regulamento_${id}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFolderDto: UpdateFolderDto, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.folderService.update(+id, updateFolderDto, Number(TokenPayload.sub_id));
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.folderService.restore(+id, Number(TokenPayload.sub_id));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.folderService.remove(+id, Number(TokenPayload.sub_id));
  }

  @Delete(':id/hard')
  hardDelete(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    if (TokenPayload.role !== 'admin_manager') {
      throw new ForbiddenException('Apenas admin_manager pode remover itens permanentemente.');
    }
    return this.folderService.hardDelete(+id, Number(TokenPayload.sub_id));
  }
}
