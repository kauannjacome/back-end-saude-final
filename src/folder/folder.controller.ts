import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
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

  @Get('all/regulation/:id')
  findFolderAllRegulation(@Param('id') id: string) {
    return this.folderService.findFolderAllRegulation(+id);
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
