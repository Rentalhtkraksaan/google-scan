"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

/**
 * 1. Validasi Kode Referral Affiliate & Hitung Diskon Ongkir
 * Jika kode valid: Pembeli berhak atas diskon subsidi ongkir max Rp 10.000
 */
export async function validateAffiliateReferralCodeAction(rawCode: string) {
  try {
    if (!rawCode || !rawCode.trim()) {
      return { success: false, message: "Kode referral tidak boleh kosong." };
    }

    const cleanCode = rawCode.trim().toUpperCase();
    const affiliate = await prisma.affiliateAccount.findUnique({
      where: { referralCode: cleanCode },
    });

    if (!affiliate) {
      return { success: false, message: "Kode referral affiliate tidak ditemukan." };
    }

    if (affiliate.status !== "ACTIVE") {
      return { success: false, message: "Kode referral affiliate ini sedang tidak aktif." };
    }

    const siteSetting = await prisma.siteSetting.findUnique({
      where: { id: "default" },
      select: { affiliateShippingDiscount: true },
    });

    const discountAmount = siteSetting?.affiliateShippingDiscount ?? 10000;

    return {
      success: true,
      message: `Kode referral "${affiliate.referralCode}" aktif! Anda mendapatkan subsidi ongkir Rp ${discountAmount.toLocaleString("id-ID")}.`,
      affiliate: {
        id: affiliate.id,
        fullName: affiliate.fullName,
        referralCode: affiliate.referralCode,
        commissionPerPcs: affiliate.commissionPerPcs,
      },
      discountAmount,
    };
  } catch (error) {
    console.error("validateAffiliateReferralCodeAction error:", error);
    return { success: false, message: "Gagal memverifikasi kode referral." };
  }
}

/**
 * 2. Daftar Sebagai Affiliate Baru (Publik / Dari Dashboard)
 */
export async function registerAffiliateAccountAction(data: {
  fullName: string;
  phone: string;
  email: string;
  socialMediaUrl?: string;
  followersCount?: number;
  customReferralCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
}) {
  try {
    if (!data.fullName?.trim() || !data.phone?.trim() || !data.email?.trim()) {
      return { success: false, message: "Nama lengkap, nomor WhatsApp, dan Email wajib diisi." };
    }

    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPhone = data.phone.trim().replace(/[^0-9]/g, "");

    const existingEmail = await prisma.affiliateAccount.findUnique({
      where: { email: cleanEmail },
    });

    if (existingEmail) {
      return { success: false, message: "Email sudah terdaftar sebagai affiliate. Silakan gunakan email lain." };
    }

    // Buat Kode Referral Unik jika tidak ditentukan
    let referralCode = data.customReferralCode?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") || "";
    if (!referralCode) {
      const namePart = data.fullName.trim().replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase();
      const randNum = Math.floor(100 + Math.random() * 900);
      referralCode = `${namePart}${randNum}`;
    }

    // Pastikan kode referral unik
    const existingCode = await prisma.affiliateAccount.findUnique({
      where: { referralCode },
    });

    if (existingCode) {
      referralCode = `${referralCode}${Math.floor(10 + Math.random() * 90)}`;
    }

    const followers = Number(data.followersCount) || 0;
    const siteSetting = await prisma.siteSetting.findUnique({
      where: { id: "default" },
      select: { affiliateDefaultCommission: true },
    });

    // Tarif komisi berjenjang berdasarkan jumlah followers
    let commissionPerPcs = siteSetting?.affiliateDefaultCommission ?? 5000;
    if (followers >= 50000) {
      commissionPerPcs = 10000;
    } else if (followers >= 10000) {
      commissionPerPcs = 7500;
    }

    const affiliate = await prisma.affiliateAccount.create({
      data: {
        fullName: data.fullName.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        referralCode,
        socialMediaUrl: data.socialMediaUrl?.trim() || null,
        followersCount: followers,
        commissionPerPcs,
        bankName: data.bankName?.trim() || null,
        accountNumber: data.accountNumber?.trim() || null,
        accountHolder: data.accountHolder?.trim() || null,
        status: "ACTIVE",
      },
    });

    await prisma.activityLog.create({
      data: {
        userName: affiliate.fullName,
        userRole: "USER",
        action: "CREATE",
        title: "Pendaftaran Affiliate Baru 🤝",
        description: `Affiliate "${affiliate.fullName}" (${affiliate.email}) resmi bergabung dengan kode referral: ${affiliate.referralCode} (${followers.toLocaleString("id-ID")} followers).`,
        targetId: affiliate.id,
        targetName: affiliate.referralCode,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");

    return {
      success: true,
      message: `Selamat! Akun affiliate berhasil dibuat. Kode referral Anda adalah: ${affiliate.referralCode}`,
      affiliate,
    };
  } catch (error) {
    console.error("registerAffiliateAccountAction error:", error);
    return { success: false, message: "Gagal mendaftarkan akun affiliate." };
  }
}

/**
 * 3. Ambil Semua Daftar Akun Affiliate (Khusus Super Admin)
 */
export async function getAffiliateAccountsAction() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, affiliates: [], message: "Akses ditolak: Khusus Super Admin." };
    }

    const affiliates = await prisma.affiliateAccount.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Hitung total pesanan dan total kartu terjual per affiliate
    const affiliateCodes = affiliates.map((a) => a.referralCode);
    const referralOrders = await prisma.resellerOrder.findMany({
      where: {
        affiliateCode: { in: affiliateCodes },
        paymentStatus: "PAID",
      },
      select: {
        affiliateCode: true,
        totalQuantity: true,
        totalAmount: true,
      },
    });

    const statsMap = new Map<string, { totalOrders: number; totalCards: number; totalSales: number }>();
    for (const order of referralOrders) {
      if (!order.affiliateCode) continue;
      const cur = statsMap.get(order.affiliateCode) || { totalOrders: 0, totalCards: 0, totalSales: 0 };
      cur.totalOrders += 1;
      cur.totalCards += order.totalQuantity;
      cur.totalSales += order.totalAmount;
      statsMap.set(order.affiliateCode, cur);
    }

    const enrichedAffiliates = affiliates.map((aff) => {
      const stats = statsMap.get(aff.referralCode) || { totalOrders: 0, totalCards: 0, totalSales: 0 };
      return {
        ...aff,
        totalOrders: stats.totalOrders,
        totalCards: stats.totalCards,
        totalSales: stats.totalSales,
      };
    });

    return {
      success: true,
      affiliates: enrichedAffiliates,
    };
  } catch (error) {
    console.error("getAffiliateAccountsAction error:", error);
    return { success: false, affiliates: [], message: "Gagal memuat data affiliate." };
  }
}

/**
 * 4. Super Admin: Update Tarif Komisi & Status Akun Affiliate
 */
export async function updateAffiliateAccountAction(
  id: string,
  data: {
    fullName?: string;
    phone?: string;
    followersCount?: number;
    commissionPerPcs?: number;
    status?: "ACTIVE" | "SUSPENDED";
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
    notes?: string;
  }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak: Khusus Super Admin." };
    }

    const updated = await prisma.affiliateAccount.update({
      where: { id },
      data: {
        fullName: data.fullName?.trim(),
        phone: data.phone?.trim(),
        followersCount: data.followersCount !== undefined ? Number(data.followersCount) : undefined,
        commissionPerPcs: data.commissionPerPcs !== undefined ? Number(data.commissionPerPcs) : undefined,
        status: data.status,
        bankName: data.bankName?.trim(),
        accountNumber: data.accountNumber?.trim(),
        accountHolder: data.accountHolder?.trim(),
        notes: data.notes?.trim(),
      },
    });

    revalidatePath("/super-admin");

    return {
      success: true,
      message: "Data affiliate berhasil diperbarui!",
      affiliate: updated,
    };
  } catch (error) {
    console.error("updateAffiliateAccountAction error:", error);
    return { success: false, message: "Gagal memperbarui data affiliate." };
  }
}

/**
 * 5. Super Admin: Cairkan Komisi Affiliate (Payout)
 */
export async function payoutAffiliateCommissionAction(
  id: string,
  amount: number,
  notes?: string
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak: Khusus Super Admin." };
    }

    const affiliate = await prisma.affiliateAccount.findUnique({
      where: { id },
    });

    if (!affiliate) {
      return { success: false, message: "Akun affiliate tidak ditemukan." };
    }

    const payoutAmount = Math.max(0, Number(amount) || 0);
    if (payoutAmount <= 0) {
      return { success: false, message: "Nominal pencairan harus lebih dari 0." };
    }

    if (payoutAmount > affiliate.balance) {
      return {
        success: false,
        message: `Saldo komisi tidak mencukupi (Saldo saat ini: Rp ${affiliate.balance.toLocaleString("id-ID")}).`,
      };
    }

    const updated = await prisma.affiliateAccount.update({
      where: { id },
      data: {
        balance: { decrement: payoutAmount },
        totalWithdrawn: { increment: payoutAmount },
      },
    });

    await prisma.activityLog.create({
      data: {
        userName: session.user.name || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "UPDATE_STATUS",
        title: "Pencairan Komisi Affiliate 💸",
        description: `Super Admin mencairkan komisi sebesar Rp ${payoutAmount.toLocaleString("id-ID")} kepada Affiliate "${affiliate.fullName}" (${affiliate.referralCode}). Rekening: ${affiliate.bankName || "-"} ${affiliate.accountNumber || "-"}.${notes ? ` Catatan: ${notes}` : ""}`,
        targetId: affiliate.id,
        targetName: affiliate.referralCode,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");

    return {
      success: true,
      message: `Berhasil mencairkan komisi Rp ${payoutAmount.toLocaleString("id-ID")} untuk ${affiliate.fullName}!`,
      affiliate: updated,
    };
  } catch (error) {
    console.error("payoutAffiliateCommissionAction error:", error);
    return { success: false, message: "Gagal memproses pencairan komisi." };
  }
}

/**
 * 6. Affiliate Cek Statistik & Saldo Mandiri (Berdasarkan Kode Referral / No HP)
 */
export async function checkAffiliateStatsAction(query: string) {
  try {
    if (!query || !query.trim()) {
      return { success: false, message: "Silakan masukkan kode referral atau nomor WhatsApp." };
    }

    const clean = query.trim().toUpperCase();
    const cleanPhone = query.trim().replace(/[^0-9]/g, "");

    const affiliate = await prisma.affiliateAccount.findFirst({
      where: {
        OR: [
          { referralCode: clean },
          { phone: cleanPhone },
          { email: query.trim().toLowerCase() },
        ],
      },
    });

    if (!affiliate) {
      return { success: false, message: "Data akun affiliate tidak ditemukan." };
    }

    // Ambil riwayat pesanan referral
    const referralOrders = await prisma.resellerOrder.findMany({
      where: {
        affiliateCode: affiliate.referralCode,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        totalQuantity: true,
        totalAmount: true,
        paymentStatus: true,
        orderStatus: true,
        affiliateCommission: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      affiliate,
      orders: referralOrders,
    };
  } catch (error) {
    console.error("checkAffiliateStatsAction error:", error);
    return { success: false, message: "Gagal memuat statistik affiliate." };
  }
}
