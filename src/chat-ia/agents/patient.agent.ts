import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface PatientSearchParams {
  name?: string;
  cpf?: string;
  cns?: string;
  birthDate?: string;
}

export interface PatientResult {
  id: number;
  name: string;
  cpf: string;
  cns: string | null;
  birthDate: Date;
  age: number;
}

/**
 * PATIENT AGENT
 * 
 * Responsabilidade: Buscar pacientes usando SQL direto (SEM LLM)
 * 
 * Estratégia em Cascata:
 * 1. Busca exata por CPF (11 dígitos) - Prioridade máxima
 * 2. Busca exata por CNS (15 dígitos)
 * 3. Busca fuzzy por nome (ILIKE - case insensitive)
 * 4. Busca por nome + data de nascimento
 * 
 * Vantagens:
 * - ✅ Rápido (queries SQL otimizadas)
 * - ✅ Barato (sem tokens LLM)
 * - ✅ Preciso (busca exata quando possível)
 * - ✅ Calcula idade automaticamente
 * 
 * @example
 * // Busca por CPF
 * await patientAgent.search(subscriberId, { cpf: '12345678900' });
 * 
 * // Busca por nome
 * await patientAgent.search(subscriberId, { name: 'João Silva' });
 */
@Injectable()
export class PatientAgent {
  private readonly logger = new Logger(PatientAgent.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Busca pacientes usando estratégia em cascata
   * @param subscriberId - ID do assinante
   * @param params - Parâmetros de busca (name, cpf, cns, birthDate)
   * @returns Lista de pacientes encontrados
   */
  async search(
    subscriberId: number,
    params: PatientSearchParams,
  ): Promise<PatientResult[]> {
    this.logger.debug(`🔍 Buscando pacientes:`, params);
    this.logger.debug(`[PatientAgent] 📥 Search Params: ${JSON.stringify(params, null, 2)}`);

    try {
      // 1. Busca exata por CPF (prioridade máxima)
      if (params.cpf && params.cpf.length === 11) {
        const patient = await this.prisma.patient.findFirst({
          where: {
            subscriber_id: subscriberId,
            cpf: params.cpf,
            deleted_at: null,
          },
        });

        if (patient) {
          this.logger.log(`✅ Encontrado por CPF: ${patient.name}`);
          return [this.mapPatient(patient)];
        }
      }

      // 2. Busca exata por CNS
      if (params.cns && params.cns.length === 15) {
        const patient = await this.prisma.patient.findFirst({
          where: {
            subscriber_id: subscriberId,
            cns: params.cns,
            deleted_at: null,
          },
        });

        if (patient) {
          this.logger.log(`✅ Encontrado por CNS: ${patient.name}`);
          return [this.mapPatient(patient)];
        }
      }

      // 3. Busca por nome (fuzzy)
      if (params.name && params.name.length >= 3) {
        const patients = await this.prisma.patient.findMany({
          where: {
            subscriber_id: subscriberId,
            name: {
              contains: params.name,
              mode: 'insensitive',
            },
            deleted_at: null,
          },
          take: 5,
          orderBy: {
            name: 'asc',
          },
        });

        if (patients.length > 0) {
          this.logger.log(`✅ Encontrados ${patients.length} pacientes por nome`);
          return patients.map((p) => this.mapPatient(p));
        }
      }

      // 4. Busca por nome + data de nascimento
      if (params.name && params.birthDate) {
        const patients = await this.prisma.patient.findMany({
          where: {
            subscriber_id: subscriberId,
            name: {
              contains: params.name,
              mode: 'insensitive',
            },
            birth_date: new Date(params.birthDate),
            deleted_at: null,
          },
          take: 5,
        });

        if (patients.length > 0) {
          this.logger.log(`✅ Encontrados ${patients.length} pacientes por nome + data`);
          return patients.map((p) => this.mapPatient(p));
        }
      }

      this.logger.warn('❌ Nenhum paciente encontrado');
      return [];
    } catch (error) {
      this.logger.error('Erro ao buscar pacientes:', error);
      return [];
    }
  }

  private mapPatient(patient: any): PatientResult {
    const age = this.calculateAge(patient.birth_date);

    return {
      id: patient.id,
      name: patient.name,
      cpf: patient.cpf,
      cns: patient.cns,
      birthDate: patient.birth_date,
      age,
    };
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }
}
