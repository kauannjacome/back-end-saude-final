import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ProfessionalService } from './professional.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';

@Controller('professional')
export class ProfessionalController {
  constructor(private readonly professionalService: ProfessionalService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProfessionalDto: CreateProfessionalDto) {
    return this.professionalService.create(createProfessionalDto);
  }

  @Get('search/simple')
  searchSimple(
    @Query('subscriber_id', ParseIntPipe) subscriber_id: number,
    @Query('term') term?: string,
  ) {
    return this.professionalService.searchSimple(subscriber_id, term);
  }

  @Get('search')
  search(
    @Query('subscriber_id', ParseIntPipe) subscriber_id: number,
    @Query('term') term?: string,
  ) {
    return this.professionalService.search(subscriber_id, term);
  }

  @Get()
  findAll(
    @Query('subscriber_id', new ParseIntPipe({ optional: true }))
    subscriber_id?: number,
  ) {
    if (!subscriber_id) {
      throw new Error('subscriber_id is required');
    }
    return this.professionalService.findAll(subscriber_id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.professionalService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProfessionalDto: UpdateProfessionalDto,
  ) {
    return this.professionalService.update(id, updateProfessionalDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.professionalService.remove(id);
  }
}
