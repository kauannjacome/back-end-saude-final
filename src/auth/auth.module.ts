import { Global, Module } from '@nestjs/common';
import { HashingServiceProtocol } from './hash/hashing.service';
import { EmailModule } from 'src/email/email.module';
import { BcryptService } from './hash/bcrypt.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from './config/jwt.config';
import { JwtModule } from '@nestjs/jwt';
import { ZapModule } from 'src/zap/module';

// Módulo global - Pode ser usado na aplicação inteira ( não precisa importar em outros módulos pra usar )
@Global()
@Module({
  imports: [
    PrismaModule,
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    EmailModule,
    ZapModule
  ],
  providers: [
    {
      provide: HashingServiceProtocol,
      useClass: BcryptService
    },
    AuthService
  ],
  exports: [
    HashingServiceProtocol,
    JwtModule,
    ConfigModule
  ],
  controllers: [AuthController]
})
export class AuthModule { }
