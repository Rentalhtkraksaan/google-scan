import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Hash password Super Admin 1 Master
  const hashedPassword = await bcrypt.hash("Aditya_24214", 10);

  // Upsert Super Admin 1 Master
  const superAdmin = await prisma.user.upsert({
    where: { email: "achmadfurqon33@gmail.com" },
    update: {
      password: hashedPassword,
      isSuperAdminMaster: true,
      canEditLandingPage: true,
    },
    create: {
      email: "achmadfurqon33@gmail.com",
      password: hashedPassword,
      fullName: "Achmad Furqon",
      whatsappNumber: "6281234567890",
      role: "SUPER_ADMIN",
      isSuperAdminMaster: true,
      canEditLandingPage: true,
    },
  });

  console.log(`✅ Super Admin created: ${superAdmin.email}`);

  // Seed beberapa QR Card default
  const cards = [
    { code: "c-001", fallbackUrl: "http://localhost:3000" },
    { code: "c-002", fallbackUrl: "http://localhost:3000" },
    { code: "c-003", fallbackUrl: "http://localhost:3000" },
    { code: "c-004", fallbackUrl: "http://localhost:3000" },
    { code: "c-005", fallbackUrl: "http://localhost:3000" },
  ];

  for (const card of cards) {
    await prisma.qrCard.upsert({
      where: { code: card.code },
      update: {},
      create: card,
    });
  }

  console.log(`✅ Seeded ${cards.length} QR Cards`);
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
