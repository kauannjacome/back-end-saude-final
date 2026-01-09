import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
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
  create(@Body() createCareDto: CreateCareDto) {
    console.log(CreateCareDto)
    return this.careService.create(createCareDto);
  }
  // 🔍 Endpoint de busca
  @Get('search')
  search(
    @Query('term') term: string,
    @TokenPayloadParam() TokenPayload: PayloadTokenDto
  ) {
    console.log(term)
    return this.careService.search(Number(TokenPayload.sub_id), term);
  }

  @Get()
  findAll() {
    return this.careService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.careService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCareDto: UpdateCareDto) {
    console.log(UpdateCareDto)
    return this.careService.update(+id, updateCareDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.careService.remove(+id);
  }
}
