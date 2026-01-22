import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeText } from '../common/utils/normalize-text';

@Injectable()
export class SuggestionService {
  constructor(private readonly prisma: PrismaService) { }

  async getSuggestions(subscriberId: number, userId: number, field: string) {
    // Retorna top 20, ordenados por usage_count
    const suggestions = await this.prisma.suggestion.findMany({
      where: {
        subscriber_id: subscriberId,
        user_id: userId,
        field_name: field,
      },
      orderBy: [
        { usage_count: 'desc' },
        { last_used_at: 'desc' },
        { updated_at: 'desc' },
      ],
      take: 20,
      select: {
        term: true,
      },
    });

    return suggestions.map((s) => s.term);
  }

  async trackSuggestion(subscriberId: number, userId: number, field: string, term: string) {
    if (!term || term.trim().length === 0) return;

    const termValue = term.trim();
    const normalizedTerm = normalizeText(termValue) ?? termValue.toLowerCase();

    // 1. Upsert: se existe, incrementa. Se nao, cria.
    await this.prisma.suggestion.upsert({
      where: {
        subscriber_id_user_id_field_name_term_normalized: {
          subscriber_id: subscriberId,
          user_id: userId,
          field_name: field,
          term_normalized: normalizedTerm,
        },
      },
      create: {
        subscriber_id: subscriberId,
        user_id: userId,
        field_name: field,
        term: termValue,
        term_normalized: normalizedTerm,
        usage_count: 1,
        last_used_at: new Date(),
      },
      update: {
        usage_count: {
          increment: 1,
        },
        last_used_at: new Date(),
      },
    });

    // 2. Limpeza: Manter somente top 20
    // Logica: Se o count total > 20, deletar os que nao estao no top 20
    const count = await this.prisma.suggestion.count({
      where: { subscriber_id: subscriberId, user_id: userId, field_name: field },
    });

    if (count > 20) {
      // Busca os IDs que DEVEMFICAR (top 20)
      const keep = await this.prisma.suggestion.findMany({
        where: { subscriber_id: subscriberId, user_id: userId, field_name: field },
        orderBy: [
          { usage_count: 'desc' },
          { last_used_at: 'desc' },
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
          user_id: userId,
          field_name: field,
          id: { notIn: keepIds }, // Cuidado: notIn com lista grande pode ser lento, mas 20 e seguro
        },
      });
    }
  }
}
