
import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service';

@Global() // Deixando global para não precisar importar em todo lugar, mas pode ser removido se preferir explícito
@Module({
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule { }
