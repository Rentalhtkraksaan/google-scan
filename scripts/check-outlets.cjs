const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const outlets = await prisma.outlet.findMany({
    select: {
      id: true,
      name: true,
      googleReviewUrl: true,
      qrCard: {
        select: {
          code: true,
          status: true,
        },
      },
    },
  });
  console.log('CURRENT_DATABASE_OUTLETS:');
  console.log(JSON.stringify(outlets, null, 2));
}

main().finally(() => prisma.$disconnect());
