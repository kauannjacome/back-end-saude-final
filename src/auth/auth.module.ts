import { Global, Module } from '@nestjs/common';
import { HashingServiceProtocol } from './hash/hashing.service';
import { BcryptService } from './hash/bcrypt.service';

// Módulo global - Pode ser usado na aplicação inteira ( não precisa importar em outros módulos pra usar )
@Global()
@Module({
  providers: [
    {
      provide: HashingServiceProtocol,
      useClass: BcryptService
    }
  ],
  exports: [
    HashingServiceProtocol
  ]
})
export class AuthModule { }
