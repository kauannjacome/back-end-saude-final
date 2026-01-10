import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportFilterPriorityStatusCareDto } from './dto/report-filter-priority-status-care.dto';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { TokenPayloadParam } from '../auth/param/token-payload.param';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';
import { ReportFilterDto } from './dto/report-filters.dto';

@UseGuards(AuthTokenGuard)
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) { }

  @Post()
  create(@Body() createReportDto: CreateReportDto) {
    return this.reportService.create(createReportDto);
  }

  // --- Regulações: Lista e PDF (Consolidado) ---
  @Post('regulations/list')
  async listRegulations(@Body() filters: ReportFilterDto, @TokenPayloadParam() tokenPayload: PayloadTokenDto) {
    filters.subscriber_id = Number(tokenPayload.sub_id);
    return this.reportService.findAllRegulations(filters);
  }

  @Post('regulations/pdf')
  async generatePdf(@Body() filters: ReportFilterDto, @TokenPayloadParam() tokenPayload: PayloadTokenDto, @Res() res: Response) {
    filters.subscriber_id = Number(tokenPayload.sub_id);

    const pdfBuffer = await this.reportService.generateRegulationPdf(filters);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=relatorio-saude.pdf',
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Post("generate")
  async generateReport(@Body() filters: ReportFilterPriorityStatusCareDto, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    console.log("chegou aqui")
    filters.subscriber_id = Number(TokenPayload.sub_id)
    return this.reportService.getRegulationReport(filters);
  }




  @Get()
  findAll() {
    return this.reportService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReportDto: UpdateReportDto) {
    return this.reportService.update(+id, updateReportDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reportService.remove(+id);
  }
}
