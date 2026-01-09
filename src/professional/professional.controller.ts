import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ProfessionalService } from './professional.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { TokenPayloadParam } from '../auth/param/token-payload.param';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';

@Controller('professional')
export class ProfessionalController {
  constructor(private readonly professionalService: ProfessionalService) { }

  @Post()
  create(@Body() createProfessionalDto: CreateProfessionalDto) {
    return this.professionalService.create(createProfessionalDto);
  }

  @UseGuards(AuthTokenGuard)
  @Get('search/simple')
  searchSimple(
    @Query('term') term: string,
    @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.professionalService.searchSimple(Number(TokenPayload.sub_id), term);
  }


  @Get('search')
  search(

    @Query('term') term: string,
  ) {
    console.log('🟢 [GET /professional/search]', { term });
    return this.professionalService.search(Number(1), term);
  }


  @Get()
  findAll() {
    return this.professionalService.findAll(Number(1));
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
