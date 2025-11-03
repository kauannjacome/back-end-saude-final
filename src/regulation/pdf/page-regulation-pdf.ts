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

export async function PageRegulationPdf(
  data: any,
  copies: number = 1
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
    doc.on('end', () => resolve(Buffer.concat(buffers)))
  );

  const patient = data.patient;
  const subscriber = data.subscriber;
  const analyzer = data.analyzer;
  const folder = data.folder;

  const formatDate = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : 'N/A';

  // === Logos ===
  try {
    if (subscriber.state_logo) {
      const resEstadual = await fetch(subscriber.state_logo);
      const bufEstadual = await resEstadual.arrayBuffer();
      doc.image(Buffer.from(bufEstadual), 30, 0, { width: 50 });
    }

  // Logo da administração (centro)
  if (subscriber.administration_logo) {
    const resAdm = await fetch(subscriber.administration_logo);
    const bufAdm = await resAdm.arrayBuffer();

    // Centraliza horizontalmente: (largura total A4 = 595.28pt)
    const centerX = (595.28 / 2) - (50 / 2); // 50 = largura do logo
    const centerY = 0; // topo

    doc.image(Buffer.from(bufAdm), centerX, centerY, { width: 50 });
  }

    if (subscriber.municipal_logo) {
      const resMunicipal = await fetch(subscriber.municipal_logo);
      const bufMunicipal = await resMunicipal.arrayBuffer();
      doc.image(Buffer.from(bufMunicipal), 500, 0, { width: 50 });
    }

       // 🔽 Apenas move o cursor Y mais para baixo se houver o logo central
    if (subscriber.administration_logo) {
      doc.y += 30; // abaixa o cabeçalho cerca de 70 pts (ajuste conforme visual)
    } else {
      doc.y = 20; // valor padrão se não tiver logo
    }
  } catch {
    // ignora erro de logo
  }

  // === Cabeçalho ===

  doc
    .font(LAYOUT.font.header.family)
    .fontSize(LAYOUT.font.header.size)
    .text('FICHA DE REGULAÇÃO', { align: 'center' });

  doc
    .font(LAYOUT.font.body.family)
    .fontSize(LAYOUT.font.body.size)
    .text(`${subscriber.municipality_name || 'N/A'}`, { align: 'center' })
    .text(`${subscriber.email || 'N/A'}`, { align: 'center' })
    .text(`${subscriber.telephone || 'N/A'}`, { align: 'center' })
    
    .moveDown(0.5);

  // === Dados do paciente ===
  doc
    .font(LAYOUT.font.header.family)
    .fontSize(LAYOUT.font.body.size + 1)
    .text('Paciente', { underline: true });

  doc
    .font(LAYOUT.font.body.family)
    .fontSize(LAYOUT.font.body.size)
    .text(`Nome: ${patient.full_name}`)
    .text(`CPF: ${patient.cpf}`)
    .text(`Telefone: ${patient.phone || 'N/A'}`)
    .text(
      `Endereço: ${patient.address || 'N/A'}, ${patient.neighborhood || ''}, ${patient.city || ''}/${patient.state || ''}`
    )
    .moveDown(0.5);

  // === Observações ===
  doc
    .font(LAYOUT.font.header.family)
    .fontSize(LAYOUT.font.body.size + 1)
    .text('Observações', { underline: true })
    .moveDown(0.5);

  doc
    .font(LAYOUT.font.body.family)
    .fontSize(LAYOUT.font.body.size)
    .text(Str(data.notes || 'N/A').limit(4000, '...').toString(), {
      width: 460,
      align: 'justify',
    });

  // === Regulação ===
  doc
    .font(LAYOUT.font.header.family)
    .fontSize(LAYOUT.font.body.size + 1)
    .text('Regulação', { underline: true });

  doc
    .font(LAYOUT.font.body.family)
    .fontSize(LAYOUT.font.body.size)
    .text(`Nome: ${analyzer?.name || 'N/A'}`)
    .text(`Pasta: ${folder?.name || 'N/A'}`);

  // Guarda posição para QR / logos
  const startY = doc.y;
  const tableX = doc.x;
  const tableY = doc.y;

  // === QR Code ===
  const qrLink = `${
    process.env.LINK_BASE_QR_CODE || 'https://exemplo.com'
  }/auth-monitoring/${data.uuid}`;
  const qrDataUrl = await QRCode.toDataURL(qrLink);
  const qrBuffer = Buffer.from(
    qrDataUrl.replace(/^data:image\/png;base64,/, ''),
    'base64'
  );

  const qrY = 70;
  const qrX = 430;

  // Moldura
  doc
    .rect(qrX - 5, qrY - 5, 150, 60)
    .strokeColor('#000000')
    .lineWidth(1)
    .stroke();

  doc.image(qrBuffer, qrX, qrY, { width: 50, height: 50 });

  doc.fontSize(8);
  doc.text(`Código: ${data.id_code || 'N/A'}`, qrX + 60, qrY);
  doc.text(`Data: ${formatDate(data.created_at)}`, qrX + 60, qrY + 15);
  doc.text(`Status: ${data.status || 'N/A'}`, qrX + 60, qrY + 30);
  doc.text(`Prioridade: ${data.priority || 'N/A'}`, qrX + 60, qrY + 45);



  doc.x = tableX;
  doc.y = tableY;

  // === Tabela de Cuidados ===
  doc.moveDown(1.2);
  if (Array.isArray(data.cares) && data.cares.length > 0) {
    const table = {
      headers: ['Cuidado', 'Quantidade'],
      rows: data.cares.map((c) => [
        Str(c.care?.name || '').limit(60, '...').toString(),
        c.quantity?.toString() || '0',
      ]),
    };

    await doc.table(table, {
      columnsSize: [480, 80],
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9),
      prepareRow: () => doc.font('Helvetica').fontSize(8),
    });
    
  }

  // === Assinaturas ===
  doc.moveDown(1.5);
  const xSignature = doc.x;
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

  // === Finaliza ===
  doc.end();
  return await pdfDone;
}
