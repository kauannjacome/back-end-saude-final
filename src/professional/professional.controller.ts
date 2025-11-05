import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ProfessionalService } from './professional.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';

@Controller('professional')
export class ProfessionalController {
  constructor(private readonly professionalService: ProfessionalService) { }

  @Post()
  create(@Body() createProfessionalDto: CreateProfessionalDto) {
    return this.professionalService.create(createProfessionalDto);
  }

  @Get('search')
  search(

    @Query('term') term: string,
  ) {
    console.log('🟢 [GET /professional/search]', { term });
    return this.professionalService.search(Number(1), term);
  }


  @Get()
  findAll(@Query('subscriber_id') subscriber_id: number) {
    return this.professionalService.findAll(Number(subscriber_id));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.professionalService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProfessionalDto: UpdateProfessionalDto) {
    return this.professionalService.update(+id, updateProfessionalDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.professionalService.remove(+id);
  }
}
