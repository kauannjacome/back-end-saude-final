import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // Ajuste conforme a necessidade de segurança
  },
})
@Injectable()
export class RegulationGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('RegulationGateway');

  // Ao conectar, o cliente pode enviar o subscriberId via query params ou handshake
  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Cliente conectado: ${client.id}`);

    // Tenta pegar o subscriber_id da query string
    // Exemplo de conexão no front: io(API_URL, { query: { subscriberId: 123 } })
    const subscriberId = client.handshake.query.subscriberId;

    if (subscriberId) {
      const room = `subscriber_${subscriberId}`;
      client.join(room);
      this.logger.log(`Cliente ${client.id} entrou na sala: ${room}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  /**
   * Entra na sala específica do assinante.
   * Pode ser chamado via evento se não for passado no handshake.
   */
  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() subscriberId: number,
    @ConnectedSocket() client: Socket,
  ) {
    const room = `subscriber_${subscriberId}`;
    client.join(room);
    this.logger.log(`Cliente ${client.id} entrou via evento na sala: ${room}`);
  }

  /**
   * Notifica clientes de um assinante específico sobre atualizações nas regulações.
   * @param subscriberId ID do assinante (Tenant)
   */
  notifyRegulationUpdate(subscriberId: number) {
    const room = `subscriber_${subscriberId}`;
    this.logger.log(`Enviando sinal de atualização para sala: ${room}`);
    // Emite apenas para a sala do assinante
    this.server.to(room).emit('regulations_updated');
  }
}
