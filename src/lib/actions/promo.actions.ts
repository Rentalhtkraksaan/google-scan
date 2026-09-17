"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { revalidateTag } from "next/cache";

// ─── Helper: cek Super Admin 1 ──────────────────────────────────────────────
async function requireSuperAdmin1() {
  const session = await auth();
  if (!session?.user) throw new Error("Sesi login telah berakhir.");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdminMaster: true },
  });

  if (!user?.isSuperAdminMaster) {
    throw new Error("Akses ditolak: Hanya Super Admin 1 yang memiliki izin ini.");
  }
}

// ─── Get semua promo aktif (untuk landing page) ──────────────────────────────
export async function getActivePromosAction() {
  const now = new Date();
  return prisma.promo.findMany({
    where: {
      isActive: true,
      OR: [{ expiredAt: null }, { expiredAt: { gt: now } }],
    },
    orderBy: { order: "asc" },
  });
}

// ─── Get semua promo (untuk admin panel) ─────────────────────────────────────
export async function getAllPromosAction() {
  return prisma.promo.findMany({ orderBy: { order: "asc" } });
}

// ─── Tambah promo baru ────────────────────────────────────────────────────────
export async function createPromoAction(formData: FormData) {
  try {
    await requireSuperAdmin1();

    const label = (formData.get("label") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const originalPrice = (formData.get("originalPrice") as string)?.trim();
    const discountPrice = (formData.get("discountPrice") as string)?.trim();
    const priceUnit = (formData.get("priceUnit") as string)?.trim() || "rb";
    const expiredAtStr = (formData.get("expiredAt") as string)?.trim();
    const isActive = formData.get("isActive") === "true";

    if (!label || !originalPrice || !discountPrice) {
      return { success: false, message: "Label dan harga wajib diisi." };
    }

    const expiredAt = expiredAtStr ? new Date(expiredAtStr) : null;

    // Ambil order terbesar, lalu +1
    const lastPromo = await prisma.promo.findFirst({ orderBy: { order: "desc" } });
    const order = (lastPromo?.order ?? -1) + 1;

    await prisma.promo.create({
      data: { label, description, originalPrice, discountPrice, priceUnit, expiredAt, isActive, order },
    });

    revalidatePath("/");
    revalidateTag("site-setting");
    return { success: true, message: "Promo berhasil ditambahkan!" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menambah promo.";
    return { success: false, message: msg };
  }
}

// ─── Update promo ─────────────────────────────────────────────────────────────
export async function updatePromoAction(id: string, formData: FormData) {
  try {
    await requireSuperAdmin1();

    const label = (formData.get("label") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const originalPrice = (formData.get("originalPrice") as string)?.trim();
    const discountPrice = (formData.get("discountPrice") as string)?.trim();
    const priceUnit = (formData.get("priceUnit") as string)?.trim() || "rb";
    const expiredAtStr = (formData.get("expiredAt") as string)?.trim();
    const isActive = formData.get("isActive") === "true";

    if (!label || !originalPrice || !discountPrice) {
      return { success: false, message: "Label dan harga wajib diisi." };
    }

    const expiredAt = expiredAtStr ? new Date(expiredAtStr) : null;

    await prisma.promo.update({
      where: { id },
      data: { label, description, originalPrice, discountPrice, priceUnit, expiredAt, isActive },
    });

    revalidatePath("/");
    revalidateTag("site-setting");
    return { success: true, message: "Promo berhasil diupdate!" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal mengupdate promo.";
    return { success: false, message: msg };
  }
}

// ─── Hapus promo ─────────────────────────────────────────────────────────────
export async function deletePromoAction(id: string) {
  try {
    await requireSuperAdmin1();
    await prisma.promo.delete({ where: { id } });
    revalidatePath("/");
    revalidateTag("site-setting");
    return { success: true, message: "Promo berhasil dihapus." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menghapus promo.";
    return { success: false, message: msg };
  }
}
