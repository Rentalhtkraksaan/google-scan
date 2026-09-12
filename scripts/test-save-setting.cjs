const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const appVersion = 'V 1.1.2';
    const cleanWa = '6285176871609';
    const cleanFallback = 'http://localhost:3000/';
    const heroBadge = '🔥 Solusi Cerdas Ulasan Bintang 5 Google Bisnis';
    const heroHeadline = 'Dapatkan Ratusan Ulasan Bintang 5 Dengan Sekali Tap';
    const heroSubheadline = 'Ubah setiap pelanggan yang puas menjadi ulasan bintang 5 resmi di Google Maps secara instan menggunakan Kartu Dynamic QR & Smart NFC.';
    const ctaPrimaryText = 'Pesan Kartu & Konsultasi WhatsApp';
    const ctaSecondaryText = 'Coba Scan Demo (c-001)';
    const ctaSecondaryUrl = '/c/c-001';
    const step1Title = 'Letakkan di Meja / Kasir';
    const step1Desc = 'Pasang kartu akrilik di kasir.';
    const step2Title = 'Pelanggan Scan / Tap';
    const step2Desc = 'Pelanggan scan dengan mudah.';
    const step3Title = 'Pop-up Review Langsung Terbuka';
    const step3Desc = 'Pop-up ulasan bintang 5 langsung terbuka.';
    const footerText = 'Smart QR Review Platform. Seluruh hak cipta dilindungi.';

    await prisma.$executeRaw`
      INSERT INTO site_settings (
        id, appVersion, whatsappNumber, globalFallbackUrl, heroBadge, heroHeadline, heroSubheadline,
        ctaPrimaryText, ctaSecondaryText, ctaSecondaryUrl, step1Title, step1Desc,
        step2Title, step2Desc, step3Title, step3Desc, footerText, updatedAt
      ) VALUES (
        'default',
        ${appVersion},
        ${cleanWa},
        ${cleanFallback},
        ${heroBadge},
        ${heroHeadline},
        ${heroSubheadline},
        ${ctaPrimaryText},
        ${ctaSecondaryText},
        ${ctaSecondaryUrl},
        ${step1Title},
        ${step1Desc},
        ${step2Title},
        ${step2Desc},
        ${step3Title},
        ${step3Desc},
        ${footerText},
        NOW()
      )
      ON DUPLICATE KEY UPDATE
        appVersion = VALUES(appVersion),
        whatsappNumber = VALUES(whatsappNumber),
        globalFallbackUrl = VALUES(globalFallbackUrl),
        heroBadge = VALUES(heroBadge),
        heroHeadline = VALUES(heroHeadline),
        heroSubheadline = VALUES(heroSubheadline),
        ctaPrimaryText = VALUES(ctaPrimaryText),
        ctaSecondaryText = VALUES(ctaSecondaryText),
        ctaSecondaryUrl = VALUES(ctaSecondaryUrl),
        step1Title = VALUES(step1Title),
        step1Desc = VALUES(step1Desc),
        step2Title = VALUES(step2Title),
        step2Desc = VALUES(step2Desc),
        step3Title = VALUES(step3Title),
        step3Desc = VALUES(step3Desc),
        footerText = VALUES(footerText),
        updatedAt = NOW();
    `;

    const rows = await prisma.$queryRaw`SELECT * FROM site_settings WHERE id = 'default' LIMIT 1;`;
    console.log('Successfully saved and retrieved settings:', rows);
  } catch (err) {
    console.error('Test save error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
