import { Global, Module } from '@nestjs/common';
import { HashingServiceProtocol } from './hash/hashing.service';
import { BcryptService } from './hash/bcrypt.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

// Módulo global - Pode ser usado na aplicação inteira ( não precisa importar em outros módulos pra usar )
@Global()
@Module({
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
