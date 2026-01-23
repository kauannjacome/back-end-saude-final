import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * PRISMA SERVICE
 * 
 * Responsabilidade: Gerenciar conexão única com o banco de dados
 * 
 * Problema Resolvido:
 * - Evita múltiplas instâncias do PrismaClient
 * - Gerencia conexão e desconexão automaticamente
 * - Singleton compartilhado entre todos os agentes
 * 
 * Uso:
 * - Injete este serviço em vez de criar new PrismaClient()
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Prisma conectado ao banco de dados (via adapter-pg)');
    } catch (error) {
      this.logger.error('❌ Erro ao conectar ao banco de dados:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma desconectado do banco de dados');
  }
}
