const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Reset existing data
  await prisma.qrCard.deleteMany();
  await prisma.outlet.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  // 1. Create Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      password: hashedPassword,
      fullName: 'Super Administrator',
      whatsappNumber: '6281234567890',
      role: 'SUPER_ADMIN',
    },
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      fullName: 'Super Administrator',
      whatsappNumber: '6281234567890',
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Super Admin created:', superAdmin.email);

  // 2. Create Sample Field Admin
  const sampleAdmin = await prisma.user.upsert({
    where: { email: 'mitra1@example.com' },
    update: {
      password: hashedPassword,
      fullName: 'Mitra Lapangan Jakarta',
      whatsappNumber: '6281298765432',
      role: 'ADMIN',
      createdById: superAdmin.id,
    },
    create: {
      email: 'mitra1@example.com',
      password: hashedPassword,
      fullName: 'Mitra Lapangan Jakarta',
      whatsappNumber: '6281298765432',
      role: 'ADMIN',
      createdById: superAdmin.id,
    },
  });
  console.log('Sample Admin created:', sampleAdmin.email);

  // 3. Create Sample User & Outlet for sampleAdmin
  const sampleUser = await prisma.user.upsert({
    where: { email: 'kopi@example.com' },
    update: {
      password: hashedPassword,
      fullName: 'Budi Santoso',
      whatsappNumber: '6281355551234',
      role: 'USER',
      createdById: sampleAdmin.id,
    },
    create: {
      email: 'kopi@example.com',
      password: hashedPassword,
      fullName: 'Budi Santoso',
      whatsappNumber: '6281355551234',
      role: 'USER',
      createdById: sampleAdmin.id,
    },
  });

  const sampleOutlet = await prisma.outlet.upsert({
    where: { ownerId: sampleUser.id },
    update: {
      name: 'Diva Swalayan Kraksaan',
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJcZlCR2cB1y0RocRq1VPhzQI',
    },
    create: {
      ownerId: sampleUser.id,
      name: 'Diva Swalayan Kraksaan',
      googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJcZlCR2cB1y0RocRq1VPhzQI',
    },
  });

  // 4. Create Initial QR Cards
  // c-001: Active & Linked to sampleOutlet
  await prisma.qrCard.upsert({
    where: { code: 'c-001' },
    update: {
      assignedAdminId: sampleAdmin.id,
      outletId: sampleOutlet.id,
      status: 'ACTIVE',
      scanCount: 142,
      fallbackUrl: 'http://localhost:3000',
    },
    create: {
      code: 'c-001',
      assignedAdminId: sampleAdmin.id,
      outletId: sampleOutlet.id,
      status: 'ACTIVE',
      scanCount: 142,
      fallbackUrl: 'http://localhost:3000',
    },
  });

  // c-002 s/d c-005: Blank active cards assigned to sampleAdmin
  for (let i = 2; i <= 5; i++) {
    const code = `c-${String(i).padStart(3, '0')}`;
    await prisma.qrCard.upsert({
      where: { code },
      update: {
        assignedAdminId: sampleAdmin.id,
        outletId: null,
        status: 'ACTIVE',
        scanCount: 0,
        fallbackUrl: 'http://localhost:3000',
      },
      create: {
        code,
        assignedAdminId: sampleAdmin.id,
        outletId: null,
        status: 'ACTIVE',
        scanCount: 0,
        fallbackUrl: 'http://localhost:3000',
      },
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
