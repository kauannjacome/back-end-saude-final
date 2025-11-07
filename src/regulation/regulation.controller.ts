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

@Controller('regulation')
export class RegulationController {
  constructor(private readonly regulationService: RegulationService) {}

  @Post()
  create(@Body() createRegulationDto: CreateRegulationDto) {
    return this.regulationService.create(createRegulationDto);
  }

  // 🔍 Endpoint de busca
@Get('search')
search(@Query('subscriber_id') subscriber_id: number, @Query('term') term: string) {
  return this.regulationService.search(Number(subscriber_id), term);
}


  @Get()
  findAll(@Query('subscriber_id') subscriber_id: number) {
    return this.regulationService.findAll(Number(subscriber_id));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.regulationService.findOne(+id);
  }

  @Get(':id/pdf')
  async generatePdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.regulationService.generatePdf(Number(id));

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="regulamento_${id}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }


    @Get(':id/request')
  async requestPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.regulationService.requestPdf(Number(id));

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="regulamento_${id}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
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
