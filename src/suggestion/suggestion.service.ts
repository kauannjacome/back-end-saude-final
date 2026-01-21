import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuggestionService {
  constructor(private readonly prisma: PrismaService) { }

  async getSuggestions(subscriberId: number, field: string) {
    // Retorna top 20, ordenados por usage_count
    const suggestions = await this.prisma.suggestion.findMany({
      where: {
        subscriber_id: subscriberId,
        field_name: field,
      },
      orderBy: [
        { usage_count: 'desc' },
        { updated_at: 'desc' },
      ],
      take: 20,
      select: {
        term: true,
      },
    });

    return suggestions.map((s) => s.term);
  }

  async trackSuggestion(subscriberId: number, field: string, term: string) {
    if (!term || term.trim().length === 0) return;

    // Normaliza termo (opcional, pode ser lowercase ou capitalizado. Aqui mantemos como veio)
    const normalizedTerm = term.trim();

    // 1. Upsert: se existe, incrementa. Se não, cria.
    await this.prisma.suggestion.upsert({
      where: {
        subscriber_id_field_name_term: {
          subscriber_id: subscriberId,
          field_name: field,
          term: normalizedTerm,
        },
      },
      create: {
        subscriber_id: subscriberId,
        field_name: field,
        term: normalizedTerm,
        usage_count: 1,
      },
      update: {
        usage_count: {
          increment: 1,
        },
      },
    });

    // 2. Limpeza: Manter somente top 20
    // Lógica: Se o count total > 20, deletar os que não estão no top 20
    const count = await this.prisma.suggestion.count({
      where: { subscriber_id: subscriberId, field_name: field },
    });

    if (count > 20) {
      // Busca os IDs que DEVEMFICAR (top 20)
      const keep = await this.prisma.suggestion.findMany({
        where: { subscriber_id: subscriberId, field_name: field },
        orderBy: [
          { usage_count: 'desc' },
          { updated_at: 'desc' },
        ],
        take: 20,
        select: { id: true },
      });

      const keepIds = keep.map((k) => k.id);

      // Deleta os outros
      await this.prisma.suggestion.deleteMany({
        where: {
          subscriber_id: subscriberId,
          field_name: field,
          id: { notIn: keepIds }, // ⚠️ Cuidado: notIn com lista grande pode ser lento, mas 20 é seguro
        },
      });
    }
  }
}
