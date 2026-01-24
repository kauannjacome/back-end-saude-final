// router.agent.ts
import { Injectable, Logger } from '@nestjs/common';
import { OpenAIProvider } from '../llm/openai.provider';

export interface RouterResult {
  intent: 'patient_search' | 'regulation_search' | 'patient_regulation_search' | 'patient_selection' | 'system_info' | 'chat';
  extracted: Record<string, string>;
  confidence: number;
}

@Injectable()
export class RouterAgent {
  private readonly logger = new Logger(RouterAgent.name);

  constructor(private readonly openAIProvider: OpenAIProvider) { }

  async process(userMessage: string, conversationHistory?: Array<{ role: string, content: string }>): Promise<RouterResult> {
    this.logger.debug(`🧭 Roteando: "${userMessage}"`);

    let contextText = '';
    if (conversationHistory?.length) {
      contextText = '\nCONTEXTO:\n';
      conversationHistory.forEach((msg, idx) => {
        const role = msg.role === 'user' ? 'Usuário' : 'Assistente';
        contextText += `${idx + 1}. ${role}: "${msg.content}"\n`;
      });
    }

    const prompt = `Você é IARA, assistente de regulação de saúde da Simples City.

CONTEXTO:
${contextText || 'Primeira mensagem.'}

MENSAGEM: "${userMessage}"

CLASSIFIQUE A INTENÇÃO E EXTRAIA DADOS. Responda APENAS JSON válido.

INTENÇÕES:

1. **patient_search** - Buscar paciente
   Extrair: { "name": "nome", "cpf": "11 dígitos", "cns": "15 dígitos" }
   Ex: "buscar João Silva", "paciente CPF 12345678900"

2. **regulation_search** - Buscar regulações/requerimentos
   Extrair: { "examType": "tipo", "cnpj": "14 dígitos", "protocol": "código", "status": "status" }
   Ex: "requerimentos CNPJ 12345678000199", "regulações de tomografia", "exames pendentes"

3. **patient_regulation_search** - Exames de paciente específico
   Extrair: { "name": "nome", "cpf": "11 dígitos", "examType": "tipo" }
   Ex: "exames de Maria", "tomografias do CPF 12345678900"

4. **patient_selection** - Selecionar da lista (só se houver contexto)
   Extrair: { "selectionType": "index|cpf|cns|birthDate", "selectionValue": "valor" }
   Ex: "o primeiro", "número 2", "CPF 12345678900"

5. **system_info** - Perguntas sobre IARA/sistema
   Extrair: { "query": "pergunta" }
   Ex: "o que você faz?", "como funciona?"

6. **chat** - Conversa geral
   Extrair: { "query": "mensagem" }
   Ex: "olá", "obrigado"

REGRAS:
- CPF/CNPJ: apenas números
- Nomes: manter original
- Exames: normalizar (tomografia, ressonância, raio-x)

RESPOSTA (JSON):
{
  "intent": "uma das 6 opções",
  "extracted": { "campo": "valor" },
  "confidence": 0.0-1.0
}`;


    try {
      const response = await this.openAIProvider.generateSimpleResponse(prompt);

      let result: RouterResult;

      try {
        result = JSON.parse(response);
      } catch {
        this.logger.warn('RouterAgent: JSON inválido do LLM, usando fallback.');
        result = {
          intent: 'chat',
          extracted: { query: userMessage },
          confidence: 0.5,
        };
      }

      this.logger.log(`✅ Intent: ${result.intent} (${(result.confidence * 100).toFixed(0)}%)`);
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
