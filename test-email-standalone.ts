
import * as nodemailer from 'nodemailer';

async function main() {
  console.log('Testing Nodemailer...');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'akautecsystem@gmail.com',
      pass: 'ytqdghyrjsdvichx',
    },
  });

  try {
    const info = await transporter.sendMail({
      from: 'akautecsystem@gmail.com',
      to: 'akautecsystem@gmail.com',
      subject: 'Teste de Recuperação de Senha - Sistema Saúde',
      html: '<h1>Teste</h1><p>Se você recebeu isso, o envio de e-mails está funcionando!</p>',
    });
    console.log('Email enviado com sucesso: %s', info.messageId);
  } catch (error) {
    console.error('Erro ao enviar email:', error);
  }
}

main();
