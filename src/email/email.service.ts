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

async sendUnlockAccount(to: string, token: string) {
  try {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const unlockLink = `${frontendUrl}/unlock-account?token=${token}`;

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to,
      subject: 'Desbloqueio de Conta',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #333;">Desbloqueio de Conta</h2>

          <p>Você solicitou o desbloqueio da sua conta.</p>

          <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>⚠️ Atenção:</strong> Sua conta foi bloqueada após múltiplas tentativas de login inválidas.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a
              href="${unlockLink}"
              style="
                background-color: #28a745;
                color: #ffffff;
                padding: 12px 20px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                display: inline-block;
              "
            >
              Clique aqui para desbloquear sua conta
            </a>
          </div>

          <p style="font-size: 14px; color: #555;">
            Este link é válido por 30 minutos.
          </p>

          <p style="font-size: 12px; color: #666; margin-top: 30px;">
            Se você não solicitou este desbloqueio, ignore este e-mail e considere alterar sua senha.
          </p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Erro ao enviar email de desbloqueio:', error);
    throw new InternalServerErrorException(
      'Falha ao enviar e-mail de desbloqueio.',
    );
  }
}

}
