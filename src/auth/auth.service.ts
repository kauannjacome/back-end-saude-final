import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { SignInDto } from './dto/signin.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HashingServiceProtocol } from './hash/hashing.service';
import jwtConfig from './config/jwt.config';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from 'src/email/email.service';


@Injectable()
export class AuthService {

  constructor(
    private prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService
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

    if (!professional.password_hash) {
      throw new HttpException(
        'Usuário não possui senha cadastrada',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const passwordIsValid = await this.hashingService.compare(
      signInDto.password,
      professional.password_hash,
    );

    if (!passwordIsValid) {
      throw new HttpException("Senha/Usuário incorretos", HttpStatus.UNAUTHORIZED)
    }

    const subscriber = await this.prisma.subscriber.findFirst({
      where: {
        id: professional.subscriber_id
      }
    })

    const token = await this.jwtService.signAsync(
      {
        user_id: professional.id,
        sub_id: professional.subscriber_id,
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


      token: token

    }


  }

  async forgotPassword(email: string) {
    const professional = await this.prisma.professional.findFirst({
      where: { email }
    });

    if (!professional) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    if (professional.role === 'admin_manager') {
      throw new HttpException(
        'Administradores não podem redefinir senha por aqui. Contate o suporte ou use a rota administrativa.',
        HttpStatus.FORBIDDEN
      );
    }

    // Gerar token (UUID simples ou aleatório forte)
    // Como é link, usar UUID é melhor. A lib `nanoid` ou node nativo `crypto`
    // Mas para manter simples/compatível, vamos usar um Math.random string mais longo
    const token = Math.floor(10000000 + Math.random() * 90000000).toString(); // 8 digitos

    // Expira em 1 hora
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);

    await this.prisma.professional.update({
      where: { id: professional.id },
      data: {
        reset_token: token,
        reset_token_expiry: expiry
      }
    });

    await this.emailService.sendPasswordRecovery(email, token);

    return { message: 'E-mail de recuperação enviado com sucesso' };
  }

  async resetPassword(token: string, newPassword: string) {
    const professional = await this.prisma.professional.findFirst({
      where: {
        reset_token: token,
        reset_token_expiry: {
          gt: new Date() // Expiração maior que agora (não expirado)
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
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expiry: null
      }
    });

    return { message: 'Senha alterada com sucesso' };
  }
  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const professional = await this.prisma.professional.findUnique({
      where: { id: userId }
    });

    if (!professional || !professional.password_hash) {
      return false;
    }

    return await this.hashingService.compare(password, professional.password_hash);
  }

  async impersonate(subscriberId: number) {
    // 1. Buscar um admin deste assinante para impersonar
    // Prioriza 'admin_municipal' (Admin Local/Assinante)
    let professional = await this.prisma.professional.findFirst({
      where: {
        subscriber_id: Number(subscriberId),
        role: 'admin_municipal'
      },
      orderBy: { created_at: 'asc' }
    });

    // Se não achar admin municipal, tenta qualquer usuário (fallback) para não impedir o acesso
    if (!professional) {
      professional = await this.prisma.professional.findFirst({
        where: {
          subscriber_id: Number(subscriberId),
        },
        orderBy: { created_at: 'asc' }
      });
    }

    if (!professional) {
      throw new HttpException("Nenhum usuário encontrado para este assinante para realizar o acesso.", HttpStatus.NOT_FOUND);
    }

    const subscriber = await this.prisma.subscriber.findUnique({
      where: { id: Number(subscriberId) }
    });

    // 2. Gerar Token (mesmo payload do login normal)
    const token = await this.jwtService.signAsync(
      {
        user_id: professional.id,
        sub_id: professional.subscriber_id,
        role: professional.role
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
      role: professional.role,
      nome_sub: subscriber?.name,
      pay_sub: subscriber?.payment,
      token: token,
      isImpersonating: true // Flag útil para o frontend saber (ex: mostrar banner)
    };
  }
}
