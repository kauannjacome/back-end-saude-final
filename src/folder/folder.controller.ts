import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res } from '@nestjs/common';
import type { Response } from 'express'; 
import { FolderService } from './folder.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@Controller('folder')
export class FolderController {
  constructor(private readonly folderService: FolderService) { }

  @Post()
  create(@Body() createFolderDto: CreateFolderDto) {
    console.log(createFolderDto)
    return this.folderService.create(createFolderDto);
  }

  // 🔍 Endpoint de busca
  @Get('search')
  search(@Query('term') term: string) {
    return this.folderService.search(Number(1), term);
  }


  @Get()
  findAll(@Query('subscriber_id') subscriber_id: number) {
    return this.folderService.findAll(Number(subscriber_id));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.folderService.findOne(+id);
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
  update(@Param('id') id: string, @Body() updateFolderDto: UpdateFolderDto) {
    return this.folderService.update(+id, updateFolderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.folderService.remove(+id);
  }
}
