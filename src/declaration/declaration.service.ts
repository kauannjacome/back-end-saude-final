import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { Requerimento1Pdf } from './pdf/requerimento-1';
import { Requerimento2Pdf } from './pdf/requerimento-2';
import { AihPdf } from './pdf/aih';
import { AjudaDeCustoPDf } from './pdf/ajuda-de-custo';
import { AtulizacaoCadsusPdf } from './pdf/atulizacao-cadsus';
import { AutorizacaoPdf } from './pdf/autorizacao';
import { DesistenciaPdf } from './pdf/desistencia';

@Injectable()
export class DeclarationService {
  constructor(private prisma: PrismaService) { }

  async aihServices(id: number) {

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
    const pdfBuffer = await AihPdf(regulation);
    return pdfBuffer; // você pode retornar direto ou salvar num arquivo temporário
  }

  async ajudaDeCustoServices(id: number) {

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
    const pdfBuffer = await AjudaDeCustoPDf(regulation);
    return pdfBuffer; // você pode retornar direto ou salvar num arquivo temporário
  }

  async atualizacaoCadsusServices(id: number) {

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
    const pdfBuffer = await AtulizacaoCadsusPdf(regulation);
    return pdfBuffer; // você pode retornar direto ou salvar num arquivo temporário
  }

  async autorizacaoServices(id: number) {

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
    const pdfBuffer = await AutorizacaoPdf(regulation);
    return pdfBuffer; // você pode retornar direto ou salvar num arquivo temporário
  }

  async desistenciaServices(id: number) {

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
    const pdfBuffer = await DesistenciaPdf(regulation);
    return pdfBuffer; // você pode retornar direto ou salvar num arquivo temporário
  }

  async requerimento1Services(id: number) {

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
    const pdfBuffer = await Requerimento1Pdf(regulation);
    return pdfBuffer; // você pode retornar direto ou salvar num arquivo temporário
  }

  async requerimento2Services(id: number) {

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
    const pdfBuffer = await Requerimento2Pdf(regulation);
    return pdfBuffer; // você pode retornar direto ou salvar num arquivo temporário
  }




}
