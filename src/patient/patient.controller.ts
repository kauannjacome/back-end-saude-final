import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPaginationDto } from './dto/search-pagination-dto';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { TokenPayloadParam } from '../auth/param/token-payload.param';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';

@UseGuards(AuthTokenGuard)
@Controller('patient')
export class PatientController {
  constructor(private readonly patientService: PatientService) { }

  @Post()
  create(@Body() createPatientDto: CreatePatientDto, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.patientService.create(createPatientDto, Number(TokenPayload.sub_id));
  }

  @Get()
  findAll(@TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.patientService.findAll(Number(TokenPayload.sub_id));
  }

  @Get('search')
  search(
    @Query('term') term: string,
    @TokenPayloadParam() TokenPayload: PayloadTokenDto
  ) {
    return this.patientService.search(Number(TokenPayload.sub_id), term);
  }


  @Get(':id')
  findOne(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.patientService.findOne(+id, Number(TokenPayload.sub_id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.patientService.update(+id, updatePatientDto, Number(TokenPayload.sub_id));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.patientService.remove(+id, Number(TokenPayload.sub_id));
  }
}
