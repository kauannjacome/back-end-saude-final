
import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private queue: any;
  private readonly logger = new Logger(QueueService.name);

  async onModuleInit() {
    // Importação dinâmica porque p-queue é ESM
    const { default: PQueue } = await import('p-queue');

    this.queue = new PQueue({
      concurrency: 1, // Processa uma mensagem por vez para ser seguro com a API de Zap
      interval: 1000, // Intervalo mínimo entre execuções (opcional, mas bom para APIs rate-limited)
      intervalCap: 1 // No máximo 1 tarefa por segundo (ajuste conforme necessário)
    });

    this.queue.on('active', () => {
      this.logger.debug(`Trabalhando na tarefa. Tamanho atual da fila: ${this.queue.size}`);
    });

    this.queue.on('idle', () => {
      this.logger.debug(`Fila está vazia.`);
    });
  }

  async addJob(task: () => Promise<void> | void): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Fila não inicializada ainda. Executando tarefa imediatamente.');
      await task();
      return;
    }

    await this.queue.add(async () => {
      try {
        await task();
      } catch (error) {
        this.logger.error('Erro ao processar tarefa da fila:', error);
      }
    });
  }

  onModuleDestroy() {
    if (this.queue) {
      this.queue.pause();
      this.queue.clear();
    }
  }
}
