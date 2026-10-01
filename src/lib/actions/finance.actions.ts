"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface SharesConfig {
  kasPercentage: number;
  chikaPercentage: number;
  aditPercentage: number;
  kasName: string;
  chikaName: string;
  aditName: string;
}

/**
 * 1. Ambil Pengaturan Keuangan & Inisialisasi Default jika belum ada
 */
export async function getOrCreateFinanceSettings() {
  let setting = await prisma.financeSetting.findUnique({
    where: { id: "default" },
  });

  if (!setting) {
    setting = await prisma.financeSetting.create({
      data: {
        id: "default",
        initialBalance: 0,
        settlementDay: 25,
        kasPercentage: 10,
        chikaPercentage: 40,
        aditPercentage: 50,
        kasName: "Kas Usaha (Cadangan)",
        chikaName: "Chika",
        aditName: "Adit",
      },
    });
  }

  return setting;
}

/**
 * 2. Ambil Overview Dashboard Keuangan & Laba Bersih Real-Time
 */
export async function getFinanceDashboardDataAction() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak: Khusus Super Admin." };
    }

    const settings = await getOrCreateFinanceSettings();

    // Ambil semua transaksi yang belum dicairkan (periode berjalan / active period)
    const activeTransactions = await prisma.financeTransaction.findMany({
      where: { isSettled: false },
      orderBy: { date: "desc" },
    });

    // Ambil juga pesanan reseller / retail yang LUNAS di sistem untuk sinkronisasi otomatis
    const paidOrders = await prisma.resellerOrder.findMany({
      where: { paymentStatus: "PAID" },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        customerName: true,
        orderType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Hitung Akumulasi Pemasukan
    const manualIncomeTotal = activeTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);

    const orderIncomeTotal = activeTransactions
      .filter((t) => t.type === "INCOME" && t.category === "ORDER_SALES")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalIncome = manualIncomeTotal;

    // Hitung Akumulasi Pengeluaran per Kategori
    const operationalExpenseTotal = activeTransactions
      .filter((t) => t.type === "EXPENSE" && t.category === "OPERATIONAL")
      .reduce((sum, t) => sum + t.amount, 0);

    const inventoryAssetTotal = activeTransactions
      .filter((t) => t.type === "EXPENSE" && t.category === "INVENTORY_ASSET")
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyLiabilityTotal = activeTransactions
      .filter((t) => t.type === "EXPENSE" && t.category === "MONTHLY_LIABILITY")
      .reduce((sum, t) => sum + t.amount, 0);

    const otherExpenseTotal = activeTransactions
      .filter((t) => t.type === "EXPENSE" && t.category === "OTHER")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses =
      operationalExpenseTotal + inventoryAssetTotal + monthlyLiabilityTotal + otherExpenseTotal;

    // Laba Bersih = Total Pemasukan - Total Pengeluaran
    const netProfit = Math.max(0, totalIncome - totalExpenses);

    // Hitung Bagi Hasil
    const kasShare = Math.round((netProfit * settings.kasPercentage) / 100);
    const chikaShare = Math.round((netProfit * settings.chikaPercentage) / 100);
    const aditShare = Math.round((netProfit * settings.aditPercentage) / 100);

    // Hitung Saldo Kas Riil Berjalan = Modal Awal + Total Pemasukan - Total Pengeluaran
    const currentCashBalance = settings.initialBalance + totalIncome - totalExpenses;

    // Hitung Sisa Hari Menuju Tanggal 25 (Gajian)
    const today = new Date();
    const currentDay = today.getDate();
    const targetDay = settings.settlementDay || 25;
    let daysUntilPayout = targetDay - currentDay;
    if (daysUntilPayout < 0) {
      // Jika sudah lewat tgl 25, hitung ke tgl 25 bulan depan
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, targetDay);
      const diffTime = nextMonth.getTime() - today.getTime();
      daysUntilPayout = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      success: true,
      data: {
        settings,
        activeTransactions,
        paidOrders,
        summary: {
          initialBalance: settings.initialBalance,
          totalIncome,
          manualIncomeTotal,
          orderIncomeTotal,
          operationalExpenseTotal,
          inventoryAssetTotal,
          monthlyLiabilityTotal,
          otherExpenseTotal,
          totalExpenses,
          netProfit,
          currentCashBalance,
          shares: {
            kas: {
              name: settings.kasName,
              percentage: settings.kasPercentage,
              amount: kasShare,
            },
            chika: {
              name: settings.chikaName,
              percentage: settings.chikaPercentage,
              amount: chikaShare,
            },
            adit: {
              name: settings.aditName,
              percentage: settings.aditPercentage,
              amount: aditShare,
            },
          },
          settlementDay: settings.settlementDay,
          daysUntilPayout,
        },
      },
    };
  } catch (error) {
    console.error("getFinanceDashboardDataAction error:", error);
    return { success: false, message: "Gagal memuat data keuangan internal." };
  }
}

/**
 * 3. Tambah Catatan Transaksi Baru (Pemasukan / Belanja / Inventaris / Tanggungan)
 */
export async function addFinanceTransactionAction(data: {
  type: "INCOME" | "EXPENSE";
  category: "OPERATIONAL" | "INVENTORY_ASSET" | "MONTHLY_LIABILITY" | "ORDER_SALES" | "MANUAL_INCOME" | "OTHER";
  title: string;
  amount: number;
  notes?: string;
  date?: string;
  receiptUrl?: string;
}) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak: Khusus Super Admin." };
    }

    if (!data.title || !data.amount || data.amount <= 0) {
      return { success: false, message: "Nama transaksi dan nominal wajib diisi (lebih dari 0)." };
    }

    const transaction = await prisma.financeTransaction.create({
      data: {
        type: data.type,
        category: data.category,
        title: data.title.trim(),
        amount: Math.round(data.amount),
        notes: data.notes?.trim() || null,
        date: data.date ? new Date(data.date) : new Date(),
        receiptUrl: data.receiptUrl?.trim() || null,
        isSettled: false,
      },
    });

    revalidatePath("/super-admin");
    return { success: true, message: "Transaksi berhasil dicatat ke buku kas!", data: transaction };
  } catch (error) {
    console.error("addFinanceTransactionAction error:", error);
    return { success: false, message: "Gagal mencatat transaksi keuangan." };
  }
}

/**
 * 4. Update Transaksi Keuangan
 */
export async function updateFinanceTransactionAction(
  id: string,
  data: {
    type?: "INCOME" | "EXPENSE";
    category?: string;
    title?: string;
    amount?: number;
    notes?: string;
    date?: string;
    receiptUrl?: string;
  }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak." };
    }

    const updated = await prisma.financeTransaction.update({
      where: { id },
      data: {
        type: data.type,
        category: data.category,
        title: data.title?.trim(),
        amount: data.amount ? Math.round(data.amount) : undefined,
        notes: data.notes !== undefined ? data.notes.trim() || null : undefined,
        date: data.date ? new Date(data.date) : undefined,
        receiptUrl: data.receiptUrl !== undefined ? data.receiptUrl.trim() || null : undefined,
      },
    });

    revalidatePath("/super-admin");
    return { success: true, message: "Transaksi berhasil diperbarui.", data: updated };
  } catch (error) {
    console.error("updateFinanceTransactionAction error:", error);
    return { success: false, message: "Gagal memperbarui transaksi." };
  }
}

/**
 * 5. Hapus Transaksi Keuangan (Khusus Super Admin 1 Master)
 */
export async function deleteFinanceTransactionAction(id: string) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN" || !session.user.isSuperAdminMaster) {
      return { success: false, message: "Akses ditolak: Hanya Super Admin 1 (Master) yang dapat menghapus transaksi kas." };
    }

    await prisma.financeTransaction.delete({
      where: { id },
    });

    revalidatePath("/super-admin");
    return { success: true, message: "Transaksi kas berhasil dihapus." };
  } catch (error) {
    console.error("deleteFinanceTransactionAction error:", error);
    return { success: false, message: "Gagal menghapus transaksi kas." };
  }
}

/**
 * 6. Update Pengaturan Modal Awal & Persentase Bagi Hasil (Kas 10%, Chika 40%, Adit 50%)
 */
export async function updateFinanceSettingsAction(data: {
  initialBalance?: number;
  settlementDay?: number;
  kasPercentage?: number;
  chikaPercentage?: number;
  aditPercentage?: number;
  kasName?: string;
  chikaName?: string;
  aditName?: string;
}) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak: Khusus Super Admin." };
    }

    // Pastikan total persentase adalah 100% jika semua persentase diberikan
    if (
      data.kasPercentage !== undefined &&
      data.chikaPercentage !== undefined &&
      data.aditPercentage !== undefined
    ) {
      const total = data.kasPercentage + data.chikaPercentage + data.aditPercentage;
      if (total !== 100) {
        return {
          success: false,
          message: `Total persentase pembagian harus tepat 100% (Saat ini: ${total}%).`,
        };
      }
    }

    const updated = await prisma.financeSetting.upsert({
      where: { id: "default" },
      update: {
        initialBalance: data.initialBalance !== undefined ? Math.round(data.initialBalance) : undefined,
        settlementDay: data.settlementDay,
        kasPercentage: data.kasPercentage,
        chikaPercentage: data.chikaPercentage,
        aditPercentage: data.aditPercentage,
        kasName: data.kasName?.trim(),
        chikaName: data.chikaName?.trim(),
        aditName: data.aditName?.trim(),
      },
      create: {
        id: "default",
        initialBalance: data.initialBalance ? Math.round(data.initialBalance) : 0,
        settlementDay: data.settlementDay || 25,
        kasPercentage: data.kasPercentage || 10,
        chikaPercentage: data.chikaPercentage || 40,
        aditPercentage: data.aditPercentage || 50,
        kasName: data.kasName?.trim() || "Kas Usaha (Cadangan)",
        chikaName: data.chikaName?.trim() || "Chika",
        aditName: data.aditName?.trim() || "Adit",
      },
    });

    revalidatePath("/super-admin");
    return { success: true, message: "Pengaturan modal dan bagi hasil berhasil disimpan!", data: updated };
  } catch (error) {
    console.error("updateFinanceSettingsAction error:", error);
    return { success: false, message: "Gagal menyimpan pengaturan keuangan." };
  }
}

/**
 * 7. Tutup Buku & Pencairan Bagi Hasil (Payout Settlement)
 *    Mencatat log riwayat gajian, mengunci slip, dan mereset hitungan periode berjalan menjadi 0 bersih!
 */
export async function settleFinancePeriodAction(data: {
  periodName: string;
  notes?: string;
}) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak: Khusus Super Admin." };
    }

    const settings = await getOrCreateFinanceSettings();

    // Ambil seluruh transaksi aktif yang belum disettle
    const activeTransactions = await prisma.financeTransaction.findMany({
      where: { isSettled: false },
    });

    if (activeTransactions.length === 0) {
      return {
        success: false,
        message: "Tidak ada transaksi aktif yang perlu dicairkan pada periode ini.",
      };
    }

    // Kalkulasi Angka Bersih
    const totalIncome = activeTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = activeTransactions
      .filter((t) => t.type === "EXPENSE" && t.category === "OPERATIONAL")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalInventory = activeTransactions
      .filter((t) => t.type === "EXPENSE" && t.category === "INVENTORY_ASSET")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalLiability = activeTransactions
      .filter((t) => t.type === "EXPENSE" && t.category === "MONTHLY_LIABILITY")
      .reduce((sum, t) => sum + t.amount, 0);

    const otherExpenses = activeTransactions
      .filter((t) => t.type === "EXPENSE" && t.category === "OTHER")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalAllExpenses = totalExpense + totalInventory + totalLiability + otherExpenses;
    const netProfit = Math.max(0, totalIncome - totalAllExpenses);

    const kasAmount = Math.round((netProfit * settings.kasPercentage) / 100);
    const chikaAmount = Math.round((netProfit * settings.chikaPercentage) / 100);
    const aditAmount = Math.round((netProfit * settings.aditPercentage) / 100);

    const sharesBreakdown = JSON.stringify({
      kas: { name: settings.kasName, percentage: settings.kasPercentage, amount: kasAmount },
      chika: { name: settings.chikaName, percentage: settings.chikaPercentage, amount: chikaAmount },
      adit: { name: settings.aditName, percentage: settings.aditPercentage, amount: aditAmount },
      transactionCount: activeTransactions.length,
    });

    // 1. Buat Record Riwayat Tutup Buku / Pencairan Gaji
    const settlement = await prisma.financeSettlementHistory.create({
      data: {
        periodName: data.periodName.trim(),
        totalIncome,
        totalExpense: totalExpense + otherExpenses,
        totalLiability,
        totalInventory,
        netProfit,
        kasAmount,
        chikaAmount,
        aditAmount,
        sharesBreakdown,
        notes: data.notes?.trim() || null,
        settledByName: session.user.name || "Super Admin",
      },
    });

    // 2. Tandai semua transaksi yang ada sebagai SUDAH DICAIKAN (isSettled: true)
    await prisma.financeTransaction.updateMany({
      where: { isSettled: false },
      data: {
        isSettled: true,
        settlementId: settlement.id,
      },
    });

    // 3. Akumulasikan bagian Kas Cadangan (10%) ke Modal Awal Kas berjalan
    await prisma.financeSetting.update({
      where: { id: "default" },
      data: {
        initialBalance: settings.initialBalance + kasAmount,
      },
    });

    // 4. Catat Log Aktivitas
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "Super Admin",
        userRole: "SUPER_ADMIN",
        action: "UPDATE",
        title: "Pencairan Bagi Hasil & Tutup Buku Kas 💰",
        description: `Super Admin mencairkan periode ${data.periodName}. Laba Bersih: Rp ${netProfit.toLocaleString("id-ID")} (Chika: Rp ${chikaAmount.toLocaleString("id-ID")}, Adit: Rp ${aditAmount.toLocaleString("id-ID")}, Kas Cadangan: Rp ${kasAmount.toLocaleString("id-ID")}).`,
        targetName: data.periodName,
      },
    }).catch(() => {});

    revalidatePath("/super-admin");
    return {
      success: true,
      message: `Tutup buku ${data.periodName} berhasil dicairkan! Hitungan periode baru telah di-reset bersih.`,
      data: settlement,
    };
  } catch (error) {
    console.error("settleFinancePeriodAction error:", error);
    return { success: false, message: "Gagal mencairkan bagi hasil periode." };
  }
}

/**
 * 8. Ambil Riwayat Pencairan / Tutup Buku Lalu
 */
export async function getFinanceSettlementsHistoryAction() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Akses ditolak." };
    }

    const histories = await prisma.financeSettlementHistory.findMany({
      orderBy: { settledAt: "desc" },
    });

    return { success: true, data: histories };
  } catch (error) {
    console.error("getFinanceSettlementsHistoryAction error:", error);
    return { success: false, message: "Gagal memuat riwayat tutup buku.", data: [] };
  }
}

/**
 * 9. Hapus Riwayat Tutup Buku (Khusus Super Admin 1 Master)
 */
export async function deleteFinanceSettlementHistoryAction(settlementId: string) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN" || !session.user.isSuperAdminMaster) {
      return { success: false, message: "Akses ditolak: Hanya Super Admin 1 (Master) yang dapat menghapus arsip tutup buku." };
    }

    // Kembalikan transaksi yang terhubung menjadi un-settled
    await prisma.financeTransaction.updateMany({
      where: { settlementId },
      data: {
        isSettled: false,
        settlementId: null,
      },
    });

    await prisma.financeSettlementHistory.delete({
      where: { id: settlementId },
    });

    revalidatePath("/super-admin");
    return { success: true, message: "Arsip tutup buku berhasil dihapus & transaksi dikembalikan aktif." };
  } catch (error) {
    console.error("deleteFinanceSettlementHistoryAction error:", error);
    return { success: false, message: "Gagal menghapus arsip tutup buku." };
  }
}
