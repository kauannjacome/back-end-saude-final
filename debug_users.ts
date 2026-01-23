import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Use consistent SSL setting for debug
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Checking Professionals per Subscriber ---');

  const subscribers = await prisma.subscriber.findMany({
    include: {
      professionals: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  for (const sub of subscribers) {
    console.log(`Subscriber: ${sub.name} (ID: ${sub.id})`);
    if (sub.professionals.length === 0) {
      console.log('  -> NO USERS FOUND');
    } else {
      for (const prof of sub.professionals) {
        console.log(`  - User: ${prof.name} | Role: ${prof.role} | Email: ${prof.email}`);
      }
    }
    console.log('-----------------------------------');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
