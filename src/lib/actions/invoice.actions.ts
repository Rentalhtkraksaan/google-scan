"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordActivityLog } from "@/lib/actions/activity.actions";
import { revalidatePath } from "next/cache";

export interface InvoiceItemPayload {
  id: string;
  name: string;
  qty: number;
  price: number;
}

export interface SaveInvoiceInput {
  id?: string;
  invoiceNumber: string;
  orderDate: string; // YYYY-MM-DD
  customerName: string;
  customerPhone?: string;
  items: InvoiceItemPayload[];
  discount?: number;
  paymentStatus: "LUNAS" | "DP";
  downPaymentAmount?: number;
  paymentMethod?: string;
  notes?: string;
}

// 1. Simpan / Update Invoice ke Database
export async function saveInvoiceAction(input: SaveInvoiceInput) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak: Hanya Super Admin yang dapat membuat invoice." };
    }

    const {
      id,
      invoiceNumber,
      orderDate,
      customerName,
      customerPhone,
      items,
      discount = 0,
      paymentStatus,
      downPaymentAmount = 0,
      paymentMethod,
      notes,
    } = input;

    if (!invoiceNumber || !customerName || !orderDate) {
      return { success: false, message: "Nomor invoice, nama pemesan, dan tanggal wajib diisi." };
    }

    if (!items || items.length === 0) {
      return { success: false, message: "Minimal harus ada satu barang dalam pesanan." };
    }

    const subtotal = items.reduce((acc, item) => acc + item.qty * item.price, 0);
    const grandTotal = Math.max(0, subtotal - discount);
    const paid = paymentStatus === "LUNAS" ? grandTotal : Math.min(downPaymentAmount, grandTotal);
    const remaining = Math.max(0, grandTotal - paid);

    const itemsJson = JSON.stringify(items);

    let savedInvoice;
    if (id) {
      // Update existing
      savedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          invoiceNumber: invoiceNumber.trim(),
          orderDate,
          customerName: customerName.trim(),
          customerPhone: customerPhone?.trim() || null,
          itemsJson,
          subtotal,
          discount,
          grandTotal,
          paymentStatus,
          downPaymentAmount: paid,
          remainingAmount: remaining,
          paymentMethod: paymentMethod?.trim() || null,
          notes: notes?.trim() || null,
        },
      });
    } else {
      // Create new (or upsert by invoiceNumber)
      savedInvoice = await prisma.invoice.upsert({
        where: { invoiceNumber: invoiceNumber.trim() },
        update: {
          orderDate,
          customerName: customerName.trim(),
          customerPhone: customerPhone?.trim() || null,
          itemsJson,
          subtotal,
          discount,
          grandTotal,
          paymentStatus,
          downPaymentAmount: paid,
          remainingAmount: remaining,
          paymentMethod: paymentMethod?.trim() || null,
          notes: notes?.trim() || null,
        },
        create: {
          invoiceNumber: invoiceNumber.trim(),
          orderDate,
          customerName: customerName.trim(),
          customerPhone: customerPhone?.trim() || null,
          itemsJson,
          subtotal,
          discount,
          grandTotal,
          paymentStatus,
          downPaymentAmount: paid,
          remainingAmount: remaining,
          paymentMethod: paymentMethod?.trim() || null,
          notes: notes?.trim() || null,
          createdById: session.user.id,
        },
      });
    }

    // Log aktivitas
    await recordActivityLog({
      userId: session.user.id,
      userName: session.user.name || "Super Admin",
      userRole: "SUPER_ADMIN",
      action: "SAVE_INVOICE",
      title: `Simpan Invoice: ${savedInvoice.invoiceNumber}`,
      description: `Invoice ${savedInvoice.invoiceNumber} untuk "${savedInvoice.customerName}" (Total: Rp ${grandTotal.toLocaleString("id-ID")}, Status: ${paymentStatus}) berhasil disimpan ke database.`,
      targetId: savedInvoice.id,
      targetName: savedInvoice.invoiceNumber,
      superAdminId: session.user.id,
    });

    revalidatePath("/super-admin");

    return {
      success: true,
      message: "Invoice berhasil disimpan ke database.",
      invoice: savedInvoice,
    };
  } catch (error: any) {
    console.error("Save Invoice Error:", error);
    return { success: false, message: error.message || "Gagal menyimpan invoice." };
  }
}

// 2. Ambil Riwayat Invoice dari Database (Dapat Dicari)
export async function getInvoicesAction(params?: {
  search?: string;
  paymentStatus?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak.", invoices: [], total: 0 };
    }

    const { search = "", paymentStatus = "ALL", page = 1, limit = 50 } = params || {};

    const where: any = {};

    if (paymentStatus && paymentStatus !== "ALL") {
      where.paymentStatus = paymentStatus;
    }

    if (search.trim()) {
      const q = search.trim();
      where.OR = [
        { invoiceNumber: { contains: q } },
        { customerName: { contains: q } },
        { customerPhone: { contains: q } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          createdBy: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      success: true,
      invoices,
      total,
    };
  } catch (error) {
    console.error("Get Invoices Error:", error);
    return { success: false, message: "Gagal mengambil daftar invoice.", invoices: [], total: 0 };
  }
}

// 3. Hapus Invoice (KHUSUS SUPER ADMIN 1 / MASTER)
export async function deleteInvoiceAction(invoiceId: string) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak: Hanya Super Admin yang dapat mengakses." };
    }

    // Cek apakah user adalah Super Admin 1 (Master)
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, fullName: true, isSuperAdminMaster: true },
    });

    if (!currentUser?.isSuperAdminMaster) {
      return {
        success: false,
        message: "Akses ditolak: Hanya Super Admin 1 (Master) yang memiliki izin untuk menghapus invoice dari database.",
      };
    }

    const existing = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!existing) {
      return { success: false, message: "Data invoice tidak ditemukan." };
    }

    await prisma.invoice.delete({
      where: { id: invoiceId },
    });

    // Log aktivitas
    await recordActivityLog({
      userId: currentUser.id,
      userName: currentUser.fullName || "Super Admin 1 (Master)",
      userRole: "SUPER_ADMIN",
      action: "DELETE_INVOICE",
      title: `Hapus Invoice: ${existing.invoiceNumber}`,
      description: `Super Admin 1 menghapus permanen invoice ${existing.invoiceNumber} milik "${existing.customerName}" dari database.`,
      targetId: existing.id,
      targetName: existing.invoiceNumber,
      superAdminId: currentUser.id,
    });

    revalidatePath("/super-admin");

    return {
      success: true,
      message: `Invoice ${existing.invoiceNumber} berhasil dihapus permanen dari database.`,
    };
  } catch (error: any) {
    console.error("Delete Invoice Error:", error);
    return { success: false, message: error.message || "Gagal menghapus invoice." };
  }
}
