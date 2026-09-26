"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { CardStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { generateCardsSchema } from "@/lib/validations";
import { recordActivityLog } from "@/lib/actions/activity.actions";
import { cleanCardCode, parseMultipleCardCodes } from "@/lib/card-code";

export type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

async function getSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Sesi login Anda telah berakhir. Silakan login kembali.");
  return session;
}

// ─── Super Admin: Batch Generate Kartu QR Baru ──────────────────────────────

export async function generateBatchCardsAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak." };
    }

    const raw = {
      count: formData.get("count") ? Number(formData.get("count")) : 10,
      prefix: (formData.get("prefix") as string) || "c-",
      assignedAdminId: (formData.get("assignedAdminId") as string) || null,
      fallbackUrl: (formData.get("fallbackUrl") as string) || (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
    };

    const parsed = generateCardsSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, message: parsed.error.errors[0]?.message ?? "Data input tidak valid" };
    }

    const { count, prefix, assignedAdminId, fallbackUrl } = parsed.data;

    const existingCards = await prisma.qrCard.findMany({ select: { code: true } });
    const existingCodes = new Set(existingCards.map((c) => c.code.toLowerCase()));

    let counter = 1;
    for (const c of existingCards) {
      const match = c.code.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num >= counter) counter = num + 1;
      }
    }

    let cleanPrefix = prefix.trim().toLowerCase();
    if (!cleanPrefix.endsWith("-") && !cleanPrefix.endsWith("_")) {
      cleanPrefix += "-";
    }

    const cardsToInsert = [];
    for (let i = 0; i < count; i++) {
      let code = `${cleanPrefix}${String(counter).padStart(3, "0")}`;
      while (existingCodes.has(code)) {
        counter++;
        code = `${cleanPrefix}${String(counter).padStart(3, "0")}`;
      }
      existingCodes.add(code);
      counter++;

      cardsToInsert.push({
        code,
        assignedAdminId: assignedAdminId && assignedAdminId !== "unassigned" ? assignedAdminId : null,
        status: CardStatus.ACTIVE,
        scanCount: 0,
        fallbackUrl,
      });
    }

    await prisma.qrCard.createMany({
      data: cardsToInsert,
    });

    let targetAdminName: string | null = null;
    if (assignedAdminId && assignedAdminId !== "unassigned") {
      const targetAdmin = await prisma.user.findUnique({
        where: { id: assignedAdminId },
        select: { fullName: true, email: true },
      });
      if (targetAdmin) {
        targetAdminName = targetAdmin.fullName;
      }
    }

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "GENERATE_CARDS",
      title: "Batch Generate Kartu QR Baru",
      description: targetAdminName
        ? `Super Admin "${session.user.name || session.user.fullName}" membuat ${cardsToInsert.length} kartu QR baru (${cardsToInsert[0]?.code} s/d ${cardsToInsert[cardsToInsert.length - 1]?.code}) dan mengalokasikannya ke Admin Lapangan "${targetAdminName}".`
        : `Super Admin "${session.user.name || session.user.fullName}" membuat ${cardsToInsert.length} kartu QR baru (${cardsToInsert[0]?.code} s/d ${cardsToInsert[cardsToInsert.length - 1]?.code}) ke Kolam Umum Pusat (Belum dialokasikan).`,
      targetId: assignedAdminId && assignedAdminId !== "unassigned" ? assignedAdminId : undefined,
      targetName: targetAdminName ? `Admin ${targetAdminName}` : `Kolam Pusat (${cardsToInsert.length} Kartu)`,
      adminId: assignedAdminId && assignedAdminId !== "unassigned" ? assignedAdminId : undefined,
      superAdminId: session.user.id,
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Berhasil membuat ${cardsToInsert.length} kartu QR baru (${cardsToInsert[0]?.code} s/d ${cardsToInsert[cardsToInsert.length - 1]?.code})`,
    };
  } catch (error) {
    console.error("generateBatchCardsAction error:", error);
    const msg = error instanceof Error ? error.message : "Terjadi kesalahan server saat membuat batch kartu.";
    return { success: false, message: msg };
  }
}

// ─── Super Admin / Admin Lapangan: Toggle Status Kartu (ACTIVE / INACTIVE) ──

export async function toggleCardStatusAction(code: string): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (session.user.role !== Role.SUPER_ADMIN && session.user.role !== Role.ADMIN) {
      return { success: false, message: "Akses ditolak." };
    }

    const card = await prisma.qrCard.findUnique({ where: { code } });
    if (!card) return { success: false, message: "Kartu tidak ditemukan." };

    // Admin lapangan hanya boleh ubah status kartu jatahnya sendiri
    if (session.user.role === Role.ADMIN) {
      if (card.assignedAdminId !== session.user.id) {
        return {
          success: false,
          message: "Akses ditolak: Anda hanya dapat mengubah status kartu jatah Anda sendiri.",
        };
      }
    }

    const newStatus = card.status === CardStatus.ACTIVE ? CardStatus.INACTIVE : CardStatus.ACTIVE;

    const updated = await prisma.qrCard.update({
      where: { code },
      data: { status: newStatus },
    });

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "TOGGLE_CARD_STATUS",
      title: newStatus === CardStatus.ACTIVE ? "Mengaktifkan Kartu QR" : "Menonaktifkan Kartu QR",
      description: `${session.user.role === Role.ADMIN ? 'Admin Lapangan' : 'Super Admin'} "${session.user.name || session.user.fullName}" mengubah status kartu "${code}" menjadi ${newStatus}.`,
      targetId: code,
      targetName: `Kartu ${code}`,
      outletId: card.outletId || undefined,
      adminId: card.assignedAdminId || undefined,
      superAdminId: session.user.role === Role.SUPER_ADMIN ? session.user.id : undefined,
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Status kartu "${code}" berhasil diubah menjadi ${newStatus}.`,
      data: updated,
    };
  } catch (error) {
    console.error("toggleCardStatusAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal mengubah status kartu.";
    return { success: false, message: msg };
  }
}

// ─── Super Admin: Update Fallback URL & Alokasi Admin ────────────────────────

export async function updateCardConfigAction(
  code: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak." };
    }

    const fallbackUrl = (formData.get("fallbackUrl") as string)?.trim();
    const assignedAdminId = formData.get("assignedAdminId") as string;
    const outletId = formData.get("outletId") as string;

    const existingCard = await prisma.qrCard.findUnique({
      where: { code },
      include: {
        outlet: {
          include: {
            owner: true,
            qrCards: { orderBy: { createdAt: "asc" } },
          },
        },
      },
    });

    if (!existingCard) {
      return { success: false, message: "Kartu tidak ditemukan." };
    }

    const updateData: {
      fallbackUrl?: string;
      assignedAdminId?: string | null;
      outletId?: string | null;
      status?: CardStatus;
    } = {};

    if (fallbackUrl) updateData.fallbackUrl = fallbackUrl;

    let targetAdminId: string | null | undefined = undefined;
    if (assignedAdminId !== undefined) {
      targetAdminId = assignedAdminId === "unassigned" || !assignedAdminId ? null : assignedAdminId;
      updateData.assignedAdminId = targetAdminId;
    }

    if (outletId !== undefined) {
      updateData.outletId = outletId === "none" || !outletId ? null : outletId;
      if (outletId && outletId !== "none") {
        updateData.status = CardStatus.ACTIVE;
      }
    }

    const updated = await prisma.qrCard.update({
      where: { code },
      data: updateData,
      include: {
        assignedAdmin: { select: { fullName: true } },
        outlet: { select: { name: true } },
      },
    });

    // ─── OTOMATISASI INDUKAN KE ANAKAN & OUTLET ───
    // Jika kartu ini terhubung ke outlet dan alokasi admin-nya diubah:
    let movedAnakanCount = 0;
    if (assignedAdminId !== undefined && existingCard.outletId && existingCard.outlet) {
      const allOutletCards = existingCard.outlet.qrCards || [];
      const primaryCard = allOutletCards[0];
      const isInduk = primaryCard?.code === code || allOutletCards.length === 1;

      // Jika kartu yang dialihkan adalah kartu indukan (atau kartu outlet):
      if (isInduk) {
        // 1. Pindahkan SEMUA kartu anakan yang terhubung ke outlet ini ke admin yang sama
        const childCards = allOutletCards.filter((c) => c.code !== code);
        if (childCards.length > 0) {
          await prisma.qrCard.updateMany({
            where: {
              outletId: existingCard.outletId,
              code: { not: code },
            },
            data: {
              assignedAdminId: targetAdminId,
            },
          });
          movedAnakanCount = childCards.length;
        }

        // 2. Sinkronkan pembuat akun outlet (createdById) ke targetAdminId
        if (existingCard.outlet.owner) {
          await prisma.user.update({
            where: { id: existingCard.outlet.owner.id },
            data: { createdById: targetAdminId },
          });
        }
      }
    }

    const adminLabel = updated.assignedAdmin?.fullName ? `Admin "${updated.assignedAdmin.fullName}"` : "Kolam Umum Pusat";
    const outletLabel = updated.outlet?.name ? `Outlet "${updated.outlet.name}"` : "Belum Terhubung";

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "UPDATE_CARD_CONFIG",
      title: "Memperbarui Pengaturan Kartu QR",
      description: `Super Admin "${session.user.name || session.user.fullName}" memperbarui pengaturan kartu "${code}" (Alokasi: ${adminLabel}, Outlet: ${outletLabel})${
        movedAnakanCount > 0
          ? ` — Otomatis mengalihkan ${movedAnakanCount} kartu anakan & outlet binaan ke ${adminLabel}`
          : ""
      }.`,
      targetId: code,
      targetName: `Kartu ${code}`,
      outletId: updated.outletId || undefined,
      adminId: updated.assignedAdminId || undefined,
      superAdminId: session.user.id,
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");
    revalidatePath("/portal");

    return {
      success: true,
      message:
        movedAnakanCount > 0
          ? `Pengaturan kartu induk "${code}" berhasil disimpan. ${movedAnakanCount} kartu anakan & outlet "${existingCard.outlet?.name}" otomatis dialihkan ke ${adminLabel}.`
          : `Pengaturan kartu "${code}" berhasil disimpan.`,
      data: updated,
    };
  } catch (error) {
    console.error("updateCardConfigAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal memperbarui konfigurasi kartu.";
    return { success: false, message: msg };
  }
}

// ─── Super Admin: Hapus Kartu ────────────────────────────────────────────────

export async function deleteCardAction(code: string): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak." };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdminMaster: true, canDeleteCards: true },
    });

    // Validasi izin Super Admin 2
    if (!currentUser?.isSuperAdminMaster && !currentUser?.canDeleteCards) {
      return {
        success: false,
        message: "Akses ditolak: Akun Super Admin 2 Anda belum diberikan izin untuk menghapus kartu oleh Super Admin 1 (Master).",
      };
    }

    const card = await prisma.qrCard.findUnique({
      where: { code },
      include: {
        assignedAdmin: {
          include: { createdBy: true },
        },
        outlet: {
          include: {
            owner: {
              include: {
                createdBy: {
                  include: { createdBy: true },
                },
              },
            },
          },
        },
      },
    });

    if (!card) return { success: false, message: "Kartu tidak ditemukan." };

    // Proteksi kartu Demo Landing Page agar tidak terhapus
    const siteSetting = await prisma.siteSetting.findUnique({ where: { id: "default" } });
    const demoTarget = (siteSetting?.ctaSecondaryUrl || "c-001").toLowerCase().trim();
    const cleanCode = code.toLowerCase().trim();
    if (cleanCode === "c-001" || demoTarget.includes(cleanCode)) {
      return {
        success: false,
        message: "Akses ditolak: Kartu ini adalah Kartu Demo Landing Page dan tidak dapat dihapus.",
      };
    }

    // Jika pemanggil adalah Super Admin 2 (bukan Master):
    if (!currentUser?.isSuperAdminMaster) {
      // 1. Kartu dialokasikan ke Admin Lapangan buatan Super Admin 1
      if (card.assignedAdmin && (card.assignedAdmin.createdBy?.isSuperAdminMaster || !card.assignedAdmin.createdById)) {
        return {
          success: false,
          message:
            "Akses ditolak: Akun Super Admin 2 tidak memiliki izin untuk menghapus kartu yang dialokasikan ke Admin binaan Super Admin 1.",
        };
      }
      // 2. Kartu terhubung ke outlet buatan Super Admin 1 atau Admin binaan Super Admin 1
      if (card.outlet?.owner) {
        const owner = card.outlet.owner;
        const createdByMasterDirectly = owner.createdBy?.isSuperAdminMaster || !owner.createdById;
        const createdByAdminFromMaster =
          owner.createdBy?.role === Role.ADMIN &&
          (owner.createdBy?.createdBy?.isSuperAdminMaster || !owner.createdBy?.createdById);
        if (createdByMasterDirectly || createdByAdminFromMaster) {
          return {
            success: false,
            message:
              "Akses ditolak: Akun Super Admin 2 tidak memiliki izin untuk menghapus kartu yang terhubung ke outlet binaan Super Admin 1.",
          };
        }
      }
    }

    await prisma.qrCard.delete({
      where: { code },
    });

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "DELETE_CARD",
      title: "Menghapus Kartu QR",
      description: `Super Admin "${session.user.name || session.user.fullName}" menghapus kartu "${code}" dari sistem.`,
      targetId: code,
      targetName: `Kartu ${code}`,
      outletId: card.outletId || undefined,
      adminId: card.assignedAdminId || undefined,
      superAdminId: session.user.id,
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return { success: true, message: `Kartu "${code}" berhasil dihapus dari sistem.` };
  } catch (error) {
    console.error("deleteCardAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal menghapus kartu.";
    return { success: false, message: msg };
  }
}

// ─── Super Admin / Admin: Unlink Outlet dari Kartu ────────────────────────────

export async function unlinkCardOutletAction(code: string): Promise<ActionResult> {
  try {
    const session = await getSession();

    const card = await prisma.qrCard.findUnique({
      where: { code },
    });

    if (!card) return { success: false, message: "Kartu tidak ditemukan." };

    if (session.user.role === Role.ADMIN) {
      if (card.assignedAdminId !== session.user.id) {
        return { success: false, message: "Akses ditolak." };
      }
    } else if (session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak." };
    }

    await prisma.qrCard.update({
      where: { code },
      data: { outletId: null },
    });

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "UNLINK_CARD",
      title: "Melepas Kartu dari Outlet",
      description: `${session.user.role === Role.ADMIN ? 'Admin Lapangan' : 'Super Admin'} "${session.user.name || session.user.fullName}" melepaskan kartu "${code}" dari outlet.`,
      targetId: code,
      targetName: `Kartu ${code}`,
      outletId: card.outletId || undefined,
      adminId: card.assignedAdminId || undefined,
      superAdminId: session.user.role === Role.SUPER_ADMIN ? session.user.id : undefined,
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return { success: true, message: `Kartu "${code}" berhasil dilepas dari outlet.` };
  } catch (error) {
    console.error("unlinkCardOutletAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal melepaskan kartu dari outlet.";
    return { success: false, message: msg };
  }
}

// ─── Super Admin / Admin: Assign Kartu ke Outlet yang Sudah Ada ────────────

export async function assignCardToOutletAction(
  code: string,
  outletId: string
): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (session.user.role !== Role.SUPER_ADMIN && session.user.role !== Role.ADMIN) {
      return { success: false, message: "Akses ditolak." };
    }

    const card = await prisma.qrCard.findUnique({
      where: { code },
    });

    if (!card) return { success: false, message: "Kartu tidak ditemukan." };

    if (session.user.role === Role.ADMIN) {
      if (card.assignedAdminId && card.assignedAdminId !== session.user.id) {
        return { success: false, message: "Akses ditolak: Kartu ini bukan jatah Anda." };
      }
    }

    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      include: {
        qrCards: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!outlet) return { success: false, message: "Outlet tujuan tidak ditemukan." };

    const updateData: { outletId: string; status: CardStatus; assignedAdminId?: string | null } = {
      outletId,
      status: CardStatus.ACTIVE,
    };

    // Sinkronkan alokasi admin kartu anakan baru agar selalu sama dengan kartu indukan outlet
    if (outlet.qrCards && outlet.qrCards.length > 0 && outlet.qrCards[0].assignedAdminId) {
      updateData.assignedAdminId = outlet.qrCards[0].assignedAdminId;
    } else if (session.user.role === Role.ADMIN && !card.assignedAdminId) {
      updateData.assignedAdminId = session.user.id;
    }

    await prisma.qrCard.update({
      where: { code },
      data: updateData,
    });

    // Jika outlet belum pernah menjadi member dan opsi auto VIP aktif, berikan VIP Free 1 Bulan (30 Hari)
    const siteSetting = await prisma.siteSetting.findUnique({ where: { id: "default" } });
    const isAutoVip = siteSetting ? (siteSetting.autoVipTrialOnActivation ?? true) : true;
    const trialDays = siteSetting?.trialDurationDays ?? 30;

    if (isAutoVip && !outlet.isMember && !outlet.membershipStartedAt) {
      const trialExpiry = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
      await prisma.outlet.update({
        where: { id: outletId },
        data: {
          isMember: true,
          membershipStartedAt: new Date(),
          membershipExpiresAt: trialExpiry,
        },
      });
    }

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "ASSIGN_CARD",
      title: "Menghubungkan Kartu ke Outlet",
      description: `${session.user.role === Role.ADMIN ? 'Admin Lapangan' : 'Super Admin'} "${session.user.name || session.user.fullName}" menghubungkan kartu "${code}" ke outlet "${outlet.name}".`,
      targetId: code,
      targetName: `Kartu ${code} -> ${outlet.name}`,
      outletId: outletId,
      adminId: updateData.assignedAdminId || card.assignedAdminId || undefined,
      superAdminId: session.user.role === Role.SUPER_ADMIN ? session.user.id : undefined,
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");
    revalidatePath("/portal");

    return {
      success: true,
      message: `Kartu "${code}" berhasil dihubungkan ke outlet "${outlet.name}".`,
    };
  } catch (error) {
    console.error("assignCardToOutletAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal menghubungkan kartu ke outlet.";
    return { success: false, message: msg };
  }
}

// ─── Super Admin 1 (Master): Hapus Batch Kartu (Select All / Bulk Delete) ───

export async function deleteBatchCardsAction(codes: string[]): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak: Hanya Super Admin yang dapat menghapus kartu." };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdminMaster: true, canDeleteCards: true },
    });

    if (!currentUser?.isSuperAdminMaster && !currentUser?.canDeleteCards) {
      return {
        success: false,
        message: "Akses ditolak: Anda tidak memiliki izin untuk menghapus kartu.",
      };
    }

    if (!codes || codes.length === 0) {
      return { success: false, message: "Tidak ada kartu yang dipilih untuk dihapus." };
    }

    // Proteksi kartu demo
    const siteSetting = await prisma.siteSetting.findUnique({ where: { id: "default" } });
    const demoTarget = (siteSetting?.ctaSecondaryUrl || "c-001").toLowerCase().trim();

    const targetCodes = codes.filter((code) => {
      const cleanCode = code.toLowerCase().trim();
      return cleanCode !== "c-001" && !demoTarget.includes(cleanCode);
    });

    if (targetCodes.length === 0) {
      return { success: false, message: "Tidak ada kartu yang dapat dihapus (kartu demo dilindungi)." };
    }

    let finalTargetCodes = targetCodes;

    // Jika pemanggil adalah Super Admin 2 (bukan Master):
    // Super Admin 2 dilarang menghapus kartu milik Admin binaan Super Admin 1 atau Outlet binaan Super Admin 1
    if (!currentUser?.isSuperAdminMaster) {
      const protectedCards = await prisma.qrCard.findMany({
        where: {
          code: { in: targetCodes },
          OR: [
            // Dialokasikan ke Admin binaan Super Admin 1
            {
              assignedAdmin: {
                OR: [
                  { isSuperAdminMaster: true },
                  { createdBy: { isSuperAdminMaster: true } },
                  { createdById: null },
                ],
              },
            },
            // Terhubung ke Outlet binaan Super Admin 1
            {
              outlet: {
                owner: {
                  OR: [
                    { createdBy: { isSuperAdminMaster: true } },
                    { createdBy: { createdBy: { isSuperAdminMaster: true } } },
                    { createdById: null },
                  ],
                },
              },
            },
          ],
        },
        select: { code: true },
      });

      const protectedCodes = new Set(protectedCards.map((c) => c.code));
      finalTargetCodes = targetCodes.filter((code) => !protectedCodes.has(code));

      if (finalTargetCodes.length === 0) {
        return {
          success: false,
          message: "Akses ditolak: Kartu yang Anda pilih dikelola atau dimiliki oleh Super Admin 1.",
        };
      }
    }

    await prisma.qrCard.deleteMany({
      where: { code: { in: finalTargetCodes } },
    });

    const codeSnippet = finalTargetCodes.length <= 5 ? finalTargetCodes.join(", ") : `${finalTargetCodes.slice(0, 5).join(", ")} dan ${finalTargetCodes.length - 5} lainnya`;

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "DELETE_BATCH_CARDS",
      title: "Menghapus Massal Kartu QR",
      description: `${session.user.role === Role.SUPER_ADMIN && currentUser?.isSuperAdminMaster ? 'Super Admin 1' : 'Super Admin 2'} "${session.user.name || session.user.fullName}" menghapus ${finalTargetCodes.length} kartu QR secara massal (${codeSnippet}).`,
      targetName: `${finalTargetCodes.length} Kartu (${codeSnippet})`,
      superAdminId: session.user.id,
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Berhasil menghapus ${targetCodes.length} kartu QR secara permanen.`,
    };
  } catch (error) {
    console.error("deleteBatchCardsAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal menghapus batch kartu.";
    return { success: false, message: msg };
  }
}

// ─── Scanner Kamera: Lookup & Validasi Status Kartu Fisik ─────────────────────

export type ScannedCardResult = {
  status: "EXISTING_ACTIVE" | "EXISTING_EMPTY" | "DELETED_RECOVERABLE" | "NEW_AVAILABLE" | "ACCESS_DENIED";
  code: string;
  message: string;
  card?: {
    code: string;
    status: string;
    scanCount: number;
    fallbackUrl?: string | null;
    assignedAdminId?: string | null;
    assignedAdmin?: { id: string; fullName: string; email: string } | null;
    outletId?: string | null;
    outlet?: {
      id: string;
      name: string;
      googleReviewUrl: string;
      owner?: { id: string; fullName: string; whatsappNumber?: string | null } | null;
    } | null;
  };
  lastKnownHistory?: {
    action: string;
    description: string;
    date: string;
    assignedAdminName?: string;
  };
  suggestedAdminId?: string | null;
  canRestore: boolean;
};


async function internalLookupSingleCard(
  cleanCode: string,
  currentUserId: string,
  currentUserRole: Role,
  isMaster: boolean
): Promise<ScannedCardResult> {
  // 1. Cek apakah kartu saat ini ADA di database
  const existingCard = await prisma.qrCard.findUnique({
    where: { code: cleanCode },
    include: {
      assignedAdmin: {
        select: { id: true, fullName: true, email: true, createdById: true },
      },
      outlet: {
        include: {
          owner: {
            select: { id: true, fullName: true, whatsappNumber: true },
          },
        },
      },
    },
  });

  if (existingCard) {
    // Validasi Hak Akses Kartu yang Ada di Sistem
    if (currentUserRole === Role.SUPER_ADMIN) {
      if (!isMaster) {
        if (existingCard.assignedAdmin && existingCard.assignedAdmin.createdById !== currentUserId) {
          return {
            status: "ACCESS_DENIED",
            code: cleanCode,
            message: "Akses Ditolak: Kartu fisik ini berada di bawah wewenang Super Admin 1.",
            canRestore: false,
          };
        }
      }
    } else if (currentUserRole === Role.ADMIN) {
      if (existingCard.assignedAdminId !== currentUserId) {
        return {
          status: "ACCESS_DENIED",
          code: cleanCode,
          message: `Kamu tidak diberi jatah kartu nomor ${cleanCode} oleh Super Admin. Harap hubungi Super Admin.`,
          canRestore: false,
        };
      }
    }

    const isLinkedToOutlet = !!existingCard.outletId && !!existingCard.outlet;
    const statusMsg = isLinkedToOutlet
      ? `Kartu ${cleanCode} aktif dan terhubung ke outlet "${existingCard.outlet?.name}".`
      : `Kartu ${cleanCode} berstatus kartu kosong (siap dialokasikan/dihubungkan).`;

    return {
      status: isLinkedToOutlet ? "EXISTING_ACTIVE" : "EXISTING_EMPTY",
      code: cleanCode,
      message: statusMsg,
      card: {
        code: existingCard.code,
        status: existingCard.status,
        scanCount: existingCard.scanCount,
        fallbackUrl: existingCard.fallbackUrl,
        assignedAdminId: existingCard.assignedAdminId,
        assignedAdmin: existingCard.assignedAdmin
          ? {
              id: existingCard.assignedAdmin.id,
              fullName: existingCard.assignedAdmin.fullName,
              email: existingCard.assignedAdmin.email,
            }
          : null,
        outletId: existingCard.outletId,
        outlet: existingCard.outlet
          ? {
              id: existingCard.outlet.id,
              name: existingCard.outlet.name,
              googleReviewUrl: existingCard.outlet.googleReviewUrl,
              owner: existingCard.outlet.owner,
            }
          : null,
      },
      canRestore: false,
    };
  }

  // 2. Kartu TIDAK ADA di database -> Cari riwayat ActivityLog
  const lastLog = await prisma.activityLog.findFirst({
    where: {
      OR: [
        { targetId: cleanCode },
        { targetName: { contains: cleanCode } },
        { description: { contains: cleanCode } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  if (lastLog) {
    if (currentUserRole === Role.SUPER_ADMIN) {
      if (!isMaster) {
        if (lastLog.superAdminId && lastLog.superAdminId !== currentUserId) {
          return {
            status: "ACCESS_DENIED",
            code: cleanCode,
            message: "Akses Ditolak: Kartu fisik ini sebelumnya didaftarkan oleh Super Admin 1. Anda tidak memiliki wewenang untuk memulihkannya.",
            canRestore: false,
          };
        }
      }
    } else if (currentUserRole === Role.ADMIN) {
      if (!lastLog.adminId || lastLog.adminId !== currentUserId) {
        return {
          status: "ACCESS_DENIED",
          code: cleanCode,
          message: `Kamu tidak diberi jatah kartu nomor ${cleanCode} oleh Super Admin. Harap hubungi Super Admin.`,
          canRestore: false,
        };
      }
    }

    return {
      status: "DELETED_RECOVERABLE",
      code: cleanCode,
      message: `Kartu fisik "${cleanCode}" terdeteksi pernah terdaftar namun saat ini terhapus dari database. Anda dapat memulihkannya kembali.`,
      lastKnownHistory: {
        action: lastLog.action,
        description: lastLog.description,
        date: lastLog.createdAt.toISOString(),
      },
      suggestedAdminId: lastLog.adminId || null,
      canRestore: true,
    };
  }

  // 3. Kartu belum pernah ada di riwayat sistem sama sekali
  if (currentUserRole === Role.SUPER_ADMIN) {
    return {
      status: "NEW_AVAILABLE",
      code: cleanCode,
      message: `Kode kartu "${cleanCode}" belum terdaftar di sistem. Super Admin dapat mendaftarkannya sebagai kartu baru.`,
      canRestore: true,
    };
  } else {
    return {
      status: "ACCESS_DENIED",
      code: cleanCode,
      message: `Kamu tidak diberi jatah kartu nomor ${cleanCode} oleh Super Admin. Harap hubungi Super Admin.`,
      canRestore: false,
    };
  }
}

export async function lookupScannedCardAction(rawCodeOrUrl: string): Promise<ActionResult<ScannedCardResult>> {
  try {
    const session = await getSession();
    const cleanCode = cleanCardCode(rawCodeOrUrl);
    if (!cleanCode) {
      return { success: false, message: "Gagal mengekstrak kode kartu QR dari hasil scan." };
    }

    const currentUserId = session.user.id;
    const currentUserRole = session.user.role as Role;
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { isSuperAdminMaster: true },
    });
    const isMaster = !!dbUser?.isSuperAdminMaster;

    const result = await internalLookupSingleCard(cleanCode, currentUserId, currentUserRole, isMaster);
    return { success: true, message: result.message, data: result };
  } catch (error) {
    console.error("lookupScannedCardAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal memeriksa status kartu QR.";
    return { success: false, message: msg };
  }
}

// ─── Batch Lookup: Periksa Status Banyak Kartu Fisik Sekaligus ───────────────

export async function batchLookupScannedCardsAction(
  rawCodesOrText: string[] | string
): Promise<ActionResult<ScannedCardResult[]>> {
  try {
    const session = await getSession();
    const codes: string[] = Array.isArray(rawCodesOrText)
      ? rawCodesOrText.map(cleanCardCode).filter((c): c is string => !!c)
      : parseMultipleCardCodes(rawCodesOrText);

    const uniqueCodes = Array.from(new Set(codes));
    if (uniqueCodes.length === 0) {
      return { success: false, message: "Tidak ada kode kartu QR yang valid untuk diperiksa." };
    }

    if (uniqueCodes.length > 200) {
      return { success: false, message: "Maksimal 200 kartu dapat diperiksa dalam satu waktu." };
    }

    const currentUserId = session.user.id;
    const currentUserRole = session.user.role as Role;
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { isSuperAdminMaster: true },
    });
    const isMaster = !!dbUser?.isSuperAdminMaster;

    const results = await Promise.all(
      uniqueCodes.map((c) => internalLookupSingleCard(c, currentUserId, currentUserRole, isMaster))
    );

    return {
      success: true,
      message: `Berhasil memeriksa status ${results.length} kartu fisik.`,
      data: results,
    };
  } catch (error) {
    console.error("batchLookupScannedCardsAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal memeriksa batch kartu QR.";
    return { success: false, message: msg };
  }
}

// ─── Scanner Kamera: Pulihkan / Daftarkan Kembali Kartu Fisik ─────────────────

export async function restoreOrRegisterCardAction(data: {
  code: string;
  assignedAdminId?: string | null;
  outletId?: string | null;
}): Promise<ActionResult> {
  try {
    const session = await getSession();

    const cleanCode = data.code?.trim().toLowerCase();
    if (!cleanCode) {
      return { success: false, message: "Kode kartu tidak valid." };
    }

    // Cek apakah sudah ada kartu dengan kode ini
    const existing = await prisma.qrCard.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return { success: false, message: `Kartu ${cleanCode} sudah aktif di sistem.` };
    }

    const currentUserId = session.user.id;
    const currentUserRole = session.user.role;
    
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { isSuperAdminMaster: true },
    });
    const isMaster = !!dbUser?.isSuperAdminMaster;

    let targetAdminId: string | null = null;

    if (currentUserRole === Role.SUPER_ADMIN) {
      targetAdminId = data.assignedAdminId && data.assignedAdminId !== "unassigned" ? data.assignedAdminId : null;
    } else if (currentUserRole === Role.ADMIN) {
      targetAdminId = currentUserId;
      const check = await internalLookupSingleCard(cleanCode, currentUserId, currentUserRole, isMaster);
      if (!check.canRestore) {
        return {
          success: false,
          message: check.message || `Kamu tidak diberi jatah kartu nomor ${cleanCode} oleh Super Admin. Harap hubungi Super Admin.`,
        };
      }
    } else {
      return { success: false, message: "Akses ditolak." };
    }

    // Ambil info admin target jika ada
    let targetAdminName = "Pool Umum (Belum Dialokasikan)";
    if (targetAdminId) {
      const adm = await prisma.user.findUnique({
        where: { id: targetAdminId },
        select: { fullName: true },
      });
      if (adm) targetAdminName = adm.fullName;
    }

    // Ambil info outlet jika dipilih
    let targetOutletName = "";
    if (data.outletId) {
      const outl = await prisma.outlet.findUnique({
        where: { id: data.outletId },
        select: { name: true },
      });
      if (outl) targetOutletName = outl.name;
    }

    const newCard = await prisma.qrCard.create({
      data: {
        code: cleanCode,
        assignedAdminId: targetAdminId,
        outletId: data.outletId || null,
        status: CardStatus.ACTIVE,
      },
    });

    const roleLabel =
      currentUserRole === Role.SUPER_ADMIN
        ? isMaster
          ? "Super Admin 1 (Master)"
          : "Super Admin 2"
        : "Admin Lapangan";

    const desc = targetOutletName
      ? `${roleLabel} "${session.user.name || session.user.fullName}" memulihkan kartu fisik "${cleanCode}", mengalokasikannya ke Admin "${targetAdminName}", dan langsung menghubungkannya ke outlet "${targetOutletName}".`
      : `${roleLabel} "${session.user.name || session.user.fullName}" memulihkan kartu fisik "${cleanCode}" dan mengalokasikannya ke Admin "${targetAdminName}".`;

    await recordActivityLog({
      userId: currentUserId,
      userName: session.user.name || session.user.fullName,
      userRole: currentUserRole,
      action: "RESTORE_CARD",
      title: `Memulihkan Kartu Fisik ${cleanCode}`,
      description: desc,
      targetId: cleanCode,
      targetName: targetOutletName ? `${cleanCode} (${targetOutletName})` : cleanCode,
      outletId: data.outletId || undefined,
      adminId: targetAdminId || undefined,
      superAdminId: currentUserRole === Role.SUPER_ADMIN ? currentUserId : undefined,
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");
    revalidatePath("/portal");

    return {
      success: true,
      message: `Kartu fisik "${cleanCode}" berhasil dipulihkan dan aktif kembali di sistem!`,
      data: newCard,
    };
  } catch (error) {
    console.error("restoreOrRegisterCardAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal memulihkan kartu QR.";
    return { success: false, message: msg };
  }
}

// ─── Batch Restore: Pulihkan / Daftarkan Banyak Kartu Fisik Sekaligus ─────────

export async function batchRestoreOrRegisterCardsAction(data: {
  codes: string[];
  assignedAdminId?: string | null;
  outletId?: string | null;
}): Promise<ActionResult<{ restoredCount: number; restoredCodes: string[]; skippedCodes: string[] }>> {
  try {
    const session = await getSession();
    const cleanCodes = Array.from(
      new Set(data.codes.map(cleanCardCode).filter((c): c is string => !!c))
    );

    if (cleanCodes.length === 0) {
      return { success: false, message: "Tidak ada kode kartu yang valid untuk dipulihkan." };
    }

    if (cleanCodes.length > 200) {
      return { success: false, message: "Maksimal 200 kartu dapat dipulihkan dalam satu batch." };
    }

    const currentUserId = session.user.id;
    const currentUserRole = session.user.role as Role;
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { isSuperAdminMaster: true },
    });
    const isMaster = !!dbUser?.isSuperAdminMaster;

    // Filter out cards that are already active in the database
    const existingCards = await prisma.qrCard.findMany({
      where: { code: { in: cleanCodes } },
      select: { code: true },
    });
    const existingSet = new Set(existingCards.map((c) => c.code));

    const candidates = cleanCodes.filter((c) => !existingSet.has(c));
    const allowedCodes: string[] = [];
    const skippedCodes: string[] = cleanCodes.filter((c) => existingSet.has(c));

    for (const code of candidates) {
      const check = await internalLookupSingleCard(code, currentUserId, currentUserRole, isMaster);
      if (check.canRestore) {
        allowedCodes.push(code);
      } else {
        skippedCodes.push(code);
      }
    }

    if (allowedCodes.length === 0) {
      return {
        success: false,
        message: "Tidak ada kartu yang dapat dipulihkan (seluruh kartu sudah aktif atau Anda tidak memiliki izin akses).",
      };
    }

    let targetAdminId: string | null = null;
    if (currentUserRole === Role.SUPER_ADMIN) {
      targetAdminId =
        data.assignedAdminId && data.assignedAdminId !== "unassigned" ? data.assignedAdminId : null;
    } else if (currentUserRole === Role.ADMIN) {
      targetAdminId = currentUserId;
    } else {
      return { success: false, message: "Akses ditolak." };
    }

    let targetAdminName = "Pool Umum (Belum Dialokasikan)";
    if (targetAdminId) {
      const adm = await prisma.user.findUnique({
        where: { id: targetAdminId },
        select: { fullName: true },
      });
      if (adm) targetAdminName = adm.fullName;
    }

    let targetOutletName = "";
    if (data.outletId) {
      const outl = await prisma.outlet.findUnique({
        where: { id: data.outletId },
        select: { name: true },
      });
      if (outl) targetOutletName = outl.name;
    }

    await prisma.qrCard.createMany({
      data: allowedCodes.map((code) => ({
        code,
        assignedAdminId: targetAdminId,
        outletId: data.outletId || null,
        status: CardStatus.ACTIVE,
      })),
      skipDuplicates: true,
    });

    const roleLabel =
      currentUserRole === Role.SUPER_ADMIN
        ? isMaster
          ? "Super Admin 1 (Master)"
          : "Super Admin 2"
        : "Admin Lapangan";

    const previewCodes =
      allowedCodes.slice(0, 5).join(", ") +
      (allowedCodes.length > 5 ? ` (+${allowedCodes.length - 5} lainnya)` : "");

    const desc = targetOutletName
      ? `${roleLabel} "${session.user.name || session.user.fullName}" memulihkan massal ${allowedCodes.length} kartu fisik (${previewCodes}), dialokasikan ke Admin "${targetAdminName}", dan dihubungkan ke outlet "${targetOutletName}".`
      : `${roleLabel} "${session.user.name || session.user.fullName}" memulihkan massal ${allowedCodes.length} kartu fisik (${previewCodes}) dan dialokasikan ke Admin "${targetAdminName}".`;

    await recordActivityLog({
      userId: currentUserId,
      userName: session.user.name || session.user.fullName,
      userRole: currentUserRole,
      action: "BATCH_RESTORE_CARDS",
      title: `Memulihkan Massal ${allowedCodes.length} Kartu Fisik`,
      description: desc,
      targetId: allowedCodes.slice(0, 10).join(", "),
      targetName: `${allowedCodes.length} Kartu Fisik`,
      outletId: data.outletId || undefined,
      adminId: targetAdminId || undefined,
      superAdminId: currentUserRole === Role.SUPER_ADMIN ? currentUserId : undefined,
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");
    revalidatePath("/portal");

    return {
      success: true,
      message: `Berhasil memulihkan ${allowedCodes.length} kartu fisik sekaligus!`,
      data: {
        restoredCount: allowedCodes.length,
        restoredCodes: allowedCodes,
        skippedCodes,
      },
    };
  } catch (error) {
    console.error("batchRestoreOrRegisterCardsAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal memulihkan batch kartu fisik.";
    return { success: false, message: msg };
  }
}

