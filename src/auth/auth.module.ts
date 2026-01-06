import { Global, Module } from '@nestjs/common';
import { HashingServiceProtocol } from './hash/hashing.service';
import { BcryptService } from './hash/bcrypt.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from './config/jwt.config';
import { JwtModule } from '@nestjs/jwt';

// Módulo global - Pode ser usado na aplicação inteira ( não precisa importar em outros módulos pra usar )
@Global()
@Module({
  imports: [PrismaModule,
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider ())
  ],
  providers: [
    {
      provide: HashingServiceProtocol,
      useClass: BcryptService
    },
    AuthService
  ],
  exports: [
    HashingServiceProtocol
  ],
  controllers: [AuthController]
})
export class AuthModule { }
