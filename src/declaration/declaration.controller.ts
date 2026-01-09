import { Controller, Get, Post, Body, Patch, Param, Delete, Res, UseGuards } from '@nestjs/common';
import { DeclarationService } from './declaration.service';
import type { Response } from 'express';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';

@UseGuards(AuthTokenGuard)
@Controller('declaration')
export class DeclarationController {
  constructor(private readonly declarationService: DeclarationService) { }



  @Get('requerimento1/:id')
  async requerimento1controller(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.declarationService.requerimento1Services(Number(id));

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="declaracao_${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }


  @Get('requerimento2/:id')
  async requerimento2controller(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.declarationService.requerimento2Services(Number(id));

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="declaracao_${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

}
