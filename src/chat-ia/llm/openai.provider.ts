import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface OpenAIConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface OpenAIResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

@Injectable()
export class OpenAIProvider implements OnModuleInit {
  private openai: OpenAI | null = null;
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly defaultModel = 'gpt-4o-mini';
  private readonly apiKey: string | undefined; // ✅ Permite undefined

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('API_KEY_OPEN_IA');

    if (!this.apiKey) {
      this.logger.warn(
        '⚠️  API_KEY_OPEN_IA não configurada. O serviço retornará respostas mock.'
      );
    }
  }

  onModuleInit() {
    if (this.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.apiKey,
      });
      this.logger.log('✅ OpenAI Provider inicializado com sucesso');
    } else {
      this.logger.warn('⚠️  OpenAI Provider em modo MOCK');
    }
  }

  async generateResponse(
    messages: ChatCompletionMessageParam[],
    config?: OpenAIConfig
  ): Promise<OpenAIResponse> {
    // Modo mock se não houver API key
    if (!this.apiKey || !this.openai) {
      return this.getMockResponse(messages);
    }

    try {
      this.logger.debug(`Gerando resposta com modelo: ${config?.model || this.defaultModel}`);
      this.logger.debug(`[OpenAIProvider] 📤 Enviando Payload: ${JSON.stringify(messages, null, 2)}`);

      const completion = await this.openai.chat.completions.create({
        model: config?.model || this.defaultModel,
        messages: messages,
        temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens,
        top_p: config?.topP ?? 1,
      });

      const choice = completion.choices[0];

      if (!choice?.message?.content) {
        throw new Error('Resposta da OpenAI está vazia ou inválida');
      }

      const response: OpenAIResponse = {
        content: choice.message.content,
        model: completion.model,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        finishReason: choice.finish_reason,
      };

      this.logger.debug(
        `Resposta gerada: ${response.usage.totalTokens} tokens, finish_reason: ${response.finishReason}`
      );
      this.logger.debug(`[OpenAIProvider] 📥 Recebido Response: ${JSON.stringify(response, null, 2)}`);

      return response;
    } catch (error) {
      this.logger.error('Erro ao chamar API da OpenAI:', error);

      if (error?.status === 429) {
        throw new Error('Limite de requisições da OpenAI excedido. Tente novamente em alguns instantes.');
      }

      if (error?.status === 401) {
        throw new Error('API Key da OpenAI inválida. Verifique suas credenciais.');
      }

      throw new Error(`Erro ao gerar resposta: ${error?.message || 'Erro desconhecido'}`);
    }
  }

  async generateSimpleResponse(
    prompt: string,
    systemPrompt?: string,
    config?: OpenAIConfig
  ): Promise<string> {
    const messages: ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await this.generateResponse(messages, config);
    return response.content;
  }

  async criarEmbedding(texto: string): Promise<number[]> {
    if (!this.apiKey || !this.openai) {
      this.logger.warn('Retornando embedding mock');
      return new Array(1536).fill(0);
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texto,
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('Erro ao criar embedding:', error);
      throw new Error(`Erro ao criar embedding: ${error?.message}`);
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey && !!this.openai;
  }

  private getMockResponse(messages: ChatCompletionMessageParam[]): OpenAIResponse {
    this.logger.warn('Retornando resposta MOCK');

    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop();

    return {
      content: `[MOCK] Esta é uma resposta de teste. Pergunta: "${typeof lastUserMessage?.content === 'string'
        ? lastUserMessage.content
        : 'N/A'
        }". Configure OPENAI_API_KEY no .env para usar a API real.`,
      model: 'mock-model',
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      finishReason: 'stop',
    };
  }
}