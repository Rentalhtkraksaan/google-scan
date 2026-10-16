"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { normalizeWhatsappNumber } from "@/lib/whatsapp-utils";

export type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

// ─── 1. Pengecekan Real-Time Database TiDB ──────────────────────────────────

export async function checkProspectAvailabilityAction(params: {
  whatsappNumber: string;
  outletName?: string;
}): Promise<{
  success: boolean;
  existsWa: boolean;
  existsName: boolean;
  message: string;
  existingProspect?: {
    id: string;
    outletName: string;
    whatsappNumber: string;
    savedByName?: string | null;
    status: string;
    createdAt: Date;
  } | null;
  nameMatchProspect?: {
    id: string;
    outletName: string;
    whatsappNumber: string;
  } | null;
}> {
  try {
    const cleanWa = normalizeWhatsappNumber(params.whatsappNumber);
    const cleanName = (params.outletName || "").trim();

    let existingWa = null;
    if (cleanWa && cleanWa.length >= 8) {
      existingWa = await prisma.chatProspect.findUnique({
        where: { whatsappNumber: cleanWa },
      });
    }

    let existingName = null;
    if (cleanName && cleanName.length >= 3) {
      existingName = await prisma.chatProspect.findFirst({
        where: {
          outletName: { equals: cleanName },
          ...(cleanWa ? { NOT: { whatsappNumber: cleanWa } } : {}),
        },
      });
    }

    if (existingWa) {
      return {
        success: true,
        existsWa: true,
        existsName: !!existingName,
        message: `Nomor WhatsApp sudah ada di penyimpanan atas nama: "${existingWa.outletName}"!`,
        existingProspect: {
          id: existingWa.id,
          outletName: existingWa.outletName,
          whatsappNumber: existingWa.whatsappNumber,
          savedByName: existingWa.savedByName,
          status: existingWa.status,
          createdAt: existingWa.createdAt,
        },
        nameMatchProspect: existingName
          ? {
              id: existingName.id,
              outletName: existingName.outletName,
              whatsappNumber: existingName.whatsappNumber,
            }
          : null,
      };
    }

    if (existingName) {
      return {
        success: true,
        existsWa: false,
        existsName: true,
        message: `Nama outlet "${cleanName}" sudah pernah disimpan dengan nomor WA lain (${existingName.whatsappNumber}).`,
        existingProspect: null,
        nameMatchProspect: {
          id: existingName.id,
          outletName: existingName.outletName,
          whatsappNumber: existingName.whatsappNumber,
        },
      };
    }

    return {
      success: true,
      existsWa: false,
      existsName: false,
      message: "Nomor WhatsApp dan Nama Outlet tersedia (belum tersimpan di database).",
      existingProspect: null,
      nameMatchProspect: null,
    };
  } catch (err: unknown) {
    console.error("checkProspectAvailabilityAction error:", err);
    return {
      success: false,
      existsWa: false,
      existsName: false,
      message: "Gagal memeriksa database.",
    };
  }
}

// ─── 2. Simpan Target Outlet ke TiDB Database ───────────────────────────────

export async function saveProspectTargetAction(params: {
  outletName: string;
  whatsappNumber: string;
  notes?: string;
  status?: string;
}): Promise<ActionResult> {
  try {
    const cleanWa = normalizeWhatsappNumber(params.whatsappNumber);
    const cleanName = (params.outletName || "").trim();

    if (!cleanName) {
      return { success: false, message: "Nama outlet tidak boleh kosong." };
    }

    if (!cleanWa || cleanWa.length < 8) {
      return { success: false, message: "Nomor WhatsApp tidak valid (minimal 8 digit)." };
    }

    const saved = await prisma.chatProspect.upsert({
      where: { whatsappNumber: cleanWa },
      create: {
        outletName: cleanName,
        whatsappNumber: cleanWa,
        notes: params.notes?.trim() || null,
        status: params.status || "BARU",
      },
      update: {
        outletName: cleanName,
        notes: params.notes !== undefined ? params.notes.trim() : undefined,
        status: params.status || undefined,
      },
    });

    revalidatePath("/templatechat");

    return {
      success: true,
      message: `Data outlet "${saved.outletName}" berhasil disimpan ke database TiDB!`,
      data: saved,
    };
  } catch (err: unknown) {
    console.error("saveProspectTargetAction error:", err);
    return { success: false, message: "Gagal menyimpan data ke database TiDB." };
  }
}

// ─── 3. Ambil Daftar Semua Target Outlet dari TiDB ──────────────────────────

export async function getProspectsListAction(): Promise<
  Array<{
    id: string;
    outletName: string;
    whatsappNumber: string;
    status: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
  try {
    return await prisma.chatProspect.findMany({
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
  } catch (err) {
    console.error("getProspectsListAction error:", err);
    return [];
  }
}

// ─── 4. Hapus Target Outlet dari Database ────────────────────────────────────

export async function deleteProspectAction(id: string): Promise<ActionResult> {
  try {
    await prisma.chatProspect.delete({
      where: { id },
    });
    revalidatePath("/templatechat");
    return { success: true, message: "Target outlet berhasil dihapus dari database." };
  } catch (err) {
    console.error("deleteProspectAction error:", err);
    return { success: false, message: "Gagal menghapus target outlet." };
  }
}

// ─── 5. Manajemen Template Chat (CRUD TiDB) ──────────────────────────────────

const DEFAULT_TEMPLATES = [
  {
    title: "Template 1 (Sapaan Pembuka)",
    badge: "Waktu Device",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    content: "halo,selamat {waktu} kak",
    orderNumber: 1,
    isDefault: true,
  },
  {
    title: "Template 2 (Tanya Penggunaan Review Card)",
    badge: "Follow Up",
    badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    content: 'mau tanya apakah outlet "{outlet}" sudah memakai google review card ya kak?',
    orderNumber: 2,
    isDefault: true,
  },
  {
    title: "Template 3 (Jika Prospek Menjawab SUDAH)",
    badge: "Respon: Sudah",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    content: "baik kak jika butuh lagi bisa berkabar ya kak",
    orderNumber: 3,
    isDefault: true,
  },
  {
    title: "Template 3 (Jika Prospek Menjawab BELUM)",
    badge: "Respon: Belum",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    content:
      "kebetulan kita lgi buat google review card ini bertujuan membantu bisnis owner mendapat bintang 5 secara simple tap/scan buka rating pilih bintng kirim slesai",
    orderNumber: 4,
    isDefault: true,
  },
  {
    title: "Template Gabungan (Sapaan + Pertanyaan Langsung)",
    badge: "Kirim Cepat",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    content: 'halo,selamat {waktu} kak\n\nmau tanya apakah outlet "{outlet}" sudah memakai google review card ya kak?',
    orderNumber: 5,
    isDefault: true,
  },
];

export async function getChatTemplatesAction() {
  try {
    let list = await prisma.chatTemplate.findMany({
      orderBy: { orderNumber: "asc" },
    });

    // Auto-seed default templates jika tabel masih kosong di database
    if (list.length === 0) {
      await prisma.chatTemplate.createMany({
        data: DEFAULT_TEMPLATES,
      });
      list = await prisma.chatTemplate.findMany({
        orderBy: { orderNumber: "asc" },
      });
    }

    return list;
  } catch (err) {
    console.error("getChatTemplatesAction error:", err);
    return [];
  }
}

export async function createChatTemplateAction(data: {
  title: string;
  badge?: string;
  badgeColor?: string;
  content: string;
}): Promise<ActionResult> {
  try {
    const cleanTitle = data.title?.trim();
    const cleanContent = data.content?.trim();

    if (!cleanTitle || !cleanContent) {
      return { success: false, message: "Judul dan isi template tidak boleh kosong." };
    }

    const count = await prisma.chatTemplate.count();

    const created = await prisma.chatTemplate.create({
      data: {
        title: cleanTitle,
        badge: data.badge?.trim() || "Kustom",
        badgeColor: data.badgeColor || "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        content: cleanContent,
        orderNumber: count + 1,
        isDefault: false,
      },
    });

    revalidatePath("/templatechat");
    return { success: true, message: "Template chat baru berhasil ditambahkan!", data: created };
  } catch (err) {
    console.error("createChatTemplateAction error:", err);
    return { success: false, message: "Gagal membuat template chat baru." };
  }
}

export async function updateChatTemplateAction(
  id: string,
  data: {
    title: string;
    badge?: string;
    badgeColor?: string;
    content: string;
  }
): Promise<ActionResult> {
  try {
    const cleanTitle = data.title?.trim();
    const cleanContent = data.content?.trim();

    if (!cleanTitle || !cleanContent) {
      return { success: false, message: "Judul dan isi template tidak boleh kosong." };
    }

    const updated = await prisma.chatTemplate.update({
      where: { id },
      data: {
        title: cleanTitle,
        badge: data.badge?.trim() || undefined,
        badgeColor: data.badgeColor || undefined,
        content: cleanContent,
      },
    });

    revalidatePath("/templatechat");
    return { success: true, message: "Template chat berhasil diperbarui!", data: updated };
  } catch (err) {
    console.error("updateChatTemplateAction error:", err);
    return { success: false, message: "Gagal memperbarui template chat." };
  }
}

export async function deleteChatTemplateAction(id: string): Promise<ActionResult> {
  try {
    await prisma.chatTemplate.delete({
      where: { id },
    });

    revalidatePath("/templatechat");
    return { success: true, message: "Template chat berhasil dihapus." };
  } catch (err) {
    console.error("deleteChatTemplateAction error:", err);
    return { success: false, message: "Gagal menghapus template chat." };
  }
}

export async function resetDefaultChatTemplatesAction(): Promise<ActionResult> {
  try {
    await prisma.chatTemplate.deleteMany({});
    await prisma.chatTemplate.createMany({
      data: DEFAULT_TEMPLATES,
    });

    revalidatePath("/templatechat");
    return { success: true, message: "Seluruh template berhasil direset ke standar default!" };
  } catch (err) {
    console.error("resetDefaultChatTemplatesAction error:", err);
    return { success: false, message: "Gagal mereset template ke default." };
  }
}
