import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { SignInDto } from './dto/signin.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HashingServiceProtocol } from './hash/hashing.service';
import jwtConfig from './config/jwt.config';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';


@Injectable()
export class AuthService {

  constructor(
    private prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService
  ) {
    console.log("--------------------------")
    console.log(jwtConfiguration)
    console.log("--------------------------")
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


}
