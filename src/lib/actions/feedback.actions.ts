"use server";

import { prisma } from "@/lib/prisma";
import { recordActivityLog } from "@/lib/actions/activity.actions";
import { revalidatePath } from "next/cache";

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
        cardCode: cardCode || null,
        rating: Math.min(Math.max(Number(rating) || 1, 1), 5),
        customerName: customerName?.trim() || "Anonim",
        phone: phone?.trim() || null,
        message: message.trim(),
      },
    });

    // Record activity log
    await recordActivityLog({
      userId: outlet.ownerId,
      userName: customerName?.trim() || "Pengunjung (Smart Filter)",
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
    });

    if (!feedback) {
      return { success: false, message: "Data tidak ditemukan." };
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
