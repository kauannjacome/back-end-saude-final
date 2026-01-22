import { Controller, Get, Post, Body, Patch, Param, Delete, Res, UseGuards } from '@nestjs/common';
import { DeclarationService } from './declaration.service';
import type { Response } from 'express';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';

@UseGuards(AuthTokenGuard)
@Controller('declaration')
export class DeclarationController {
  constructor(private readonly declarationService: DeclarationService) { }



  @Get('aih/:id')
  async aihController(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.declarationService.aihServices(Number(id));
    this.sendPdf(res, id, 'aih', pdfBuffer);
  }

  @Get('ajuda-de-custo/:id')
  async ajudaDeCustoController(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.declarationService.ajudaDeCustoServices(Number(id));
    this.sendPdf(res, id, 'ajuda_de_custo', pdfBuffer);
  }

  @Get('atualizacao-cadsus/:id')
  async atualizacaoCadsusController(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.declarationService.atualizacaoCadsusServices(Number(id));
    this.sendPdf(res, id, 'atualizacao_cadsus', pdfBuffer);
  }

  @Get('autorizacao/:id')
  async autorizacaoController(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.declarationService.autorizacaoServices(Number(id));
    this.sendPdf(res, id, 'autorizacao', pdfBuffer);
  }

  @Get('desistencia/:id')
  async desistenciaController(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.declarationService.desistenciaServices(Number(id));
    this.sendPdf(res, id, 'desistencia', pdfBuffer);
  }

  @Get('requerimento1/:id')
  async requerimento1controller(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.declarationService.requerimento1Services(Number(id));
    this.sendPdf(res, id, 'requerimento_1', pdfBuffer);
  }

  @Get('requerimento2/:id')
  async requerimento2controller(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.declarationService.requerimento2Services(Number(id));
    this.sendPdf(res, id, 'requerimento_2', pdfBuffer);
  }

  private sendPdf(res: Response, id: string, type: string, buffer: Buffer) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${type}_${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

}
