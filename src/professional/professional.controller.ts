import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ProfessionalService } from './professional.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { TokenPayloadParam } from '../auth/param/token-payload.param';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';

@UseGuards(AuthTokenGuard)
@Controller('professional')
export class ProfessionalController {
  constructor(private readonly professionalService: ProfessionalService) { }

  @Post()
  create(@Body() createProfessionalDto: CreateProfessionalDto) {
    return this.professionalService.create(createProfessionalDto);
  }

  @Get('search/simple')
  searchSimple(
    @Query('term') term: string,
    @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.professionalService.searchSimple(Number(TokenPayload.sub_id), term);
  }


  @Get('search')
  search(
    @Query('term') term: string,
    @TokenPayloadParam() TokenPayload: PayloadTokenDto
  ) {
    console.log('🟢 [GET /professional/search]', { term });
    return this.professionalService.search(Number(TokenPayload.sub_id), term);
  }


  @Get()
  findAll(@TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.professionalService.findAll(Number(TokenPayload.sub_id));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.professionalService.findOne(+id, Number(TokenPayload.sub_id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProfessionalDto: UpdateProfessionalDto, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.professionalService.update(+id, updateProfessionalDto, Number(TokenPayload.sub_id));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.professionalService.remove(+id, Number(TokenPayload.sub_id));
  }
}
