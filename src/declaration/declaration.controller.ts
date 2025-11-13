import { Controller, Get, Post, Body, Patch, Param, Delete, Res } from '@nestjs/common';
import { DeclarationService } from './declaration.service';
import type { Response } from 'express'; 

@Controller('declaration')
export class DeclarationController {
  constructor(private readonly declarationService: DeclarationService) {}



  @Get('pdf/:id')
async generatePdf(@Param('id') id: string, @Res() res: Response) {
  const pdfBuffer = await this.declarationService.generatePdf(Number(id));

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="declaracao_${id}.pdf"`,
    'Content-Length': pdfBuffer.length,
  });

  res.end(pdfBuffer);
}


}
