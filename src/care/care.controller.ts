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
  create(@Body() createCareDto: CreateCareDto, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    console.log(CreateCareDto)
    return this.careService.create(createCareDto, Number(TokenPayload.sub_id));
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

  @Get('min-deadline/check')
  checkMinDeadline(
    @Query('care_id') careId: string,
    @Query('patient_id') patientId: string,
    @TokenPayloadParam() tokenPayload: PayloadTokenDto
  ) {
    return this.careService.checkMinDeadline(
      Number(careId),
      Number(patientId),
      Number(tokenPayload.sub_id)
    );
  }

  @Get()
  findAll(@TokenPayloadParam() tokenPayload: PayloadTokenDto) {
    return this.careService.findAll(Number(tokenPayload.sub_id));
  }

  @Get(':id')
  @Get(':id')
  findOne(@Param('id') id: string, @TokenPayloadParam() tokenPayload: PayloadTokenDto) {
    return this.careService.findOne(+id, Number(tokenPayload.sub_id));
  }

  @Patch(':id')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCareDto: UpdateCareDto, @TokenPayloadParam() tokenPayload: PayloadTokenDto) {
    console.log(UpdateCareDto)
    return this.careService.update(+id, updateCareDto, Number(tokenPayload.sub_id));
  }

  @Delete(':id')
  @Delete(':id')
  remove(@Param('id') id: string, @TokenPayloadParam() tokenPayload: PayloadTokenDto) {
    return this.careService.remove(+id, Number(tokenPayload.sub_id));
  }
}
