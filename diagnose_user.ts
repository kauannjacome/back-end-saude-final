
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'kauannjacome@gmail.com';
  console.log(`🔍 Diagnosing user: ${email}`);

  // 1. Find Professional
  const professional = await prisma.professional.findFirst({
    where: { email: email }
  });

  if (!professional) {
    console.error(`❌ User not found with email: ${email}`);
    return;
  }

  console.log(`✅ User Found: ID=${professional.id}, Name=${professional.name}, SubscriberID=${professional.subscriber_id}`);

  // 2. Find Notifications for this Subscriber
  const notifications = await prisma.notification.findMany({
    where: { subscriber_id: professional.subscriber_id },
    include: {
      reads: {
        where: { professional_id: professional.id }
      }
    }
  });

  console.log(`📊 Total Notifications for Subscriber ${professional.subscriber_id}: ${notifications.length}`);

  notifications.forEach(n => {
    const readRecord = n.reads[0];
    const isCleared = readRecord?.cleared_at != null;
    const isRead = readRecord?.read_at != null;
    console.log(`- Notif ID ${n.id} (${n.title}): Created=${n.created_at.toISOString()}, Read=${isRead}, Cleared=${isCleared}`);
  });

  if (notifications.length === 0) {
    console.log("⚠️ No notifications found. Checking regulations...");
    // Check regulations that SHOULD have triggered
    const regulations = await prisma.regulation.findMany({
      where: { subscriber_id: professional.subscriber_id },
      take: 5
    });
    console.log(`Info: Found ${regulations.length} regulations for this subscriber.`);
  }
}

main().finally(() => prisma.$disconnect());
