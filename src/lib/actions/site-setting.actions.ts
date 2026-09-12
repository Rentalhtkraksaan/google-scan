"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

export async function getSiteSettingAction() {
  try {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM site_settings WHERE id = 'default' LIMIT 1;
    `;

    let setting = rows?.[0] || null;

    if (!setting) {
      await prisma.$executeRaw`
        INSERT INTO site_settings (
          id, appVersion, whatsappNumber, globalFallbackUrl, heroBadge, heroHeadline, heroSubheadline,
          ctaPrimaryText, ctaSecondaryText, ctaSecondaryUrl, step1Title, step1Desc,
          step2Title, step2Desc, step3Title, step3Desc, footerText, updatedAt
        ) VALUES (
          'default', 'V 1.1.2', '6281234567890', 'http://localhost:3000',
          '🔥 Solusi Cerdas Ulasan Bintang 5 Google Bisnis',
          'Dapatkan Ratusan Ulasan Bintang 5 Dengan Sekali Tap',
          'Ubah setiap pelanggan yang puas menjadi ulasan bintang 5 resmi di Google Maps secara instan menggunakan Kartu Dynamic QR & Smart NFC.',
          'Pesan Kartu & Konsultasi WhatsApp', 'Coba Scan Demo (c-001)', '/c/c-001',
          'Letakkan di Meja / Kasir', 'Pasang kartu akrilik di kasir.',
          'Pelanggan Scan / Tap', 'Pelanggan scan dengan mudah.',
          'Pop-up Review Langsung Terbuka', 'Pop-up ulasan bintang 5 langsung terbuka.',
          'Smart QR Review Platform. Seluruh hak cipta dilindungi.', NOW()
        )
        ON DUPLICATE KEY UPDATE id = id;
      `;

      const freshRows = await prisma.$queryRaw<Record<string, unknown>[]>`
        SELECT * FROM site_settings WHERE id = 'default' LIMIT 1;
      `;
      setting = freshRows?.[0] || null;
    }

    return { success: true, data: setting };
  } catch (error) {
    console.error("getSiteSettingAction error:", error);
    return { success: false, message: "Gagal memuat pengaturan website." };
  }
}

export async function updateSiteSettingAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, message: "Sesi login telah berakhir." };
    }

    if (session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak: Hanya Super Admin yang memiliki hak akses." };
    }

    // Cek status fresh dari database untuk memastikan izin Super Admin 1 / Super Admin 2
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdminMaster: true, canEditLandingPage: true },
    });

    const hasPermission =
      currentUser?.isSuperAdminMaster === true || currentUser?.canEditLandingPage === true;

    if (!hasPermission) {
      return {
        success: false,
        message:
          "Akses ditolak: Akun Super Admin 2 Anda belum diberikan izin oleh Super Admin 1 untuk mengubah konten Landing Page & WhatsApp.",
      };
    }

    const appVersion = (formData.get("appVersion") as string)?.trim() || "V 1.1.2";
    const whatsappNumber = (formData.get("whatsappNumber") as string)?.trim();
    const globalFallbackUrl = (formData.get("globalFallbackUrl") as string)?.trim();
    const heroBadge = (formData.get("heroBadge") as string)?.trim();
    const heroHeadline = (formData.get("heroHeadline") as string)?.trim();
    const heroSubheadline = (formData.get("heroSubheadline") as string)?.trim();
    const ctaPrimaryText = (formData.get("ctaPrimaryText") as string)?.trim();
    const ctaSecondaryText = (formData.get("ctaSecondaryText") as string)?.trim();
    const ctaSecondaryUrl = (formData.get("ctaSecondaryUrl") as string)?.trim();
    const step1Title = (formData.get("step1Title") as string)?.trim();
    const step1Desc = (formData.get("step1Desc") as string)?.trim();
    const step2Title = (formData.get("step2Title") as string)?.trim();
    const step2Desc = (formData.get("step2Desc") as string)?.trim();
    const step3Title = (formData.get("step3Title") as string)?.trim();
    const step3Desc = (formData.get("step3Desc") as string)?.trim();
    const footerText = (formData.get("footerText") as string)?.trim();

    if (!whatsappNumber || !heroHeadline) {
      return { success: false, message: "Nomor WhatsApp dan Headline utama wajib diisi." };
    }

    let cleanWa = whatsappNumber.replace(/[^0-9]/g, "");
    if (cleanWa.startsWith("08")) {
      cleanWa = "62" + cleanWa.slice(1);
    }

    let cleanFallback = globalFallbackUrl || "http://localhost:3000";
    if (cleanFallback && !cleanFallback.startsWith("http://") && !cleanFallback.startsWith("https://")) {
      cleanFallback = "https://" + cleanFallback;
    }

    // Direct MySQL Raw Execution for 100% reliability and no DLL locking issues
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
        ${heroBadge || "🔥 Solusi Cerdas Ulasan Bintang 5 Google Bisnis"},
        ${heroHeadline},
        ${heroSubheadline || "Ubah setiap pelanggan yang puas menjadi ulasan bintang 5 resmi di Google Maps secara instan menggunakan Kartu Dynamic QR & Smart NFC."},
        ${ctaPrimaryText || "Pesan Kartu & Konsultasi WhatsApp"},
        ${ctaSecondaryText || "Coba Scan Demo (c-001)"},
        ${ctaSecondaryUrl || "/c/c-001"},
        ${step1Title || "Letakkan di Meja / Kasir"},
        ${step1Desc || "Pasang kartu akrilik di kasir."},
        ${step2Title || "Pelanggan Scan / Tap"},
        ${step2Desc || "Pelanggan scan dengan mudah."},
        ${step3Title || "Pop-up Review Langsung Terbuka"},
        ${step3Desc || "Pop-up ulasan bintang 5 langsung terbuka."},
        ${footerText || "Smart QR Review Platform. Seluruh hak cipta dilindungi."},
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

    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM site_settings WHERE id = 'default' LIMIT 1;
    `;
    const updated = rows?.[0] || null;

    revalidatePath("/");
    revalidatePath("/super-admin");

    return {
      success: true,
      message: "Pengaturan Versi & Landing Page berhasil disimpan!",
      data: updated,
    };
  } catch (error) {
    console.error("updateSiteSettingAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal menyimpan pengaturan website.";
    return { success: false, message: msg };
  }
}

// ─── Super Admin: Terapkan Link Pengalihan Master ke Seluruh Kartu Massal ────
export async function applyGlobalFallbackUrlToAllCardsAction(customUrl?: string): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak: Hanya Super Admin yang memiliki hak akses." };
    }

    let targetUrl: string = customUrl?.trim() || "";
    if (!targetUrl) {
      const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
        SELECT globalFallbackUrl FROM site_settings WHERE id = 'default' LIMIT 1;
      `;
      targetUrl = (rows?.[0]?.globalFallbackUrl as string) || "http://localhost:3000";
    }

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    const updated = await prisma.qrCard.updateMany({
      data: {
        fallbackUrl: targetUrl,
      },
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Berhasil menerapkan Link Pengalihan Master ke seluruh ${updated.count} kartu QR di sistem!`,
    };
  } catch (error) {
    console.error("applyGlobalFallbackUrlToAllCardsAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal menerapkan link ke seluruh kartu.";
    return { success: false, message: msg };
  }
}

// ─── Super Admin: Ambil Pengaturan Template Multi-Ukuran ────────────────────
export async function getPrintTemplatesAction(): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { id: "default" },
      select: { printTemplates: true },
    });

    const raw = setting?.printTemplates;
    let parsed: Record<string, unknown> = {};

    if (typeof raw === "string" && raw.trim().startsWith("{")) {
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        console.error("Failed to parse printTemplates JSON:", err);
      }
    }

    return {
      success: true,
      message: "Template cetak berhasil dimuat.",
      data: parsed,
    };
  } catch (error) {
    console.error("getPrintTemplatesAction error:", error);
    return {
      success: false,
      message: "Gagal memuat konfigurasi template cetak.",
      data: {},
    };
  }
}

// ─── Super Admin: Simpan Pengaturan Template Multi-Ukuran ───────────────────
export async function updatePrintTemplatesAction(templatesJson: string): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak: Hanya Super Admin yang memiliki hak akses." };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdminMaster: true, canManagePrintTemplates: true },
    });

    const hasPermission =
      currentUser?.isSuperAdminMaster === true || currentUser?.canManagePrintTemplates === true;

    if (!hasPermission) {
      return {
        success: false,
        message: "Akses ditolak: Anda tidak memiliki izin untuk mengedit atau menyimpan template cetak.",
      };
    }

    await prisma.siteSetting.upsert({
      where: { id: "default" },
      update: { printTemplates: templatesJson },
      create: { id: "default", printTemplates: templatesJson },
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");
    revalidatePath("/portal");

    return {
      success: true,
      message: "Pengaturan Template Cetak Multi-Ukuran berhasil disimpan secara permanen!",
    };
  } catch (error) {
    console.error("updatePrintTemplatesAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal menyimpan konfigurasi template cetak.";
    return { success: false, message: msg };
  }
}


