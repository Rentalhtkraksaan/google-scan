"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath, revalidateTag } from "next/cache";

import { unstable_cache } from "next/cache";

// ─── Helper: cek Super Admin (Super Admin 1 & Super Admin 2) ────────────────
async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Sesi login telah berakhir.");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, fullName: true, role: true, isSuperAdminMaster: true, canEditLandingPage: true },
  });

  if (!user || user.role !== "SUPER_ADMIN") {
    throw new Error("Akses ditolak: Hanya Super Admin yang memiliki izin ini.");
  }

  return user;
}

// ─── Get semua foto produk ────────────────────────────────────────────────────
export const getProductPhotosAction = unstable_cache(
  async () => {
    return prisma.productPhoto.findMany({ orderBy: { order: "asc" } });
  },
  ["product-photos-cache"],
  {
    revalidate: 60,
    tags: ["site-setting", "product-photos"],
  }
);

// ─── Upload foto baru ────────────────────────────────────────────────────────
export async function uploadProductPhotoAction(formData: FormData) {
  try {
    const user = await requireSuperAdmin();

    const file = formData.get("file") as File | null;
    const caption = (formData.get("caption") as string)?.trim() || null;

    if (!file || file.size === 0) {
      return { success: false, message: "File foto tidak ditemukan." };
    }

    // Validasi tipe file
    if (!file.type.startsWith("image/")) {
      return { success: false, message: "File harus berupa gambar (JPG, PNG, WEBP, dll)." };
    }

    // Validasi batas ukuran file (maksimal 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, message: "Ukuran file foto maksimal 10MB." };
    }

    // Konversi ke base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Ambil order terbesar, lalu +1
    const lastPhoto = await prisma.productPhoto.findFirst({ orderBy: { order: "desc" } });
    const order = (lastPhoto?.order ?? -1) + 1;

    const newPhoto = await prisma.productPhoto.create({
      data: { imageData: base64, caption, order },
    });

    // Catat log aktivitas
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        userName: user.fullName || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "UPDATE_LANDING_PAGE",
        title: "Upload Foto Produk Landing Page 📸",
        description: `${user.fullName || "Super Admin"} (${user.isSuperAdminMaster ? "Super Admin 1" : "Super Admin 2"}) mengunggah foto baru untuk galeri landing page.`,
        targetId: newPhoto.id,
        targetName: caption || "Foto Galeri Landing Page",
      },
    }).catch(() => {});

    revalidatePath("/");
    revalidateTag("site-setting");
    return { success: true, message: "Foto berhasil diupload!" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal mengupload foto.";
    return { success: false, message: msg };
  }
}

// ─── Update caption foto ──────────────────────────────────────────────────────
export async function updateProductPhotoCaptionAction(id: string, caption: string) {
  try {
    const user = await requireSuperAdmin();
    await prisma.productPhoto.update({
      where: { id },
      data: { caption: caption.trim() || null },
    });

    // Catat log aktivitas
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        userName: user.fullName || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "UPDATE_LANDING_PAGE",
        title: "Edit Caption Foto Produk ✏️",
        description: `${user.fullName || "Super Admin"} (${user.isSuperAdminMaster ? "Super Admin 1" : "Super Admin 2"}) memperbarui caption foto produk landing page.`,
        targetId: id,
        targetName: caption || "Foto Galeri Landing Page",
      },
    }).catch(() => {});

    revalidatePath("/");
    revalidateTag("site-setting");
    return { success: true, message: "Caption berhasil diupdate!" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal mengupdate caption.";
    return { success: false, message: msg };
  }
}

// ─── Hapus foto — row dihapus = base64 ikut hilang bersih dari DB ────────────
export async function deleteProductPhotoAction(id: string) {
  try {
    const user = await requireSuperAdmin();
    await prisma.productPhoto.delete({ where: { id } });

    // Catat log aktivitas
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        userName: user.fullName || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "UPDATE_LANDING_PAGE",
        title: "Hapus Foto Produk Landing Page 🗑️",
        description: `${user.fullName || "Super Admin"} (${user.isSuperAdminMaster ? "Super Admin 1" : "Super Admin 2"}) menghapus foto produk dari galeri landing page.`,
        targetId: id,
        targetName: "Foto Galeri",
      },
    }).catch(() => {});

    revalidatePath("/");
    revalidateTag("site-setting");
    return { success: true, message: "Foto berhasil dihapus." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menghapus foto.";
    return { success: false, message: msg };
  }
}
