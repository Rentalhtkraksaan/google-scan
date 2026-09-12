const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const chika = await prisma.user.findFirst({
    where: { email: 'chika1@gmail.com' },
  });

  if (!chika) return;

  // Find all cards assigned to chika
  const cards = await prisma.qrCard.findMany({
    where: { assignedAdminId: chika.id, outletId: { not: null } },
    include: { outlet: true },
  });

  for (const c of cards) {
    if (c.outlet?.ownerId) {
      await prisma.user.update({
        where: { id: c.outlet.ownerId },
        data: { createdById: chika.id },
      });
      console.log(`Updated owner of ${c.code} (${c.outlet.name}) createdById to chika_admin`);
    }
  }
}

main().finally(() => prisma.$disconnect());
