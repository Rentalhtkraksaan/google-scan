const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.outlet.updateMany({
    where: {
      name: {
        contains: 'raluna',
      },
    },
    data: {
      name: 'Raluna Cafe Paiton',
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJdZo8ar8D1y0R1zYTsah8xs4',
    },
  });
  console.log('RALUNA_CAFE_UPDATED_SUCCESSFULLY');
}

main().finally(() => prisma.$disconnect());
