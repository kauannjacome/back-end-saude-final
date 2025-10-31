import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CareService } from './care.service';
import { CreateCareDto } from './dto/create-care.dto';
import { UpdateCareDto } from './dto/update-care.dto';

@Controller('care')
export class CareController {
  constructor(private readonly careService: CareService) {}

  @Post()
  create(@Body() createCareDto: CreateCareDto) {
    return this.careService.create(createCareDto);
  }
  // 🔍 Endpoint de busca
  @Get('search/:subscriber_id')
  search(
    @Param('subscriber_id') subscriber_id: string,
    @Query('term') term: string,
  ) {
    return this.careService.search(+subscriber_id, term);
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
    return this.careService.update(+id, updateCareDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.careService.remove(+id);
  }
}
