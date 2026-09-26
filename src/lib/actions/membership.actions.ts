"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Outlet mengunggah bukti transfer pembayaran membership
 */
export async function submitPaymentProofAction(
  outletId: string,
  amount: number,
  proofImageUrl: string,
  senderName?: string,
  senderNotes?: string
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, message: "Silakan login terlebih dahulu." };
    }

    if (!outletId || !proofImageUrl) {
      return { success: false, message: "Data bukti transfer dan outlet wajib diisi." };
    }

    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      select: { ownerId: true },
    });

    if (!outlet) {
      return { success: false, message: "Outlet tidak ditemukan." };
    }

    const isOwner = outlet.ownerId === session.user.id;
    const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return { success: false, message: "Akses ditolak: Anda bukan pemilik outlet ini." };
    }

    const payment = await prisma.membershipPayment.create({
      data: {
        outletId,
        amount: amount || 45000,
        proofImageUrl,
        status: "PENDING",
        senderName: senderName || session.user.name || "Pemilik Outlet",
        senderNotes: senderNotes || null,
      },
    });

    // Catat log aktivitas
    await prisma.activityLog.create({
      data: {
        outletId,
        userId: session.user.id,
        userName: session.user.name || "Pemilik Outlet",
        userRole: (session.user.role as "USER" | "ADMIN" | "SUPER_ADMIN") || "USER",
        action: "UPDATE_STATUS",
        title: "Kirim Bukti Pembayaran Member 💳",
        description: `Outlet mengirim bukti transfer sebesar Rp ${(amount || 45000).toLocaleString("id-ID")} untuk verifikasi member premium.`,
        targetId: payment.id,
        targetName: "Pembayaran Member",
      },
    }).catch(() => {});

    revalidatePath("/portal");
    revalidatePath("/super-admin");

    return {
      success: true,
      message: "Bukti transfer berhasil dikirim! Menunggu konfirmasi Super Admin.",
      paymentId: payment.id,
    };
  } catch (error) {
    console.error("Error submitting payment proof:", error);
    return { success: false, message: "Gagal mengirim bukti pembayaran." };
  }
}

import { getDefaultSeptember30Expiry, isOutletMemberActive, formatMembershipExpiry } from "@/lib/membership-utils";

/**
 * Super Admin: 1-Klik Menyetujui bukti transfer & mengaktifkan status member outlet
 */
export async function approvePaymentProofAction(paymentId: string, customExpiryDate?: string | Date) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak. Khusus Super Admin." };
    }

    const payment = await prisma.membershipPayment.findUnique({
      where: { id: paymentId },
      include: { outlet: true },
    });

    if (!payment) {
      return { success: false, message: "Data pembayaran tidak ditemukan." };
    }

    const now = new Date();
    const expiresAt = customExpiryDate ? new Date(customExpiryDate) : getDefaultSeptember30Expiry();

    // Update status payment & outlet
    await prisma.$transaction([
      prisma.membershipPayment.update({
        where: { id: paymentId },
        data: {
          status: "APPROVED",
          adminNotes: `Disetujui oleh ${session.user.name} pada ${now.toLocaleString("id-ID")}`,
        },
      }),
      prisma.outlet.update({
        where: { id: payment.outletId },
        data: {
          isMember: true,
          membershipStartedAt: now,
          membershipExpiresAt: expiresAt,
        },
      }),
    ]);

    revalidatePath("/super-admin");
    revalidatePath("/portal");

    return {
      success: true,
      message: `Pembayaran ${payment.outlet.name} disetujui! Status Member aktif s/d ${formatMembershipExpiry(expiresAt)}.`,
    };
  } catch (error) {
    console.error("Error approving payment proof:", error);
    return { success: false, message: "Gagal menyetujui pembayaran." };
  }
}

/**
 * Super Admin: Tolak bukti transfer
 */
export async function rejectPaymentProofAction(paymentId: string, reason: string) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak. Khusus Super Admin." };
    }

    await prisma.membershipPayment.update({
      where: { id: paymentId },
      data: {
        status: "REJECTED",
        adminNotes: reason || "Bukti transfer tidak valid atau dana belum masuk rekening.",
      },
    });

    revalidatePath("/super-admin");
    revalidatePath("/portal");

    return { success: true, message: "Bukti transfer telah ditolak." };
  } catch (error) {
    console.error("Error rejecting payment proof:", error);
    return { success: false, message: "Gagal menolak pembayaran." };
  }
}

/**
 * Super Admin: Toggle manual status member untuk 1 outlet
 */
export async function toggleOutletMembershipAction(
  outletId: string,
  isMember: boolean,
  customExpiryDate?: string | Date
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak. Khusus Super Admin." };
    }

    const now = new Date();
    const expiresAt = isMember
      ? (customExpiryDate ? new Date(customExpiryDate) : getDefaultSeptember30Expiry())
      : null;

    const updated = await prisma.outlet.update({
      where: { id: outletId },
      data: {
        isMember,
        membershipStartedAt: isMember ? now : null,
        membershipExpiresAt: expiresAt,
      },
    });

    revalidatePath("/super-admin");
    revalidatePath("/portal");

    return {
      success: true,
      isMember: updated.isMember,
      membershipExpiresAt: updated.membershipExpiresAt,
      message: isMember
        ? `Status Member Premium "${updated.name}" aktif s/d ${formatMembershipExpiry(expiresAt)}!`
        : `Status Member Premium "${updated.name}" dinonaktifkan.`,
    };
  } catch (error) {
    console.error("Error toggling outlet membership:", error);
    return { success: false, message: "Gagal mengubah status member outlet." };
  }
}

/**
 * Super Admin: Mengganti tanggal kadaluarsa atau memperpanjang masa aktif member outlet
 * "super admin bisa membperpanjang juga dan bisa mengganti tnggl juga"
 */
export async function updateOutletMembershipExpiryAction(
  outletId: string,
  newExpiryDate: string | Date,
  forceActive?: boolean
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak. Khusus Super Admin." };
    }

    const parsedDate = new Date(newExpiryDate);
    if (isNaN(parsedDate.getTime())) {
      return { success: false, message: "Format tanggal tidak valid." };
    }

    const isFuture = parsedDate.getTime() > Date.now();
    const shouldBeMember = forceActive !== undefined ? forceActive : isFuture;

    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      select: { name: true, membershipStartedAt: true },
    });

    if (!outlet) {
      return { success: false, message: "Outlet tidak ditemukan." };
    }

    const updated = await prisma.outlet.update({
      where: { id: outletId },
      data: {
        isMember: shouldBeMember,
        membershipExpiresAt: parsedDate,
        membershipStartedAt: outlet.membershipStartedAt || new Date(),
      },
    });

    // Catat log aktivitas
    await prisma.activityLog.create({
      data: {
        outletId,
        userName: session.user.name || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "UPDATE_STATUS",
        title: "Perbarui Masa Aktif Member 📅",
        description: `Masa aktif Member Premium "${outlet.name}" diatur hingga ${formatMembershipExpiry(parsedDate)}. Status: ${shouldBeMember ? "Aktif" : "Nonaktif"}.`,
        targetId: outletId,
        targetName: outlet.name,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");
    revalidatePath("/portal");

    return {
      success: true,
      outlet: updated,
      message: `Masa aktif "${outlet.name}" berhasil diatur hingga ${formatMembershipExpiry(parsedDate)}!`,
    };
  } catch (error) {
    console.error("Error updating outlet membership expiry:", error);
    return { success: false, message: "Gagal memperbarui masa aktif member." };
  }
}

/**
 * 🔥 TOMBOL SUPER: Aktifkan SEMUA outlet ke Member Premium sekaligus!
 * Default masa aktif: 30 September 2026 23:59:59 WIB ("seluruh masa aktif member hanya smpai 30 septmber ya")
 */
export async function bulkActivateAllMembersAction(customExpiryDate?: string | Date) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak. Khusus Super Admin." };
    }

    const now = new Date();
    const expiresAt = customExpiryDate ? new Date(customExpiryDate) : getDefaultSeptember30Expiry();

    const result = await prisma.outlet.updateMany({
      data: {
        isMember: true,
        membershipStartedAt: now,
        membershipExpiresAt: expiresAt,
      },
    });

    // Catat log audit
    await prisma.activityLog.create({
      data: {
        userName: session.user.name || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "UPDATE_STATUS",
        title: "⚡ Tombol Super: Seluruh Outlet Menjadi Member Premium",
        description: `Super Admin mengaktifkan seluruh ${result.count} outlet menjadi Member Premium hingga ${formatMembershipExpiry(expiresAt)}.`,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");
    revalidatePath("/portal");

    return {
      success: true,
      count: result.count,
      message: `Luar biasa! Seluruh ${result.count} outlet kini aktif Member Premium s/d ${formatMembershipExpiry(expiresAt)}!`,
    };
  } catch (error) {
    console.error("Error bulk activating members:", error);
    return { success: false, message: "Gagal mengaktifkan semua member." };
  }
}

/**
 * Sinkronisasi otomatis outlet yang masa aktifnya telah habis
 * "dan jika habis otomatis udh ga member dan fitur dihilangkan smua"
 */
export async function syncExpiredMembershipsAction() {
  try {
    const now = new Date();
    const result = await prisma.outlet.updateMany({
      where: {
        isMember: true,
        membershipExpiresAt: {
          lte: now,
        },
      },
      data: {
        isMember: false,
      },
    });

    if (result.count > 0) {
      revalidatePath("/super-admin");
      revalidatePath("/portal");
    }

    return { success: true, expiredCount: result.count };
  } catch (error) {
    console.error("Error syncing expired memberships:", error);
    return { success: false, expiredCount: 0 };
  }
}

/**
 * Super Admin: Update Pengaturan Biaya & Rekening Transfer Membership
 */
export async function updateMembershipSettingsAction(
  price: number,
  bankName: string,
  accountNumber: string,
  accountName: string,
  notes?: string,
  trialNotice?: string,
  midtransServerKey?: string,
  midtransClientKey?: string,
  midtransIsProduction?: boolean,
  trialDurationDays?: number,
  autoVipTrialOnActivation?: boolean
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak. Khusus Super Admin." };
    }

    // Hanya Super Admin 1 (Master) yang berhak mengubah tarif dan konfigurasi rekening / payment gateway
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdminMaster: true },
    });

    if (!user?.isSuperAdminMaster) {
      return {
        success: false,
        message: "Akses ditolak: Hanya Super Admin 1 (Master) yang berhak mengubah tarif dan konfigurasi Payment Gateway.",
      };
    }

    await prisma.siteSetting.upsert({
      where: { id: "default" },
      update: {
        membershipPrice: price || 45000,
        membershipBankName: bankName || "BCA",
        membershipAccountNumber: accountNumber || "0885172288",
        membershipAccountName: accountName || "Smart QR Review",
        membershipNotes: notes || null,
        membershipTrialNotice: trialNotice || null,
        midtransServerKey: midtransServerKey !== undefined ? midtransServerKey.trim() : undefined,
        midtransClientKey: midtransClientKey !== undefined ? midtransClientKey.trim() : undefined,
        midtransIsProduction: midtransIsProduction !== undefined ? midtransIsProduction : false,
        trialDurationDays: trialDurationDays !== undefined ? trialDurationDays : 30,
        autoVipTrialOnActivation: autoVipTrialOnActivation !== undefined ? autoVipTrialOnActivation : true,
      },
      create: {
        id: "default",
        membershipPrice: price || 45000,
        membershipBankName: bankName || "BCA",
        membershipAccountNumber: accountNumber || "0885172288",
        membershipAccountName: accountName || "Smart QR Review",
        membershipNotes: notes || null,
        membershipTrialNotice: trialNotice || null,
        midtransServerKey: midtransServerKey !== undefined ? midtransServerKey.trim() : null,
        midtransClientKey: midtransClientKey !== undefined ? midtransClientKey.trim() : null,
        midtransIsProduction: midtransIsProduction !== undefined ? midtransIsProduction : false,
        trialDurationDays: trialDurationDays !== undefined ? trialDurationDays : 30,
        autoVipTrialOnActivation: autoVipTrialOnActivation !== undefined ? autoVipTrialOnActivation : true,
      },
    });

    revalidatePath("/super-admin");
    revalidatePath("/portal");

    return {
      success: true,
      message: "Pengaturan harga & Payment Gateway Midtrans berhasil disimpan!",
    };
  } catch (error) {
    console.error("Error updating membership settings:", error);
    return { success: false, message: "Gagal menyimpan pengaturan membership." };
  }
}

/**
 * Super Admin: Atur harga khusus VIP per outlet tertentu (override harga master jika diisi)
 */
export async function updateOutletCustomVipPriceAction(outletId: string, customVipPrice: number | null) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak. Khusus Super Admin." };
    }

    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      select: { name: true },
    });

    if (!outlet) {
      return { success: false, message: "Outlet tidak ditemukan." };
    }

    const updated = await prisma.outlet.update({
      where: { id: outletId },
      data: {
        customVipPrice: customVipPrice && customVipPrice > 0 ? Math.round(customVipPrice) : null,
      },
    });

    await prisma.activityLog.create({
      data: {
        outletId,
        userName: session.user.name || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "UPDATE_STATUS",
        title: "Atur Harga Khusus VIP Outlet",
        description: `Super Admin mengatur harga khusus VIP untuk outlet "${outlet.name}" menjadi ${
          updated.customVipPrice ? `Rp ${updated.customVipPrice.toLocaleString("id-ID")}` : "Mengikuti Harga Master Global"
        }.`,
        targetId: outletId,
        targetName: outlet.name,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");
    revalidatePath("/portal");

    return {
      success: true,
      customVipPrice: updated.customVipPrice,
      message: updated.customVipPrice
        ? `Harga khusus VIP untuk "${outlet.name}" diset Rp ${updated.customVipPrice.toLocaleString("id-ID")}/bulan.`
        : `Harga VIP untuk "${outlet.name}" kembali mengikuti Harga Master Global.`,
    };
  } catch (error) {
    console.error("Error updateOutletCustomVipPriceAction:", error);
    return { success: false, message: "Gagal menyimpan harga khusus outlet." };
  }
}

/**
 * Buat transaksi Midtrans Snap Token untuk pembayaran perpanjangan VIP Outlet (Khusus QRIS)
 */
export async function createMidtransVipTransactionAction(outletId: string) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, message: "Silakan login terlebih dahulu." };
    }

    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      include: {
        owner: {
          select: {
            fullName: true,
            email: true,
            whatsappNumber: true,
          },
        },
      },
    });

    if (!outlet) {
      return { success: false, message: "Outlet tidak ditemukan." };
    }

    // Role check: Admin/Super Admin atau pemilik outlet
    if (session.user.role === "USER" && outlet.ownerId !== session.user.id) {
      return { success: false, message: "Akses ditolak." };
    }

    const siteSetting = await prisma.siteSetting.findUnique({
      where: { id: "default" },
    });

    const serverKey = siteSetting?.midtransServerKey || process.env.MIDTRANS_SERVER_KEY || "";
    const clientKey = siteSetting?.midtransClientKey || process.env.MIDTRANS_CLIENT_KEY || "";
    const isProduction = siteSetting?.midtransIsProduction ?? (process.env.MIDTRANS_IS_PRODUCTION === "true");

    if (!serverKey) {
      return {
        success: false,
        message: "Payment Gateway Midtrans belum dikonfigurasi oleh Super Admin. Silakan hubungi pengelola.",
      };
    }

    // Tentukan harga: Harga khusus outlet jika ada, fallback ke harga master
    const amount = outlet.customVipPrice && outlet.customVipPrice > 0
      ? outlet.customVipPrice
      : (siteSetting?.membershipPrice || 45000);

    const orderId = `VIP-${outlet.id.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const snapEndpoint = isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    const authHeader = "Basic " + Buffer.from(serverKey + ":").toString("base64");

    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: outlet.name,
        email: outlet.owner?.email || "outlet@smartqr.id",
        phone: outlet.owner?.whatsappNumber || "08123456789",
      },
      item_details: [
        {
          id: "VIP-1M",
          price: amount,
          quantity: 1,
          name: `VIP 1 Bulan - ${outlet.name.slice(0, 25)}`,
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
      console.error("[Midtrans Error]:", snapData);
      return {
        success: false,
        message: snapData.error_messages?.[0] || "Gagal membuat invoice pembayaran Midtrans.",
      };
    }

    // Catat record MembershipPayment di database dengan status PENDING
    await prisma.membershipPayment.create({
      data: {
        outletId: outlet.id,
        amount,
        paymentType: "MIDTRANS_QRIS",
        status: "PENDING",
        midtransOrderId: orderId,
        snapToken: snapData.token,
        senderName: outlet.owner?.fullName || outlet.name,
        senderNotes: `Perpanjangan VIP 1 Bulan via Midtrans QRIS`,
      },
    });

    return {
      success: true,
      snapToken: snapData.token,
      redirectUrl: snapData.redirect_url,
      orderId,
      amount,
      clientKey,
      isProduction,
    };
  } catch (error) {
    console.error("Error createMidtransVipTransactionAction:", error);
    return { success: false, message: "Terjadi kesalahan saat memproses pembayaran." };
  }
}

/**
 * Cek status transaksi Midtrans secara real-time dari browser outlet
 */
export async function checkMidtransTransactionStatusAction(orderId: string) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, message: "Silakan login terlebih dahulu." };
    }

    const payment = await prisma.membershipPayment.findFirst({
      where: { midtransOrderId: orderId },
      include: { outlet: { include: { owner: true } } },
    });

    if (!payment) {
      return { success: false, message: "Data transaksi tidak ditemukan." };
    }

    // Otorisasi IDOR: Hanya pemilik outlet atau Admin/Super Admin yang berhak mengecek status transaksi
    const isOwner = payment.outlet?.ownerId === session.user.id;
    const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return { success: false, message: "Akses ditolak: Anda tidak memiliki akses ke transaksi ini." };
    }

    // Jika sudah approved di webhook, langsung return success
    if (payment.status === "APPROVED") {
      return {
        success: true,
        status: "APPROVED",
        isPaid: true,
        expiresAt: payment.outlet.membershipExpiresAt,
      };
    }

    const siteSetting = await prisma.siteSetting.findUnique({
      where: { id: "default" },
    });

    const serverKey = siteSetting?.midtransServerKey || process.env.MIDTRANS_SERVER_KEY || "";
    const isProduction = siteSetting?.midtransIsProduction ?? (process.env.MIDTRANS_IS_PRODUCTION === "true");

    if (!serverKey) {
      return { success: false, message: "Kunci server Midtrans belum diisi." };
    }

    const statusEndpoint = isProduction
      ? `https://api.midtrans.com/v2/${orderId}/status`
      : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

    const authHeader = "Basic " + Buffer.from(serverKey + ":").toString("base64");

    const statusRes = await fetch(statusEndpoint, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": authHeader,
      },
    });

    const statusData = await statusRes.json();

    const isSuccess =
      statusData.transaction_status === "settlement" ||
      (statusData.transaction_status === "capture" && statusData.fraud_status === "accept");

    if (isSuccess && payment.status !== "APPROVED") {
      const now = new Date();
      let newExpiresAt: Date;

      if (payment.outlet.membershipExpiresAt && new Date(payment.outlet.membershipExpiresAt).getTime() > now.getTime()) {
        newExpiresAt = new Date(new Date(payment.outlet.membershipExpiresAt).getTime() + 30 * 24 * 60 * 60 * 1000);
      } else {
        newExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      await prisma.$transaction([
        prisma.membershipPayment.update({
          where: { id: payment.id },
          data: {
            status: "APPROVED",
            midtransTransactionId: statusData.transaction_id || undefined,
            adminNotes: `Sukses via Midtrans QRIS pada ${now.toLocaleString("id-ID")}`,
          },
        }),
        prisma.outlet.update({
          where: { id: payment.outletId },
          data: {
            isMember: true,
            membershipStartedAt: payment.outlet.membershipStartedAt || now,
            membershipExpiresAt: newExpiresAt,
          },
        }),
        prisma.activityLog.create({
          data: {
            outletId: payment.outletId,
            userId: payment.outlet.ownerId,
            userName: payment.outlet.owner?.fullName || payment.outlet.name,
            userRole: "USER",
            action: "VIP_RENEWAL_MIDTRANS",
            title: "Perpanjangan Member VIP Berhasil (Midtrans QRIS) ⚡",
            description: `Outlet "${payment.outlet.name}" sukses memperpanjang Member VIP via Midtrans QRIS sebesar Rp ${payment.amount.toLocaleString("id-ID")}. Masa aktif kini berlaku hingga ${formatMembershipExpiry(newExpiresAt)}.`,
            targetId: payment.id,
            targetName: "Midtrans QRIS",
          },
        }),
      ]);

      revalidatePath("/portal");
      revalidatePath("/super-admin");

      return {
        success: true,
        status: "APPROVED",
        isPaid: true,
        expiresAt: newExpiresAt,
      };
    }

    return {
      success: true,
      status: statusData.transaction_status || payment.status,
      isPaid: false,
    };
  } catch (error) {
    console.error("Error checkMidtransTransactionStatusAction:", error);
    return { success: false, message: "Gagal memeriksa status pembayaran." };
  }
}

/**
 * Super Admin: Ambil seluruh daftar outlet beserta status membership, expired, & harga khusus
 */
export async function getAllOutletsMembershipAction() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, outlets: [], message: "Akses ditolak." };
    }

    const outlets = await prisma.outlet.findMany({
      include: {
        owner: {
          select: {
            fullName: true,
            email: true,
            whatsappNumber: true,
          },
        },
        qrCards: {
          select: {
            code: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = Date.now();
    const formatted = outlets.map((o) => {
      const isExpired = o.membershipExpiresAt ? new Date(o.membershipExpiresAt).getTime() <= now : true;
      const daysRemaining = o.membershipExpiresAt
        ? Math.ceil((new Date(o.membershipExpiresAt).getTime() - now) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        id: o.id,
        name: o.name,
        ownerName: o.owner?.fullName || "-",
        ownerEmail: o.owner?.email || "-",
        ownerWa: o.owner?.whatsappNumber || "-",
        isMember: o.isMember,
        isExpired,
        daysRemaining,
        membershipStartedAt: o.membershipStartedAt,
        membershipExpiresAt: o.membershipExpiresAt,
        customVipPrice: o.customVipPrice,
        cardsCount: o.qrCards.length,
        createdAt: o.createdAt,
      };
    });

    return { success: true, outlets: formatted };
  } catch (error) {
    console.error("Error getAllOutletsMembershipAction:", error);
    return { success: false, outlets: [], message: "Gagal memuat data member outlet." };
  }
}

/**
 * Mengambil daftar bukti transfer pembayaran yang masuk untuk diverifikasi Super Admin
 */
export async function getMembershipRequestsAction() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, requests: [], message: "Akses ditolak." };
    }

    const requests = await prisma.membershipPayment.findMany({
      include: {
        outlet: {
          select: {
            id: true,
            name: true,
            isMember: true,
            owner: {
              select: {
                fullName: true,
                whatsappNumber: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, requests };
  } catch (error) {
    console.error("Error fetching membership requests:", error);
    return { success: false, requests: [], message: "Gagal memuat daftar permintaan." };
  }
}

/**
 * Update Pengaturan Fitur VIP Outlet (Efek Suara & Teks Sambutan Audio Custom)
 */
export async function updateOutletVipSettingsAction(data: {
  outletId: string;
  soundEffect?: string;
  customGreetingText?: string;
}) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, message: "Silakan login terlebih dahulu." };
    }

    const outlet = await prisma.outlet.findUnique({
      where: { id: data.outletId },
    });

    if (!outlet) {
      return { success: false, message: "Outlet tidak ditemukan." };
    }

    // Role check: Admin, Super Admin, atau pemilik outlet itu sendiri
    if (session.user.role === "USER" && outlet.ownerId !== session.user.id) {
      return { success: false, message: "Akses ditolak." };
    }

    await prisma.outlet.update({
      where: { id: data.outletId },
      data: {
        soundEffect: data.soundEffect !== undefined ? data.soundEffect : outlet.soundEffect,
        customGreetingText: data.customGreetingText !== undefined ? data.customGreetingText : outlet.customGreetingText,
      },
    });

    revalidatePath("/portal");

    return {
      success: true,
      message: "Pengaturan fitur VIP berhasil disimpan!",
    };
  } catch (err: unknown) {
    console.error("Error updateOutletVipSettingsAction:", err);
    return {
      success: false,
      message: (err as Error)?.message || "Gagal menyimpan pengaturan VIP.",
    };
  }
}

/**
 * Reset / Refresh Token Pairing QR Kasir
 */
export async function resetStaffPairingTokenAction(outletId: string) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, message: "Silakan login terlebih dahulu." };
    }

    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
    });

    if (!outlet) {
      return { success: false, message: "Outlet tidak ditemukan." };
    }

    if (session.user.role === "USER" && outlet.ownerId !== session.user.id) {
      return { success: false, message: "Akses ditolak." };
    }

    const newToken = "ksr_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    await prisma.outlet.update({
      where: { id: outletId },
      data: { staffPairingToken: newToken },
    });

    revalidatePath("/portal");

    return {
      success: true,
      newToken,
      message: "Kode Pairing Kasir berhasil direset! HP staf sebelumnya telah diputus.",
    };
  } catch (err: unknown) {
    console.error("Error resetStaffPairingTokenAction:", err);
    return {
      success: false,
      message: (err as Error)?.message || "Gagal mereset token kasir.",
    };
  }
}

/**
 * Super Admin: Ambil notifikasi perpanjangan VIP terbaru (Midtrans QRIS) untuk real-time banner & dering di dashboard
 */
export async function getRecentVipRenewalsAction(sinceTimestamp?: number) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, renewals: [] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereCondition: any = {
      action: "VIP_RENEWAL_MIDTRANS",
    };

    if (sinceTimestamp && sinceTimestamp > 0) {
      whereCondition.createdAt = {
        gt: new Date(sinceTimestamp),
      };
    }

    const renewals = await prisma.activityLog.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return {
      success: true,
      renewals: renewals.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        outletId: r.outletId,
        userName: r.userName,
        createdAt: r.createdAt.toISOString(),
        timestamp: new Date(r.createdAt).getTime(),
      })),
    };
  } catch (err) {
    console.error("Error getRecentVipRenewalsAction:", err);
    return { success: false, renewals: [] };
  }
}

/**
 * Super Admin: Hapus data riwayat transaksi pembayaran / struk
 */
export async function deletePaymentRecordAction(paymentId: string) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak. Khusus Super Admin." };
    }

    const payment = await prisma.membershipPayment.findUnique({
      where: { id: paymentId },
      include: { outlet: true },
    });

    if (!payment) {
      return { success: false, message: "Data riwayat pembayaran tidak ditemukan." };
    }

    await prisma.membershipPayment.delete({
      where: { id: paymentId },
    });

    await prisma.activityLog.create({
      data: {
        outletId: payment.outletId,
        userId: session.user.id,
        userName: session.user.name || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "DELETE_PAYMENT",
        title: "Hapus Riwayat Pembayaran 🗑️",
        description: `Super Admin menghapus riwayat pembayaran sebesar Rp ${payment.amount.toLocaleString("id-ID")} untuk outlet "${payment.outlet.name}".`,
        targetId: payment.id,
        targetName: payment.outlet.name,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");
    revalidatePath("/portal");

    return {
      success: true,
      message: `Riwayat pembayaran "${payment.outlet.name}" berhasil dihapus.`,
    };
  } catch (error) {
    console.error("Error deleting payment record:", error);
    return { success: false, message: "Gagal menghapus riwayat pembayaran." };
  }
}


