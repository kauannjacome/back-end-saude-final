// src/regulation/pdf/generate-regulation-pdf.ts
import PDFDocument from 'pdfkit-table';
import * as QRCode from 'qrcode';
import Str from '@supercharge/strings';
import fetch from 'node-fetch';

const LAYOUT = {
  margin: 20,
  pageSize: 'A4',
  font: {
    header: { family: 'Helvetica-Bold', size: 14 },
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
  const formatDate = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : 'N/A';

  async function drawRegulationSection(startY: number, showSignature = false) {
    doc.y = startY;

    // Espaço adicional na segunda via
    if (showSignature) doc.moveDown(2);

    // === Cabeçalho ===
    doc.font(LAYOUT.font.header.family)
      .fontSize(LAYOUT.font.header.size)
      .text('FICHA DE REGULAÇÃO', { align: 'center' });

    doc.font(LAYOUT.font.body.family).fontSize(LAYOUT.font.body.size);
    doc.text(`${subscriber.municipality_name || 'N/A'}`, { align: 'center' });
    doc.text(`${subscriber.email || 'N/A'}`, { align: 'center' });
    doc.text(`${subscriber.telephone || 'N/A'}`, { align: 'center' });

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

    doc.moveDown(0.3);

    // === Observações ===
    doc.font(LAYOUT.font.header.family)
      .fontSize(LAYOUT.font.body.size + 1)
      .text('Observações', { underline: true });

    doc.font(LAYOUT.font.body.family).fontSize(LAYOUT.font.body.size);
    doc.text(` ${data.notes || 'N/A'}`, {
      width: 460,
      align: 'justify',
    });
    const tableX = doc.x
    const tableY = doc.y
    // === QR Code e informações ===
    const qrLink = `${process.env.LINK_BASE_QR_CODE || 'https://exemplo.com'}/auth-monitoring/${data.uuid}`;
    const qrDataUrl = await QRCode.toDataURL(qrLink);
    const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');


    const qrX = 430;
    const qrY = startY + (50); // QR mais baixo na 2ª via
    // Desenha o retângulo em volta do bloco de QR + texto
    doc
      .rect(qrX - 5, qrY - 5, 150, 80) // x, y, largura, altura
      .strokeColor('#000000')           // cor da borda
      .lineWidth(1)
      .stroke();                        // desenha o contorno


    doc.image(qrBuffer, qrX, qrY, { width: 60, height: 60 });

    doc.fontSize(8);
    doc.text(`Código: ${data.id_code || 'N/A'}`, qrX + 60, qrY);
    doc.text(`Data: ${formatDate(data.created_at)}`, qrX + 60, qrY + 15);
    doc.text(`Status: ${data.status || 'N/A'}`, qrX + 60, qrY + 30);
    doc.text(`Prioridade: ${data.priority || 'N/A'}`, qrX + 60, qrY + 40);

    // === Logo (opcional) ===
    try {
      const res = await fetch(subscriber.state_logo);
      const buf = await res.arrayBuffer();
      doc.image(Buffer.from(buf), 20, startY, { width: 40, height: 40 });
    } catch {
      // ignora erro de logo
    }
    doc.x = tableX
    doc.y = tableY
    // === Tabela de cuidados ===
    doc.moveDown(0.8);
    const table = {
      headers: ['Cuidado', 'Quantidade'],
      rows: data.cares.map((c) => [
        Str(c.care.name).limit(60, '...').toString(),
        c.quantity.toString(),
      ]),
    };

    await doc.table(table, {
      columnsSize: [380, 80],
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9),
      prepareRow: () => doc.font('Helvetica').fontSize(8),
    });

    // === Campo de assinatura (apenas na segunda via) ===
    if (showSignature) {
          const x_signature = doc.x
      doc.moveDown(1.5);

      const y_signature = doc.y

      doc.text('________________________________________', );
      doc.text('Assinatura do Responsável', );
      doc.x =x_signature +300
      doc.y =y_signature  
         doc.text('________________________________________', );
      doc.text('Assinatura do Responsável', );
    }
  }

  // === Primeira via ===
  await drawRegulationSection(30, false);

  // === Linha divisória ===
  const halfY = doc.page.height / 2;
  doc.moveTo(20, halfY).lineTo(doc.page.width - 20, halfY).dash(3, { space: 3 }).stroke();
  doc.undash();
  // === Segunda via, com cabeçalho centralizado ===
  await drawRegulationSection(halfY + 50, true); // agora começa bem mais abaixo

  // === Finaliza ===
  doc.end();
  return await pdfDone;
}
