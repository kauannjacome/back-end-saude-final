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
} from '@nestjs/common';
import type { Response } from 'express'; // ✅ import type
import { RegulationService } from './regulation.service';
import { CreateRegulationDto } from './dto/create-regulation.dto';
import { UpdateRegulationDto } from './dto/update-regulation.dto';
import { UpdateStatusRegulationDto } from './dto/update-status-regulation.dto';

@Controller('regulation')
export class RegulationController {
  constructor(private readonly regulationService: RegulationService) { }

  @Post()
  create(@Body() createRegulationDto: CreateRegulationDto) {
    console.log(createRegulationDto)
    return this.regulationService.create(createRegulationDto);
  }

  // 🔍 Endpoint de busca
  @Get('search')
  search( @Query('term') term: string) {
    return this.regulationService.search(Number(1), term);
  }
  @Get('by-patient/:patient_id')
  findByPatient(@Param('patient_id') patient_id: string) {
    return this.regulationService.findByPatient(Number(patient_id));
  }


  @Get()
  findAll(@Query('subscriber_id') subscriber_id: number) {
    return this.regulationService.findAll(Number(subscriber_id));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.regulationService.findOne(+id);
  }

  @Get('pdf/:id')
  async generatePdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.regulationService.generatePdf(Number(id));

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="regulamento_${id}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }


  @Patch('status/:id')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusRegulationDto,
  ) {
    return this.regulationService.updateStatus(+id, updateStatusDto.status);
  }


  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRegulationDto: UpdateRegulationDto,
  ) {
    return this.regulationService.update(+id, updateRegulationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.regulationService.remove(+id);
  }
}
