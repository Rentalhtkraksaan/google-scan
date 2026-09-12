const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const outlet = await prisma.outlet.findFirst({
    where: { owner: { email: 'demo.outlet@gmail.com' } },
  });

  if (!outlet) {
    console.log('Outlet not found');
    return;
  }

  const sampleFeedbacks = [
    {
      rating: 2,
      customerName: 'Budi Santoso',
      phone: '081299998888',
      message: 'Kopinya agak sedikit dingin dan waktu tunggu terlalu lama.',
    },
    {
      rating: 3,
      customerName: 'Siti Rahma',
      phone: '081377776666',
      message: 'Makanannya enak tapi musik di area outdoor agak terlalu keras.',
    },
    {
      rating: 1,
      customerName: 'Andi Wijaya',
      phone: '085711223344',
      message: 'Pelayanan kasir kurang ramah saat jam makan siang.',
    },
    {
      rating: 2,
      customerName: 'Dewi Lestari',
      phone: '081988776655',
      message: 'AC di lantai 2 kurang dingin saat siang hari.',
    },
    {
      rating: 3,
      customerName: 'Rian Pratama',
      phone: '082144556677',
      message: 'Menu pastry yang dipesan sudah habis padahal baru jam 3 sore.',
    },
  ];

  for (const fb of sampleFeedbacks) {
    await prisma.customerFeedback.create({
      data: {
        outletId: outlet.id,
        rating: fb.rating,
        customerName: fb.customerName,
        phone: fb.phone,
        message: fb.message,
      },
    });
  }

  console.log('Added sample feedbacks for demo outlet!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
