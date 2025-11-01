// src/regulation/pdf/generate-regulation-pdf.ts
import PDFDocument from 'pdfkit-table';
import * as QRCode from 'qrcode';
import Str from '@supercharge/strings';


// Define layout padrão
const LAYOUT = {
  margin: 20,
  pageSize: 'A4',
  font: {
    header: { family: 'Helvetica-Bold', size: 16 },
    body: { family: 'Helvetica', size: 10 },
    small: { family: 'Helvetica-Oblique', size: 8 },
  },
  colors: {
    grayBox: '#E0E0E0',
  },
  signature: {
    width: 260,
    height: 35,
    gap: 10,
  },
};

/**
 * Gera o PDF completo de uma Regulation (ficha de regulação)
 * @param data Regulation completa com includes (patient, cares, care, creator, supplier, etc.)
 * @param copies Quantidade de vias (default 1)
 */
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
      Keywords: 'regulação, saúde, PDF',
      Creator: 'Sistema Municipal',
    },
  });

  const buffers: Buffer[] = [];
  doc.on('data', buffers.push.bind(buffers));
  const pdfDone = new Promise<Buffer>((resolve) =>
    doc.on('end', () => resolve(Buffer.concat(buffers))),
  );

  const patient = data.patient;
  const formatDate = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : 'N/A';

  for (let i = 0; i < copies; i++) {
    if (i > 0) doc.addPage();

    // === CABEÇALHO ===
    doc.y = 30;
    doc.font(LAYOUT.font.header.family)
      .fontSize(LAYOUT.font.header.size)
      .text('FICHA DE REGULAÇÃO', { align: 'center' })
      .moveDown(1.5);

    // Dados básicos da regulation
    doc.font(LAYOUT.font.body.family).fontSize(LAYOUT.font.body.size);
    doc.text(`Código: ${data.id_code || 'N/A'}`);
    doc.text(`Data da Solicitação: ${formatDate(data.request_date)}`);
    doc.text(`Status: ${data.status || 'N/A'}`);
    doc.text(`Prioridade: ${data.priority || 'N/A'}`);
    doc.text(`Observações: ${data.notes || 'N/A'}`);
    doc.moveDown();

    // === DADOS DO PACIENTE ===
    doc.font(LAYOUT.font.header.family)
      .fontSize(LAYOUT.font.body.size + 1)
      .text('Dados do Paciente', { underline: true });
    doc.moveDown(0.5);

    doc.font(LAYOUT.font.body.family).fontSize(LAYOUT.font.body.size);
    doc.text(`Nome: ${patient.full_name}`);
    doc.text(`CPF: ${patient.cpf}`);
    doc.text(`Telefone: ${(patient.phone || '') || 'N/A'}`);
    doc.text(
      `Endereço: ${patient.address || 'N/A'}, ${patient.neighborhood || ''}, ${patient.city || ''}/${patient.state || ''}`,
    );
    doc.moveDown(1.5);

    // === QR CODE ===
    const qrLink = `${process.env.LINK_BASE_QR_CODE || 'https://exemplo.com'}/auth-monitoring/${data.uuid}`;
    const qrDataUrl = await QRCode.toDataURL(qrLink);
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrImageBuffer = Buffer.from(base64Data, 'base64');

    const qrX = doc.page.width - 150;
    const qrY = doc.y - 10;
    doc.roundedRect(qrX - 15, qrY - 5, 130, 100, 10).fill(LAYOUT.colors.grayBox);
    doc.image(qrImageBuffer, qrX + 25, qrY + 10, { width: 70 });
    doc.fillColor('#000')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Acompanhe:', qrX - 5, qrY + 80, { width: 130, align: 'center' });
    doc.moveDown(3);

    // === TABELA DE CUIDADOS ===
    const table = {
      headers: ['Cuidado', 'Quantidade'],
      rows: data.cares.map((c) => [
        Str(c.care.name).limit(60, '...').toString(),
        c.quantity.toString(),
      ]),
    };

    await doc.table(table, {
      columnsSize: [400, 100],
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
      prepareRow: () => doc.font('Helvetica').fontSize(9),
    });

    // === LINHA DIVISÓRIA (MEIO DA FOLHA) ===
    const halfY = doc.page.height / 2;
    doc.moveTo(20, halfY).lineTo(doc.page.width - 20, halfY).dash(3, { space: 3 }).stroke();

    // === SEGUNDA VIA COM ASSINATURA ===
    const startY = halfY + 20;
    doc.font('Helvetica-Bold').fontSize(12).text('2ª VIA - ASSINATURA', 30, startY);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Paciente: ${patient.full_name}`, 30, startY + 30);
    doc.text(`CPF: ${patient.cpf}`, 30, startY + 45);
    doc.text('________________________________________', 30, startY + 100);
    doc.text('Assinatura do Responsável', 30, startY + 115);

    // === RODAPÉ ===
    const footerY = doc.page.height - 30;
    const subscriber = data.creator || { name: 'Secretaria Municipal de Saúde', email: '', telephone: '' };
    doc.font('Helvetica-Oblique')
      .fontSize(LAYOUT.font.body.size)
      .fillColor('#000')
      .text(
        `${subscriber.name || 'Secretaria de Saúde'} - telefone: ${
          subscriber.telephone || '' || 'N/A'
        } - email: ${subscriber.email || 'N/A'}`,
        30,
        footerY,
        { align: 'center', width: doc.page.width - 60 },
      );
  }

  doc.end();
  return await pdfDone;
}
