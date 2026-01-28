import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { SignInDto } from './dto/signin.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HashingServiceProtocol } from './hash/hashing.service';
import jwtConfig from './config/jwt.config';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from 'src/email/email.service';
import { ZapService } from 'src/zap/service';
import { nanoid } from 'nanoid';

const MAX_LOGIN_ATTEMPTS = 5;
const MAX_UNLOCK_ATTEMPTS = 10;

@Injectable()
export class AuthService {

  constructor(
    private prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly zapService: ZapService
  ) {
  }

  async authenticate(signInDto: SignInDto) {

    const professional = await this.prisma.professional.findFirst({
      where: {
        email: signInDto.email
      }
    })

    if (!professional) {
      throw new HttpException("Falha ao fazer o login", HttpStatus.UNAUTHORIZED)
    }

    // Verificar se usuário está bloqueado
    if (professional.isBlocked) {
      throw new HttpException(
        "Conta bloqueada. Solicite o desbloqueio por e-mail, WhatsApp ou contate um administrador.",
        HttpStatus.FORBIDDEN
      );
    }

    if (!professional.passwordHash) {
      throw new HttpException(
        'Usuário não possui senha cadastrada',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const passwordIsValid = await this.hashingService.compare(
      signInDto.password,
      professional.passwordHash,
    );

    if (!passwordIsValid) {
      // Incrementar tentativas de login
      const newTryCount = (professional.numberTry || 0) + 1;
      const shouldBlock = newTryCount >= MAX_LOGIN_ATTEMPTS;

      await this.prisma.professional.update({
        where: { id: professional.id },
        data: {
          numberTry: newTryCount,
          isBlocked: shouldBlock
        }
      });

      if (shouldBlock) {
        throw new HttpException(
          `Conta bloqueada após ${MAX_LOGIN_ATTEMPTS} tentativas inválidas. Solicite o desbloqueio.`,
          HttpStatus.FORBIDDEN
        );
      }

      const remaining = MAX_LOGIN_ATTEMPTS - newTryCount;
      throw new HttpException(
        `Senha/Usuário incorretos. ${remaining} tentativa(s) restante(s).`,
        HttpStatus.UNAUTHORIZED
      );
    }

    // Login correto - resetar contador de tentativas
    if (professional.numberTry && professional.numberTry > 0) {
      await this.prisma.professional.update({
        where: { id: professional.id },
        data: { numberTry: 0 }
      });
    }

    const subscriber = professional.subscriberId ? await this.prisma.subscriber.findFirst({
      where: {
        id: professional.subscriberId
      }
    }) : null

    const token = await this.jwtService.signAsync(
      {
        user_id: professional.id,
        sub_id: professional.subscriberId,
        role: professional.role
      },
      {
        secret: this.jwtConfiguration.secret,
        expiresIn: "30d",
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer
      }
    )

    return {
      id: professional.id,
      name: professional.name,
      email: professional.email,
      role: professional.role,
      nome_sub: subscriber?.name,
      pay_sub: subscriber?.payment,
      token: token,
      is_password_temp: professional.isPasswordTemp,
      accepted_terms: professional.acceptedTerms,
      accepted_terms_version: professional.acceptedTermsVersion
    }
  }

  async forgotPassword(email: string) {
    const professional = await this.prisma.professional.findFirst({
      where: { email }
    });

    if (!professional) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    if (professional.role === 'ADMIN_MANAGER') {
      throw new HttpException(
        'Administradores não podem redefinir senha por aqui. Contate o suporte ou use a rota administrativa.',
        HttpStatus.FORBIDDEN
      );
    }

    // Gerar token seguro com nanoid (21 caracteres por padrão)
    const token = nanoid(32);

    // Expira em 1 hora
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);

    await this.prisma.professional.update({
      where: { id: professional.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry
      }
    });

    await this.emailService.sendPasswordRecovery(email, token);

    return { message: 'E-mail de recuperação enviado com sucesso' };
  }

  async resetPassword(token: string, newPassword: string) {
    const professional = await this.prisma.professional.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        }
      }
    });

    if (!professional) {
      throw new HttpException('Token inválido ou expirado', HttpStatus.BAD_REQUEST);
    }

    const passwordHash = await this.hashingService.hash(newPassword);

    await this.prisma.professional.update({
      where: { id: professional.id },
      data: {
        passwordHash: passwordHash,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    return { message: 'Senha alterada com sucesso' };
  }

  // =============================================
  // DESBLOQUEIO POR EMAIL
  // =============================================
  async requestUnlockByEmail(email: string) {
    const professional = await this.prisma.professional.findFirst({
      where: { email }
    });

    if (!professional) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    if (!professional.isBlocked) {
      throw new HttpException('Conta não está bloqueada', HttpStatus.BAD_REQUEST);
    }

    // Verificar se excedeu limite de tentativas de desbloqueio
    if ((professional.numberUnlock || 0) >= MAX_UNLOCK_ATTEMPTS) {
      throw new HttpException(
        'Limite de tentativas de desbloqueio atingido. Contate um administrador.',
        HttpStatus.FORBIDDEN
      );
    }

    // Gerar token seguro com nanoid
    const token = nanoid(32);

    // Expira em 30 minutos
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 30);

    await this.prisma.professional.update({
      where: { id: professional.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry
      }
    });

    await this.emailService.sendUnlockAccount(email, token);

    return { message: 'E-mail de desbloqueio enviado com sucesso' };
  }

  async confirmUnlockByEmail(token: string) {
    const professional = await this.prisma.professional.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        }
      }
    });

    if (!professional) {
      throw new HttpException('Token inválido ou expirado', HttpStatus.BAD_REQUEST);
    }

    if (!professional.isBlocked) {
      throw new HttpException('Conta não está bloqueada', HttpStatus.BAD_REQUEST);
    }

    // Verificar se ainda pode desbloquear por email
    if ((professional.numberUnlock || 0) >= MAX_UNLOCK_ATTEMPTS) {
      throw new HttpException(
        'Limite de tentativas de desbloqueio atingido. Contate um administrador.',
        HttpStatus.FORBIDDEN
      );
    }

    // Incrementar contador de desbloqueios e desbloquear
    await this.prisma.professional.update({
      where: { id: professional.id },
      data: {
        isBlocked: false,
        numberTry: 0,
        numberUnlock: (professional.numberUnlock || 0) + 1,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    return { message: 'Conta desbloqueada com sucesso' };
  }

  // =============================================
  // DESBLOQUEIO POR WHATSAPP
  // =============================================
  async requestUnlockByWhatsApp(email: string) {
    const professional = await this.prisma.professional.findFirst({
      where: { email },
      include: { subscriber: true }
    });

    if (!professional) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    if (!professional.isBlocked) {
      throw new HttpException('Conta não está bloqueada', HttpStatus.BAD_REQUEST);
    }

    if (!professional.phoneNumber) {
      throw new HttpException('Usuário não possui telefone cadastrado', HttpStatus.BAD_REQUEST);
    }

    // Verificar se excedeu limite de tentativas de desbloqueio
    if ((professional.numberUnlock || 0) >= MAX_UNLOCK_ATTEMPTS) {
      throw new HttpException(
        'Limite de tentativas de desbloqueio atingido. Contate um administrador.',
        HttpStatus.FORBIDDEN
      );
    }

    // Gerar código de 6 dígitos para facilitar digitação
    const code = nanoid(6).toUpperCase();

    // Expira em 15 minutos
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 15);

    await this.prisma.professional.update({
      where: { id: professional.id },
      data: {
        resetToken: code,
        resetTokenExpiry: expiry
      }
    });

    // Enviar mensagem via WhatsApp
    const message = `🔓 *Código de Desbloqueio*\n\nSeu código para desbloquear a conta é:\n\n*${code}*\n\nEste código expira em 15 minutos.\n\nSe você não solicitou este desbloqueio, ignore esta mensagem.`;

    await this.zapService.sendMessage(
      professional.subscriberId!,
      professional.phoneNumber,
      message
    );

    return { message: 'Código de desbloqueio enviado via WhatsApp' };
  }

  async confirmUnlockByWhatsApp(email: string, code: string) {
    const professional = await this.prisma.professional.findFirst({
      where: {
        email,
        resetToken: code.toUpperCase(),
        resetTokenExpiry: {
          gt: new Date()
        }
      }
    });

    if (!professional) {
      throw new HttpException('Código inválido ou expirado', HttpStatus.BAD_REQUEST);
    }

    if (!professional.isBlocked) {
      throw new HttpException('Conta não está bloqueada', HttpStatus.BAD_REQUEST);
    }

    // Verificar se ainda pode desbloquear por WhatsApp
    if ((professional.numberUnlock || 0) >= MAX_UNLOCK_ATTEMPTS) {
      throw new HttpException(
        'Limite de tentativas de desbloqueio atingido. Contate um administrador.',
        HttpStatus.FORBIDDEN
      );
    }

    // Incrementar contador de desbloqueios e desbloquear
    await this.prisma.professional.update({
      where: { id: professional.id },
      data: {
        isBlocked: false,
        numberTry: 0,
        numberUnlock: (professional.numberUnlock || 0) + 1,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    return { message: 'Conta desbloqueada com sucesso' };
  }

  // =============================================
  // DESBLOQUEIO POR ADMIN (SEM LIMITE)
  // =============================================
  async adminUnlock(professionalId: number, adminRole: string) {
    // Apenas ADMIN_MANAGER ou ADMIN_MUNICIPAL podem desbloquear
    if (adminRole !== 'ADMIN_MANAGER' && adminRole !== 'ADMIN_MUNICIPAL') {
      throw new HttpException(
        'Apenas administradores podem desbloquear contas',
        HttpStatus.FORBIDDEN
      );
    }

    const professional = await this.prisma.professional.findUnique({
      where: { id: professionalId }
    });

    if (!professional) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    // Admin pode desbloquear mesmo se numberUnlock >= 10
    await this.prisma.professional.update({
      where: { id: professionalId },
      data: {
        isBlocked: false,
        numberTry: 0,
        numberUnlock: 0,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    return { message: 'Conta desbloqueada pelo administrador' };
  }

  // =============================================
  // MÉTODOS EXISTENTES
  // =============================================
  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const professional = await this.prisma.professional.findUnique({
      where: { id: userId }
    });

    if (!professional || !professional.passwordHash) {
      return false;
    }

    return await this.hashingService.compare(password, professional.passwordHash);
  }

  async updatePassword(userId: number, currentPassword: string, newPassword: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id: userId }
    });

    if (!professional) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    if (!professional.passwordHash) {
      throw new HttpException('Usuário não possui senha cadastrada', HttpStatus.BAD_REQUEST);
    }

    const isCurrentPasswordValid = await this.hashingService.compare(
      currentPassword,
      professional.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new HttpException('Senha atual incorreta', HttpStatus.UNAUTHORIZED);
    }

    if (currentPassword === newPassword) {
      throw new HttpException('A nova senha deve ser diferente da senha atual', HttpStatus.BAD_REQUEST);
    }

    const newPasswordHash = await this.hashingService.hash(newPassword);

    await this.prisma.professional.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        isPasswordTemp: false
      }
    });

    return { message: 'Senha atualizada com sucesso' };
  }

  async acceptTerms(userId: number, version: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id: userId }
    });

    if (!professional) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    await this.prisma.professional.update({
      where: { id: userId },
      data: {
        acceptedTerms: true,
        acceptedTermsAt: new Date(),
        acceptedTermsVersion: version
      }
    });

    return {
      message: 'Termos de uso aceitos com sucesso',
      accepted_at: new Date(),
      version: version
    };
  }

  async getTermsStatus(userId: number) {
    const professional = await this.prisma.professional.findUnique({
      where: { id: userId },
      select: {
        acceptedTerms: true,
        acceptedTermsAt: true,
        acceptedTermsVersion: true
      }
    });

    if (!professional) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    return {
      accepted_terms: professional.acceptedTerms,
      accepted_terms_at: professional.acceptedTermsAt,
      accepted_terms_version: professional.acceptedTermsVersion
    };
  }

  async impersonate(subscriberId: number, role?: string, adminUserId?: number) {
    let professional;

    if (role) {
      if (role === 'ADMIN_MUNICIPAL') {
        professional = await this.prisma.professional.findFirst({
          where: {
            subscriberId: Number(subscriberId),
            role: { in: ['ADMIN_MUNICIPAL', 'ADMIN_MANAGER'] }
          },
          orderBy: { createdAt: 'asc' }
        });
      } else {
        professional = await this.prisma.professional.findFirst({
          where: {
            subscriberId: Number(subscriberId),
            role: role as any
          },
          orderBy: { createdAt: 'asc' }
        });
      }
    } else {
      professional = await this.prisma.professional.findFirst({
        where: {
          subscriberId: Number(subscriberId),
          role: 'ADMIN_MUNICIPAL'
        },
        orderBy: { createdAt: 'asc' }
      });

      if (!professional) {
        professional = await this.prisma.professional.findFirst({
          where: {
            subscriberId: Number(subscriberId),
          },
          orderBy: { createdAt: 'asc' }
        });
      }
    }

    // VIRTUAL IMPERSONATION (Fallback)
    if (!professional && adminUserId) {
      const adminUser = await this.prisma.professional.findUnique({
        where: { id: adminUserId }
      });

      if (adminUser) {
        const subscriber = await this.prisma.subscriber.findUnique({
          where: { id: Number(subscriberId) }
        });

        const targetRole = role || 'ADMIN_MUNICIPAL';

        const token = await this.jwtService.signAsync(
          {
            user_id: adminUser.id,
            sub_id: Number(subscriberId),
            role: targetRole
          },
          {
            secret: this.jwtConfiguration.secret,
            expiresIn: "1d",
            audience: this.jwtConfiguration.audience,
            issuer: this.jwtConfiguration.issuer
          }
        );

        return {
          id: adminUser.id,
          name: `${adminUser.name} (Virtual)`,
          email: adminUser.email,
          role: targetRole,
          nome_sub: subscriber?.name,
          pay_sub: subscriber?.payment,
          token: token,
          isImpersonating: true
        };
      }
    }

    if (!professional) {
      throw new HttpException("Nenhum usuário encontrado para este assinante para realizar o acesso.", HttpStatus.NOT_FOUND);
    }

    const subscriber = await this.prisma.subscriber.findUnique({
      where: { id: Number(subscriberId) }
    });

    const finalRole = role || professional.role;

    const token = await this.jwtService.signAsync(
      {
        user_id: professional.id,
        sub_id: professional.subscriberId,
        role: finalRole
      },
      {
        secret: this.jwtConfiguration.secret,
        expiresIn: "1d",
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer
      }
    );

    return {
      id: professional.id,
      name: professional.name,
      email: professional.email,
      role: finalRole,
      nome_sub: subscriber?.name,
      pay_sub: subscriber?.payment,
      token: token,
      isImpersonating: true
    };
  }
}
