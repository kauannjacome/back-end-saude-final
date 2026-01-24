import { Injectable, Logger } from '@nestjs/common';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class ValidatorAgent {
  private readonly logger = new Logger(ValidatorAgent.name);

  validate(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // CPF
    if (data.cpf && !this.isValidCPF(data.cpf)) errors.push('CPF inválido');

    // CNPJ
    if (data.cnpj && !this.isValidCNPJ(data.cnpj)) errors.push('CNPJ inválido');

    // CNS
    if (data.cns && !/^\d{15}$/.test(this.normalizeCNS(data.cns))) errors.push('CNS inválido');

    // Datas
    ['birthDate', 'dateFrom', 'dateTo'].forEach(field => {
      if (data[field]) {
        const date = new Date(data[field]);
        if (isNaN(date.getTime())) errors.push(`${field} inválida`);
        else if (field === 'birthDate' && date > new Date()) errors.push('Data de nascimento não pode ser futura');
      }
    });

    // Prioridade
    if (data.priority && !['eletivo', 'urgencia', 'emergencia'].includes(data.priority)) {
      warnings.push(`Prioridade "${data.priority}" desconhecida`);
    }

    // Status
    if (data.status && !['in_progress', 'approved', 'denied', 'returned'].includes(data.status)) {
      warnings.push(`Status "${data.status}" desconhecido`);
    }

    if (errors.length) this.logger.warn(`❌ Validação falhou: ${errors.join(', ')}`);
    if (warnings.length) this.logger.debug(`⚠️ Avisos: ${warnings.join(', ')}`);

    return { valid: errors.length === 0, errors, warnings };
  }

  normalizeCPF(cpf: string): string { return cpf.replace(/\D/g, ''); }
  normalizeCNPJ(cnpj: string): string { return cnpj.replace(/\D/g, ''); }
  normalizeCNS(cns: string): string { return cns.replace(/\D/g, ''); }

  isValidCPF(cpf: string): boolean {
    const c = this.normalizeCPF(cpf);
    if (!c || c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
    let sum = 0, r;
    for (let i = 1; i <= 9; i++) sum += parseInt(c[i - 1]) * (11 - i);
    r = (sum * 10) % 11; if (r === 10 || r === 11) r = 0; if (r !== parseInt(c[9])) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(c[i - 1]) * (12 - i);
    r = (sum * 10) % 11; if (r === 10 || r === 11) r = 0; if (r !== parseInt(c[10])) return false;
    return true;
  }

  isValidCNPJ(cnpj: string): boolean {
    const c = this.normalizeCNPJ(cnpj);
    if (!c || c.length !== 14 || /^(\d)\1+$/.test(c)) return false;

    // First check digit
    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(c[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    let r = sum % 11;
    const digit1 = r < 2 ? 0 : 11 - r;
    if (digit1 !== parseInt(c[12])) return false;

    // Second check digit
    sum = 0;
    weight = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(c[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    r = sum % 11;
    const digit2 = r < 2 ? 0 : 11 - r;
    if (digit2 !== parseInt(c[13])) return false;

    return true;
  }
}
