import { Controller, Post, Get, Body, Param, Query, Req } from '@nestjs/common';
import { ChatIaService } from './chat-ia.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  conversationId?: string;
}

export class ChatResponseDto {
  message: string;
  conversationId?: string|null;
  metadata: {
    timestamp: string;
    tokensUsed?: number;
    executionTimeMs?: number;
    intent?: string;
  };
}

@ApiTags('Chat IA - IARA')
@Controller('chat-ia')
export class ChatIaController {
  constructor(private readonly chatIaService: ChatIaService) { }

  @Post()
  @ApiOperation({ summary: 'Enviar mensagem para a IARA' })
  @ApiResponse({ status: 200, description: 'Resposta da IARA', type: ChatResponseDto })
  async chat(
    @Body() dto: SendMessageDto,
    @Req() request: any,
  ): Promise<ChatResponseDto> {
    const subscriberId = request.user?.subscriber_id || 1;
    const userId = request.user?.id;

    return this.chatIaService.processMessage({
      message: dto.message,
      subscriberId,
      userId,
      conversationId: dto.conversationId,
    });
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Listar conversas do usuário' })
  async listConversations(
    @Req() request: any,
    @Query('limit') limit?: number,
  ) {
    const subscriberId = request.user?.subscriber_id || 1;
    const userId = request.user?.id;

    return this.chatIaService.listConversations(subscriberId, userId, limit);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Obter detalhes de uma conversa' })
  async getConversation(
    @Param('id') conversationId: string,
    @Req() request: any,
  ) {
    const subscriberId = request.user?.subscriber_id || 1;

    return this.chatIaService.getConversation(subscriberId, conversationId);
  }
}
