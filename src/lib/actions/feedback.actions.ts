"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordActivityLog } from "@/lib/actions/activity.actions";
import { revalidatePath } from "next/cache";
import { checkRateLimit } from "@/lib/rate-limit";

// Helper to check user access to a specific outlet
async function verifyOutletAccess(outletId: string) {
  const session = await auth();
  if (!session?.user) return { allowed: false, session: null };

  const { role, id: userId } = session.user;

  if (role === "SUPER_ADMIN") return { allowed: true, session };

  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    include: {
      owner: true,
      qrCards: true,
    },
  });

  if (!outlet) return { allowed: false, session };

  if (role === "USER") {
    return { allowed: outlet.ownerId === userId, session, outlet };
  }

  if (role === "ADMIN") {
    const isCreator = outlet.owner.createdById === userId;
    const isCardHolder = outlet.qrCards?.some((c) => c.assignedAdminId === userId);
    return { allowed: isCreator || isCardHolder, session, outlet };
  }

  return { allowed: false, session };
}

export async function submitCustomerFeedbackAction(data: {
  outletId: string;
  cardCode?: string;
  rating: number;
  customerName?: string;
  phone?: string;
  message: string;
}) {
  try {
    const { outletId, cardCode, rating, customerName, phone, message } = data;

    if (!outletId) {
      return { success: false, message: "Outlet tidak valid." };
    }

    if (!message || message.trim().length < 2) {
      return { success: false, message: "Mohon tuliskan pesan atau saran Anda." };
    }

    if (message.trim().length > 2000) {
      return { success: false, message: "Pesan maksimal 2.000 karakter." };
    }

    if (customerName && customerName.trim().length > 100) {
      return { success: false, message: "Nama maksimal 100 karakter." };
    }

    if (phone && phone.trim().length > 20) {
      return { success: false, message: "Nomor telepon maksimal 20 digit." };
    }

    // Rate limiting: max 10 submissions per minute per outlet
    const rateCheck = checkRateLimit(`feedback_outlet_${outletId}`, 10, 60 * 1000);
    if (!rateCheck.allowed) {
      return {
        success: false,
        message: "Terlalu banyak masukan terkirim dalam waktu singkat. Mohon tunggu 1 menit.",
      };
    }

    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      include: { owner: true },
    });

    if (!outlet) {
      return { success: false, message: "Outlet tidak ditemukan." };
    }

    const feedback = await prisma.customerFeedback.create({
      data: {
        outletId,
        cardCode: cardCode?.trim().slice(0, 50) || null,
        rating: Math.min(Math.max(Number(rating) || 1, 1), 5),
        customerName: customerName?.trim().slice(0, 100) || "Anonim",
        phone: phone?.trim().slice(0, 20) || null,
        message: message.trim().slice(0, 2000),
      },
    });

    // Record activity log
    await recordActivityLog({
      userId: outlet.ownerId,
      userName: customerName?.trim().slice(0, 100) || "Pengunjung (Smart Filter)",
      userRole: "USER",
      action: "FEEDBACK_RECEIVED",
      title: `Masukan Pengunjung ⭐${feedback.rating}`,
      description: `Pengunjung memberikan masukan bintang ${feedback.rating} untuk "${outlet.name}": "${feedback.message.slice(0, 100)}${feedback.message.length > 100 ? "..." : ""}"`,
      targetId: feedback.id,
      targetName: outlet.name,
      outletId: outlet.id,
    });

    revalidatePath("/portal");
    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return {
      success: true,
      message: "Masukan Anda telah berhasil dikirim langsung ke manajemen.",
      feedbackId: feedback.id,
    };
  } catch (error) {
    console.error("Submit Feedback Error:", error);
    return { success: false, message: "Gagal mengirimkan masukan. Silakan coba lagi." };
  }
}

export async function getOutletFeedbacksAction(outletId: string) {
  try {
    const { allowed } = await verifyOutletAccess(outletId);
    if (!allowed) {
      return { success: false, feedbacks: [] };
    }

    const feedbacks = await prisma.customerFeedback.findMany({
      where: { outletId },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, feedbacks };
  } catch (error) {
    console.error("Get Outlet Feedbacks Error:", error);
    return { success: false, feedbacks: [] };
  }
}

export async function toggleFeedbackResolvedAction(feedbackId: string) {
  try {
    const feedback = await prisma.customerFeedback.findUnique({
      where: { id: feedbackId },
      select: { id: true, outletId: true, isResolved: true },
    });

    if (!feedback) {
      return { success: false, message: "Data tidak ditemukan." };
    }

    const { allowed } = await verifyOutletAccess(feedback.outletId);
    if (!allowed) {
      return { success: false, message: "Akses ditolak: Anda tidak memiliki izin untuk mengelola feedback ini." };
    }

    const updated = await prisma.customerFeedback.update({
      where: { id: feedbackId },
      data: { isResolved: !feedback.isResolved },
    });

    revalidatePath("/portal");
    return {
      success: true,
      message: updated.isResolved ? "Ditandai telah ditangani." : "Ditandai belum ditangani.",
    };
  } catch (error) {
    console.error("Toggle Feedback Error:", error);
    return { success: false, message: "Gagal memperbarui status." };
  }
}

export async function deleteCustomerFeedbackAction(feedbackId: string) {
  try {
    const feedback = await prisma.customerFeedback.findUnique({
      where: { id: feedbackId },
      include: { outlet: true },
    });

    if (!feedback) {
      return { success: false, message: "Data masukan tidak ditemukan." };
    }

    const { allowed } = await verifyOutletAccess(feedback.outletId);
    if (!allowed) {
      return { success: false, message: "Akses ditolak: Anda tidak memiliki izin untuk menghapus feedback ini." };
    }

    await prisma.customerFeedback.delete({
      where: { id: feedbackId },
    });

    if (feedback.outlet) {
      await recordActivityLog({
        userId: feedback.outlet.ownerId,
        userName: "Pemilik Outlet",
        userRole: "USER",
        action: "DELETE_FEEDBACK",
        title: `Hapus Masukan Pengunjung ⭐${feedback.rating}`,
        description: `Pemilik outlet menghapus data masukan/keluhan dari "${feedback.customerName || "Anonim"}" (⭐${feedback.rating}).`,
        targetId: feedback.id,
        targetName: feedback.outlet.name,
        outletId: feedback.outlet.id,
      });
    }

    revalidatePath("/portal");
    return { success: true, message: "1 Masukan pengunjung berhasil dihapus permanen." };
  } catch (error) {
    console.error("Delete Feedback Error:", error);
    return { success: false, message: "Gagal menghapus data masukan." };
  }
}

export async function deleteBatchCustomerFeedbacksAction(feedbackIds: string[]) {
  try {
    if (!feedbackIds || feedbackIds.length === 0) {
      return { success: false, message: "Pilih minimal 1 masukan untuk dihapus." };
    }

    const feedbacks = await prisma.customerFeedback.findMany({
      where: { id: { in: feedbackIds } },
      include: { outlet: true },
    });

    if (feedbacks.length === 0) {
      return { success: false, message: "Data masukan tidak ditemukan." };
    }

    // Verify access to each feedback's outlet
    const outletIds = Array.from(new Set(feedbacks.map((f) => f.outletId)));
    for (const outId of outletIds) {
      const { allowed } = await verifyOutletAccess(outId);
      if (!allowed) {
        return { success: false, message: "Akses ditolak: Terdapat feedback yang bukan milik outlet binaan Anda." };
      }
    }

    const firstOutlet = feedbacks[0]?.outlet;

    await prisma.customerFeedback.deleteMany({
      where: { id: { in: feedbackIds } },
    });

    if (firstOutlet) {
      await recordActivityLog({
        userId: firstOutlet.ownerId,
        userName: "Pemilik Outlet",
        userRole: "USER",
        action: "BATCH_DELETE_FEEDBACK",
        title: `Hapus Massal ${feedbackIds.length} Masukan`,
        description: `Pemilik outlet menghapus massal sebanyak ${feedbackIds.length} data masukan/keluhan pengunjung.`,
        targetId: feedbackIds.join(","),
        targetName: firstOutlet.name,
        outletId: firstOutlet.id,
      });
    }

    revalidatePath("/portal");
    return {
      success: true,
      message: `${feedbackIds.length} Masukan pengunjung berhasil dihapus permanen.`,
    };
  } catch (error) {
    console.error("Delete Batch Feedback Error:", error);
    return { success: false, message: "Gagal menghapus massal data masukan." };
  }
}
