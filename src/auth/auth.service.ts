import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import jwtConfig from './config/jwt.config';
import { SignInDto } from './dto/signin.dto';
import { HashingServiceProtocol } from './hash/hashing.service';

@Injectable()
export class AuthService {


  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
  ) {}

  async authenticate(signInDto: SignInDto) {
    const professional = await this.prisma.professional.findFirst({
      where: {
        email: signInDto.email.toLowerCase().trim(),
      },
    });

    if (!professional) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!professional.password_hash) {
      throw new UnauthorizedException(
        'Usuário não possui senha cadastrada',
      );
    }

    const passwordIsValid = await this.hashingService.compare(
      signInDto.password,
      professional.password_hash,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const subscriber = await this.prisma.subscriber.findUnique({
      where: {
        id: professional.subscriber_id,
      },
    });

    const token = await this.jwtService.signAsync(
      {
        user_id: professional.id,
        sub_id: professional.subscriber_id,
        role: professional.role,
      },
      {
        secret: this.jwtConfiguration.secret,
        expiresIn: this.jwtConfiguration.expiresIn || '30d',
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
      },
    );

    return {
      id: professional.id,
      name: professional.name,
      email: professional.email,
      nome_sub: subscriber?.name,
      role: professional.role,
      play_sub: subscriber?.payment,
      token,
    };
  }
}
