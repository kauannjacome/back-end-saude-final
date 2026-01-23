// src/regulation/pdf/generate-regulation-pdf.ts
import PDFDocument from 'pdfkit-table';
import * as QRCode from 'qrcode';
import Str from '@supercharge/strings';
import fetch from 'node-fetch';
import extenso from 'extenso';
import type { DeclarationPdfData } from './types';

const LAYOUT = {
  margin: 20,
  pageSize: 'A4',
  font: {
    header: { family: 'Helvetica-Bold', size: 10 },
    body: { family: 'Helvetica', size: 9 },
    small: { family: 'Helvetica-Oblique', size: 8 },
  },
  colors: {
    grayBox: '#E0E0E0',
    black: '#000',
  },
};

const DOCUMENT_TITLE = 'DECLARACAO DE RESIDENCIA (PEC)';

export async function RequestRegulationPdf(data: DeclarationPdfData): Promise<Buffer> {
  const doc = new (PDFDocument as any)({
    margin: LAYOUT.margin,
    size: LAYOUT.pageSize,
    bufferPages: true,
    info: {
      Title: `${DOCUMENT_TITLE} - ${data.id_code || 'N/A'}`,
      Author: data.creator?.name || 'Sistema de Regulação',
      Subject: 'Documento administrativo',
      Creator: 'Sistema Municipal',
    },
  });

  const buffers: Buffer[] = [];
  doc.on('data', buffers.push.bind(buffers));
  const pdfDone = new Promise<Buffer>((resolve) =>
    doc.on('end', () => resolve(Buffer.concat(buffers)))
  );

  const patient = data.patient;
  const subscriber = data.subscriber || {};

  const formatDate = (d: Date | string | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : 'N/A';
  const requestDate = formatDate(data.request_date);
  // === Logos ===
  try {
    if (subscriber.state_logo) {
      const resEstadual = await fetch(subscriber.state_logo);
      const bufEstadual = await resEstadual.arrayBuffer();
      doc.image(Buffer.from(bufEstadual), 30, 0, { width: 50 });
    }

    if (subscriber.administration_logo) {
      const resAdm = await fetch(subscriber.administration_logo);
      const bufAdm = await resAdm.arrayBuffer();
      const centerX = (595.28 / 2) - (50 / 2);
      const centerY = 0;
      doc.image(Buffer.from(bufAdm), centerX, centerY, { width: 50 });
    }

    if (subscriber.municipal_logo) {
      const resMunicipal = await fetch(subscriber.municipal_logo);
      const bufMunicipal = await resMunicipal.arrayBuffer();
      doc.image(Buffer.from(bufMunicipal), 500, 0, { width: 50 });
    }

    if (subscriber.administration_logo) {
      doc.y += 30;
    } else {
      doc.y = 20;
    }
  } catch {
    // Ignora erros de logo
  }

  // === Cabeçalho ===
  doc
    .font(LAYOUT.font.header.family)
    .fontSize(LAYOUT.font.header.size)
    .text(DOCUMENT_TITLE, { align: 'center' });

  doc
    .font(LAYOUT.font.body.family)
    .fontSize(LAYOUT.font.body.size)
    .text(`${subscriber.municipality_name || 'N/A'}`, { align: 'center' })
    .text(`${subscriber.email || 'N/A'}`, { align: 'center' })
    .text(`${subscriber.telephone || 'N/A'}`, { align: 'center' })
    .moveDown(0.5);

  // === Texto principal + Cuidados na mesma linha ===
  doc
    .font(LAYOUT.font.body.family) // sem negrito
    .fontSize(LAYOUT.font.body.size);

    let textoPrincipal = `Eu, ${patient?.name || 'N/A'}, inscrito(a) no CPF sob o numero ${patient?.cpf || 'N/A'}, residente e domiciliado(a) em ${patient?.address || 'N/A'}, ${patient?.neighborhood || ''}, ${patient?.city || ''}/${patient?.state || ''}, DECLARO, para fins de instrucao do processo administrativo de regulacao e sob as penas da lei (art. 299 do Codigo Penal), que solicito os seguintes procedimentos/servicos de saude: `;

  // === Cuidados (texto corrido em uma linha) ===
  if (Array.isArray(data.cares) && data.cares.length > 0) {

    const frases = data.cares.map((c) => {
      const nomeCuidado = Str(c.care?.name || '').limit(60, '...').toString();
      const quantidade = Number(c.quantity) || 0;

      // Se quantidade for 1 → não mostra número
      if (quantidade === 1) {
        return `${nomeCuidado}`;
      }

      // Se quantidade >= 2 → mostra número por extenso
      if (quantidade > 1) {
        const quantidadeTexto = extenso(quantidade, { mode: "number" });
        return `${quantidadeTexto} ${nomeCuidado}`;
      }

      return nomeCuidado;
    });

    const textoCorrido =
      frases.length === 1
        ? `${frases[0]}.`
        : frases.length === 2
          ? `${frases.join(' e ')}.`
          : `${frases.slice(0, -1).join(', ')} e ${frases.slice(-1)}.`;

    textoPrincipal += textoCorrido;
  } else {
    textoPrincipal += 'nenhum cuidado informado.';
  }

  // Adiciona tudo como um único parágrafo justificado
  doc.text(textoPrincipal.replace(/\s+/g, ' '), {
    align: 'justify',
    paragraphGap: 5,
    continued: false,
  });
    doc.text('Declaro, ainda, que as informacoes prestadas sao verdadeiras e autorizo o tratamento dos dados pessoais para fins administrativos, de auditoria e de controle, nos termos da Lei 13.709/2018 (LGPD).', {
    align: 'justify',
    paragraphGap: 5,
  });
  doc.text('E, para que produza seus efeitos legais, firmo a presente.', {
    align: 'justify',
    paragraphGap: 5,
  });
  doc.moveDown(1);
  doc.text(`${subscriber.municipality_name}/${subscriber.state_acronym}, ${requestDate}`, { align: 'right' });
  // === Assinaturas ===
  doc.y = doc.page.height - 80;

  // Centraliza os textos
  doc.text('________________________________________', { align: 'center' });
  doc.text('Assinatura do Responsável', { align: 'center' });

  // === Finaliza ===
  doc.end();
  return await pdfDone;
}
