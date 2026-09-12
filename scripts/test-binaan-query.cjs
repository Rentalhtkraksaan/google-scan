const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const chika = await prisma.user.findFirst({
    where: { email: 'chika1@gmail.com' },
  });

  const createdUsers = await prisma.user.findMany({
    where: {
      role: 'USER',
      outlet: {
        qrCard: {
          assignedAdminId: chika.id,
        },
      },
    },
    include: {
      outlet: {
        include: {
          qrCard: true,
        },
      },
    },
  });

  console.log('CHIKA BINAAN OUTLETS COUNT:', createdUsers.length);
  console.log(createdUsers.map(u => ({
    outletName: u.outlet?.name,
    cardCode: u.outlet?.qrCard?.code,
    assignedAdminId: u.outlet?.qrCard?.assignedAdminId,
  })));
}

main().finally(() => prisma.$disconnect());
