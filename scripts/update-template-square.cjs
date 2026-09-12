const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const squareConfig = {
    square: {
      sizeKey: 'square',
      name: 'Stiker Meja Persegi',
      badge: '10 x 10 cm',
      widthMm: 100,
      heightMm: 100,
      canvasWidth: 1500,
      canvasHeight: 1500,
      aspectRatio: '1/1',
      description: 'Ukuran standar stiker meja persegi (10 x 10 cm) untuk nomor meja, akrilik kasir, atau coaster.',
      isActive: true,
      backgroundUrl: null,
      qr: { x: 50, y: 58, size: 52, borderRadius: 12, show: true },
      versionTag: { x: 7, y: 5, fontSize: 22, show: true },
      codeTag: { x: 93, y: 5, fontSize: 22, show: true },
      outletNameTag: { x: 50, y: 89, fontSize: 28, show: true }
    }
  };

  await prisma.siteSetting.upsert({
    where: { id: 'default' },
    update: { printTemplates: JSON.stringify(squareConfig) },
    create: { id: 'default', printTemplates: JSON.stringify(squareConfig) }
  });

  console.log('SUCCESS: Database SiteSetting.printTemplates updated to square only!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
