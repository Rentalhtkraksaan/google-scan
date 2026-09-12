const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Set admin@example.com (or first SUPER_ADMIN) as isSuperAdminMaster = true
  const masterAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN', email: 'admin@example.com' },
  });

  if (masterAdmin) {
    await prisma.user.update({
      where: { id: masterAdmin.id },
      data: { isSuperAdminMaster: true, canEditLandingPage: true },
    });
    console.log(`Set ${masterAdmin.email} as isSuperAdminMaster = true`);
  } else {
    // If admin@example.com not found, set the earliest created SUPER_ADMIN
    const firstSuperAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      orderBy: { createdAt: 'asc' },
    });
    if (firstSuperAdmin) {
      await prisma.user.update({
        where: { id: firstSuperAdmin.id },
        data: { isSuperAdminMaster: true, canEditLandingPage: true },
      });
      console.log(`Set first super admin ${firstSuperAdmin.email} as isSuperAdminMaster = true`);
    }
  }

  // 2. Initialize default SiteSetting
  const setting = await prisma.siteSetting.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      whatsappNumber: '6281234567890',
      heroBadge: '🔥 Solusi Cerdas Ulasan Bintang 5 Google Bisnis',
      heroHeadline: 'Dapatkan Ratusan Ulasan Bintang 5 Dengan Sekali Tap',
      heroSubheadline: 'Ubah setiap pelanggan yang puas menjadi ulasan bintang 5 resmi di Google Maps secara instan menggunakan Kartu Dynamic QR & Smart NFC.',
      ctaPrimaryText: 'Pesan Kartu & Konsultasi WhatsApp',
      ctaSecondaryText: 'Coba Scan Demo (c-001)',
      step1Title: 'Letakkan di Meja / Kasir',
      step1Desc: 'Pasang kartu akrilik atau standee QR pintar di meja makan, resepsionis, atau meja kasir saat pelanggan membayar.',
      step2Title: 'Pelanggan Scan / Tap',
      step2Desc: 'Pelanggan cukup mengarahkan kamera smartphone atau mendekatkan HP tanpa perlu mengetik atau mencari nama outlet di Google Maps.',
      step3Title: 'Pop-up Review Langsung Terbuka',
      step3Desc: 'Halaman rating bintang 5 Google resmi langsung muncul seketika di layar HP pelanggan, siap dikirim dalam 5 detik!',
      footerText: 'Smart QR Review Platform. Seluruh hak cipta dilindungi.',
    },
    update: {},
  });

  console.log('SiteSetting initialized:', setting);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
