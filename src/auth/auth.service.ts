import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SignInDto } from './dto/signin.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HashingServiceProtocol } from './hash/hashing.service';

@Injectable()
export class AuthService {

  constructor(
    private prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol
  ) { }

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

    return {
      id: professional.id,
      name: professional.name,
      email: professional.email,
    }


  }


}
