import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import {  UpdateLocalCns } from './pdf/update-local-cns';

@Injectable()
export class DeclarationService {
    constructor(private prisma: PrismaService) {}


async generatePdf(id: number, copies: number = 1) {

    const regulation = await this.prisma.regulation.findUnique({
      where: { id },
      include: {
        patient: true,
        folder: true,
        supplier: true,
        creator: true,
        analyzer: true,
        subscriber: true,
        cares: {
          include: { care: true },
        },
      },
    });



    // const pdfBuffer = await generateRegulationPdf(regulation, copies);
    const pdfBuffer = await UpdateLocalCns(regulation);
    return pdfBuffer; // você pode retornar direto ou salvar num arquivo temporário
  }



}
