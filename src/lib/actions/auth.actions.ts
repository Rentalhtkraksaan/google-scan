"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { createAdminSchema, registerOutletSchema } from "@/lib/validations";
import { resolveAndFormatGoogleUrl } from "@/lib/google-url";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { recordActivityLog } from "@/lib/actions/activity.actions";

export type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

// ─── Helper Session & Quick Redirect ─────────────────────────────────────────

export async function getLoginRedirectPath(email: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { role: true },
    });
    if (user?.role === Role.SUPER_ADMIN) return "/super-admin";
    if (user?.role === Role.ADMIN) return "/admin";
    return "/portal";
  } catch {
    return "/portal";
  }
}

async function getSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Sesi login Anda telah berakhir. Silakan login kembali.");
  return session;
}

// ─── Super Admin: Buat Admin Baru + Auto Generate Kartu QR ───────────────────

export async function createAdminAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak: Hanya Super Admin yang memiliki hak akses." };
    }

    const raw = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      fullName: formData.get("fullName") as string,
      whatsappNumber: formData.get("whatsappNumber") as string,
      cardCount: formData.get("cardCount") ? Number(formData.get("cardCount")) : 0,
      cardPrefix: (formData.get("cardPrefix") as string) || "c-",
    };

    const parsed = createAdminSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Data input tidak valid",
      };
    }

    const { email, password, fullName, whatsappNumber, cardCount, cardPrefix } = parsed.data;

    // Cek email duplikat
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) {
      return { success: false, message: "Email sudah terdaftar dalam sistem." };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Buat User Admin
    const admin = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        fullName: fullName.trim(),
        whatsappNumber: whatsappNumber?.trim() || null,
        role: Role.ADMIN,
        createdById: session.user.id,
      },
    });

    // 2. Auto-generate kuota kartu QR jika cardCount > 0
    let createdCount = 0;
    if (cardCount > 0) {
      const existingCards = await prisma.qrCard.findMany({ select: { code: true } });
      const existingCodes = new Set(existingCards.map((c) => c.code.toLowerCase()));

      // Cari nomor awal tertinggi
      let counter = 1;
      for (const c of existingCards) {
        const match = c.code.match(/\d+$/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num >= counter) counter = num + 1;
        }
      }

      let cleanPrefix = (cardPrefix || "c-").trim().toLowerCase();
      if (!cleanPrefix.endsWith("-") && !cleanPrefix.endsWith("_")) {
        cleanPrefix += "-";
      }

      const fallbackUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const cardsToInsert = [];

      for (let i = 0; i < cardCount; i++) {
        let code = `${cleanPrefix}${String(counter).padStart(3, "0")}`;
        while (existingCodes.has(code)) {
          counter++;
          code = `${cleanPrefix}${String(counter).padStart(3, "0")}`;
        }
        existingCodes.add(code);
        counter++;

        cardsToInsert.push({
          code,
          assignedAdminId: admin.id,
          status: "ACTIVE" as const,
          scanCount: 0,
          fallbackUrl,
        });
      }

      if (cardsToInsert.length > 0) {
        await prisma.qrCard.createMany({
          data: cardsToInsert,
        });
        createdCount = cardsToInsert.length;
      }
    }

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "CREATE_ADMIN",
      title: "Membuat Akun Admin Lapangan",
      description: `Super Admin "${session.user.name || session.user.fullName}" membuat Admin "${admin.fullName}" (${admin.email})${createdCount > 0 ? ` dan mengalokasikan ${createdCount} kartu QR.` : '.'}`,
      targetId: admin.id,
      targetName: admin.fullName,
      adminId: admin.id,
      superAdminId: session.user.id,
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return {
      success: true,
      message:
        createdCount > 0
          ? `Admin "${admin.fullName}" berhasil dibuat beserta ${createdCount} kartu QR kosong aktif!`
          : `Admin "${admin.fullName}" berhasil dibuat`,
      data: { id: admin.id, email: admin.email, fullName: admin.fullName, cardCount: createdCount },
    };
  } catch (error) {
    console.error("createAdminAction error:", error);
    const msg = error instanceof Error ? error.message : "Terjadi kesalahan pada server saat membuat Admin.";
    return { success: false, message: msg };
  }
}

// ─── Super Admin: Edit Data Admin & Password ─────────────────────────────────

export async function updateAdminUserAction(
  adminId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak: Hanya Super Admin yang memiliki hak akses." };
    }

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin) return { success: false, message: "Admin tidak ditemukan." };

    const fullName = (formData.get("fullName") as string)?.trim();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const whatsappNumber = (formData.get("whatsappNumber") as string)?.trim();
    const newPassword = (formData.get("password") as string)?.trim();

    if (!fullName || !email) {
      return { success: false, message: "Nama lengkap dan email wajib diisi." };
    }

    if (email.length > 30) {
      return { success: false, message: "Email maksimal 30 karakter." };
    }

    if (newPassword && (newPassword.length < 8 || length < 6 || newPassword.length > 15.length > 50)) {
      return { success: false, message: "Password harus berukuran 6 sampai 15 karakter." };
    }

    // Cek email duplikat jika email diubah
    if (email !== admin.email) {
      const existing = await prisma.user.findUnique({
        where: { email },
      });
      if (existing) {
        return { success: false, message: "Email tersebut sudah digunakan oleh akun lain." };
      }
    }

    let cleanWa = whatsappNumber ? whatsappNumber.replace(/[^0-9]/g, "") : null;
    if (cleanWa && cleanWa.startsWith("08")) {
      cleanWa = "62" + cleanWa.slice(1);
    }

    const updateData: {
      fullName: string;
      email: string;
      whatsappNumber: string | null;
      password?: string;
    } = {
      fullName,
      email,
      whatsappNumber: cleanWa,
    };

    if (newPassword && newPassword.length >= 6) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: adminId },
      data: updateData,
    });

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "UPDATE_ADMIN",
      title: "Memperbarui Data Admin Lapangan",
      description: `Super Admin "${session.user.name || session.user.fullName}" memperbarui data Admin "${updated.fullName}" (${updated.email})${newPassword ? ' dan mereset password.' : '.'}`,
      targetId: adminId,
      targetName: updated.fullName,
      adminId: adminId,
      superAdminId: session.user.id,
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return {
      success: true,
      message: newPassword
        ? `Data Admin "${updated.fullName}" dan Password baru berhasil disimpan!`
        : `Data Admin "${updated.fullName}" berhasil diperbarui.`,
    };
  } catch (error) {
    console.error("updateAdminUserAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal memperbarui data admin.";
    return { success: false, message: msg };
  }
}

// ─── Super Admin & Admin Lapangan: Matikan / Aktifkan Akun (Toggle Active Status) ───────────────

export async function toggleUserActiveStatusAction(userId: string): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (session.user.role !== Role.SUPER_ADMIN && session.user.role !== Role.ADMIN) {
      return { success: false, message: "Akses ditolak: Anda tidak memiliki hak akses untuk mengubah status akun." };
    }

    if (userId === session.user.id) {
      return { success: false, message: "Anda tidak dapat menonaktifkan akun Anda sendiri." };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        outlet: {
          include: {
            qrCards: true,
          },
        },
      },
    });

    if (!targetUser) return { success: false, message: "User tidak ditemukan." };

    // Validasi izin untuk Admin Lapangan
    if (session.user.role === Role.ADMIN) {
      if (targetUser.role !== Role.USER) {
        return { success: false, message: "Akses ditolak: Admin Lapangan hanya dapat mengelola status outlet binaannya." };
      }
      const isCreator = targetUser.createdById === session.user.id;
      const isCardHolder = targetUser.outlet?.qrCards?.some((c) => c.assignedAdminId === session.user.id);
      if (!isCreator && !isCardHolder) {
        return { success: false, message: "Akses ditolak: Anda tidak memiliki izin untuk mengelola outlet ini." };
      }
    }

    const newStatus = !targetUser.isActive;

    // 1. Update status aktif user
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: newStatus },
    });

    // 2. Jika targetUser memiliki outlet, sinkronkan status SEMUA kartu QR yang terhubung ke outlet tersebut!
    let connectedCardCount = 0;
    if (targetUser.outlet?.id) {
      const cardResult = await prisma.qrCard.updateMany({
        where: { outletId: targetUser.outlet.id },
        data: { status: newStatus ? "ACTIVE" : "INACTIVE" },
      });
      connectedCardCount = cardResult.count;
    }

    const roleName =
      session.user.role === Role.ADMIN
        ? "Admin Lapangan"
        : session.user.role === Role.SUPER_ADMIN
        ? "Super Admin"
        : "Pengguna";

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "TOGGLE_USER_STATUS",
      title: newStatus ? "Mengaktifkan Akun Pengguna" : "Menonaktifkan Akun Pengguna",
      description: `${roleName} "${session.user.name || session.user.fullName}" ${
        newStatus ? "mengaktifkan kembali" : "menonaktifkan"
      } akun "${targetUser.fullName}" (${targetUser.role})${
        targetUser.outlet
          ? ` beserta ${connectedCardCount} kartu QR yang terhubung (${newStatus ? "kartu aktif kembali" : "semua kartu dinonaktifkan"})`
          : ""
      }.`,
      targetId: userId,
      targetName: targetUser.fullName,
      outletId: targetUser.outlet?.id || undefined,
      adminId: session.user.role === Role.ADMIN ? session.user.id : (targetUser.createdById || undefined),
      superAdminId: session.user.role === Role.SUPER_ADMIN ? session.user.id : undefined,
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");
    revalidatePath("/portal");

    return {
      success: true,
      message: newStatus
        ? `Akun "${targetUser.fullName}" berhasil DIAKTIFKAN kembali dan ${connectedCardCount} kartu QR yang terhubung aktif kembali.`
        : `Akun "${targetUser.fullName}" berhasil DINONAKTIFKAN dan seluruh (${connectedCardCount}) kartu QR yang terhubung otomatis MATI / NONAKTIF.`,
      data: { isActive: newStatus, affectedCards: connectedCardCount },
    };
  } catch (error) {
    console.error("toggleUserActiveStatusAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal mengubah status akun.";
    return { success: false, message: msg };
  }
}

// ─── Super Admin 1: Buat Akun Super Admin 2 Baru ─────────────────────────────
export async function createSuperAdminAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak: Hanya Super Admin yang memiliki hak akses." };
    }

    // Pastikan pemanggil adalah Super Admin 1 (Master)
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdminMaster: true },
    });

    if (!currentUser?.isSuperAdminMaster) {
      return {
        success: false,
        message: "Akses ditolak: Hanya Super Admin 1 (Master) yang dapat membuat akun Super Admin baru.",
      };
    }

    const raw = {
      email: (formData.get("email") as string)?.trim().toLowerCase(),
      password: formData.get("password") as string,
      fullName: (formData.get("fullName") as string)?.trim(),
      whatsappNumber: (formData.get("whatsappNumber") as string)?.trim(),
      canEditLandingPage: formData.get("canEditLandingPage") === "true",
      canManagePrintTemplates: formData.get("canManagePrintTemplates") === "true",
      canDeleteCards: formData.get("canDeleteCards") === "true",
    };

    if (!raw.email || !raw.password || !raw.fullName) {
      return { success: false, message: "Nama, email, dan password wajib diisi." };
    }

    if (raw.email.length > 30) {
      return { success: false, message: "Email maksimal 30 karakter." };
    }

    if (raw.password.length < 8 || raw.password.length > 50) {
      return { success: false, message: "Password harus berukuran minimal 8 karakter." };
    }
    if (!/[A-Z]/.test(raw.password) || !/[a-z]/.test(raw.password) || !/[0-9]/.test(raw.password) || !/[^A-Za-z0-9]/.test(raw.password)) {
      return { success: false, message: "Password harus mengandung huruf besar, huruf kecil, angka, dan karakter khusus." };
    }

    // Cek email duplikat
    const existing = await prisma.user.findUnique({
      where: { email: raw.email },
    });
    if (existing) {
      return { success: false, message: "Email sudah terdaftar dalam sistem." };
    }

    const hashedPassword = await bcrypt.hash(raw.password, 10);

    let cleanWa = raw.whatsappNumber ? raw.whatsappNumber.replace(/[^0-9]/g, "") : null;
    if (cleanWa && cleanWa.startsWith("08")) {
      cleanWa = "62" + cleanWa.slice(1);
    }

    const newSuperAdmin = await prisma.user.create({
      data: {
        email: raw.email,
        password: hashedPassword,
        fullName: raw.fullName,
        whatsappNumber: cleanWa,
        role: Role.SUPER_ADMIN,
        isSuperAdminMaster: false, // Super Admin 2
        canEditLandingPage: raw.canEditLandingPage,
        canManagePrintTemplates: raw.canManagePrintTemplates,
        canDeleteCards: raw.canDeleteCards,
        createdById: session.user.id,
      },
    });

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "CREATE_SUPER_ADMIN",
      title: "Membuat Super Admin 2 Baru",
      description: `Super Admin 1 "${session.user.name || session.user.fullName}" membuat akun Super Admin 2 "${newSuperAdmin.fullName}" (${newSuperAdmin.email}).`,
      targetId: newSuperAdmin.id,
      targetName: newSuperAdmin.fullName,
      superAdminId: session.user.id,
    });

    revalidatePath("/super-admin");

    return {
      success: true,
      message: `Akun Super Admin 2 "${newSuperAdmin.fullName}" berhasil dibuat.`,
      data: { id: newSuperAdmin.id },
    };
  } catch (error) {
    console.error("createSuperAdminAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal membuat akun Super Admin.";
    return { success: false, message: msg };
  }
}

// ─── Super Admin 1: Toggle Hak Akses Super Admin 2 ──────────────────────────
export async function toggleSuperAdminPermissionAction(
  targetUserId: string,
  permission: "canEditLandingPage" | "canManagePrintTemplates" | "canDeleteCards"
): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak." };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdminMaster: true },
    });

    if (!currentUser?.isSuperAdminMaster) {
      return {
        success: false,
        message: "Akses ditolak: Hanya Super Admin 1 yang dapat mengubah hak akses Super Admin 2.",
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) return { success: false, message: "User tidak ditemukan." };
    if (targetUser.isSuperAdminMaster) {
      return { success: false, message: "Hak akses Super Admin 1 utama tidak dapat diubah." };
    }

    const newPermValue = !targetUser[permission];

    await prisma.user.update({
      where: { id: targetUserId },
      data: { [permission]: newPermValue },
    });

    const permLabel =
      permission === "canManagePrintTemplates"
        ? "Kelola Template Cetak Multi-Ukuran"
        : permission === "canDeleteCards"
        ? "Hapus Kartu QR Permanen"
        : "Edit Landing Page & WhatsApp";

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "UPDATE_SUPER_ADMIN_PERMISSION",
      title: "Mengubah Izin Super Admin 2",
      description: `Super Admin 1 "${session.user.name || session.user.fullName}" ${newPermValue ? 'memberikan' : 'mencabut'} izin ${permLabel} untuk "${targetUser.fullName}".`,
      targetId: targetUserId,
      targetName: targetUser.fullName,
      superAdminId: session.user.id,
    });

    revalidatePath("/super-admin");

    return {
      success: true,
      message: newPermValue
        ? `Izin ${permLabel} untuk "${targetUser.fullName}" berhasil DIBERIKAN.`
        : `Izin ${permLabel} untuk "${targetUser.fullName}" berhasil DICABUT.`,
      data: { [permission]: newPermValue },
    };
  } catch (error) {
    console.error("toggleSuperAdminPermissionAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal mengubah hak akses.";
    return { success: false, message: msg };
  }
}

// ─── Super Admin: Hapus Super Admin 2 ─────────────────────────────────────────
export async function deleteSuperAdminAction(targetUserId: string): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak." };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdminMaster: true },
    });

    if (!currentUser?.isSuperAdminMaster) {
      return {
        success: false,
        message: "Akses ditolak: Hanya Super Admin 1 yang dapat menghapus akun Super Admin 2.",
      };
    }

    if (targetUserId === session.user.id) {
      return { success: false, message: "Anda tidak dapat menghapus akun Super Admin Anda sendiri." };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) return { success: false, message: "Super Admin tidak ditemukan." };
    if (targetUser.isSuperAdminMaster) {
      return { success: false, message: "Super Admin 1 (Master) tidak dapat dihapus!" };
    }

    await prisma.user.delete({ where: { id: targetUserId } });

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "DELETE_SUPER_ADMIN",
      title: "Menghapus Super Admin 2",
      description: `Super Admin 1 "${session.user.name || session.user.fullName}" menghapus akun Super Admin 2 "${targetUser.fullName}".`,
      targetId: targetUserId,
      targetName: targetUser.fullName,
      superAdminId: session.user.id,
    });

    revalidatePath("/super-admin");

    return { success: true, message: `Akun Super Admin 2 "${targetUser.fullName}" berhasil dihapus.` };
  } catch (error) {
    console.error("deleteSuperAdminAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal menghapus Super Admin.";
    return { success: false, message: msg };
  }
}

// ─── Super Admin: Hapus Admin ─────────────────────────────────────────────────

export async function deleteAdminAction(adminId: string): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak." };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdminMaster: true },
    });

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      include: {
        createdBy: true,
        createdUsers: {
          where: { role: Role.USER },
        },
        assignedCards: {
          where: { outletId: { not: null } },
        },
      },
    });

    if (!admin) return { success: false, message: "Admin tidak ditemukan." };
    if (admin.role !== Role.ADMIN) return { success: false, message: "User bukan merupakan Admin." };

    // Validasi: Admin Lapangan hanya bisa dihapus jika Outlet Binaan nya sudah 0
    const outletBinaanCount = Math.max(admin.createdUsers.length, admin.assignedCards.length);
    if (outletBinaanCount > 0) {
      return {
        success: false,
        message: `Akses ditolak: Admin "${admin.fullName}" masih memiliki ${outletBinaanCount} outlet binaan aktif. Hapus atau alihkan outlet terlebih dahulu sebelum menghapus akun Admin ini.`,
      };
    }

    // Proteksi: Jika Super Admin 2 mencoba menghapus data buatan Super Admin 1
    if (!currentUser?.isSuperAdminMaster) {
      if (admin.createdBy?.isSuperAdminMaster || !admin.createdById) {
        return {
          success: false,
          message:
            "Akses ditolak: Akun Super Admin 2 tidak memiliki izin untuk menghapus admin yang dibuat oleh Super Admin 1.",
        };
      }
    }

    // Unassign kartu-kartu yang dipegang admin ini agar kembali ke kolam umum pusat
    await prisma.qrCard.updateMany({
      where: { assignedAdminId: adminId },
      data: { assignedAdminId: null },
    });

    // Hapus Admin
    await prisma.user.delete({ where: { id: adminId } });

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "DELETE_ADMIN",
      title: "Menghapus Admin Lapangan",
      description: `Super Admin "${session.user.name || session.user.fullName}" menghapus akun Admin "${admin.fullName}".`,
      targetId: adminId,
      targetName: admin.fullName,
      adminId: adminId,
      superAdminId: session.user.id,
    });

    revalidatePath("/super-admin");

    return { success: true, message: `Admin "${admin.fullName}" berhasil dihapus.` };
  } catch (error) {
    console.error("deleteAdminAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal menghapus Admin.";
    return { success: false, message: msg };
  }
}

// ─── Admin / Super Admin: Registrasi Outlet Baru ke Kartu QR (Claim Card) ───

export async function registerOutletAndClaimCardAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak: Anda harus login sebagai Admin atau Super Admin." };
    }

    const raw = {
      code: (formData.get("code") as string)?.trim().toLowerCase(),
      fullName: formData.get("fullName") as string,
      whatsappNumber: formData.get("whatsappNumber") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      outletName: formData.get("outletName") as string,
      googleReviewUrl: formData.get("googleReviewUrl") as string,
    };

    const parsed = registerOutletSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Data outlet tidak valid",
      };
    }

    const { code, fullName, whatsappNumber, email, password, outletName, googleReviewUrl } = parsed.data;
    const finalReviewUrl = await resolveAndFormatGoogleUrl(googleReviewUrl);

    // 1. Validasi kartu QR
    const card = await prisma.qrCard.findUnique({
      where: { code },
    });

    if (!card) {
      return { success: false, message: `Kartu dengan kode "${code}" tidak ditemukan dalam database.` };
    }

    if (card.outletId) {
      return { success: false, message: `Kartu "${code}" sudah terhubung ke outlet lain!` };
    }

    // 2. Jika login sebagai ADMIN lapangan, pastikan kartu ini memang jatahnya
    if (session.user.role === Role.ADMIN) {
      if (card.assignedAdminId && card.assignedAdminId !== session.user.id) {
        return {
          success: false,
          message: `Akses ditolak: Kartu "${code}" bukan merupakan inventaris jatah akun Anda.`,
        };
      }
    }

    // 3. Validasi email User
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existingUser) {
      return { success: false, message: `Email "${email}" sudah terdaftar pada akun lain. Gunakan email berbeda.` };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Format nomor WhatsApp agar konsisten (awalan 62)
    let cleanWa = whatsappNumber.replace(/[^0-9]/g, "");
    if (cleanWa.startsWith("08")) {
      cleanWa = "62" + cleanWa.slice(1);
    }

    // 4. Buat User + Outlet + Hubungkan ke Kartu QR dalam transaksi atomic
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          fullName: fullName.trim(),
          whatsappNumber: cleanWa,
          role: Role.USER,
          createdById: session.user.id,
        },
      });

      const newOutlet = await tx.outlet.create({
        data: {
          ownerId: newUser.id,
          name: outletName.trim(),
          googleReviewUrl: finalReviewUrl,
        },
      });

      const updatedCard = await tx.qrCard.update({
        where: { code },
        data: {
          outletId: newOutlet.id,
          status: "ACTIVE",
          // Jika didaftarkan oleh admin lapangan, pastikan assignedAdminId diset ke admin tersebut
          ...(session.user.role === Role.ADMIN && !card.assignedAdminId ? { assignedAdminId: session.user.id } : {}),
        },
      });

      return { user: newUser, outlet: newOutlet, card: updatedCard };
    });

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "REGISTER_OUTLET",
      title: "Mendaftarkan Outlet Baru",
      description: `${session.user.role === Role.ADMIN ? 'Admin Lapangan' : 'Super Admin'} "${session.user.name || session.user.fullName}" mendaftarkan outlet baru "${result.outlet.name}" dan menghubungkannya ke kartu "${code}".`,
      targetId: result.outlet.id,
      targetName: result.outlet.name,
      outletId: result.outlet.id,
      adminId: session.user.role === Role.ADMIN ? session.user.id : (card.assignedAdminId || undefined),
      superAdminId: session.user.role === Role.SUPER_ADMIN ? session.user.id : undefined,
    });

    revalidatePath("/admin");
    revalidatePath("/super-admin");

    return {
      success: true,
      message: `Outlet "${result.outlet.name}" berhasil didaftarkan dan aktif di kartu "${code}"!`,
      data: {
        userId: result.user.id,
        outletId: result.outlet.id,
        cardCode: result.card.code,
      },
    };
  } catch (error) {
    console.error("registerOutletAndClaimCardAction error:", error);
    const msg = error instanceof Error ? error.message : "Terjadi kesalahan server saat mendaftarkan outlet.";
    return { success: false, message: msg };
  }
}

// ─── Admin / Super Admin: Hapus User / Outlet ────────────────────────────────

export async function deleteOutletUserAction(userId: string): Promise<ActionResult> {
  try {
    const session = await getSession();

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        createdBy: {
          include: {
            createdBy: true,
          },
        },
        outlet: {
          include: {
            qrCards: {
              include: {
                assignedAdmin: {
                  include: {
                    createdBy: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!targetUser) {
      return { success: false, message: "User/Outlet tidak ditemukan." };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdminMaster: true, role: true },
    });

    const targetCards = targetUser.outlet?.qrCards || [];

    // Admin bisa hapus user yang dibuat oleh dirinya ATAU outlet yang terhubung ke kartu jatah admin tersebut
    if (session.user.role === Role.ADMIN) {
      const isCreator = targetUser.createdById === session.user.id;
      const isCardHolder = targetCards.some((c) => c.assignedAdminId === session.user.id);
      if (!isCreator && !isCardHolder) {
        return {
          success: false,
          message: "Akses ditolak: Anda tidak memiliki izin untuk menghapus outlet ini.",
        };
      }
    } else if (session.user.role === Role.SUPER_ADMIN) {
      // Jika pemanggil adalah Super Admin 2, tidak boleh hapus data buatan Super Admin 1 atau buatan Admin binaan Super Admin 1
      if (!currentUser?.isSuperAdminMaster) {
        const createdByMasterDirectly =
          targetUser.createdBy?.isSuperAdminMaster || !targetUser.createdById;

        const createdByAdminFromMaster =
          targetUser.createdBy?.role === Role.ADMIN &&
          (targetUser.createdBy?.createdBy?.isSuperAdminMaster || !targetUser.createdBy?.createdById);

        const cardAdminFromMaster = targetCards.some(
          (c) =>
            c.assignedAdmin &&
            (c.assignedAdmin.createdBy?.isSuperAdminMaster || !c.assignedAdmin.createdById)
        );

        if (createdByMasterDirectly || createdByAdminFromMaster || cardAdminFromMaster) {
          return {
            success: false,
            message:
              "Akses ditolak: Akun Super Admin 2 tidak memiliki izin untuk menghapus outlet yang dibuat oleh Super Admin 1 atau oleh Admin binaan Super Admin 1.",
          };
        }
      }
    } else {
      return { success: false, message: "Akses ditolak." };
    }

    // Proteksi: Jika salah satu kartu outlet terhubung ke kartu demo landing page, tidak boleh dihapus
    const siteSetting = await prisma.siteSetting.findUnique({ where: { id: "default" } });
    const demoTarget = (siteSetting?.ctaSecondaryUrl || "c-001").toLowerCase().trim();
    const hasDemoCard = targetCards.some((c) => {
      const cardCode = c.code.toLowerCase().trim();
      return cardCode === "c-001" || demoTarget.includes(cardCode);
    });

    if (hasDemoCard) {
      return {
        success: false,
        message: "Akses ditolak: Outlet ini terhubung ke Kartu Demo Landing Page dan tidak dapat dihapus.",
      };
    }

    // Proteksi: Jika outlet memegang lebih dari 1 kartu (> 1 kartu), tidak boleh dihapus, hanya boleh dinonaktifkan
    if (targetCards.length > 1) {
      return {
        success: false,
        message: `Akses ditolak: Outlet "${targetUser.outlet?.name || targetUser.fullName}" memegang ${targetCards.length} kartu QR (lebih dari 1 kartu). Outlet tidak dapat dihapus, silakan nonaktifkan akun/outlet sebagai gantinya.`,
      };
    }

    // Unlink semua kartu QR milik outlet ini jika ada
    if (targetUser.outlet?.id) {
      await prisma.qrCard.updateMany({
        where: { outletId: targetUser.outlet.id },
        data: { outletId: null },
      });
    }

    // Hapus user (onDelete: Cascade di Prisma akan menghapus Outlet secara otomatis)
    await prisma.user.delete({
      where: { id: userId },
    });

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "DELETE_OUTLET",
      title: "Menghapus Outlet",
      description: `${session.user.role === Role.ADMIN ? 'Admin Lapangan' : 'Super Admin'} "${session.user.name || session.user.fullName}" menghapus outlet "${targetUser.outlet?.name || targetUser.fullName}".`,
      targetId: targetUser.outlet?.id || userId,
      targetName: targetUser.outlet?.name || targetUser.fullName,
      outletId: targetUser.outlet?.id || undefined,
      adminId: session.user.role === Role.ADMIN ? session.user.id : undefined,
      superAdminId: session.user.role === Role.SUPER_ADMIN ? session.user.id : undefined,
    });

    revalidatePath("/admin");
    revalidatePath("/super-admin");

    return {
      success: true,
      message: `Outlet "${targetUser.outlet?.name || targetUser.fullName}" berhasil dihapus dan seluruh kartu QR telah dikembalikan ke status kosong.`,
    };
  } catch (error) {
    console.error("deleteOutletUserAction error:", error);
    const msg = error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus outlet.";
    return { success: false, message: msg };
  }
}

// ─── Admin / Super Admin / Owner: Update Data Outlet ────────────────────────

export async function updateOutletAction(
  outletId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await getSession();

    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      include: { owner: true, qrCards: true },
    });

    if (!outlet) return { success: false, message: "Outlet tidak ditemukan." };

    if (session.user.role === Role.USER) {
      if (outlet.ownerId !== session.user.id) {
        return { success: false, message: "Akses ditolak: Anda hanya dapat mengedit outlet milik Anda sendiri." };
      }
    } else if (session.user.role === Role.ADMIN) {
      const isCreator = outlet.owner.createdById === session.user.id;
      const isCardHolder = outlet.qrCards?.some((c) => c.assignedAdminId === session.user.id);
      if (!isCreator && !isCardHolder) {
        return { success: false, message: "Akses ditolak: Anda tidak memiliki izin untuk mengedit outlet ini." };
      }
    } else if (session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak." };
    }

    const name = formData.get("name") as string;
    const googleReviewUrl = formData.get("googleReviewUrl") as string;
    const fullName = formData.get("fullName") as string;
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const whatsappNumber = formData.get("whatsappNumber") as string;
    const newPassword = (formData.get("password") as string)?.trim();

    if (!name || !googleReviewUrl) {
      return { success: false, message: "Nama outlet dan link Google Review wajib diisi." };
    }

    if (email) {
      if (email.length > 30) {
        return { success: false, message: "Email maksimal 30 karakter." };
      }
      if (email !== outlet.owner.email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          return { success: false, message: "Email tersebut sudah digunakan oleh akun lain." };
        }
      }
    }

    const finalReviewUrl = await resolveAndFormatGoogleUrl(googleReviewUrl);

    let cleanWa = whatsappNumber ? whatsappNumber.replace(/[^0-9]/g, "") : null;
    if (cleanWa && cleanWa.startsWith("08")) {
      cleanWa = "62" + cleanWa.slice(1);
    }

    const userUpdateData: {
      fullName?: string;
      email?: string;
      whatsappNumber?: string | null;
      password?: string;
    } = {
      fullName: fullName ? fullName.trim() : outlet.owner.fullName,
      whatsappNumber: cleanWa !== null ? cleanWa : outlet.owner.whatsappNumber,
    };

    if (email) {
      userUpdateData.email = email;
    }

    if (newPassword) {
      if (newPassword.length < 8 || length < 6 || newPassword.length > 15.length > 50) {
        return { success: false, message: "Password baru harus berukuran 6 sampai 15 karakter." };
      }
      userUpdateData.password = await bcrypt.hash(newPassword, 10);
    }

    await prisma.$transaction([
      prisma.outlet.update({
        where: { id: outletId },
        data: {
          name: name.trim(),
          googleReviewUrl: finalReviewUrl,
        },
      }),
      prisma.user.update({
        where: { id: outlet.ownerId },
        data: userUpdateData,
      }),
    ]);

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "UPDATE_OUTLET",
      title: "Memperbarui Data Outlet",
      description: `Pengguna "${session.user.name || session.user.fullName}" (${session.user.role}) memperbarui data outlet "${name}"${newPassword ? ' dan mengubah password.' : '.'}`,
      targetId: outletId,
      targetName: name,
      outletId: outletId,
      adminId: outlet.owner.createdById || undefined,
      superAdminId: session.user.role === Role.SUPER_ADMIN ? session.user.id : undefined,
    });

    revalidatePath("/admin");
    revalidatePath("/super-admin");
    revalidatePath("/portal");
    revalidatePath("/user");

    return {
      success: true,
      message: newPassword
        ? `Data outlet "${name}" dan password baru berhasil disimpan!`
        : `Data outlet "${name}" berhasil diperbarui.`,
    };
  } catch (error) {
    console.error("updateOutletAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal memperbarui data outlet.";
    return { success: false, message: msg };
  }
}

// ─── Super Admin 1 (Master): Hapus Batch Outlet / Klien ──────────────────────

export async function deleteBatchOutletUsersAction(userIds: string[]): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak." };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdminMaster: true },
    });

    if (!currentUser?.isSuperAdminMaster) {
      return {
        success: false,
        message: "Akses ditolak: Hanya Super Admin 1 (Master) yang memiliki izin untuk menghapus massal.",
      };
    }

    if (!userIds || userIds.length === 0) {
      return { success: false, message: "Tidak ada outlet yang dipilih untuk dihapus." };
    }

    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, role: Role.USER },
      include: { outlet: { include: { qrCards: true } } },
    });

    const siteSetting = await prisma.siteSetting.findUnique({ where: { id: "default" } });
    const demoTarget = (siteSetting?.ctaSecondaryUrl || "c-001").toLowerCase().trim();

    const allowedUserIds: string[] = [];
    const outletIdsToUnlink: string[] = [];
    let skippedOverQuotaCount = 0;

    for (const u of users) {
      const userCards = u.outlet?.qrCards || [];
      const hasDemoCard = userCards.some((c) => {
        const cardCode = c.code.toLowerCase().trim();
        return cardCode === "c-001" || demoTarget.includes(cardCode);
      });
      if (hasDemoCard) {
        continue; // skip demo outlet
      }
      if (userCards.length > 1) {
        skippedOverQuotaCount++;
        continue; // skip outlet with > 1 cards (hanya bisa dinonaktifkan)
      }
      allowedUserIds.push(u.id);
      if (u.outlet?.id) {
        outletIdsToUnlink.push(u.outlet.id);
      }
    }

    if (allowedUserIds.length === 0) {
      return {
        success: false,
        message: skippedOverQuotaCount > 0
          ? "Tidak ada outlet yang dapat dihapus. Outlet yang dipilih memegang lebih dari 1 kartu QR (> 1 kartu) atau merupakan outlet demo terlindungi (hanya dapat dinonaktifkan)."
          : "Tidak ada outlet yang dapat dihapus (outlet demo dilindungi).",
      };
    }

    if (outletIdsToUnlink.length > 0) {
      await prisma.qrCard.updateMany({
        where: { outletId: { in: outletIdsToUnlink } },
        data: { outletId: null },
      });
    }

    const outletNames = users.map((u) => u.outlet?.name || u.fullName).filter(Boolean);
    const outletSnippet = outletNames.length <= 4 ? outletNames.join(", ") : `${outletNames.slice(0, 4).join(", ")} dan ${outletNames.length - 4} lainnya`;

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "DELETE_BATCH_OUTLETS",
      title: "Menghapus Massal Outlet",
      description: `Super Admin 1 "${session.user.name || session.user.fullName}" menghapus ${allowedUserIds.length} outlet secara massal (${outletSnippet}).`,
      targetName: `${allowedUserIds.length} Outlet (${outletSnippet})`,
      superAdminId: session.user.id,
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Berhasil menghapus ${allowedUserIds.length} outlet binaan. Kartu QR telah dikembalikan ke status kosong.`,
    };
  } catch (error) {
    console.error("deleteBatchOutletUsersAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal menghapus batch outlet.";
    return { success: false, message: msg };
  }
}

// ─── Super Admin 1 (Master): Hapus Batch Admin Lapangan ──────────────────────

export async function deleteBatchAdminsAction(adminIds: string[]): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak." };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdminMaster: true },
    });

    if (!currentUser?.isSuperAdminMaster) {
      return {
        success: false,
        message: "Akses ditolak: Hanya Super Admin 1 (Master) yang memiliki izin untuk menghapus massal.",
      };
    }

    if (!adminIds || adminIds.length === 0) {
      return { success: false, message: "Tidak ada admin yang dipilih untuk dihapus." };
    }

    // Cek apakah ada admin yang masih memiliki outlet binaan
    const adminsWithOutlets = await prisma.user.findMany({
      where: {
        id: { in: adminIds },
        role: Role.ADMIN,
        OR: [
          { createdUsers: { some: { role: Role.USER } } },
          { assignedCards: { some: { outletId: { not: null } } } },
        ],
      },
      include: {
        createdUsers: { where: { role: Role.USER } },
        assignedCards: { where: { outletId: { not: null } } },
      },
    });

    if (adminsWithOutlets.length > 0) {
      const details = adminsWithOutlets
        .map(
          (a) =>
            `${a.fullName} (${Math.max(a.createdUsers.length, a.assignedCards.length)} outlet)`
        )
        .join(", ");
      return {
        success: false,
        message: `Gagal menghapus massal: Admin berikut masih memiliki outlet binaan aktif: ${details}. Hanya admin dengan 0 outlet binaan yang dapat dihapus.`,
      };
    }

    await prisma.qrCard.updateMany({
      where: { assignedAdminId: { in: adminIds } },
      data: { assignedAdminId: null },
    });

    const targetAdmins = await prisma.user.findMany({
      where: { id: { in: adminIds } },
      select: { fullName: true },
    });
    const adminNames = targetAdmins.map((a) => a.fullName);
    const adminSnippet = adminNames.length <= 4 ? adminNames.join(", ") : `${adminNames.slice(0, 4).join(", ")} dan ${adminNames.length - 4} lainnya`;

    await prisma.user.deleteMany({
      where: { id: { in: adminIds }, role: Role.ADMIN },
    });

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "DELETE_BATCH_ADMINS",
      title: "Menghapus Massal Admin Lapangan",
      description: `Super Admin 1 "${session.user.name || session.user.fullName}" menghapus ${adminIds.length} Admin Lapangan secara massal (${adminSnippet}).`,
      targetName: `${adminIds.length} Admin (${adminSnippet})`,
      superAdminId: session.user.id,
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Berhasil menghapus ${adminIds.length} Admin Lapangan. Seluruh kartu yang dipegang telah dikembalikan ke kolam pusat.`,
    };
  } catch (error) {
    console.error("deleteBatchAdminsAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal menghapus batch admin.";
    return { success: false, message: msg };
  }
}

// ─── Super Admin 1 (Master): Hapus Batch Super Admin 2 ───────────────────────

export async function deleteBatchSuperAdminsAction(superAdminIds: string[]): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak." };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdminMaster: true },
    });

    if (!currentUser?.isSuperAdminMaster) {
      return {
        success: false,
        message: "Akses ditolak: Hanya Super Admin 1 (Master) yang memiliki izin untuk menghapus massal.",
      };
    }

    const validTargetIds = superAdminIds.filter((id) => id !== session.user.id);

    if (validTargetIds.length === 0) {
      return { success: false, message: "Tidak ada Super Admin 2 yang dapat dihapus." };
    }

    const targetSuperAdmins = await prisma.user.findMany({
      where: { id: { in: validTargetIds } },
      select: { fullName: true },
    });
    const saNames = targetSuperAdmins.map((s) => s.fullName);
    const saSnippet = saNames.length <= 4 ? saNames.join(", ") : `${saNames.slice(0, 4).join(", ")} dan ${saNames.length - 4} lainnya`;

    await prisma.user.deleteMany({
      where: { id: { in: validTargetIds }, role: Role.SUPER_ADMIN, isSuperAdminMaster: false },
    });

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "DELETE_BATCH_SUPER_ADMINS",
      title: "Menghapus Massal Super Admin 2",
      description: `Super Admin 1 "${session.user.name || session.user.fullName}" menghapus ${validTargetIds.length} akun Super Admin 2 secara massal (${saSnippet}).`,
      targetName: `${validTargetIds.length} Super Admin (${saSnippet})`,
      superAdminId: session.user.id,
    });

    revalidatePath("/super-admin");

    return {
      success: true,
      message: `Berhasil menghapus ${validTargetIds.length} akun Super Admin 2.`,
    };
  } catch (error) {
    console.error("deleteBatchSuperAdminsAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal menghapus batch super admin.";
    return { success: false, message: msg };
  }
}

// ─── Public: Reset / Lupa Password dengan Verifikasi Lengkap ─────────────────

export async function resetForgotPasswordAction(formData: FormData): Promise<ActionResult> {
  try {
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const whatsappNumber = (formData.get("whatsappNumber") as string)?.trim();
    const newPassword = (formData.get("newPassword") as string)?.trim();

    if (!email || !whatsappNumber || !newPassword) {
      return {
        success: false,
        message: "Semua kolom (Email, No. WhatsApp, Password Baru) wajib diisi.",
      };
    }

    if (email.length > 30) {
      return {
        success: false,
        message: "Email maksimal 30 karakter.",
      };
    }

    if (newPassword.length < 8 || newPassword.length > 50) {
      return {
        success: false,
        message: "Password baru minimal 8 karakter.",
      };
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      return {
        success: false,
        message: "Password harus mengandung minimal satu huruf besar, satu huruf kecil, satu angka, dan satu karakter khusus.",
      };
    }

    // 1. Cari user berdasarkan email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        success: false,
        message: "Data verifikasi tidak cocok. Pastikan Email dan No. WhatsApp sama dengan yang didaftarkan.",
      };
    }



    // 3. Cocokkan Nomor WhatsApp
    let cleanInputWa = whatsappNumber.replace(/[^0-9]/g, "");
    if (cleanInputWa.startsWith("08")) {
      cleanInputWa = "62" + cleanInputWa.slice(1);
    }

    let cleanUserWa = user.whatsappNumber ? user.whatsappNumber.replace(/[^0-9]/g, "") : "";
    if (cleanUserWa.startsWith("08")) {
      cleanUserWa = "62" + cleanUserWa.slice(1);
    }

    if (cleanInputWa !== cleanUserWa) {
      return {
        success: false,
        message: "Nomor WhatsApp tidak cocok dengan data akun yang terdaftar.",
      };
    }

    // 4. Update password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return {
      success: true,
      message: `Password untuk akun "${user.fullName}" berhasil diperbarui! Silakan login dengan password baru.`,
    };
  } catch (error) {
    console.error("resetForgotPasswordAction error:", error);
    const msg = error instanceof Error ? error.message : "Terjadi kesalahan server saat mereset password.";
    return { success: false, message: msg };
  }
}

// ─── Super Admin 1: Update Data & Password Super Admin 2 ──────────────────────

export async function updateSuperAdminUserAction(
  targetUserId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await getSession();

    if (session.user.role !== Role.SUPER_ADMIN) {
      return { success: false, message: "Akses ditolak." };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdminMaster: true },
    });

    if (!currentUser?.isSuperAdminMaster) {
      return {
        success: false,
        message: "Akses ditolak: Hanya Super Admin 1 (Master) yang dapat mengubah data Super Admin 2.",
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) return { success: false, message: "User tidak ditemukan." };

    const fullName = (formData.get("fullName") as string)?.trim();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const whatsappNumber = (formData.get("whatsappNumber") as string)?.trim();
    const newPassword = (formData.get("password") as string)?.trim();
    const canEditLandingPage = formData.get("canEditLandingPage") === "true";
    const canManagePrintTemplates = formData.get("canManagePrintTemplates") === "true";
    const canDeleteCards = formData.get("canDeleteCards") === "true";

    if (!fullName || !email) {
      return { success: false, message: "Nama lengkap dan email wajib diisi." };
    }

    if (email.length > 30) {
      return { success: false, message: "Email maksimal 30 karakter." };
    }

    if (newPassword && (newPassword.length < 8 || length < 6 || newPassword.length > 15.length > 50)) {
      return { success: false, message: "Password harus berukuran 6 sampai 15 karakter." };
    }

    if (email !== targetUser.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return { success: false, message: "Email sudah digunakan oleh akun lain." };
      }
    }

    let cleanWa = whatsappNumber ? whatsappNumber.replace(/[^0-9]/g, "") : null;
    if (cleanWa && cleanWa.startsWith("08")) {
      cleanWa = "62" + cleanWa.slice(1);
    }

    const updateData: {
      fullName: string;
      email: string;
      whatsappNumber: string | null;
      canEditLandingPage: boolean;
      canManagePrintTemplates: boolean;
      canDeleteCards: boolean;
      password?: string;
    } = {
      fullName,
      email,
      whatsappNumber: cleanWa,
      canEditLandingPage,
      canManagePrintTemplates,
      canDeleteCards,
    };

    if (newPassword && newPassword.length >= 6) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
    });

    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || session.user.fullName,
      userRole: session.user.role,
      action: "UPDATE_SUPER_ADMIN",
      title: "Memperbarui Data Super Admin 2",
      description: `Super Admin 1 "${session.user.name || session.user.fullName}" memperbarui data Super Admin 2 "${updated.fullName}"${newPassword ? ' dan mereset password.' : '.'}`,
      targetId: targetUserId,
      targetName: updated.fullName,
      superAdminId: session.user.id,
    });

    revalidatePath("/super-admin");

    return {
      success: true,
      message: newPassword
        ? `Data Super Admin 2 "${updated.fullName}" dan Password baru berhasil disimpan!`
        : `Data Super Admin 2 "${updated.fullName}" berhasil diperbarui.`,
    };
  } catch (error) {
    console.error("updateSuperAdminUserAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal memperbarui data Super Admin.";
    return { success: false, message: msg };
  }
}

// ─── Self Profile: Update Data Akun Sendiri ──────────────────────────────────

export async function updateSelfProfileAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await getSession();
    const userId = session.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, message: "Akun tidak ditemukan." };

    const fullName = (formData.get("fullName") as string)?.trim();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const whatsappNumber = (formData.get("whatsappNumber") as string)?.trim();
    const newPassword = (formData.get("password") as string)?.trim();

    if (!fullName) {
      return { success: false, message: "Nama lengkap wajib diisi." };
    }

    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return { success: false, message: "Email sudah digunakan oleh akun lain." };
      }
    }

    let cleanWa = whatsappNumber ? whatsappNumber.replace(/[^0-9]/g, "") : null;
    if (cleanWa && cleanWa.startsWith("08")) {
      cleanWa = "62" + cleanWa.slice(1);
    }

    const updateData: {
      fullName: string;
      email?: string;
      whatsappNumber: string | null;
      password?: string;
    } = {
      fullName,
      whatsappNumber: cleanWa,
    };

    if (email) {
      updateData.email = email;
    }

    if (email && email.length > 30) {
      return { success: false, message: "Email maksimal 30 karakter." };
    }

    if (newPassword) {
      if (newPassword.length < 8 || length < 6 || newPassword.length > 15.length > 50) {
        return { success: false, message: "Password baru harus berukuran 6 sampai 15 karakter." };
      }
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await recordActivityLog({
      userId: session.user.id,
      userName: updated.fullName,
      userRole: updated.role,
      action: "UPDATE_PROFILE",
      title: "Memperbarui Profil Akun",
      description: `Pengguna "${updated.fullName}" (${updated.role}) memperbarui profil akun sendiri${newPassword ? ' dan mengubah password.' : '.'}`,
      targetId: userId,
      targetName: updated.fullName,
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");
    revalidatePath("/portal");
    revalidatePath("/user");

    return {
      success: true,
      message: newPassword
        ? `Profil "${updated.fullName}" dan Password berhasil diperbarui!`
        : `Profil "${updated.fullName}" berhasil diperbarui.`,
    };
  } catch (error) {
    console.error("updateSelfProfileAction error:", error);
    const msg = error instanceof Error ? error.message : "Gagal memperbarui profil akun.";
    return { success: false, message: msg };
  }
}

/**
 * Log user logout activity for audit trail
 */
export async function logLogoutAction(): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: true, message: "Tidak ada sesi aktif." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isSuperAdminMaster: true,
        createdById: true,
        createdBy: {
          select: {
            id: true,
            role: true,
            createdById: true,
          },
        },
      },
    });

    if (user) {
      const roleLabel =
        user.role === Role.SUPER_ADMIN
          ? user.isSuperAdminMaster
            ? "Super Admin 1 (Master)"
            : "Super Admin 2"
          : user.role === Role.ADMIN
          ? "Admin Lapangan"
          : "Pemilik Outlet";

      let adminId: string | null = null;
      let superAdminId: string | null = null;

      if (user.role === Role.SUPER_ADMIN) {
        superAdminId = user.id;
      } else if (user.role === Role.ADMIN) {
        adminId = user.id;
        if (user.createdBy && user.createdBy.role === Role.SUPER_ADMIN) {
          superAdminId = user.createdBy.id;
        }
      } else if (user.role === Role.USER) {
        if (user.createdBy) {
          if (user.createdBy.role === Role.ADMIN) {
            adminId = user.createdBy.id;
            if (user.createdBy.createdById) {
              superAdminId = user.createdBy.createdById;
            }
          } else if (user.createdBy.role === Role.SUPER_ADMIN) {
            superAdminId = user.createdBy.id;
          }
        }
      }

      await recordActivityLog({
        userId: user.id,
        userName: user.fullName,
        userRole: user.role,
        action: "AUTH_LOGOUT",
        title: "Logout dari Akun",
        description: `${roleLabel} "${user.fullName}" (${user.email}) telah keluar (logout) dari sistem.`,
        targetId: user.id,
        targetName: user.fullName,
        adminId: adminId,
        superAdminId: superAdminId,
      });
    }

    return { success: true, message: "Logout tercatat." };
  } catch (error) {
    console.error("Gagal mencatat log logout:", error);
    return { success: false, message: "Gagal mencatat log logout." };
  }
}

