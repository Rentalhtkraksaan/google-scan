const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // 1. Reset Global Visitor Count to 0
  await prisma.siteSetting.updateMany({
    where: { id: "default" },
    data: { visitorCount: 0 },
  });

  // 2. Delete all daily visitor data
  const deleted = await prisma.dailyVisitor.deleteMany();

  console.log(`Berhasil reset visitorCount menjadi 0.`);
  console.log(`Berhasil menghapus ${deleted.count} data grafik harian.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
