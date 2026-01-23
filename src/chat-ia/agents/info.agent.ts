import { Injectable, Logger } from '@nestjs/common';
import { OpenAIProvider } from '../llm/openai.provider';

/**
 * INFO AGENT
... (omitted JSDoc for brevity in thought, but I will provide full match)
 */
@Injectable()
export class InfoAgent {
  private readonly logger = new Logger(InfoAgent.name);

  constructor(private readonly openAIProvider: OpenAIProvider) { }

  /**
   * Processa pergunta sobre o sistema
   * @param query - Pergunta do usuário
   * @returns Resposta concisa (2-3 frases)
   */
  async process(query: string): Promise<string> {
    const prompt = `Você é IARA (Inteligência Artificial para Regulação Assistida) da Simples City.

Responda de forma concisa sobre:
- Sistema de regulação
- Pacientes
- Prioridades (eletivo, urgência, emergência)
- Status (em andamento, aprovado, negado, cancelado)
- Sobre você mesma

PERGUNTA: "${query}"

Responda em 2-3 frases, de forma clara e amigável.`;

    this.logger.debug(`[InfoAgent] ❓ Query: "${query}"`);
    const answer = await this.openAIProvider.generateSimpleResponse(prompt);
    this.logger.debug(`[InfoAgent] 💡 Answer: "${answer}"`);
    return answer;
  }
}
