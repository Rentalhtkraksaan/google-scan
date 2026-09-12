const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.outlet.updateMany({
    where: {
      name: {
        contains: 'tian lala',
      },
    },
    data: {
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJp29XXgAB1y0R5pZrmMAhyc4',
    },
  });
  console.log('TIAN_LALA_UPDATED_SUCCESSFULLY');
}

main().finally(() => prisma.$disconnect());
