import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔧 Fixing pending status values...');

  // Update regulations with 'pending' status to 'in_progress'
  const result = await prisma.$executeRawUnsafe(`
    UPDATE regulation 
    SET status = 'in_progress' 
    WHERE status = 'pending'
  `);

  console.log(`✅ Updated ${result} regulation records from 'pending' to 'in_progress'`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
