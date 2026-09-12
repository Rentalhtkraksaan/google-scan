const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.qrCard.updateMany({
    where: {
      outletId: {
        not: null,
      },
    },
    data: {
      status: 'ACTIVE',
    },
  });
  console.log('ALL_OUTLET_CARDS_ACTIVE_NOW');
}

main().finally(() => prisma.$disconnect());
