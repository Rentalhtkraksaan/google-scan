const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const chika = await prisma.user.findFirst({
    where: { email: 'chika1@gmail.com' },
  });
  console.log('CHIKA ADMIN:', chika);

  const cards = await prisma.qrCard.findMany({
    where: { assignedAdminId: chika?.id },
    include: {
      outlet: {
        include: {
          owner: true,
        },
      },
    },
  });
  console.log('CHIKA ASSIGNED CARDS (count):', cards.length);
  console.log('CARDS WITH OUTLETS:', cards.filter(c => c.outletId).map(c => ({
    code: c.code,
    outletName: c.outlet?.name,
    ownerName: c.outlet?.owner?.fullName,
    ownerCreatedById: c.outlet?.owner?.createdById,
  })));

  const createdUsers = await prisma.user.findMany({
    where: { createdById: chika?.id },
  });
  console.log('USERS CREATED BY CHIKA:', createdUsers);
}

main().finally(() => prisma.$disconnect());
