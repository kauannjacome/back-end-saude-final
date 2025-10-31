import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { RegulationService } from './regulation.service';
import { CreateRegulationDto } from './dto/create-regulation.dto';
import { UpdateRegulationDto } from './dto/update-regulation.dto';

@Controller('regulation')
export class RegulationController {
  constructor(private readonly regulationService: RegulationService) {}

  @Post()
  create(@Body() createRegulationDto: CreateRegulationDto) {
    return this.regulationService.create(createRegulationDto);
  }

    @Get()
  findAll(@Query('subscriber_id') subscriber_id: number) {
    return this.regulationService.findAll(Number(subscriber_id));
  }


  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.regulationService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRegulationDto: UpdateRegulationDto) {
    return this.regulationService.update(+id, updateRegulationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.regulationService.remove(+id);
  }
}
