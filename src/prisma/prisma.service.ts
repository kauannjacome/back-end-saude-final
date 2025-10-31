import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'], // Mostra logs úteis no terminal
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Prisma conectado ao banco de dados.');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🛑 Prisma desconectado do banco de dados.');
  }
}
