"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath, revalidateTag } from "next/cache";

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

// ─── Get semua foto produk ────────────────────────────────────────────────────
export async function getProductPhotosAction() {
  return prisma.productPhoto.findMany({ orderBy: { order: "asc" } });
}

// ─── Upload foto baru ────────────────────────────────────────────────────────
export async function uploadProductPhotoAction(formData: FormData) {
  try {
    await requireSuperAdmin1();

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

    await prisma.productPhoto.create({
      data: { imageData: base64, caption, order },
    });

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
    await requireSuperAdmin1();
    await prisma.productPhoto.update({
      where: { id },
      data: { caption: caption.trim() || null },
    });
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
    await requireSuperAdmin1();
    await prisma.productPhoto.delete({ where: { id } });
    revalidatePath("/");
    revalidateTag("site-setting");
    return { success: true, message: "Foto berhasil dihapus." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menghapus foto.";
    return { success: false, message: msg };
  }
}
