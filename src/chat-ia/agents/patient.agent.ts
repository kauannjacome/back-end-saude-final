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
  cns?: string;
  birthDate: Date;
  age: number;
}

@Injectable()
export class PatientAgent {
  private readonly logger = new Logger(PatientAgent.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(subscriberId: number, params: PatientSearchParams): Promise<PatientResult[]> {
    this.logger.debug(`🔍 Procurando paciente: ${JSON.stringify(params)}`);

    const cpf = params.cpf?.replace(/\D/g, '');
    const cns = params.cns?.replace(/\D/g, '');
    const name = params.name?.trim();

    // Prioridade: CPF > CNS > Nome+Data > Nome
    if (cpf?.length === 11) {
      const patient = await this.prisma.patient.findFirst({
        where: { subscriber_id: subscriberId, cpf, deleted_at: null },
      });
      if (patient) return [this.mapPatient(patient)];
    }

    if (cns?.length === 15) {
      const patient = await this.prisma.patient.findFirst({
        where: { subscriber_id: subscriberId, cns, deleted_at: null },
      });
      if (patient) return [this.mapPatient(patient)];
    }

    if (name && params.birthDate) {
      const birth = new Date(params.birthDate);
      const patients = await this.prisma.patient.findMany({
        where: { subscriber_id: subscriberId, name: { contains: name, mode: 'insensitive' }, birth_date: birth, deleted_at: null },
        take: 10
      });
      if (patients.length) return patients.map(p => this.mapPatient(p));
    }

    if (name && name.length >= 3) {
      const patients = await this.prisma.patient.findMany({
        where: { subscriber_id: subscriberId, name: { contains: name, mode: 'insensitive' }, deleted_at: null },
        take: 10,
        orderBy: { name: 'asc' },
      });
      if (patients.length) return patients.map(p => this.mapPatient(p));
    }

    return [];
  }

  private mapPatient(p: any): PatientResult {
    const birth = new Date(p.birth_date);
    const age = new Date().getFullYear() - birth.getFullYear() - ((new Date().getMonth() < birth.getMonth() || (new Date().getMonth() === birth.getMonth() && new Date().getDate() < birth.getDate())) ? 1 : 0);
    return { id: p.id, name: p.name, cpf: p.cpf, cns: p.cns, birthDate: birth, age };
  }
}
