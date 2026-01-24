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

      // Carregar histórico de mensagens (últimas 5 por padrão)
      const historyLimit = parseInt(process.env.CHAT_CONTEXT_MESSAGES || '5');
      const recentMessages = await this.prisma.chat_message.findMany({
        where: { conversation_id: conversation.id },
        orderBy: { created_at: 'desc' },
        take: historyLimit,
        select: { role: true, content: true },
      });

      // Inverter ordem (mais antiga primeiro) e adicionar ao input
      const conversationHistory = recentMessages.reverse();

      // Summarize context if conversation is getting long
      let contextSummary: string | undefined = undefined;
      if (conversationHistory.length >= historyLimit) {
        const olderMessages = conversationHistory.slice(0, -3); // Keep last 3 in full
        if (olderMessages.length > 0) {
          contextSummary = `Resumo: Conversa sobre ${olderMessages.filter(m => m.role === 'user').map(m => m.content.substring(0, 30)).join(', ')}`;
        }
      }

      // Adicionar contexto ao input (se existir)
      if (conversation.context) {
        input.metadata = {
          ...input.metadata,
          context: conversation.context,
          conversationHistory,
          contextSummary
        };
        this.logger.debug(`[ChatIaService] 📥 Contexto carregado: ${JSON.stringify(conversation.context)}`);
      } else {
        input.metadata = {
          ...input.metadata,
          conversationHistory,
          contextSummary
        };
      }

      this.logger.debug(`[ChatIaService] 📜 Histórico: ${conversationHistory.length} mensagens`);

      // Processar com orchestrator
      const response = await this.orchestratorAgent.handle(input);

      // Atualizar contexto da conversa (se houver novo contexto)
      if (response.metadata.context) {
        await this.prisma.chat_conversation.update({
          where: { id: conversation.id },
          data: { context: response.metadata.context as any },
        });
        this.logger.debug(`[ChatIaService] 💾 Contexto atualizado: ${JSON.stringify(response.metadata.context)}`);
      } else if (response.metadata.clearContext) {
        await this.prisma.chat_conversation.update({
          where: { id: conversation.id },
          data: { context: null as any }, // Limpar contexto explicitamente
        });
        this.logger.debug(`[ChatIaService] 🧹 Contexto limpo`);
      }

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

    return conversations;
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

    return conversation;
  }

  async clearAllConversations(subscriberId: number, userId?: string) {
    const where: any = {
      subscriber_id: subscriberId,
    };

    if (userId) {
      where.OR = [
        { user_id: parseInt(userId) },
        { user_id: null },
      ];
    }

    const result = await this.prisma.chat_conversation.deleteMany({
      where,
    });

    this.logger.log(`🧹 Limpeza de conversas: ${result.count} conversas removidas para usuário ${userId || 'todos'} (Subscriber: ${subscriberId})`);

    return {
      message: 'Todas as conversas foram excluídas com sucesso.',
      count: result.count,
    };
  }
}
