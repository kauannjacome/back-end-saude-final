import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
  }

async sendPasswordRecovery(to: string, token: string) {
  try {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to,
      subject: 'Recuperação de Senha',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #333;">Recuperação de Senha</h2>

          <p>Você solicitou a redefinição da sua senha.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a
              href="${resetLink}"
              style="
                background-color: #007bff;
                color: #ffffff;
                padding: 12px 20px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                display: inline-block;
              "
            >
              Clique aqui para redefinir a senha
            </a>
          </div>

          <p style="font-size: 14px; color: #555;">
            Este link é válido por tempo limitado.
          </p>

          <p style="font-size: 12px; color: #666; margin-top: 30px;">
            Se você não solicitou esta alteração, ignore este e-mail.
          </p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    throw new InternalServerErrorException(
      'Falha ao enviar e-mail de recuperação.',
    );
  }
}

}
