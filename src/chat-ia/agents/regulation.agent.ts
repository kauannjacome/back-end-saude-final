import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface RegulationSearchParams {
  dateFrom?: string;
  dateTo?: string;
  priority?: string;
  status?: string;
  idCode?: string;
  query?: string;
}

export interface RegulationResult {
  id: number;
  idCode: string | null;
  patientName: string | null;
  clinicalIndication: string | null;
  priority: string | null;
  status: string | null;
  createdAt: Date;
}

/**
 * REGULATION AGENT
 * 
 * Responsabilidade: Buscar regulações usando SQL direto (SEM LLM)
 * 
 * Filtros Suportados:
 * - ID Code (busca exata)
 * - Período (dateFrom, dateTo)
 * - Prioridade (eletivo, urgência, emergência)
 * - Status (em andamento, aprovado, negado, cancelado)
 * - Texto livre (busca em indicação clínica e observações)
 * 
 * Vantagens:
 * - ✅ Rápido (queries SQL otimizadas)
 * - ✅ Barato (sem tokens LLM)
 * - ✅ Flexível (múltiplos filtros combinados)
 * - ✅ Ordenado por data (mais recentes primeiro)
 * 
 * @example
 * // Busca por prioridade
 * await regulationAgent.search(subscriberId, { priority: 'urgencia' });
 * 
 * // Busca por período
 * await regulationAgent.search(subscriberId, { 
 *   dateFrom: '2026-01-01', 
 *   dateTo: '2026-01-31' 
 * });
 */
@Injectable()
export class RegulationAgent {
  private readonly logger = new Logger(RegulationAgent.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Busca regulações com filtros combinados
   * @param subscriberId - ID do assinante
   * @param params - Parâmetros de busca (dateFrom, dateTo, priority, status, idCode, query)
   * @returns Lista de regulações encontradas (máximo 10)
   */
  async search(
    subscriberId: number,
    params: RegulationSearchParams,
  ): Promise<RegulationResult[]> {
    this.logger.debug(`🔍 Buscando regulações:`, params);
    this.logger.debug(`[RegulationAgent] 📥 Search Params: ${JSON.stringify(params, null, 2)}`);

    try {
      const where: any = {
        subscriber_id: subscriberId,
        deleted_at: null,
      };

      // Busca por ID Code (exato)
      if (params.idCode) {
        where.id_code = params.idCode;
      }

      // Filtro por período
      if (params.dateFrom || params.dateTo) {
        where.created_at = {};
        if (params.dateFrom) {
          where.created_at.gte = new Date(params.dateFrom);
        }
        if (params.dateTo) {
          where.created_at.lte = new Date(params.dateTo);
        }
      }

      // Filtro por prioridade
      if (params.priority) {
        where.priority = params.priority;
      }

      // Filtro por status
      if (params.status) {
        where.status = params.status;
      }

      // Busca por texto livre (indicação clínica ou observações)
      if (params.query && params.query.length >= 3) {
        where.OR = [
          {
            clinical_indication: {
              contains: params.query,
              mode: 'insensitive',
            },
          },
          {
            notes: {
              contains: params.query,
              mode: 'insensitive',
            },
          },
        ];
      }

      const regulations = await this.prisma.regulation.findMany({
        where,
        include: {
          patient: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 10,
      });

      this.logger.log(`✅ Encontradas ${regulations.length} regulações`);

      return regulations.map((r) => ({
        id: r.id,
        idCode: r.id_code,
        patientName: r.patient?.name || null,
        clinicalIndication: r.clinical_indication,
        priority: r.priority,
        status: r.status,
        createdAt: r.created_at,
      }));
    } catch (error) {
      this.logger.error('Erro ao buscar regulações:', error);
      return [];
    }
  }
}
