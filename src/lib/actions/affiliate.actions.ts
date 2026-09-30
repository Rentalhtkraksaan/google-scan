"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

/**
 * 1. Validasi Kode Referral Affiliate & Hitung Diskon Ongkir
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
 * 2. Daftar Sebagai Affiliate Baru (Publik / Dari Super Admin)
 */
export async function registerAffiliateAccountAction(data: {
  fullName: string;
  phone: string;
  email: string;
  password?: string;
  socialMediaUrl?: string;
  followersCount?: number;
  commissionPerPcs?: number;
  customReferralCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  notes?: string;
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

    // Tarif komisi: jika diisi manual pakai manual, jika tidak hitung tier followers
    let commissionPerPcs = Number(data.commissionPerPcs) || 0;
    if (commissionPerPcs <= 0) {
      commissionPerPcs = siteSetting?.affiliateDefaultCommission ?? 5000;
      if (followers >= 50000) {
        commissionPerPcs = 10000;
      } else if (followers >= 10000) {
        commissionPerPcs = 7500;
      }
    }

    const plainPassword = data.password?.trim() || "affiliate123";
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const affiliate = await prisma.affiliateAccount.create({
      data: {
        fullName: data.fullName.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        password: hashedPassword,
        referralCode,
        socialMediaUrl: data.socialMediaUrl?.trim() || null,
        followersCount: followers,
        commissionPerPcs,
        bankName: data.bankName?.trim() || null,
        accountNumber: data.accountNumber?.trim() || null,
        accountHolder: data.accountHolder?.trim() || null,
        notes: data.notes?.trim() || null,
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
      message: `Selamat! Akun affiliate "${affiliate.fullName}" berhasil dibuat dengan kode: ${affiliate.referralCode}. Password login: "${plainPassword}".`,
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
        hasPassword: !!aff.password,
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
 * 4. Super Admin: Update Lengkap Data Akun Affiliate
 */
export async function updateAffiliateAccountAction(
  id: string,
  data: {
    fullName?: string;
    phone?: string;
    email?: string;
    referralCode?: string;
    password?: string;
    socialMediaUrl?: string;
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

    const existing = await prisma.affiliateAccount.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, message: "Akun affiliate tidak ditemukan." };
    }

    // Check duplicate email if changed
    if (data.email && data.email.trim().toLowerCase() !== existing.email.toLowerCase()) {
      const dupEmail = await prisma.affiliateAccount.findUnique({
        where: { email: data.email.trim().toLowerCase() },
      });
      if (dupEmail && dupEmail.id !== id) {
        return { success: false, message: "Email sudah digunakan oleh affiliate lain." };
      }
    }

    // Check duplicate referralCode if changed
    if (data.referralCode && data.referralCode.trim().toUpperCase() !== existing.referralCode.toUpperCase()) {
      const cleanRef = data.referralCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      const dupRef = await prisma.affiliateAccount.findUnique({
        where: { referralCode: cleanRef },
      });
      if (dupRef && dupRef.id !== id) {
        return { success: false, message: "Kode referral sudah digunakan oleh affiliate lain." };
      }
    }

    let hashedPassword: string | undefined = undefined;
    if (data.password && data.password.trim()) {
      hashedPassword = await bcrypt.hash(data.password.trim(), 10);
    }

    const updated = await prisma.affiliateAccount.update({
      where: { id },
      data: {
        fullName: data.fullName?.trim() || undefined,
        phone: data.phone?.trim().replace(/[^0-9]/g, "") || undefined,
        email: data.email?.trim().toLowerCase() || undefined,
        referralCode: data.referralCode?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") || undefined,
        password: hashedPassword,
        socialMediaUrl: data.socialMediaUrl !== undefined ? data.socialMediaUrl.trim() || null : undefined,
        followersCount: data.followersCount !== undefined ? Number(data.followersCount) : undefined,
        commissionPerPcs: data.commissionPerPcs !== undefined ? Number(data.commissionPerPcs) : undefined,
        status: data.status || undefined,
        bankName: data.bankName !== undefined ? data.bankName.trim() || null : undefined,
        accountNumber: data.accountNumber !== undefined ? data.accountNumber.trim() || null : undefined,
        accountHolder: data.accountHolder !== undefined ? data.accountHolder.trim() || null : undefined,
        notes: data.notes !== undefined ? data.notes.trim() || null : undefined,
      },
    });

    revalidatePath("/super-admin");
    revalidatePath("/affiliate");

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
 * 5. Super Admin: Reset Password Cepat untuk Affiliate
 */
export async function resetAffiliatePasswordAction(id: string, newPassword: string) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak: Khusus Super Admin." };
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, message: "Password minimal 4 karakter." };
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    const affiliate = await prisma.affiliateAccount.update({
      where: { id },
      data: { password: hashedPassword },
    });

    await prisma.activityLog.create({
      data: {
        userName: session.user.name || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "UPDATE",
        title: "Reset Password Affiliate 🔑",
        description: `Super Admin mereset password akun affiliate "${affiliate.fullName}" (${affiliate.email}).`,
        targetId: affiliate.id,
        targetName: affiliate.referralCode,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");

    return {
      success: true,
      message: `Password akun "${affiliate.fullName}" berhasil diperbarui menjadi "${newPassword.trim()}".`,
    };
  } catch (error) {
    console.error("resetAffiliatePasswordAction error:", error);
    return { success: false, message: "Gagal mereset password affiliate." };
  }
}

/**
 * 6. Super Admin: Hapus Akun Affiliate
 */
export async function deleteAffiliateAccountAction(id: string) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak: Khusus Super Admin." };
    }

    const existing = await prisma.affiliateAccount.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, message: "Akun affiliate tidak ditemukan." };
    }

    await prisma.affiliateAccount.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userName: session.user.name || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "DELETE",
        title: "Hapus Akun Affiliate 🗑️",
        description: `Super Admin menghapus akun affiliate "${existing.fullName}" (Kode: ${existing.referralCode}).`,
        targetId: existing.id,
        targetName: existing.referralCode,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");

    return {
      success: true,
      message: `Akun affiliate "${existing.fullName}" berhasil dihapus.`,
    };
  } catch (error) {
    console.error("deleteAffiliateAccountAction error:", error);
    return { success: false, message: "Gagal menghapus akun affiliate." };
  }
}

/**
 * 7. Super Admin: Cairkan Komisi Affiliate (Payout)
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
    revalidatePath("/affiliate");

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
 * 8. Dashboard Affiliate: Ambil Data Lengkap untuk Affiliate yang Sedang Login
 */
export async function getAffiliateDashboardDataAction() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, message: "Sesi login tidak valid." };
    }

    // Temukan akun affiliate berdasarkan email atau id
    const affiliate = await prisma.affiliateAccount.findFirst({
      where: {
        OR: [
          { email: session.user.email?.toLowerCase().trim() },
          { id: session.user.id },
        ],
      },
    });

    if (!affiliate) {
      return { success: false, message: "Akun affiliate tidak ditemukan." };
    }

    // Ambil riwayat pesanan referral
    const orders = await prisma.resellerOrder.findMany({
      where: {
        affiliateCode: affiliate.referralCode,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        totalQuantity: true,
        subtotal: true,
        shippingFee: true,
        discountAmount: true,
        totalAmount: true,
        paymentStatus: true,
        orderStatus: true,
        affiliateCommission: true,
        createdAt: true,
      },
    });

    const siteSetting = await prisma.siteSetting.findUnique({
      where: { id: "default" },
      select: {
        whatsappNumber: true,
        affiliateShippingDiscount: true,
      },
    });

    return {
      success: true,
      affiliate,
      orders,
      siteSetting,
    };
  } catch (error) {
    console.error("getAffiliateDashboardDataAction error:", error);
    return { success: false, message: "Gagal memuat data dashboard affiliate." };
  }
}

/**
 * 9. Affiliate Cek Statistik & Saldo Mandiri (Berdasarkan Kode Referral / No HP)
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
        subtotal: true,
        shippingFee: true,
        discountAmount: true,
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

/**
 * 10. Affiliate Mandiri: Ubah Kode Referral (Maksimal 1x Seumur Hidup)
 */
export async function updateAffiliateReferralCodeSelfAction(rawCode: string) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, message: "Sesi login tidak valid." };
    }

    if (!rawCode || !rawCode.trim()) {
      return { success: false, message: "Kode referral baru tidak boleh kosong." };
    }

    const cleanCode = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleanCode.length < 3 || cleanCode.length > 20) {
      return { success: false, message: "Kode referral harus berupa 3-20 karakter alfanumerik (huruf dan angka saja)." };
    }

    const affiliate = await prisma.affiliateAccount.findFirst({
      where: {
        OR: [
          { email: session.user.email?.toLowerCase().trim() },
          { id: session.user.id },
        ],
      },
    });

    if (!affiliate) {
      return { success: false, message: "Akun affiliate tidak ditemukan." };
    }

    if ((affiliate.referralCodeChangeCount || 0) >= 1) {
      return {
        success: false,
        message: "Kesempatan ubah kode referral sudah habis. Kode referral hanya dapat diubah maksimal 1 kali.",
      };
    }

    if (cleanCode === affiliate.referralCode.toUpperCase()) {
      return { success: false, message: "Kode referral baru sama dengan kode Anda saat ini." };
    }

    // Pastikan kode referral belum digunakan
    const existing = await prisma.affiliateAccount.findUnique({
      where: { referralCode: cleanCode },
    });

    if (existing) {
      return { success: false, message: `Kode referral "${cleanCode}" sudah digunakan oleh mitra lain. Silakan pilih kode yang lain.` };
    }

    const oldCode = affiliate.referralCode;

    const updated = await prisma.affiliateAccount.update({
      where: { id: affiliate.id },
      data: {
        referralCode: cleanCode,
        referralCodeChangeCount: { increment: 1 },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: affiliate.id,
        userName: affiliate.fullName,
        userRole: "USER",
        action: "UPDATE",
        title: "Ubah Kode Referral Affiliate 🏷️",
        description: `Affiliate "${affiliate.fullName}" mengubah kode referral dari "${oldCode}" menjadi "${cleanCode}" (Kesempatan 1x terpakai).`,
        targetId: affiliate.id,
        targetName: cleanCode,
      },
    }).catch(() => {});

    revalidatePath("/affiliate");
    revalidatePath("/super-admin");

    return {
      success: true,
      message: `Kode referral berhasil diubah menjadi "${cleanCode}"! Kesempatan ubah kode telah terpakai (Maks. 1x).`,
      newCode: cleanCode,
      changeCount: updated.referralCodeChangeCount,
    };
  } catch (error) {
    console.error("updateAffiliateReferralCodeSelfAction error:", error);
    return { success: false, message: "Gagal memperbarui kode referral." };
  }
}

/**
 * 11. Affiliate Mandiri: Ubah Data Rekening Pencairan Komisi
 */
export async function updateAffiliateBankInfoSelfAction(data: {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, message: "Sesi login tidak valid." };
    }

    if (!data.bankName?.trim() || !data.accountNumber?.trim() || !data.accountHolder?.trim()) {
      return { success: false, message: "Nama Bank/E-Wallet, Nomor Rekening, dan Nama Pemilik Rekening wajib diisi." };
    }

    const affiliate = await prisma.affiliateAccount.findFirst({
      where: {
        OR: [
          { email: session.user.email?.toLowerCase().trim() },
          { id: session.user.id },
        ],
      },
    });

    if (!affiliate) {
      return { success: false, message: "Akun affiliate tidak ditemukan." };
    }

    const updated = await prisma.affiliateAccount.update({
      where: { id: affiliate.id },
      data: {
        bankName: data.bankName.trim(),
        accountNumber: data.accountNumber.trim(),
        accountHolder: data.accountHolder.trim(),
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: affiliate.id,
        userName: affiliate.fullName,
        userRole: "USER",
        action: "UPDATE",
        title: "Update Rekening Affiliate 💳",
        description: `Affiliate "${affiliate.fullName}" memperbarui rekening pencairan: ${updated.bankName} ${updated.accountNumber} a.n ${updated.accountHolder}.`,
        targetId: affiliate.id,
        targetName: affiliate.referralCode,
      },
    }).catch(() => {});

    revalidatePath("/affiliate");
    revalidatePath("/super-admin");

    return {
      success: true,
      message: "Data rekening pencairan berhasil disimpan!",
      bankInfo: {
        bankName: updated.bankName,
        accountNumber: updated.accountNumber,
        accountHolder: updated.accountHolder,
      },
    };
  } catch (error) {
    console.error("updateAffiliateBankInfoSelfAction error:", error);
    return { success: false, message: "Gagal menyimpan data rekening." };
  }
}

/**
 * 12. Affiliate Mandiri: Ubah Profil & Password Akun (Nama, WA, Email, Password, Medsos)
 */
export async function updateAffiliateProfileSelfAction(data: {
  fullName: string;
  phone: string;
  email: string;
  newPassword?: string;
  socialMediaUrl?: string;
}) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, message: "Sesi login tidak valid." };
    }

    if (!data.fullName?.trim() || !data.phone?.trim() || !data.email?.trim()) {
      return { success: false, message: "Nama lengkap, nomor WhatsApp, dan Email wajib diisi." };
    }

    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPhone = data.phone.trim().replace(/[^0-9]/g, "");

    const affiliate = await prisma.affiliateAccount.findFirst({
      where: {
        OR: [
          { email: session.user.email?.toLowerCase().trim() },
          { id: session.user.id },
        ],
      },
    });

    if (!affiliate) {
      return { success: false, message: "Akun affiliate tidak ditemukan." };
    }

    // Cek duplikasi email jika diganti
    if (cleanEmail !== affiliate.email.toLowerCase()) {
      const dup = await prisma.affiliateAccount.findUnique({
        where: { email: cleanEmail },
      });
      if (dup && dup.id !== affiliate.id) {
        return { success: false, message: "Email ini sudah digunakan oleh akun affiliate lain." };
      }
    }

    let hashedPassword: string | undefined = undefined;
    if (data.newPassword && data.newPassword.trim()) {
      if (data.newPassword.trim().length < 4) {
        return { success: false, message: "Password baru minimal 4 karakter." };
      }
      hashedPassword = await bcrypt.hash(data.newPassword.trim(), 10);
    }

    const updated = await prisma.affiliateAccount.update({
      where: { id: affiliate.id },
      data: {
        fullName: data.fullName.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        password: hashedPassword,
        socialMediaUrl: data.socialMediaUrl !== undefined ? data.socialMediaUrl.trim() || null : undefined,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: affiliate.id,
        userName: affiliate.fullName,
        userRole: "USER",
        action: "UPDATE",
        title: "Update Profil Affiliate 👤",
        description: `Affiliate "${updated.fullName}" (${updated.email}) memperbarui profil & kredensial login.`,
        targetId: affiliate.id,
        targetName: affiliate.referralCode,
      },
    }).catch(() => {});

    revalidatePath("/affiliate");
    revalidatePath("/super-admin");

    return {
      success: true,
      message: "Profil dan akun affiliate berhasil diperbarui!",
      affiliate: updated,
    };
  } catch (error) {
    console.error("updateAffiliateProfileSelfAction error:", error);
    return { success: false, message: "Gagal memperbarui profil affiliate." };
  }
}
