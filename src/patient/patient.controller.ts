import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PaginationDto } from './dto/pagination-dto';

@Controller('patient')
export class PatientController {
  constructor(private readonly patientService: PatientService) { }

  @Post()
  create(@Body() createPatientDto: CreatePatientDto) {
    return this.patientService.create(createPatientDto);
  }

  @Get()
  findAll(@Query('subscriber_id') subscriber_id: number) {
    return this.patientService.findAll(Number(subscriber_id));
  }

  @Get('search')
  search(
    @Query('term') term: string,
    @Query() paginationDto: PaginationDto
  ) {
    return this.patientService.search(Number(1), term,paginationDto);
  }


  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.patientService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto) {
    return this.patientService.update(+id, updatePatientDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.patientService.remove(+id);
  }
}
