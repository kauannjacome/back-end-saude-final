import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { TokenPayloadParam } from '../auth/param/token-payload.param';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';

@UseGuards(AuthTokenGuard)
@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) { }

  @Post()
  create(@Body() createGroupDto: CreateGroupDto, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.groupService.create(createGroupDto, Number(TokenPayload.sub_id));
  }

  @Get('deleted/list')
  findAllDeleted(@TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.groupService.findAllDeleted(Number(TokenPayload.sub_id));
  }

  // 🔍 Endpoint de busca
  @Get('search')
  search(@Query('term') term: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.groupService.search(Number(TokenPayload.sub_id), term);
  }
  // 🔍 Endpoint de busca
  @Get('search/simples')
  findMinimal(@Query('term') term: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.groupService.search(Number(TokenPayload.sub_id), term);
  }

  @Get()
  findAll(@TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.groupService.findAll(Number(TokenPayload.sub_id));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.groupService.findOne(+id, Number(TokenPayload.sub_id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.groupService.update(+id, updateGroupDto, Number(TokenPayload.sub_id));
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.groupService.restore(+id, Number(TokenPayload.sub_id));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.groupService.remove(+id, Number(TokenPayload.sub_id));
  }

  @Delete(':id/hard')
  hardDelete(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    if (TokenPayload.role !== 'admin_manager') {
      throw new ForbiddenException('Apenas admin_manager pode remover itens permanentemente.');
    }
    return this.groupService.hardDelete(+id, Number(TokenPayload.sub_id));
  }
}
