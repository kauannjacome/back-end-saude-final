import { Injectable, Logger } from '@nestjs/common';
import { OpenAIProvider } from '../llm/openai.provider';

export interface RouterResult {
  intent: 'patient_search' | 'regulation_search' | 'system_info' | 'chat';
  extracted: {
    name?: string;
    cpf?: string;
    cns?: string;
    birthDate?: string;
    dateFrom?: string;
    dateTo?: string;
    priority?: string;
    status?: string;
    idCode?: string;
    query?: string;
  };
  confidence: number;
}

/**
 * ROUTER AGENT
 * 
 * Responsabilidade: Detectar intenção e extrair dados da mensagem
 * 
 * Prompt: ~150 tokens (pequeno!)
 * 
 * Intenções Suportadas:
 * - patient_search: Buscar paciente
 * - regulation_search: Buscar regulação
 * - system_info: Informação sobre o sistema
 * - chat: Conversa geral
 * 
 * Dados Extraídos:
 * - Nome, CPF, CNS, Data de Nascimento (para pacientes)
 * - Período, Prioridade, Status, ID Code (para regulações)
 * - Query livre (para info e chat)
 * 
 * Vantagens:
 * - ✅ Prompt pequeno (economia de tokens)
 * - ✅ Resposta em JSON (fácil de parsear)
 * - ✅ Confiança (0.0-1.0) para decisões
 * - ✅ Fallback para chat se incerto
 * 
 * @example
 * const result = await routerAgent.process("Busca o paciente João Silva");
 * // { intent: "patient_search", extracted: { name: "João Silva" }, confidence: 0.95 }
 */
@Injectable()
export class RouterAgent {
  private readonly logger = new Logger(RouterAgent.name);

  constructor(private readonly openAIProvider: OpenAIProvider) { }

  /**
   * Detecta intenção e extrai dados da mensagem
   * @param userMessage - Mensagem do usuário
   * @returns Intent, dados extraídos e confiança
   */
  async process(userMessage: string): Promise<RouterResult> {
    this.logger.debug(`🧭 Roteando: "${userMessage}"`);

    const prompt = `Classifique a intenção e extraia dados:

INTENÇÕES:
- patient_search: buscar paciente
- regulation_search: buscar regulação
- system_info: informação sobre o sistema
- chat: conversa geral

MENSAGEM: "${userMessage}"

Responda APENAS em JSON:
{
  "intent": "patient_search|regulation_search|system_info|chat",
  "extracted": {
    "name": "nome se mencionado",
    "cpf": "apenas números",
    "cns": "apenas números",
    "birthDate": "YYYY-MM-DD se mencionado",
    "dateFrom": "YYYY-MM-DD se período",
    "dateTo": "YYYY-MM-DD se período",
    "priority": "eletivo|urgencia|emergencia",
    "status": "in_progress|approved|denied|cancelled",
    "idCode": "código se mencionado",
    "query": "texto livre para busca"
  },
  "confidence": 0.0-1.0
}`;

    this.logger.debug(`[RouterAgent] 📝 Prompt enviado: ${prompt}`);

    try {
      const response = await this.openAIProvider.generateSimpleResponse(prompt);
      const result = JSON.parse(response);

      this.logger.log(`✅ Intent: ${result.intent} (${(result.confidence * 100).toFixed(0)}%)`);
      this.logger.debug(`[RouterAgent] 🎯 Resultado Parsed: ${JSON.stringify(result, null, 2)}`);

      return result;
    } catch (error) {
      this.logger.error('Erro no RouterAgent:', error);
      return {
        intent: 'chat',
        extracted: { query: userMessage },
        confidence: 0.5,
      };
    }
  }
}
