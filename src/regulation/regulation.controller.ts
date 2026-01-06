import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { RegulationService } from './regulation.service';
import { CreateRegulationDto } from './dto/create-regulation.dto';
import { UpdateRegulationDto } from './dto/update-regulation.dto';
import { UpdateStatusRegulationDto } from './dto/update-status-regulation.dto';

@Controller('regulation')
export class RegulationController {
  constructor(private readonly regulationService: RegulationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createRegulationDto: CreateRegulationDto) {
    return this.regulationService.create(createRegulationDto);
  }

  @Get('search')
  search(
    @Query('subscriber_id', ParseIntPipe) subscriber_id: number,
    @Query('term') term?: string,
  ) {
    return this.regulationService.search(subscriber_id, term);
  }
  @Get('by-patient/:patient_id')
  findByPatient(@Param('patient_id', ParseIntPipe) patient_id: number) {
    return this.regulationService.findByPatient(patient_id);
  }

  @Get()
  findAll(
    @Query('subscriber_id', new ParseIntPipe({ optional: true }))
    subscriber_id?: number,
  ) {
    if (!subscriber_id) {
      throw new Error('subscriber_id is required');
    }
    return this.regulationService.findAll(subscriber_id);
  }

  @Get('mobile/person/:uuid')
  findOnePublicPerson(@Param('uuid') uuid: string) {
    return this.regulationService.findOnePublicPerson(uuid);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.regulationService.findOne(id);
  }

  @Get('pdf/:id')
  async generatePdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const buffer = await this.regulationService.generatePdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="regulamento_${id}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Patch('status/:id')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStatusRegulationDto,
  ) {
    return this.regulationService.updateStatus(id, updateStatusDto.status);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRegulationDto: UpdateRegulationDto,
  ) {
    return this.regulationService.update(id, updateRegulationDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.regulationService.remove(id);
  }
}
