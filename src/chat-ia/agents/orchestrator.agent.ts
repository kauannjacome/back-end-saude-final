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
    context?: any;
    clearContext?: boolean;
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
      // 1. Rotear e extrair dados (com histórico se disponível)
      const conversationHistory = input.metadata?.conversationHistory || [];
      const routerResult = await this.routerAgent.process(input.message, conversationHistory);

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

        case 'patient_selection' as any:
          this.logger.debug(`🎯 Seleção de paciente detectada: ${routerResult.extracted.selectionValue} (${routerResult.extracted.selectionType})`);

          if (!input.metadata?.context?.pendingPatients) {
            response = 'Não encontrei nenhuma lista de pacientes para selecionar. Por favor, faça uma nova busca.';
            break;
          }

          const pendingPatients = input.metadata.context.pendingPatients;
          let selectedPatient: any = null;

          // Lógica de seleção
          if (routerResult.extracted.selectionType === 'index') {
            const index = parseInt(routerResult.extracted.selectionValue || '0') - 1;
            if (index >= 0 && index < pendingPatients.length) {
              selectedPatient = pendingPatients[index];
            }
          } else if (routerResult.extracted.selectionType === 'cpf') {
            const cpf = routerResult.extracted.selectionValue;
            selectedPatient = pendingPatients.find((p: any) => this.validatorAgent.normalizeCPF(p.cpf) === cpf);
          } else if (routerResult.extracted.selectionType === 'cns') {
            const cns = routerResult.extracted.selectionValue;
            selectedPatient = pendingPatients.find((p: any) => p.cns && this.validatorAgent.normalizeCNS(p.cns) === cns);
          } else if (routerResult.extracted.selectionType === 'birthDate') {
            // Simplificação: compara apenas a string da data formatada ou tenta match
            // Ideal seria normalizar data, mas vamos assumir DD/MM/YYYY
            const date = routerResult.extracted.selectionValue;
            selectedPatient = pendingPatients.find((p: any) => {
              const pDate = new Date(p.birthDate).toLocaleDateString('pt-BR');
              return pDate === date;
            });
          }

          if (selectedPatient) {
            this.logger.log(`✅ Paciente selecionado via contexto: ${selectedPatient.name}`);

            // Retomar ação original
            const originalIntent = input.metadata.context.originalIntent;

            if (originalIntent === 'patient_regulation_search') {
              const examType = input.metadata.context.originalExamType;

              const patientRegulations = await this.regulationAgent.search(
                input.subscriberId,
                {
                  patientId: selectedPatient.id,
                  examType: examType,
                },
              );

              if (patientRegulations.length === 0) {
                response = `Paciente **${selectedPatient.name}** selecionado. Não encontrei regulações${examType ? ` de "${examType}"` : ''}.`;
              } else {
                response = `**Regulações${examType ? ` de "${examType}"` : ''}** do paciente **${selectedPatient.name}**:\n\n`;
                response += await this.formatterAgent.formatRegulations(patientRegulations);
              }
            } else {
              // Default: apenas mostrar paciente selecionado
              response = await this.formatterAgent.formatPatients([selectedPatient]);
            }

            // Limpar contexto após sucesso
            return {
              message: response,
              metadata: {
                timestamp: new Date().toISOString(),
                agent: this.name,
                conversationId: input.conversationId,
                userId: input.userId,
                executionTimeMs: Date.now() - startTime,
                intent: 'patient_selection',
                clearContext: true
              }
            };

          } else {
            response = 'Não consegui identificar qual paciente você quis dizer. Tente responder com o número (ex: "1"), o CPF ou a data de nascimento.';
          }
          break;

        case 'patient_regulation_search':
          // Fluxo em 2 etapas: buscar paciente → buscar regulações do paciente
          this.logger.debug(`🔄 Iniciando busca em 2 etapas: paciente + regulações`);

          // Etapa 1: Buscar paciente
          const foundPatients = await this.patientAgent.search(
            input.subscriberId,
            routerResult.extracted,
          );

          if (foundPatients.length === 0) {
            response = `Não encontrei nenhum paciente com o nome ${routerResult.extracted.name}.`;
          } else if (foundPatients.length > 1) {
            // Múltiplos pacientes encontrados - pedir esclarecimento E SALVAR CONTEXTO
            response = await this.formatterAgent.formatPatients(foundPatients);
            response += '\n\n⚠️ Por favor, informe o CPF, CNS, data de nascimento ou o número da lista para selecionar.';

            return {
              message: response,
              metadata: {
                timestamp: new Date().toISOString(),
                agent: this.name,
                conversationId: input.conversationId,
                userId: input.userId,
                executionTimeMs: Date.now() - startTime,
                intent: routerResult.intent,
                context: {
                  pendingPatients: foundPatients,
                  originalIntent: 'patient_regulation_search',
                  originalExamType: routerResult.extracted.examType
                }
              }
            };
          } else {
            // Exatamente 1 paciente encontrado - buscar suas regulações
            const patient = foundPatients[0];
            this.logger.log(`✅ Paciente identificado: ${patient.name} (ID: ${patient.id})`);

            // Etapa 2: Buscar regulações do paciente
            const patientRegulations = await this.regulationAgent.search(
              input.subscriberId,
              {
                patientId: patient.id,
                examType: routerResult.extracted.examType,
              },
            );

            if (patientRegulations.length === 0) {
              response = `Não encontrei regulações${routerResult.extracted.examType ? ` de ${routerResult.extracted.examType}` : ''} para o paciente **${patient.name}**.`;
            } else {
              response = `**Regulações${routerResult.extracted.examType ? ` de ${routerResult.extracted.examType}` : ''}** do paciente **${patient.name}**:\n\n`;
              response += await this.formatterAgent.formatRegulations(patientRegulations);
            }
          }
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