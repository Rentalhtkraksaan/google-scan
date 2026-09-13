const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const data = [];
  
  // Seed for 2024 (some random data)
  for (let month = 1; month <= 12; month++) {
    const daysInMonth = new Date(2024, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const baseVisits = month * 2; 
      const visits = Math.floor(Math.random() * 15) + baseVisits;
      
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      data.push({ date: `2024-${mm}-${dd}`, visits });
    }
  }

  // Seed for 2025 up to September
  for (let month = 1; month <= 9; month++) {
    const daysInMonth = month === 9 ? 13 : new Date(2025, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const baseVisits = 30 + (month * 3); 
      const visits = Math.floor(Math.random() * 20) + baseVisits;
      
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      data.push({ date: `2025-${mm}-${dd}`, visits });
    }
  }

  // Insert to DB using upsert to avoid conflicts
  for (const item of data) {
    await prisma.dailyVisitor.upsert({
      where: { date: item.date },
      update: { visits: item.visits },
      create: item,
    });
  }

  console.log(`Seeded ${data.length} daily visitor records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
