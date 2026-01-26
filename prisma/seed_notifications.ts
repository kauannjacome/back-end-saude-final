import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting Notification Seed...');

  // 1. Target Subscriber 1 (Common Dev User)
  const subscriberId = 1;
  console.log(`🎯 Targeting Subscriber ID: ${subscriberId}`);

  // 2. Create Patient and Cares for testing
  console.log('Creating Patient and Cares for testing...');
  const patient = await prisma.patient.upsert({
    where: { subscriber_id_cpf: { subscriber_id: subscriberId, cpf: '99999999999' } },
    update: {},
    create: {
      subscriber_id: subscriberId,
      cpf: '99999999999',
      name: 'Paciente Teste Notificação',
      birth_date: new Date('1990-01-01'),
    },
  });

  const care1 = await prisma.care.upsert({
    where: { uuid: 'feed-0000-0000-0000-000000000001' },
    update: {},
    create: {
      uuid: 'feed-0000-0000-0000-000000000001',
      subscriber_id: subscriberId,
      name: 'Procedimento Teste A',
      unit_measure: 'un',
    },
  });

  const group = await prisma.group.upsert({
    where: { uuid: 'feed-0000-0000-0000-000000000040' },
    update: {},
    create: {
      uuid: 'feed-0000-0000-0000-000000000040',
      subscriber_id: subscriberId,
      name: 'Grupo de Teste Notificações',
    }
  });

  const unit = await prisma.unit.upsert({
    where: { uuid: 'feed-0000-0000-0000-000000000041' },
    update: {},
    create: {
      uuid: 'feed-0000-0000-0000-000000000041',
      subscriber_id: subscriberId,
      name: 'Unidade de Teste Central',
    }
  });

  const care2 = await prisma.care.upsert({
    where: { uuid: 'feed-0000-0000-0000-000000000002' },
    update: {},
    create: {
      uuid: 'feed-0000-0000-0000-000000000002',
      subscriber_id: subscriberId,
      name: 'Procedimento Teste B',
      unit_measure: 'un',
    },
  });

  // 3. Ensure a Folder and Supplier exist for better UI
  console.log('Ensuring Folder and Supplier exist...');
  const folder = await prisma.folder.upsert({
    where: { uuid: 'feed-0000-0000-0000-000000000030' },
    update: {},
    create: {
      uuid: 'feed-0000-0000-0000-000000000030',
      subscriber_id: subscriberId,
      name: 'Pasta de Teste Sementes',
    }
  });

  const supplier = await prisma.supplier.upsert({
    where: { subscriber_id_cnpj: { subscriber_id: subscriberId, cnpj: '00000000000000' } },
    update: {},
    create: {
      subscriber_id: subscriberId,
      name: 'Fornecedor de Teste',
      trade_name: 'Teste Lab',
      cnpj: '00000000000000',
    }
  });

  // 4. Create Regulations for Scheduled Date Testing
  console.log('Creating Regulations for DATE testing...');

  const regDateTrigger = await prisma.regulation.create({
    data: {
      subscriber_id: subscriberId,
      patient_id: patient.id,
      folder_id: folder.id,
      supplier_id: supplier.id,
      status: 'in_progress',
      scheduled_date: dayjs().add(5, 'day').toDate(),
      notes: 'Teste Prazo 5 Dias',
      relationship: 'genitor_a',
      type_declaration: 'requerimento_1',
    },
  });

  await prisma.care_regulation.create({
    data: {
      subscriber_id: subscriberId,
      regulation_id: regDateTrigger.id,
      care_id: care1.id,
      quantity: 1,
    }
  });

  // Created 15 days ago, Urgent (Should trigger)
  const regPriorityTrigger = await prisma.regulation.create({
    data: {
      subscriber_id: subscriberId,
      patient_id: patient.id,
      status: 'in_progress',
      priority: 'urgencia',
      created_at: dayjs().subtract(15, 'day').toDate(),
      notes: 'Teste Prioridade 15 Dias',
    },
  });

  await prisma.care_regulation.create({
    data: {
      subscriber_id: subscriberId,
      regulation_id: regPriorityTrigger.id,
      care_id: care2.id,
      quantity: 1,
    }
  });

  // 4. Create Notification for QUANTIDADE_ATINGIDA (Directly since it's an event-based alert)
  console.log('Creating event-based notifications...');
  await prisma.notification.create({
    data: {
      subscriber_id: subscriberId,
      title: '📊 Limite atingido',
      message: `O procedimento ${care1.name} atingiu 90% da cota mensal.`,
      type: 'QUANTIDADE_ATINGIDA',
      milestone: 'cota_90_porcento',
      cares_summary: care1.name,
      patient_name: 'Sistema',
      is_read: false,
    }
  });

  // 5. Create Notification for AGENDAMENTO
  await prisma.notification.create({
    data: {
      subscriber_id: subscriberId,
      title: '📅 Novo Agendamento',
      message: `${patient.name} agendado para ${dayjs().add(2, 'day').format('DD/MM/YYYY')}`,
      type: 'AGENDAMENTO',
      milestone: 'agendamento_confirmado',
      patient_name: patient.name,
      cares_summary: care1.name,
      scheduled_date: dayjs().add(2, 'day').toDate(),
      is_read: false,
    }
  });

  // 6. Create suggestions for autocomplete testing
  console.log('Creating suggestions...');
  const suggestions = [
    { field: 'clinical_indication', term: 'Paciente com dores abdominais crônicas' },
    { field: 'clinical_indication', term: 'Avaliação pré-operatória' },
    { field: 'notes', term: 'Paciente prefere atendimento no período da tarde' },
    { field: 'notes', term: 'Trazer exames anteriores de imagem' },
  ];

  for (const sug of suggestions) {
    await prisma.suggestion.upsert({
      where: {
        subscriber_id_user_id_field_name_term_normalized: {
          subscriber_id: subscriberId,
          user_id: 1, // Assuming admin or existing user
          field_name: sug.field,
          term_normalized: sug.term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ""),
        }
      },
      update: { usage_count: { increment: 1 } },
      create: {
        subscriber_id: subscriberId,
        user_id: 1,
        field_name: sug.field,
        term: sug.term,
        term_normalized: sug.term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ""),
        usage_count: 1,
      }
    });
  }

  // 7. Create Audit Logs for history testing
  console.log('Creating audit logs...');
  await prisma.audit_log.createMany({
    data: [
      {
        subscriber_id: subscriberId,
        actor_id: 1,
        object_type: 'regulation',
        object_id: regDateTrigger.id,
        action: 'create',
        detail: { notes: 'Criação inicial para teste de prazo' },
      },
      {
        subscriber_id: subscriberId,
        actor_id: 1,
        object_type: 'regulation',
        object_id: regPriorityTrigger.id,
        action: 'update',
        detail: { old_status: 'draft', new_status: 'in_progress' },
      }
    ]
  });

  // 8. Create Care Usage Ranks for dashboard/analytics testing
  console.log('Creating usage ranks...');
  await prisma.care_usage_rank.upsert({
    where: {
      subscriber_id_user_id_care_id: {
        subscriber_id: subscriberId,
        user_id: 1,
        care_id: care1.id,
      }
    },
    update: { usage_count: 50 },
    create: {
      subscriber_id: subscriberId,
      user_id: 1,
      care_id: care1.id,
      usage_count: 50,
    }
  });

  await prisma.care_usage_rank.upsert({
    where: {
      subscriber_id_user_id_care_id: {
        subscriber_id: subscriberId,
        user_id: 1,
        care_id: care2.id,
      }
    },
    update: { usage_count: 25 },
    create: {
      subscriber_id: subscriberId,
      user_id: 1,
      care_id: care2.id,
      usage_count: 25,
    }
  });

  // 9. Inactive/Future/Lower Priority (Should NOT trigger)
  console.log('Creating Regulations that should NOT trigger alerts...');

  await prisma.regulation.create({
    data: {
      subscriber_id: subscriberId,
      status: 'in_progress',
      scheduled_date: dayjs().add(10, 'day').toDate(),
      notes: 'Teste Prazo 10 Dias (Sem alerta)',
    },
  });

  await prisma.regulation.create({
    data: {
      subscriber_id: subscriberId,
      status: 'in_progress',
      priority: 'urgencia',
      created_at: dayjs().subtract(10, 'day').toDate(),
      notes: 'Teste Prioridade 10 Dias (Sem alerta)',
    },
  });

  // 10. Create WhatsApp Config for testing notification delivery logic
  console.log('Creating WhatsApp config...');
  await prisma.whatsapp_config.upsert({
    where: { subscriber_id: subscriberId },
    update: { instance_name: `Instancia_${subscriberId}`, is_active: true },
    create: {
      subscriber_id: subscriberId,
      instance_name: `Instancia_${subscriberId}`,
      provider: 'evolution',
      is_active: true,
    }
  });

  // 11. Create Chat IA (IARA) conversation for testing
  console.log('Creating Chat IA (IARA) seeds...');
  const chatConv = await prisma.chat_conversation.create({
    data: {
      subscriber_id: subscriberId,
      user_id: 1,
      user_type: 'professional',
      context: { last_viewed_regulation: regDateTrigger.uuid },
    }
  });

  await prisma.chat_message.createMany({
    data: [
      {
        subscriber_id: subscriberId,
        conversation_id: chatConv.id,
        role: 'user',
        content: 'Como está o status das regulações pendentes?',
      },
      {
        subscriber_id: subscriberId,
        conversation_id: chatConv.id,
        role: 'assistant',
        content: `Olá! Atualmente você tem ${regDateTrigger.notes} vencendo em breve. Posso ajudar a priorizá-la?`,
      }
    ]
  });

  console.log('🌱 Seed finished.');
  console.log(`⚠️  IMPORANTE: Dados criados para Subscriber ID: ${subscriberId}`);
  console.log(`⚠️  Para gerar as notificações, você DEVE rodar o trigger manual.`);
  console.log(`⚠️  Faça o POST em: http://localhost:3000/notifications/trigger?subscriber_id=${subscriberId}`);
}

main()
  .catch((e) => {
    console.error('❌ FATAL ERROR IN SEED:');
    if (e instanceof Error) {
      console.error(e.message);
      console.error(e.stack);
    } else {
      console.error(JSON.stringify(e, null, 2));
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
