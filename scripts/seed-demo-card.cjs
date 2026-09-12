const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // 1. Pastikan ada user demo outlet
  let user = await prisma.user.findUnique({
    where: { email: 'demo.outlet@gmail.com' },
  });

  if (!user) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    user = await prisma.user.create({
      data: {
        email: 'demo.outlet@gmail.com',
        fullName: 'Kopi Kita Senopati (Demo)',
        whatsappNumber: '081234567890',
        password: hashedPassword,
        role: 'USER',
        isActive: true,
      },
    });
    console.log('Created demo user:', user.email);
  }

  // 2. Pastikan ada outlet
  let outlet = await prisma.outlet.findFirst({
    where: { ownerId: user.id },
  });

  const demoGoogleUrl = 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4';

  if (!outlet) {
    outlet = await prisma.outlet.create({
      data: {
        ownerId: user.id,
        name: 'Kopi Kita Senopati (Demo)',
        googleReviewUrl: demoGoogleUrl,
      },
    });
    console.log('Created demo outlet:', outlet.name);
  } else {
    outlet = await prisma.outlet.update({
      where: { id: outlet.id },
      data: {
        googleReviewUrl: demoGoogleUrl,
      },
    });
    console.log('Updated demo outlet:', outlet.name);
  }

  // 3. Pastikan kartu 'demo-01' ada dan aktif
  let card = await prisma.qrCard.findUnique({
    where: { code: 'demo-01' },
  });

  if (!card) {
    card = await prisma.qrCard.create({
      data: {
        code: 'demo-01',
        outletId: outlet.id,
        status: 'ACTIVE',
        fallbackUrl: 'http://localhost:3000',
      },
    });
    console.log('Created demo card:', card.code);
  } else {
    card = await prisma.qrCard.update({
      where: { code: 'demo-01' },
      data: {
        outletId: outlet.id,
        status: 'ACTIVE',
        fallbackUrl: 'http://localhost:3000',
      },
    });
    console.log('Updated demo card:', card.code);
  }

  console.log('DEMO_SETUP_COMPLETE: http://localhost:3000/c/demo-01 is ready!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
