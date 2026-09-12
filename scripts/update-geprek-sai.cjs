const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.outlet.updateMany({
    where: {
      name: {
        contains: 'geprek sai',
      },
    },
    data: {
      name: 'Ayam Geprek Sai Paiton',
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJt4YaGLID1y0Rdhi8PEQ-TfQ',
    },
  });
  console.log('GEPREK_SAI_UPDATED_SUCCESSFULLY');
}

main().finally(() => prisma.$disconnect());
