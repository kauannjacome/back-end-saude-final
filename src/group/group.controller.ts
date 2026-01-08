import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) { }

  @Post()
  create(@Body() createGroupDto: CreateGroupDto) {
    return this.groupService.create(createGroupDto);
  }

  // 🔍 Endpoint de busca
  @Get('search')
  search(@Query('term') term: string) {
    return this.groupService.search(Number(1), term);
  }
  // 🔍 Endpoint de busca
  @Get('search/simples')
  findMinimal(@Query('term') term: string) {
    return this.groupService.search(Number(1), term);
  }



  @Get()
  findAll(@Query('subscriber_id') subscriber_id: number) {
    return this.groupService.findAll(Number(1));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    return this.groupService.update(+id, updateGroupDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupService.remove(+id);
  }
}
