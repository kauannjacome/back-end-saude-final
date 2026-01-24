import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing Patient findAll...');
  try {
    // Assuming subscriber_id 1 exists from seed
    const subscriberId = 1;
    const patients = await prisma.patient.findMany({
      where: { subscriber_id: subscriberId, deleted_at: null },
      include: { regulations: true },
      orderBy: { created_at: 'desc' },
    });
    console.log(`Found ${patients.length} patients for subscriber ${subscriberId}`);
    console.log(JSON.stringify(patients.slice(0, 2), null, 2));
  } catch (error) {
    console.error('Error finding patients:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
