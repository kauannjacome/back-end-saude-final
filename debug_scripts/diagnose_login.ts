
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Diagnosing login for joao.silva@exemplo.gov.br...');

  const email = 'joao.silva@exemplo.gov.br';
  const password = '123456';

  const user = await prisma.professional.findFirst({
    where: { email },
  });

  if (!user) {
    console.error(`❌ User ${email} not found! Seed might not have run correctly.`);
    return;
  }

  console.log(`✅ User found: ${user.name} (ID: ${user.id})`);
  console.log(`🔑 Stored Hash: ${user.passwordHash}`);

  if (!user.passwordHash) {
    console.error('❌ User has no passwordHash!');
    return;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (isValid) {
    console.log('✅ Password "123456" matches the stored hash!');
  } else {
    console.error('❌ Password "123456" does NOT match the stored hash.');

    // Try generating a new hash and seeing what it looks like
    const newHash = await bcrypt.hash(password, 6);
    console.log(`ℹ️ Freshly generated hash for "123456" (rounds=6): ${newHash}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
