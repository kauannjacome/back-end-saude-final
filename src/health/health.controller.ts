import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private prisma: PrismaService,
  ) { }

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // 1. Memória (Heap < 150MB)
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),

      // 2. Banco de Dados (Ping simples)
      async () => {
        try {
          await this.prisma.$queryRawUnsafe('SELECT 1');
          return {
            database: {
              status: 'up',
              message: 'Prisma Client Connected'
            }
          };
        } catch (error) {
          throw new HealthCheckError('Database check failed', {
            database: { status: 'down', message: error.message }
          });
        }
      },

      // 3. Uptime customizado
      () => ({
        uptime: {
          status: 'up',
          uptime_seconds: process.uptime(),
        }
      })
    ]);
  }
}
