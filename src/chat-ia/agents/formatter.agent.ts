import { Injectable, Logger } from '@nestjs/common';
import { OpenAIProvider } from '../llm/openai.provider';
import { PatientResult } from './patient.agent';
import { RegulationResult } from './regulation.agent';

/**
 * FORMATTER AGENT
... (omitted JSDoc for brevity in thought, but I will provide full match)
 */
@Injectable()
export class FormatterAgent {
  private readonly logger = new Logger(FormatterAgent.name);

  constructor(private readonly openAIProvider: OpenAIProvider) { }

  /**
   * Formata lista de pacientes
   * @param patients - Lista de pacientes encontrados
   * @returns Texto formatado para exibição
   */
  async formatPatients(patients: PatientResult[]): Promise<string> {
    this.logger.debug(`[FormatterAgent] 🏗️ Formatando ${patients.length} pacientes`);
    if (patients.length === 0) {
      return 'Nenhum paciente encontrado com os critérios informados.';
    }

    if (patients.length === 1) {
      const p = patients[0];
      return `Encontrei o paciente:
- **Nome**: ${p.name}
- **CPF**: ${this.formatCPF(p.cpf)}
${p.cns ? `- **CNS**: ${p.cns}` : ''}
- **Nascimento**: ${this.formatDate(p.birthDate)} (${p.age} anos)`;
    }

    let response = `Encontrei ${patients.length} pacientes:\n\n`;
    patients.forEach((p, idx) => {
      response += `${idx + 1}. **${p.name}**\n`;
      response += `   - CPF: ${this.formatCPF(p.cpf)}\n`;
      if (p.cns) response += `   - CNS: ${p.cns}\n`;
      response += `   - Nascimento: ${this.formatDate(p.birthDate)} (${p.age} anos)\n\n`;
    });

    return response + 'Qual deles você procura?';
  }

  async formatRegulations(regulations: RegulationResult[]): Promise<string> {
    this.logger.debug(`[FormatterAgent] 🏗️ Formatando ${regulations.length} regulações`);
    if (regulations.length === 0) {
      return 'Nenhuma regulação encontrada com os critérios informados.';
    }

    let response = `Encontrei ${regulations.length} regulação(ões):\n\n`;
    regulations.forEach((r, idx) => {
      response += `${idx + 1}. **${r.idCode || `Regulação #${r.id}`}**\n`;
      if (r.patientName) response += `   - Paciente: ${r.patientName}\n`;
      if (r.clinicalIndication) {
        const indication = r.clinicalIndication.substring(0, 100);
        response += `   - Indicação: ${indication}${r.clinicalIndication.length > 100 ? '...' : ''}\n`;
      }
      if (r.priority) response += `   - Prioridade: ${this.translatePriority(r.priority)}\n`;
      if (r.status) response += `   - Status: ${this.translateStatus(r.status)}\n`;
      response += `   - Criada em: ${this.formatDate(r.createdAt)}\n\n`;
    });

    return response;
  }

  async formatError(errors: string[]): Promise<string> {
    this.logger.debug(`[FormatterAgent] 🏗️ Formatando erro: ${errors.join(', ')}`);
    if (errors.length === 1) {
      return `❌ ${errors[0]}. Por favor, corrija e tente novamente.`;
    }

    return `❌ Encontrei alguns problemas:\n${errors.map((e) => `- ${e}`).join('\n')}\n\nPor favor, corrija e tente novamente.`;
  }

  private formatCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('pt-BR');
  }

  private translatePriority(priority: string): string {
    const map: Record<string, string> = {
      eletivo: 'Eletivo',
      urgencia: 'Urgência',
      emergencia: 'Emergência',
    };
    return map[priority] || priority;
  }

  private translateStatus(status: string): string {
    const map: Record<string, string> = {
      in_progress: 'Em Andamento',
      approved: 'Aprovado',
      denied: 'Negado',
      cancelled: 'Cancelado',
    };
    return map[status] || status;
  }
}
