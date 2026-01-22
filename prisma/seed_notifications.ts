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

  // 2. Create Regulations for Scheduled Date Testing
  console.log('Creating Regulations for DATE testing...');

  // 5 days from now (Should trigger)
  await prisma.regulation.create({
    data: {
      subscriber_id: subscriberId,
      status: 'in_progress',
      scheduled_date: dayjs().add(5, 'day').toDate(),
      notes: 'Teste Prazo 5 Dias',
    },
  });

  // 10 days from now (Should NOT trigger)
  await prisma.regulation.create({
    data: {
      subscriber_id: subscriberId,
      status: 'in_progress',
      scheduled_date: dayjs().add(10, 'day').toDate(),
      notes: 'Teste Prazo 10 Dias (Sem alerta)',
    },
  });

  // 3. Create Regulations for Priority Testing
  console.log('Creating Regulations for PRIORITY testing...');

  // Created 15 days ago, Urgent (Should trigger)
  await prisma.regulation.create({
    data: {
      subscriber_id: subscriberId,
      status: 'in_progress',
      priority: 'urgencia',
      created_at: dayjs().subtract(15, 'day').toDate(),
      notes: 'Teste Prioridade 15 Dias',
    },
  });

  // Created 10 days ago, Urgent (Should NOT trigger)
  await prisma.regulation.create({
    data: {
      subscriber_id: subscriberId,
      status: 'in_progress',
      priority: 'urgencia',
      created_at: dayjs().subtract(10, 'day').toDate(),
      notes: 'Teste Prioridade 10 Dias (Sem alerta)',
    },
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
