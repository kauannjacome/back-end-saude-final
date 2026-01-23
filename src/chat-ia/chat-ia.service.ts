import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { OrchestratorAgent, OrchestratorInput } from './agents/orchestrator.agent';

@Injectable()
export class ChatIaService {
  private readonly logger = new Logger(ChatIaService.name);

  constructor(
    private readonly orchestratorAgent: OrchestratorAgent,
    private readonly prisma: PrismaService,
  ) { }

  async processMessage(input: OrchestratorInput) {
    try {
      this.logger.log(`📨 Nova mensagem de usuário ${input.userId || 'anônimo'}`);

      // Buscar ou criar conversa
      let conversation;
      if (input.conversationId) {
        conversation = await this.prisma.chat_conversation.findUnique({
          where: { uuid: input.conversationId },
        });
      }

      if (!conversation) {
        conversation = await this.prisma.chat_conversation.create({
          data: {
            subscriber_id: input.subscriberId,
            user_id: input.userId ? parseInt(input.userId) : null,
            user_type: 'professional',
          },
        });
      }

      // Salvar mensagem do usuário
      await this.prisma.chat_message.create({
        data: {
          conversation_id: conversation.id,
          role: 'user',
          content: input.message,
        },
      });

      // Processar com orchestrator
      const response = await this.orchestratorAgent.handle(input);

      // Salvar resposta da IARA
      await this.prisma.chat_message.create({
        data: {
          conversation_id: conversation.id,
          role: 'assistant',
          content: response.message,
          tokens_used: response.metadata.tokensUsed,
          model: response.metadata.model,
          metadata: response.metadata,
        },
      });

      return {
        message: response.message,
        conversationId: conversation.uuid,
        metadata: {
          timestamp: response.metadata.timestamp,
          tokensUsed: response.metadata.tokensUsed,
          executionTimeMs: response.metadata.executionTimeMs,
          intent: response.metadata.intent,
        },
      };
    } catch (error) {
      this.logger.error('Erro ao processar mensagem:', error);
      throw error;
    }
  }

  async listConversations(
    subscriberId: number,
    userId?: string,
    limit: number = 20,
  ) {
    const conversations = await this.prisma.chat_conversation.findMany({
      where: {
        subscriber_id: subscriberId,
        user_id: userId ? parseInt(userId) : undefined,
      },
      include: {
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        started_at: 'desc',
      },
      take: limit,
    });

    return conversations.map((conv) => ({
      id: conv.uuid,
      startedAt: conv.started_at,
      lastMessage: conv.messages[0]?.content,
      lastMessageAt: conv.messages[0]?.created_at,
    }));
  }

  async getConversation(subscriberId: number, conversationId: string) {
    const conversation = await this.prisma.chat_conversation.findFirst({
      where: {
        uuid: conversationId,
        subscriber_id: subscriberId,
      },
      include: {
        messages: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    return {
      id: conversation.uuid,
      startedAt: conversation.started_at,
      messages: conversation.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        createdAt: msg.created_at,
        tokensUsed: msg.tokens_used,
      })),
    };
  }
}
