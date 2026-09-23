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

/**
 * Super Admin: 1-Klik Menyetujui bukti transfer & mengaktifkan status member outlet
 */
export async function approvePaymentProofAction(paymentId: string, durationMonths = 1) {
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
    const expiresAt = new Date(now.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);

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
      message: `Pembayaran ${payment.outlet.name} disetujui! Status Member Premium telah aktif.`,
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
  durationMonths = 1
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak. Khusus Super Admin." };
    }

    const now = new Date();
    const expiresAt = isMember
      ? new Date(now.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000)
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
      message: isMember
        ? `Status Member Premium "${updated.name}" berhasil diaktifkan!`
        : `Status Member Premium "${updated.name}" dinonaktifkan.`,
    };
  } catch (error) {
    console.error("Error toggling outlet membership:", error);
    return { success: false, message: "Gagal mengubah status member outlet." };
  }
}

/**
 * 🔥 TOMBOL SUPER: Aktifkan SEMUA outlet ke Member Premium sekaligus!
 */
export async function bulkActivateAllMembersAction(durationMonths = 1) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak. Khusus Super Admin." };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);

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
        description: `Super Admin mengaktifkan seluruh ${result.count} outlet menjadi Member Premium serentak.`,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");
    revalidatePath("/portal");

    return {
      success: true,
      count: result.count,
      message: `Luar biasa! Seluruh ${result.count} outlet kini resmi berstatus Member Premium!`,
    };
  } catch (error) {
    console.error("Error bulk activating members:", error);
    return { success: false, message: "Gagal mengaktifkan semua member." };
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
  trialNotice?: string
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak. Khusus Super Admin." };
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
      },
      create: {
        id: "default",
        membershipPrice: price || 45000,
        membershipBankName: bankName || "BCA",
        membershipAccountNumber: accountNumber || "0885172288",
        membershipAccountName: accountName || "Smart QR Review",
        membershipNotes: notes || null,
        membershipTrialNotice: trialNotice || null,
      },
    });

    revalidatePath("/super-admin");
    revalidatePath("/portal");

    return {
      success: true,
      message: "Pengaturan harga & rekening pembayaran member berhasil disimpan!",
    };
  } catch (error) {
    console.error("Error updating membership settings:", error);
    return { success: false, message: "Gagal menyimpan pengaturan membership." };
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
