
import { Injectable, Logger } from '@nestjs/common';
import { PatientResult } from './patient.agent';
import { RegulationResult } from './regulation.agent';

@Injectable()
export class FormatterAgent {
  private readonly logger = new Logger(FormatterAgent.name);

  async formatPatients(p: PatientResult[]): Promise<string> {
    if (!p.length) return '❌ Nenhum paciente encontrado.';

    if (p.length === 1) {
      const pt = p[0];
      return `👤 **Paciente Encontrado**\n\n` +
        `📋 **Nome:** ${pt.name}\n` +
        `🆔 **CPF:** ${this.formatCPF(pt.cpf)}\n` +
        `${pt.cns ? `🏥 **CNS:** ${pt.cns}\n` : ''}` +
        `🎂 **Nascimento:** ${pt.birthDate.toLocaleDateString('pt-BR')} (${pt.age} anos)`;
    }

    let resp = `👥 **Encontrei ${p.length} pacientes:**\n\n`;
    p.forEach((pt, idx) => {
      resp += `**${idx + 1}.** ${pt.name}\n`;
      resp += `   └ CPF: ${this.formatCPF(pt.cpf)} | Nascimento: ${pt.birthDate.toLocaleDateString('pt-BR')}\n`;
    });
    resp += '\n💡 *Informe o número, CPF ou CNS para selecionar.*';
    return resp;
  }

  async formatRegulations(r: RegulationResult[]): Promise<string> {
    if (!r.length) return '❌ Nenhuma regulação encontrada.';

    let resp = `📋 **Encontrei ${r.length} regulação${r.length > 1 ? 'ões' : ''}:**\n\n`;
    r.forEach((reg, idx) => {
      const statusEmoji = this.getStatusEmoji(reg.status);
      const priorityEmoji = this.getPriorityEmoji(reg.priority);

      resp += `**${idx + 1}.** ${reg.idCode || `REG-${reg.id}`} ${statusEmoji}\n`;
      if (reg.patientName) resp += `   👤 Paciente: ${reg.patientName}\n`;
      if (reg.clinicalIndication) resp += `   🔬 Exame: ${reg.clinicalIndication}\n`;
      if (reg.priority) resp += `   ${priorityEmoji} Prioridade: ${this.formatPriority(reg.priority)}\n`;
      if (reg.status) resp += `   📊 Status: ${this.formatStatus(reg.status)}\n`;
      resp += `   📅 Criado: ${reg.createdAt.toLocaleDateString('pt-BR')}\n\n`;
    });

    return resp.trim();
  }

  async formatError(errors: string[]): Promise<string> {
    if (!errors.length) return '';

    let resp = '⚠️ **Encontrei alguns problemas:**\n\n';
    errors.forEach((e, idx) => {
      resp += `${idx + 1}. ❌ ${e}\n`;
    });

    // Add helpful suggestions
    resp += '\n💡 **Dicas:**\n';
    if (errors.some(e => e.includes('CPF'))) {
      resp += '• CPF deve ter 11 dígitos (ex: 123.456.789-00)\n';
    }
    if (errors.some(e => e.includes('CNS'))) {
      resp += '• CNS deve ter 15 dígitos\n';
    }
    if (errors.some(e => e.includes('CNPJ'))) {
      resp += '• CNPJ deve ter 14 dígitos (ex: 12.345.678/0001-99)\n';
    }
    if (errors.some(e => e.includes('data'))) {
      resp += '• Use formato de data DD/MM/AAAA\n';
    }

    return resp;
  }

  private formatCPF(cpf: string): string {
    if (cpf.length !== 11) return cpf;
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  private formatCNPJ(cnpj: string): string {
    if (cnpj.length !== 14) return cnpj;
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  private formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'in_progress': 'Em Andamento',
      'approved': 'Aprovado',
      'denied': 'Negado',
      'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
  }

  private formatPriority(priority: string): string {
    const priorityMap: Record<string, string> = {
      'eletivo': 'Eletivo',
      'urgencia': 'Urgência',
      'emergencia': 'Emergência'
    };
    return priorityMap[priority] || priority;
  }

  private getStatusEmoji(status?: string): string {
    const emojiMap: Record<string, string> = {
      'in_progress': '🔄',
      'approved': '✅',
      'denied': '❌',
      'cancelled': '🚫'
    };
    return status ? emojiMap[status] || '📄' : '📄';
  }

  private getPriorityEmoji(priority?: string): string {
    const emojiMap: Record<string, string> = {
      'eletivo': '📅',
      'urgencia': '⚡',
      'emergencia': '🚨'
    };
    return priority ? emojiMap[priority] || '📌' : '📌';
  }
}
