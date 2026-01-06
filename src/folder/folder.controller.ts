import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { FolderService } from './folder.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@Controller('folder')
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createFolderDto: CreateFolderDto) {
    return this.folderService.create(createFolderDto);
  }

  @Get('search')
  search(
    @Query('subscriber_id', ParseIntPipe) subscriber_id: number,
    @Query('term') term?: string,
  ) {
    return this.folderService.search(subscriber_id, term);
  }

  @Get()
  findAll(
    @Query('subscriber_id', new ParseIntPipe({ optional: true }))
    subscriber_id?: number,
  ) {
    if (!subscriber_id) {
      throw new Error('subscriber_id is required');
    }
    return this.folderService.findAll(subscriber_id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.folderService.findOne(id);
  }

  @Get('all/regulation/:uuid')
  findFolderAllRegulation(@Param('uuid') uuid: string) {
    return this.folderService.findFolderAllRegulation(uuid);
  }

  @Get('pdf/:id')
  async folderPdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const buffer = await this.folderService.folderPdfService(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="regulamento_${id}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFolderDto: UpdateFolderDto,
  ) {
    return this.folderService.update(id, updateFolderDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.folderService.remove(id);
  }
}
