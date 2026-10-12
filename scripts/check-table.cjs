const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('--- Checking outlets table ---');
    const outletCols = await prisma.$queryRawUnsafe('DESCRIBE outlets;');
    const outletColNames = outletCols.map(c => c.Field);
    console.log('Existing outlet columns:', outletColNames);

    if (!outletColNames.includes('vipPauseCount')) {
      console.log('Adding vipPauseCount to outlets...');
      await prisma.$executeRawUnsafe('ALTER TABLE outlets ADD COLUMN vipPauseCount INT NOT NULL DEFAULT 0;');
    }
    if (!outletColNames.includes('isVipPaused')) {
      console.log('Adding isVipPaused to outlets...');
      await prisma.$executeRawUnsafe('ALTER TABLE outlets ADD COLUMN isVipPaused TINYINT(1) NOT NULL DEFAULT 0;');
    }
    if (!outletColNames.includes('soundNotification')) {
      console.log('Adding soundNotification to outlets...');
      await prisma.$executeRawUnsafe('ALTER TABLE outlets ADD COLUMN soundNotification TINYINT(1) NOT NULL DEFAULT 1;');
    }

    console.log('--- Checking finance_transactions table ---');
    const ftCols = await prisma.$queryRawUnsafe('DESCRIBE finance_transactions;');
    const ftColNames = ftCols.map(c => c.Field);
    console.log('Existing finance_transactions columns:', ftColNames);

    if (!ftColNames.includes('createdById')) {
      console.log('Adding createdById to finance_transactions...');
      await prisma.$executeRawUnsafe('ALTER TABLE finance_transactions ADD COLUMN createdById VARCHAR(191) NULL;');
    }
    if (!ftColNames.includes('createdByName')) {
      console.log('Adding createdByName to finance_transactions...');
      await prisma.$executeRawUnsafe('ALTER TABLE finance_transactions ADD COLUMN createdByName VARCHAR(191) NULL;');
    }
    if (!ftColNames.includes('creatorRole')) {
      console.log('Adding creatorRole to finance_transactions...');
      await prisma.$executeRawUnsafe('ALTER TABLE finance_transactions ADD COLUMN creatorRole VARCHAR(191) NULL;');
    }

    console.log('Done! All columns verified/added.');
  } catch (err) {
    console.error('Error during migration check:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

