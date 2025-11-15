import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { fromZonedTime } from 'date-fns-tz';

import { parse } from 'fast-csv';
import PQueue from 'p-queue';

@Injectable()
export class SeedsService {
  private readonly logger = new Logger(SeedsService.name);

  constructor(private prisma: PrismaService) {}

  async csvPerson(createSeedDto: any, file: Express.Multer.File) {
    const csv = file.buffer.toString('utf-8');
    const rows: any[] = [];

    // --- PARSE DO CSV ---
    await new Promise<void>((resolve, reject) => {
      const parser = parse({
        headers: true,
        ignoreEmpty: true,
        trim: true,
      });

      parser
        .on('error', reject)
        .on('data', (row) => rows.push(row))
        .on('end', resolve);

      parser.write(csv);
      parser.end();
    });

    this.logger.log(`Processando ${rows.length} registros...`);

    const queue = new PQueue({ concurrency: 10 });

    const subscriberId = Number(createSeedDto.subscriber_id);
    let inserted = 0;

    for (const row of rows) {
      queue.add(async () => {
        try {
          await this.prisma.patient.create({
            data: {
              subscriber_id: subscriberId,
              cpf: row.nu_cpf || '',
              cns: row.nu_cns || null,
              full_name: row.no_cidadao || '',
              social_name: row.no_social || null,

              gender: this.mapGender(row.no_sexo),
              race: this.mapRace(row.co_raca_cor),
              sex: row.no_sexo || null,

              birth_date: this.brDate(row.dt_nascimento),
              death_date: this.brNullableDate(row.dt_obito),

              mother_name: row.no_mae || null,
              father_name: row.no_pai || null,

              phone:
                row.nu_telefone_celular ||
                row.nu_telefone_residencial ||
                null,

              email: row.ds_email || null,
              postal_code: row.ds_cep || null,
              state: null,
              city: null,
              address: row.ds_logradouro || null,
              number: row.nu_numero || null,
              complement: row.ds_complemento || null,
              neighborhood: row.no_bairro || null,

              nationality: row.co_nacionalidade || null,
              naturalness: row.co_pais_nascimento || null,
              marital_status: row.co_estado_civil || null,
              blood_type: row.no_tipo_sanguineo || null,
            },
          });

          inserted++;
        } catch (error) {
          this.logger.error(
            `Erro ao inserir CPF ${row.nu_cpf}: ${error.message}`,
          );
        }
      });
    }

    await queue.onIdle();

    return {
      total: rows.length,
      inserted,
      failed: rows.length - inserted,
    };
  }

  // ---------------------------
  //   TRATAMENTO DE DATAS (BR)
  // ---------------------------

  // Converte DD/MM/YYYY → YYYY-MM-DD
  private brToIso(value: string): string {
    if (value.includes('-')) return value; // já é ISO

    const [d, m, y] = value.split('/');
    return `${y}-${m}-${d}`;
  }

  private brDate(value: string | null): Date {
    if (!value) return new Date();

    try {
      const iso = this.brToIso(value); // corrige formato BR
      const date = fromZonedTime(iso, 'America/Sao_Paulo');
      return isNaN(date.getTime()) ? new Date() : date;
    } catch {
      return new Date();
    }
  }

  private brNullableDate(value: string | null): Date | null {
    if (!value) return null;

    try {
      const iso = this.brToIso(value);
      const date = fromZonedTime(iso, 'America/Sao_Paulo');
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  // ---------------------------
  //   MAPEAMENTO DE CAMPOS
  // ---------------------------
  private mapGender(value: string | null): string {
    if (!value) return 'nao_informado';

    const v = value.trim().toUpperCase();
    if (v === 'MASCULINO') return 'masculino';
    if (v === 'FEMININO') return 'feminino';

    return 'nao_informado';
  }

  private mapRace(code: string | null): string {
    const mapping: Record<string, string> = {
      '1': 'branca',
      '2': 'preta',
      '3': 'parda',
      '4': 'amarela',
      '5': 'indigena',
    };
    return mapping[code ?? ''] ?? 'nao_informado';
  }
}
