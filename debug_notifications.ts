
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const subscriberId = 1;
  const professionalId = 1; // Assuming ID 1 from seed

  console.log(`🔍 Checking notifications for Sub ${subscriberId}, Prof ${professionalId}`);

  const notifications = await prisma.notification.findMany({
    where: {
      subscriber_id: subscriberId,
      reads: {
        none: {
          professional_id: professionalId,
          cleared_at: { not: null }
        }
      }
    },
    include: {
      reads: {
        where: { professional_id: professionalId },
        select: { read_at: true, cleared_at: true }
      }
    }
  });

  console.log(`✅ Found ${notifications.length} notifications.`);

  notifications.forEach(n => {
    const isRead = n.reads.length > 0 && n.reads[0].read_at !== null;
    console.log(`- ID ${n.id}: Read? ${isRead}, Reads Record: ${JSON.stringify(n.reads)}`);
  });
}

main().finally(() => prisma.$disconnect());
