import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createGroupDto: CreateGroupDto) {
    return this.groupService.create(createGroupDto);
  }

  @Get('search')
  search(
    @Query('subscriber_id', ParseIntPipe) subscriber_id: number,
    @Query('term') term?: string,
  ) {
    return this.groupService.search(subscriber_id, term);
  }

  @Get('search/simples')
  findMinimal(
    @Query('subscriber_id', ParseIntPipe) subscriber_id: number,
    @Query('term') term?: string,
  ) {
    return this.groupService.findMinimal(subscriber_id, term);
  }

  @Get()
  findAll(
    @Query('subscriber_id', new ParseIntPipe({ optional: true }))
    subscriber_id?: number,
  ) {
    if (!subscriber_id) {
      throw new Error('subscriber_id is required');
    }
    return this.groupService.findAll(subscriber_id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.groupService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return this.groupService.update(id, updateGroupDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.groupService.remove(id);
  }
}
