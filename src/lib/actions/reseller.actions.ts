"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Super Admin: Buka kunci atau Kunci akses dashboard reseller secara manual (Gratis / Bypass)
 */
export async function toggleAdminResellerUnlockAction(adminId: string, isUnlocked: boolean) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak. Khusus Super Admin." };
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: adminId },
      select: { fullName: true, role: true },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return { success: false, message: "Admin Lapangan tidak ditemukan." };
    }

    await prisma.user.update({
      where: { id: adminId },
      data: {
        isResellerUnlocked: isUnlocked,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "UPDATE_STATUS",
        title: isUnlocked ? "Membuka Kunci Akun Reseller 🔓" : "Mengunci Akses Reseller 🔒",
        description: `Super Admin mengubah status akses Modul Reseller untuk "${adminUser.fullName}" menjadi ${isUnlocked ? "TERBUKA (Aktif)" : "TERKUNCI"}.`,
        targetId: adminId,
        targetName: adminUser.fullName,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Status akses untuk ${adminUser.fullName} berhasil diubah menjadi ${isUnlocked ? "TERBUKA (Aktif)" : "TERKUNCI"}.`,
    };
  } catch (error) {
    console.error("toggleAdminResellerUnlockAction error:", error);
    return { success: false, message: "Gagal memperbarui status akses reseller." };
  }
}

/**
 * Super Admin: Update Pengaturan Harga Modul Reseller & Reward Diskon Outlet VIP
 */
export async function updateResellerModuleSettingsAction(data: {
  resellerModulePrice?: number;
  resellerVipDiscountPerCard?: number;
  resellerCardBasePrice?: number;
  resellerModuleTitle?: string;
  resellerModuleDesc?: string;
  resellerModulePdfUrl?: string;
}) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak. Khusus Super Admin." };
    }

    await prisma.siteSetting.upsert({
      where: { id: "default" },
      update: {
        resellerModulePrice: data.resellerModulePrice !== undefined ? Number(data.resellerModulePrice) : undefined,
        resellerVipDiscountPerCard: data.resellerVipDiscountPerCard !== undefined ? Number(data.resellerVipDiscountPerCard) : undefined,
        resellerCardBasePrice: data.resellerCardBasePrice !== undefined ? Number(data.resellerCardBasePrice) : undefined,
        resellerModuleTitle: data.resellerModuleTitle !== undefined ? data.resellerModuleTitle.trim() : undefined,
        resellerModuleDesc: data.resellerModuleDesc !== undefined ? data.resellerModuleDesc.trim() : undefined,
        resellerModulePdfUrl: data.resellerModulePdfUrl !== undefined ? data.resellerModulePdfUrl.trim() : undefined,
      },
      create: {
        id: "default",
        resellerModulePrice: Number(data.resellerModulePrice) || 150000,
        resellerVipDiscountPerCard: Number(data.resellerVipDiscountPerCard) || 5000,
        resellerCardBasePrice: Number(data.resellerCardBasePrice) || 25000,
        resellerModuleTitle: data.resellerModuleTitle || "Starter Kit & Modul Resmi Kemitraan Smart QR",
        resellerModuleDesc: data.resellerModuleDesc || "",
        resellerModulePdfUrl: data.resellerModulePdfUrl || "",
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "UPDATE_STATUS",
        title: "Perbarui Tarif & Modul Reseller 💼",
        description: `Super Admin memperbarui tarif modul reseller menjadi Rp ${(data.resellerModulePrice || 150000).toLocaleString("id-ID")}, harga kartu Rp ${(data.resellerCardBasePrice || 25000).toLocaleString("id-ID")}, dan diskon VIP Rp ${(data.resellerVipDiscountPerCard || 5000).toLocaleString("id-ID")}.`,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return {
      success: true,
      message: "Pengaturan Modul Reseller & Tarif berhasil disimpan.",
    };
  } catch (error) {
    console.error("updateResellerModuleSettingsAction error:", error);
    return { success: false, message: "Gagal menyimpan pengaturan modul reseller." };
  }
}

/**
 * Klaim Kuota Reward VIP (Digunakan saat order kartu disetujui / dipenuhi)
 */
export async function claimVipRewardForAdminAction(adminId: string, countToClaim: number) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak. Khusus Super Admin." };
    }

    if (countToClaim <= 0) return { success: true };

    await prisma.user.update({
      where: { id: adminId },
      data: {
        resellerVipRewardsClaimed: {
          increment: countToClaim,
        },
      },
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return { success: true, message: `Reward ${countToClaim} diskon VIP berhasil dicatat sebagai terpakai.` };
  } catch (error) {
    console.error("claimVipRewardForAdminAction error:", error);
    return { success: false, message: "Gagal mencatat klaim reward VIP." };
  }
}

/**
 * Reseller: Beli Modul Reseller via Midtrans QRIS Instan
 */
export async function createResellerMidtransQrisAction() {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return { success: false, message: "Akses ditolak: Khusus Admin Lapangan." };
    }

    const siteSetting = await prisma.siteSetting.findUnique({
      where: { id: "default" },
    });

    const serverKey = siteSetting?.midtransServerKey || process.env.MIDTRANS_SERVER_KEY || "";
    const isProduction = siteSetting?.midtransIsProduction ?? (process.env.MIDTRANS_IS_PRODUCTION === "true");

    if (!serverKey) {
      return {
        success: false,
        message: "Payment Gateway Midtrans belum dikonfigurasi oleh Super Admin. Silakan gunakan metode transfer manual.",
      };
    }

    const amount = siteSetting?.resellerModulePrice || 150000;
    const orderId = `MODUL-${session.user.id.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const snapEndpoint = isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    const authHeader = "Basic " + Buffer.from(serverKey + ":").toString("base64");

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { fullName: true, email: true, whatsappNumber: true },
    });

    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: user?.fullName || session.user.name || "Mitra Reseller",
        email: user?.email || session.user.email || "reseller@smartqr.id",
        phone: user?.whatsappNumber || "08123456789",
      },
      item_details: [
        {
          id: "MODUL-RESELLER",
          price: amount,
          quantity: 1,
          name: (siteSetting?.resellerModuleTitle || "Modul Kemitraan Reseller").slice(0, 50),
        },
      ],
    };

    const midtransRes = await fetch(snapEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(payload),
    });

    const snapData = await midtransRes.json();

    if (!midtransRes.ok || !snapData.token) {
      console.error("[Midtrans Reseller Error]:", snapData);
      return {
        success: false,
        message: snapData.error_messages?.[0] || "Gagal membuat invoice pembayaran Midtrans.",
      };
    }

    await prisma.resellerModulePayment.create({
      data: {
        userId: session.user.id,
        amount,
        paymentType: "MIDTRANS_QRIS",
        status: "PENDING",
        midtransOrderId: orderId,
        snapToken: snapData.token,
        senderName: session.user.name || "Mitra Reseller",
      },
    });

    return {
      success: true,
      token: snapData.token,
      redirectUrl: snapData.redirect_url,
      orderId,
      amount,
    };
  } catch (error) {
    console.error("createResellerMidtransQrisAction error:", error);
    return { success: false, message: "Terjadi kesalahan saat memproses pembayaran Midtrans." };
  }
}

/**
 * Reseller: Unggah Bukti Transfer Manual untuk Modul Reseller
 */
export async function submitResellerPaymentProofAction(
  amount: number,
  proofImageUrl: string,
  senderName?: string,
  senderNotes?: string
) {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return { success: false, message: "Akses ditolak: Khusus Admin Lapangan." };
    }

    if (!proofImageUrl) {
      return { success: false, message: "Bukti transfer wajib diunggah." };
    }

    const siteSetting = await prisma.siteSetting.findUnique({ where: { id: "default" } });
    const expectedAmount = siteSetting?.resellerModulePrice || 150000;

    await prisma.resellerModulePayment.create({
      data: {
        userId: session.user.id,
        amount: amount || expectedAmount,
        paymentType: "MANUAL",
        proofImageUrl,
        status: "PENDING",
        senderName: senderName || session.user.name || "Mitra Reseller",
        senderNotes: senderNotes || null,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "Mitra Reseller",
        userRole: "ADMIN",
        action: "UPDATE_STATUS",
        title: "Kirim Bukti Pembayaran Modul Reseller 🧾",
        description: `Mitra Lapangan "${session.user.name}" mengunggah bukti transfer manual untuk aktivasi Modul Reseller sebesar Rp ${(amount || expectedAmount).toLocaleString("id-ID")}.`,
        targetId: session.user.id,
        targetName: session.user.name || "Mitra Reseller",
      },
    }).catch(() => {});

    revalidatePath("/admin");
    revalidatePath("/super-admin");

    return {
      success: true,
      message: "Bukti transfer berhasil dikirim. Super Admin akan memverifikasi dan membuka akun Anda.",
    };
  } catch (error) {
    console.error("submitResellerPaymentProofAction error:", error);
    return { success: false, message: "Gagal mengirim bukti transfer." };
  }
}

/**
 * Super Admin: Setujui Pembayaran Modul Reseller & Buka Akun Otomatis
 */
export async function approveResellerPaymentAction(paymentId: string) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak. Khusus Super Admin." };
    }

    const payment = await prisma.resellerModulePayment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!payment) {
      return { success: false, message: "Data pembayaran tidak ditemukan." };
    }

    await prisma.$transaction([
      prisma.resellerModulePayment.update({
        where: { id: paymentId },
        data: { status: "APPROVED" },
      }),
      prisma.user.update({
        where: { id: payment.userId },
        data: { isResellerUnlocked: true },
      }),
    ]);

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "UPDATE_STATUS",
        title: "Aktivasi Modul Reseller Disetujui ✅",
        description: `Super Admin menyetujui pembayaran Modul Reseller untuk "${payment.user.fullName}". Akun resmi diaktifkan.`,
        targetId: payment.userId,
        targetName: payment.user.fullName,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Pembayaran disetujui! Akun ${payment.user.fullName} kini telah aktif dan terbuka.`,
    };
  } catch (error) {
    console.error("approveResellerPaymentAction error:", error);
    return { success: false, message: "Gagal menyetujui pembayaran modul reseller." };
  }
}

/**
 * Super Admin: Tolak Pembayaran Modul Reseller
 */
export async function rejectResellerPaymentAction(paymentId: string, reason?: string) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak. Khusus Super Admin." };
    }

    await prisma.resellerModulePayment.update({
      where: { id: paymentId },
      data: {
        status: "REJECTED",
        adminNotes: reason || "Bukti transfer tidak valid atau dana belum masuk.",
      },
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return { success: true, message: "Pembayaran berhasil ditolak." };
  } catch (error) {
    console.error("rejectResellerPaymentAction error:", error);
    return { success: false, message: "Gagal menolak pembayaran." };
  }
}
