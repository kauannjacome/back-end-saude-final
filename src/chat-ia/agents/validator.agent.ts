import { Injectable, Logger } from '@nestjs/common';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * VALIDATOR AGENT
 * 
 * Responsabilidade: Validar dados extraídos (SEM LLM)
 * 
 * Validações:
 * - ✅ CPF (11 dígitos numéricos)
 * - ✅ CNS (15 dígitos numéricos)
 * - ✅ Datas (formato válido, não futuras)
 * - ✅ Prioridade (eletivo, urgência, emergência)
 * - ✅ Status (in_progress, approved, denied, cancelled)
 * 
 * Vantagens:
 * - ✅ Rápido (validação TypeScript pura)
 * - ✅ Barato (sem tokens LLM)
 * - ✅ Resiliente (evita erros antes de buscar no banco)
 * - ✅ Mensagens de erro claras
 * 
 * @example
 * const result = validatorAgent.validate({ cpf: '12345678900' });
 * if (!result.valid) {
 *   console.log(result.errors); // ["CPF deve ter 11 dígitos"]
 * }
 */
@Injectable()
export class ValidatorAgent {
  private readonly logger = new Logger(ValidatorAgent.name);

  /**
   * Valida dados extraídos pelo Router
   * @param data - Dados para validar
   * @returns Resultado com valid (boolean), errors (string[]), warnings (string[])
   */
  validate(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar CPF
    if (data.cpf) {
      if (!/^\d{11}$/.test(data.cpf)) {
        errors.push('CPF deve ter 11 dígitos');
      }
    }

    // Validar CNS
    if (data.cns) {
      if (!/^\d{15}$/.test(data.cns)) {
        errors.push('CNS deve ter 15 dígitos');
      }
    }

    // Validar datas
    if (data.birthDate) {
      const date = new Date(data.birthDate);
      if (isNaN(date.getTime())) {
        errors.push('Data de nascimento inválida');
      } else if (date > new Date()) {
        errors.push('Data de nascimento não pode ser futura');
      }
    }

    if (data.dateFrom) {
      const date = new Date(data.dateFrom);
      if (isNaN(date.getTime())) {
        errors.push('Data inicial inválida');
      }
    }

    if (data.dateTo) {
      const date = new Date(data.dateTo);
      if (isNaN(date.getTime())) {
        errors.push('Data final inválida');
      }
    }

    // Validar prioridade
    if (data.priority) {
      const validPriorities = ['eletivo', 'urgencia', 'emergencia'];
      if (!validPriorities.includes(data.priority)) {
        warnings.push(`Prioridade "${data.priority}" pode não existir`);
      }
    }

    // Validar status
    if (data.status) {
      const validStatuses = ['in_progress', 'approved', 'denied', 'cancelled'];
      if (!validStatuses.includes(data.status)) {
        warnings.push(`Status "${data.status}" pode não existir`);
      }
    }

    const valid = errors.length === 0;

    if (!valid) {
      this.logger.warn(`❌ Validação falhou: ${errors.join(', ')}`);
    } else if (warnings.length > 0) {
      this.logger.debug(`⚠️  Avisos: ${warnings.join(', ')}`);
    } else {
      this.logger.debug(`✅ Validação OK`);
    }

    return { valid, errors, warnings };
  }
}
