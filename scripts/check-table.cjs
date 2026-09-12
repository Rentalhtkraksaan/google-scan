const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const raw = await prisma.$queryRawUnsafe('DESCRIBE site_settings;');
    console.log('Columns in site_settings table:', raw);
  } catch (err) {
    console.error('Error querying columns:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
