import { Injectable, Logger } from '@nestjs/common';
import { OpenAIProvider, OpenAIConfig } from '../llm/openai.provider';
import { RouterAgent } from './router.agent';
import { PatientAgent } from './patient.agent';
import { RegulationAgent } from './regulation.agent';
import { InfoAgent } from './info.agent';
import { ValidatorAgent } from './validator.agent';
import { FormatterAgent } from './formatter.agent';

export interface OrchestratorInput {
  message: string;
  subscriberId: number;
  conversationId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  config?: OpenAIConfig;
}

export interface OrchestratorOutput {
  message: string;
  metadata: {
    timestamp: string;
    agent: string;
    conversationId?: string;
    userId?: string;
    model?: string;
    tokensUsed?: number;
    executionTimeMs?: number;
    intent?: string;
    error?: string;
  };
}

@Injectable()
export class OrchestratorAgent {
  name = 'OrchestratorAgent';
  private readonly logger = new Logger(OrchestratorAgent.name);

  constructor(
    private readonly routerAgent: RouterAgent,
    private readonly patientAgent: PatientAgent,
    private readonly regulationAgent: RegulationAgent,
    private readonly infoAgent: InfoAgent,
    private readonly validatorAgent: ValidatorAgent,
    private readonly formatterAgent: FormatterAgent,
    private readonly openAIProvider: OpenAIProvider,
  ) { }

  async handle(input: OrchestratorInput): Promise<OrchestratorOutput> {
    const startTime = Date.now();

    this.logger.log(`📨 Processando mensagem do usuário${input.userId ? ` (User: ${input.userId})` : ''}`);
    this.logger.debug(`[Orchestrator] 📥 Input: ${JSON.stringify(input, null, 2)}`);

    try {
      // 1. Rotear e extrair dados
      const routerResult = await this.routerAgent.process(input.message);

      // 2. Validar dados extraídos
      const validation = this.validatorAgent.validate(routerResult.extracted);

      if (!validation.valid) {
        const errorMessage = await this.formatterAgent.formatError(validation.errors);
        return this.buildErrorOutput(errorMessage, input, Date.now() - startTime);
      }

      // 3. Executar agente especializado baseado na intenção
      let response: string;

      switch (routerResult.intent) {
        case 'patient_search':
          const patients = await this.patientAgent.search(
            input.subscriberId,
            routerResult.extracted,
          );
          response = await this.formatterAgent.formatPatients(patients);
          break;

        case 'regulation_search':
          const regulations = await this.regulationAgent.search(
            input.subscriberId,
            routerResult.extracted,
          );
          response = await this.formatterAgent.formatRegulations(regulations);
          break;

        case 'system_info':
          response = await this.infoAgent.process(input.message);
          break;

        case 'chat':
        default:
          // Conversa geral - usar LLM diretamente
          response = await this.openAIProvider.generateSimpleResponse(
            input.message,
            'Você é IARA, assistente da Simples City. Responda de forma amigável e concisa.',
          );
          break;
      }

      const executionTimeMs = Date.now() - startTime;

      this.logger.log(`✅ Processamento concluído em ${executionTimeMs}ms`);

      const finalOutput: OrchestratorOutput = {
        message: response,
        metadata: {
          timestamp: new Date().toISOString(),
          agent: this.name,
          conversationId: input.conversationId,
          userId: input.userId,
          executionTimeMs,
          intent: routerResult.intent,
        },
      };

      this.logger.debug(`[Orchestrator] 📤 Final Output: ${JSON.stringify(finalOutput, null, 2)}`);

      return finalOutput;
    } catch (error) {
      this.logger.error(`❌ Erro no processamento: ${error.message}`, error.stack);
      return this.buildErrorOutput(
        'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
        input,
        Date.now() - startTime,
      );
    }
  }

  private buildErrorOutput(
    errorMessage: string,
    input: OrchestratorInput,
    executionTimeMs: number,
  ): OrchestratorOutput {
    return {
      message: errorMessage,
      metadata: {
        timestamp: new Date().toISOString(),
        agent: this.name,
        conversationId: input.conversationId,
        userId: input.userId,
        executionTimeMs,
        error: errorMessage,
      },
    };
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    agents: Record<string, boolean>;
    llm: boolean;
  }> {
    const checks = {
      router: !!this.routerAgent,
      patient: !!this.patientAgent,
      regulation: !!this.regulationAgent,
      info: !!this.infoAgent,
      validator: !!this.validatorAgent,
      formatter: !!this.formatterAgent,
      llm: this.openAIProvider.isConfigured(),
    };

    const healthy = Object.values(checks).every(Boolean);

    return {
      healthy,
      agents: checks,
      llm: checks.llm,
    };
  }
}