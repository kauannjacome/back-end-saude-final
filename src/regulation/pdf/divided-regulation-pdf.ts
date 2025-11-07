// src/regulation/pdf/generate-regulation-pdf.ts
import PDFDocument from 'pdfkit-table';
import * as QRCode from 'qrcode';
import Str from '@supercharge/strings';
import fetch from 'node-fetch';

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

export async function generateRegulationPdf(
  data: any,
  copies: number = 1,
): Promise<Buffer> {
  const doc = new (PDFDocument as any)({
    margin: LAYOUT.margin,
    size: LAYOUT.pageSize,
    bufferPages: true,
    info: {
      Title: `Regulação - ${data.id_code || 'N/A'}`,
      Author: data.creator?.name || 'Sistema de Regulação',
      Subject: 'Ficha de Regulação de Paciente',
      Creator: 'Sistema Municipal',
    },
  });

  const buffers: Buffer[] = [];
  doc.on('data', buffers.push.bind(buffers));
  const pdfDone = new Promise<Buffer>((resolve) =>
    doc.on('end', () => resolve(Buffer.concat(buffers))),
  );

  const patient = data.patient;
  const subscriber = data.subscriber;
  const analyzer = data.analyzer;
  const folder = data.folder;

  const formatDate = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : 'N/A';

  // ===============================
  // Função que desenha cada via
  // ===============================
  async function drawRegulationSection(startY: number, showSignature = false) {
    doc.y = startY;

    // === LOGOS (desenhar antes do texto) ===
    try {
      const logoWidth = 50;
      const logoHeight = 50;
      const spacingBelowLogos = 20;

      // Logo Estadual (esquerda)
      if (subscriber.state_logo) {
        const resEstadual = await fetch(subscriber.state_logo);
        const bufEstadual = await resEstadual.arrayBuffer();
        doc.image(Buffer.from(bufEstadual), 30, startY, { width: logoWidth });
      }

      // Logo da Administração (centro)
      if (subscriber.administration_logo) {
        const resAdm = await fetch(subscriber.administration_logo);
        const bufAdm = await resAdm.arrayBuffer();
        const centerX = (595.28 / 2) - (logoWidth / 2); // largura A4
        doc.image(Buffer.from(bufAdm), centerX, startY, { width: logoWidth });
      }

      // Logo Municipal (direita)
      if (subscriber.municipal_logo) {
        const resMunicipal = await fetch(subscriber.municipal_logo);
        const bufMunicipal = await resMunicipal.arrayBuffer();
        doc.image(Buffer.from(bufMunicipal), 500, startY, { width: logoWidth });
      }

      // Ajusta o cursor Y abaixo dos logos
      doc.y = startY + logoHeight ;
    } catch {
      // ignora erros de logo
      doc.moveDown(3);
    }

    // === Espaço adicional na segunda via ===
    if (showSignature) doc.moveDown(1);

    // === Cabeçalho ===
    doc.font(LAYOUT.font.header.family)
      .fontSize(LAYOUT.font.header.size)
      .text('FICHA DE REGULAÇÃO', { align: 'center' });

    doc.font(LAYOUT.font.body.family).fontSize(LAYOUT.font.body.size);
    doc.text(`${subscriber.municipality_name || 'N/A'}`, { align: 'center' });
    doc.text(`${subscriber.email || 'N/A'}`, { align: 'center' });
    doc.text(`${subscriber.telephone || 'N/A'}`, { align: 'center' });


    doc.y =startY +50
    doc.moveDown(0.5);

    // === Dados do paciente ===
    doc.font(LAYOUT.font.header.family)
      .fontSize(LAYOUT.font.body.size + 1)
      .text('Paciente', { underline: true });

    doc.font(LAYOUT.font.body.family).fontSize(LAYOUT.font.body.size);
    doc.text(`Nome: ${patient.full_name}`);
    doc.text(`CPF: ${patient.cpf}`);
    doc.text(`Telefone: ${patient.phone || 'N/A'}`);
    doc.text(
      `Endereço: ${patient.address || 'N/A'}, ${patient.neighborhood || ''}, ${patient.city || ''}/${patient.state || ''}`,
    );

    doc.moveDown(0.5);

    // === Observações e Regulação (apenas na 2ª via) ===
    if (showSignature) {
      doc.font(LAYOUT.font.header.family)
        .fontSize(LAYOUT.font.body.size + 1)
        .text('Observações', { underline: true });
      doc.moveDown(0.5);

      doc.font(LAYOUT.font.body.family).fontSize(LAYOUT.font.body.size);
      const notes = Str(data.notes || 'N/A').limit(400, '...').toString();
      doc.text(notes, {
        width: 460,
        align: 'justify',
      });

      doc.moveDown(0.5);
      doc.font(LAYOUT.font.header.family)
        .fontSize(LAYOUT.font.body.size + 1)
        .text('Regulação', { underline: true });

      doc.font(LAYOUT.font.body.family).fontSize(LAYOUT.font.body.size);
      doc.text(`Nome: ${analyzer?.name || 'N/A'}`);
      doc.text(`Pasta: ${folder?.name || 'N/A'}`);
    }

    const tableX = doc.x;
    const tableY = doc.y;

    // === QR Code ===
    const qrLink = `${process.env.LINK_BASE_QR_CODE || 'https://exemplo.com'}/auth-monitoring/${data.uuid}`;
    const qrDataUrl = await QRCode.toDataURL(qrLink);
    const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

    const qrX = 430;
    const qrY = startY + 60;

    doc.rect(qrX - 5, qrY - 5, 150, 60)
      .strokeColor('#000000')
      .lineWidth(1)
      .stroke();

    doc.image(qrBuffer, qrX, qrY, { width: 50, height: 50 });

    doc.fontSize(8);
    doc.text(`Código: ${data.id_code || 'N/A'}`, qrX + 60, qrY);
    doc.text(`Data: ${formatDate(data.created_at)}`, qrX + 60, qrY + 15);
    doc.text(`Status: ${data.status || 'N/A'}`, qrX + 60, qrY + 30);
    doc.text(`Prioridade: ${data.priority || 'N/A'}`, qrX + 60, qrY + 45);

    // === Tabela de cuidados ===
    doc.x = tableX;
    doc.y = tableY;
    doc.moveDown(1.2);

    const table = {
      headers: ['Solicitações', 'Quantidade'],
      rows: data.cares.slice(0, 10).map((c) => [
        Str(c.care.name).limit(60, '...').toString(),
        c.quantity.toString(),
      ]),
    };

    await doc.table(table, {
      columnsSize: [480, 80],
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9),
      prepareRow: () => doc.font('Helvetica').fontSize(8),
    });

    // === Assinaturas (somente na 2ª via) ===
    if (showSignature) {
      const xSignature = doc.x;
      doc.moveDown(1.5);
      const ySignature = doc.y;

      doc.text('________________________________________');
      doc.text('1. Assinatura do Responsável');

      doc.x = xSignature + 200;
      doc.y = ySignature;
      doc.text('________________________________________');
      doc.text('2. Assinatura do Resolvido');

      doc.x = xSignature + 400;
      doc.y = ySignature;
      doc.text('STATUS: _________________________');
      doc.moveDown(1);
      doc.text('DATA: ____/____/________');
    }
  }

  // === Primeira via ===
  await drawRegulationSection(20, false);

    // === Linha divisória ===
console.log(doc.y)
  // === Linha divisória ===
  const afterFirstTableY = 320;
  doc.moveTo(2, afterFirstTableY)
    .lineTo(doc.page.width - 20, afterFirstTableY)
    .dash(3, { space: 3 })
    .stroke();
  doc.undash();

  // === Segunda via ===
  await drawRegulationSection(afterFirstTableY + 40, true);

  // === Finaliza ===
  doc.end();
  return await pdfDone;
}
