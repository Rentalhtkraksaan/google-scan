"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  DollarSign,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  PieChart,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  ShoppingBag,
  Building2,
  CreditCard,
  Printer,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  History,
  FileText,
  Camera,
  Globe,
  Loader2,
  MessageCircle,
} from "lucide-react";
import {
  getFinanceDashboardDataAction,
  addFinanceTransactionAction,
  updateFinanceTransactionAction,
  deleteFinanceTransactionAction,
  updateFinanceSettingsAction,
  settleFinancePeriodAction,
  getFinanceSettlementsHistoryAction,
  deleteFinanceSettlementHistoryAction,
} from "@/lib/actions/finance.actions";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "@/lib/swal";

interface FinanceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMaster: boolean;
}

export function FinanceManagerModal({
  isOpen,
  onClose,
  isMaster,
}: FinanceManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "TRANSACTIONS" | "ASSETS" | "SETTINGS" | "HISTORY">("OVERVIEW");
  const [isLoading, setIsLoading] = useState(true);
  const [financeData, setFinanceData] = useState<any>(null);
  const [settlementHistories, setSettlementHistories] = useState<any[]>([]);

  // Filter transaksi
  const [transactionFilter, setTransactionFilter] = useState<string>("ALL");

  // Form Tambah Transaksi
  const [isAddingTx, setIsAddingTx] = useState(false);
  const [txType, setTxType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [txCategory, setTxCategory] = useState<string>("OPERATIONAL");
  const [txTitle, setTxTitle] = useState("");
  const [txAmount, setTxAmount] = useState<number | "">("");
  const [txNotes, setTxNotes] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // Form Edit Settings
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [settlementDay, setSettlementDay] = useState<number>(25);
  const [kasPercentage, setKasPercentage] = useState<number>(10);
  const [chikaPercentage, setChikaPercentage] = useState<number>(40);
  const [aditPercentage, setAditPercentage] = useState<number>(50);
  const [kasName, setKasName] = useState("Kas Usaha (Cadangan)");
  const [chikaName, setChikaName] = useState("Chika");
  const [aditName, setAditName] = useState("Adit");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Form Tutup Buku / Pencairan
  const [isSettling, setIsSettling] = useState(false);
  const [settlementPeriodName, setSettlementPeriodName] = useState("");
  const [settlementNotes, setSettlementNotes] = useState("");
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);

  // Slip Share Copy state
  const [copiedSlipId, setCopiedSlipId] = useState<string | null>(null);

  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    try {
      const res = await getFinanceDashboardDataAction();
      if (res.success && res.data) {
        setFinanceData(res.data);
        const s = res.data.settings;
        setInitialBalance(s.initialBalance || 0);
        setSettlementDay(s.settlementDay || 25);
        setKasPercentage(s.kasPercentage || 10);
        setChikaPercentage(s.chikaPercentage || 40);
        setAditPercentage(s.aditPercentage || 50);
        setKasName(s.kasName || "Kas Usaha (Cadangan)");
        setChikaName(s.chikaName || "Chika");
        setAditName(s.aditName || "Adit");

        // Set default settlement period name (e.g., "Periode s/d 25 Okt 2026")
        const now = new Date();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
        setSettlementPeriodName(`Periode s/d ${s.settlementDay || 25} ${monthNames[now.getMonth()]} ${now.getFullYear()}`);
      }
    } catch (err) {
      console.error("loadData finance error:", err);
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }, []);

  const loadHistories = useCallback(async () => {
    try {
      const res = await getFinanceSettlementsHistoryAction();
      if (res.success && res.data) {
        setSettlementHistories(res.data);
      }
    } catch (err) {
      console.error("loadHistories error:", err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData(true);
      loadHistories();
    }
  }, [isOpen, loadData, loadHistories]);

  if (!isOpen) return null;

  const summary = financeData?.summary || {
    initialBalance: 0,
    totalIncome: 0,
    operationalExpenseTotal: 0,
    inventoryAssetTotal: 0,
    monthlyLiabilityTotal: 0,
    otherExpenseTotal: 0,
    totalExpenses: 0,
    netProfit: 0,
    currentCashBalance: 0,
    shares: {
      kas: { name: "Kas Usaha", percentage: 10, amount: 0 },
      chika: { name: "Chika", percentage: 40, amount: 0 },
      adit: { name: "Adit", percentage: 50, amount: 0 },
    },
    daysUntilPayout: 25,
  };

  const activeTransactions = financeData?.activeTransactions || [];

  // Filtered transactions
  const filteredTransactions = activeTransactions.filter((tx: any) => {
    if (transactionFilter === "ALL") return true;
    if (transactionFilter === "INCOME") return tx.type === "INCOME";
    if (transactionFilter === "EXPENSE") return tx.type === "EXPENSE";
    return tx.category === transactionFilter;
  });

  // Assets list (INVENTORY_ASSET)
  const assetTransactions = activeTransactions.filter((tx: any) => tx.category === "INVENTORY_ASSET");

  // Handler Submit Transaksi Baru
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTitle.trim() || !txAmount || Number(txAmount) <= 0) {
      showErrorAlert("Input Tidak Lengkap", "Silakan isi nama transaksi dan nominal uang.");
      return;
    }

    setIsSubmittingTx(true);
    try {
      const res = await addFinanceTransactionAction({
        type: txType,
        category: txCategory as any,
        title: txTitle.trim(),
        amount: Number(txAmount),
        notes: txNotes.trim() || undefined,
        date: txDate,
      });

      if (res.success) {
        showSuccessAlert("Berhasil Dicatat! 🎉", res.message || "Transaksi telah ditambahkan ke buku kas.");
        setTxTitle("");
        setTxAmount("");
        setTxNotes("");
        setIsAddingTx(false);
        loadData(false);
      } else {
        showErrorAlert("Gagal", res.message || "Terjadi kesalahan.");
      }
    } catch {
      showErrorAlert("Kesalahan Server", "Gagal menyimpan transaksi.");
    } finally {
      setIsSubmittingTx(false);
    }
  };

  // Handler Hapus Transaksi
  const handleDeleteTransaction = async (id: string, title: string) => {
    const result = await showConfirmAlert(
      "Hapus Transaksi Kas?",
      `Transaksi <b>${title}</b> akan dihapus dari buku kas.`,
      "Ya, Hapus",
      "#ef4444"
    );
    if (!result.isConfirmed) return;

    try {
      const res = await deleteFinanceTransactionAction(id);
      if (res.success) {
        showSuccessAlert("Terhapus", "Transaksi kas berhasil dihapus.");
        loadData(false);
      } else {
        showErrorAlert("Gagal", res.message || "Gagal menghapus.");
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal menghapus transaksi.");
    }
  };

  // Handler Simpan Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalPercentage = Number(kasPercentage) + Number(chikaPercentage) + Number(aditPercentage);
    if (totalPercentage !== 100) {
      showErrorAlert("Persentase Tidak Pas 100%", `Total pembagian hasil saat ini ${totalPercentage}%. Harap sesuaikan agar tepat 100%.`);
      return;
    }

    setIsSavingSettings(true);
    try {
      const res = await updateFinanceSettingsAction({
        initialBalance: Number(initialBalance),
        settlementDay: Number(settlementDay),
        kasPercentage: Number(kasPercentage),
        chikaPercentage: Number(chikaPercentage),
        aditPercentage: Number(aditPercentage),
        kasName: kasName.trim(),
        chikaName: chikaName.trim(),
        aditName: aditName.trim(),
      });

      if (res.success) {
        showSuccessAlert("Pengaturan Disimpan! ⚙️", "Konfigurasi modal awal dan pembagian hasil telah diperbarui.");
        loadData(false);
      } else {
        showErrorAlert("Gagal", res.message || "Gagal menyimpan pengaturan.");
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal menyimpan pengaturan.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handler Tutup Buku & Pencairan Bagi Hasil
  const handleSettlePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlementPeriodName.trim()) {
      showErrorAlert("Nama Periode Wajib Diisi", "Contoh: Periode s/d 25 Oktober 2026");
      return;
    }

    const confirm = await showConfirmAlert(
      "Cairkan Gaji & Tutup Buku?",
      `Sistem akan mengunci laba bersih periode ini: <b>Rp ${summary.netProfit.toLocaleString("id-ID")}</b>.<br/><br/>
       • <b>${summary.shares.chika.name} (40%)</b>: Rp ${summary.shares.chika.amount.toLocaleString("id-ID")}<br/>
       • <b>${summary.shares.adit.name} (50%)</b>: Rp ${summary.shares.adit.amount.toLocaleString("id-ID")}<br/>
       • <b>${summary.shares.kas.name} (10%)</b>: Rp ${summary.shares.kas.amount.toLocaleString("id-ID")}<br/><br/>
       Hitungan transaksi berjalan akan <b>otomatis di-reset menjadi 0 bersih</b> untuk menyambut periode baru.`,
      "Ya, Cairkan & Tutup Buku",
      "#10b981"
    );
    if (!confirm.isConfirmed) return;

    setIsSubmittingSettlement(true);
    try {
      const res = await settleFinancePeriodAction({
        periodName: settlementPeriodName.trim(),
        notes: settlementNotes.trim() || undefined,
      });

      if (res.success) {
        showSuccessAlert("Tutup Buku Berhasil! 🎉", res.message || "Bagi hasil telah dicairkan dan hitungan periode di-reset bersih.");
        setIsSettling(false);
        loadData(false);
        loadHistories();
        setActiveTab("HISTORY");
      } else {
        showErrorAlert("Gagal", res.message || "Gagal mencairkan periode.");
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal memproses tutup buku.");
    } finally {
      setIsSubmittingSettlement(false);
    }
  };

  // Helper Salin Slip ke WhatsApp
  const handleCopySlipToWhatsApp = (history: any) => {
    let shares: any = {};
    try {
      shares = JSON.parse(history.sharesBreakdown || "{}");
    } catch {}

    const text = `*💰 SLIP GAJIAN & BAGI HASIL RESMI*
*${history.periodName}*
Tanggal Cair: ${new Date(history.settledAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}

📊 *Ringkasan Finansial:*
• Total Pemasukan: Rp ${history.totalIncome.toLocaleString("id-ID")}
• Belanja Operasional: Rp ${history.totalExpense.toLocaleString("id-ID")}
• Inventaris / Aset: Rp ${history.totalInventory.toLocaleString("id-ID")}
• Tanggungan Bulanan: Rp ${history.totalLiability.toLocaleString("id-ID")}
---------------------------------
*LABA BERSIH: Rp ${history.netProfit.toLocaleString("id-ID")}*

💵 *Pembagian Hasil:*
1. *${shares.chika?.name || "Chika"} (${shares.chika?.percentage || 40}%):* Rp ${history.chikaAmount.toLocaleString("id-ID")}
2. *${shares.adit?.name || "Adit"} (${shares.adit?.percentage || 50}%):* Rp ${history.aditAmount.toLocaleString("id-ID")}
3. *${shares.kas?.name || "Kas Usaha"} (${shares.kas?.percentage || 10}%):* Rp ${history.kasAmount.toLocaleString("id-ID")} (Ditahan Kas)

Dicairkan oleh: ${history.settledByName || "Super Admin"}
Semoga berkah & bisnis semakin melesat! 🚀⭐`;

    navigator.clipboard.writeText(text);
    setCopiedSlipId(history.id);
    setTimeout(() => setCopiedSlipId(null), 2000);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/85 backdrop-blur-md flex items-center justify-center animate-in fade-in"
    >
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[94vh] overflow-y-auto custom-scrollbar flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Finance & Kas Internal</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Rahasia Super Admin
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Pencatatan kas modal, belanja operasional, inventaris bisnis, dan sistem bagi hasil gaji tgl 25
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs Header */}
        <div className="flex items-center gap-1.5 sm:gap-2 pt-3 pb-2 overflow-x-auto no-scrollbar shrink-0 border-b border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab("OVERVIEW")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "OVERVIEW"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                : "bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Overview & Laba Bersih</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("TRANSACTIONS")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "TRANSACTIONS"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                : "bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Buku Kas ({activeTransactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ASSETS")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "ASSETS"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                : "bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            <span>Inventaris & Aset Bisnis ({assetTransactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("SETTINGS")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "SETTINGS"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                : "bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Modal & Persentase Gaji</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("HISTORY");
              loadHistories();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "HISTORY"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                : "bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Tutup Buku</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-4 custom-scrollbar">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Loader2 className="w-8 h-8 mx-auto text-emerald-400 animate-spin" />
              <p className="text-xs">Memuat kalkulasi finansial...</p>
            </div>
          ) : (
            <>
              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 1: OVERVIEW & REAL-TIME PROFIT SHARING BREAKDOWN          */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === "OVERVIEW" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Top Key Metrics Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Saldo Kas Riil Berjalan */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-900 border border-emerald-500/30 space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold uppercase text-[10px] tracking-wider text-emerald-400">
                          Saldo Kas Riil Berjalan
                        </span>
                        <Wallet className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white font-mono">
                        Rp {summary.currentCashBalance.toLocaleString("id-ID")}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Modal Awal (Rp {summary.initialBalance.toLocaleString("id-ID")}) + Pemasukan - Belanja
                      </p>
                    </div>

                    {/* Laba Bersih Periode Ini */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-900 border border-indigo-500/30 space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold uppercase text-[10px] tracking-wider text-indigo-400">
                          Laba Bersih Siap Bagi
                        </span>
                        <TrendingUp className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                        Rp {summary.netProfit.toLocaleString("id-ID")}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Total Pemasukan (Rp {summary.totalIncome.toLocaleString("id-ID")}) - Total Beban (Rp {summary.totalExpenses.toLocaleString("id-ID")})
                      </p>
                    </div>

                    {/* Countdown Gajian Tanggal 25 */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-900 border border-amber-500/30 space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold uppercase text-[10px] tracking-wider text-amber-400">
                          Siklus Gajian (Tgl {summary.settlementDay})
                        </span>
                        <Calendar className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white font-mono">
                        {summary.daysUntilPayout === 0 ? "HARI INI! 🎉" : `${summary.daysUntilPayout} Hari Lagi`}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Pencairan & reset buku kas otomatis setiap tgl {summary.settlementDay}
                      </p>
                    </div>
                  </div>

                  {/* Profit Sharing Live Box (Kas 10%, Chika 40%, Adit 50%) */}
                  <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <PieChart className="w-4 h-4 text-emerald-400" />
                          <span>Estimasi Bagi Hasil Periode Berjalan</span>
                        </h4>
                        <p className="text-xs text-slate-400">
                          Hitungan otomatis dari Laba Bersih (Rp {summary.netProfit.toLocaleString("id-ID")})
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsSettling(true)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Cairkan Gaji & Tutup Buku</span>
                      </button>
                    </div>

                    {/* 3 Shares Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Kas Usaha (10%) */}
                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-semibold">{summary.shares.kas.name}</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-bold text-[10px]">
                            {summary.shares.kas.percentage}%
                          </span>
                        </div>
                        <div className="text-lg font-black text-slate-200 font-mono">
                          Rp {summary.shares.kas.amount.toLocaleString("id-ID")}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Ditahan di saldo kas untuk operasional & modal
                        </p>
                      </div>

                      {/* Chika (40%) */}
                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/30 hover:border-purple-500/50 transition-all space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-purple-300 font-bold">{summary.shares.chika.name}</span>
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold text-[10px]">
                            {summary.shares.chika.percentage}%
                          </span>
                        </div>
                        <div className="text-lg font-black text-purple-200 font-mono">
                          Rp {summary.shares.chika.amount.toLocaleString("id-ID")}
                        </div>
                        <p className="text-[10px] text-purple-400/80">
                          Siap ditransfer saat gajian tgl {summary.settlementDay}
                        </p>
                      </div>

                      {/* Adit (50%) */}
                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-500/50 transition-all space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-emerald-300 font-bold">{summary.shares.adit.name}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px]">
                            {summary.shares.adit.percentage}%
                          </span>
                        </div>
                        <div className="text-lg font-black text-emerald-200 font-mono">
                          Rp {summary.shares.adit.amount.toLocaleString("id-ID")}
                        </div>
                        <p className="text-[10px] text-emerald-400/80">
                          Siap ditransfer saat gajian tgl {summary.settlementDay}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cash Flow Summary Breakdown Table */}
                  <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Rincian Beban & Pemasukan Periode Ini
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingTx(true);
                          setActiveTab("TRANSACTIONS");
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Catat Pengeluaran / Pemasukan</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-0.5">
                        <span className="text-[10px] text-slate-400 block">Total Pemasukan:</span>
                        <span className="font-mono font-bold text-emerald-400 block">
                          Rp {summary.totalIncome.toLocaleString("id-ID")}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-0.5">
                        <span className="text-[10px] text-slate-400 block">Belanja Operasional:</span>
                        <span className="font-mono font-bold text-rose-400 block">
                          Rp {summary.operationalExpenseTotal.toLocaleString("id-ID")}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-0.5">
                        <span className="text-[10px] text-slate-400 block">Inventaris & Aset:</span>
                        <span className="font-mono font-bold text-sky-400 block">
                          Rp {summary.inventoryAssetTotal.toLocaleString("id-ID")}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-0.5">
                        <span className="text-[10px] text-slate-400 block">Tanggungan Bulanan:</span>
                        <span className="font-mono font-bold text-amber-400 block">
                          Rp {summary.monthlyLiabilityTotal.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 2: BUKU KAS & DAFTAR TRANSAKSI                            */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === "TRANSACTIONS" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Action Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Filters */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { id: "ALL", label: "Semua" },
                        { id: "INCOME", label: "Pemasukan" },
                        { id: "OPERATIONAL", label: "Operasional" },
                        { id: "INVENTORY_ASSET", label: "Inventaris / Aset" },
                        { id: "MONTHLY_LIABILITY", label: "Tanggungan Rutin" },
                      ].map((btn) => (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => setTransactionFilter(btn.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            transactionFilter === btn.id
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddingTx(!isAddingTx)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all cursor-pointer self-start sm:self-auto active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingTx ? "Tutup Form" : "Catat Transaksi Baru"}</span>
                    </button>
                  </div>

                  {/* Form Tambah Transaksi */}
                  {isAddingTx && (
                    <form
                      onSubmit={handleAddTransaction}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-indigo-500/40 space-y-3.5 animate-in slide-in-from-top-2 duration-200"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                          Form Catat Transaksi Baru
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsAddingTx(false)}
                          className="p-1 text-slate-400 hover:text-white rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quick Preset Buttons */}
                      <div className="space-y-1.5 pb-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          ⚡ Template Cepat (1-Klik Isi):
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setTxType("EXPENSE");
                              setTxCategory("INVENTORY_ASSET");
                              setTxTitle("Beli Domain Web (1 Tahun)");
                              setTxNotes("Domain resmi bisnis & operasional");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-sky-950/70 hover:bg-sky-900 border border-sky-500/40 text-sky-300 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                          >
                            <Globe className="w-3 h-3" />
                            <span>🌐 Domain Web</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTxType("EXPENSE");
                              setTxCategory("INVENTORY_ASSET");
                              setTxTitle("Beli Kamera & Lensa Inventaris");
                              setTxNotes("Aset kamera konten & promosi");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-sky-950/70 hover:bg-sky-900 border border-sky-500/40 text-sky-300 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                          >
                            <Camera className="w-3 h-3" />
                            <span>📷 Kamera Bisnis</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTxType("EXPENSE");
                              setTxCategory("INVENTORY_ASSET");
                              setTxTitle("Beli Printer Thermal Bluetooth Resi");
                              setTxNotes("Printer cetak label alamat paket");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-sky-950/70 hover:bg-sky-900 border border-sky-500/40 text-sky-300 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                          >
                            <Printer className="w-3 h-3" />
                            <span>🖨️ Printer Resi</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTxType("EXPENSE");
                              setTxCategory("OPERATIONAL");
                              setTxTitle("Bahan Baku Akrilik & Chip NFC");
                              setTxNotes("Belanja stok bahan kartu & standee");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-950/70 hover:bg-amber-900 border border-amber-500/40 text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                          >
                            <Layers className="w-3 h-3" />
                            <span>💳 Bahan Akrilik & NFC</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTxType("EXPENSE");
                              setTxCategory("MONTHLY_LIABILITY");
                              setTxTitle("Langganan Cloud Server & Database Bulanan");
                              setTxNotes("Tanggungan server hosting");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                          >
                            <Building2 className="w-3 h-3" />
                            <span>⚡ Server Hosting</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="text-slate-300 font-semibold block mb-1">Tipe Transaksi *</label>
                          <select
                            value={txType}
                            onChange={(e) => {
                              const val = e.target.value as "INCOME" | "EXPENSE";
                              setTxType(val);
                              if (val === "INCOME") setTxCategory("MANUAL_INCOME");
                              else setTxCategory("OPERATIONAL");
                            }}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                          >
                            <option value="EXPENSE">🔴 Pengeluaran / Belanja</option>
                            <option value="INCOME">🟢 Pemasukan / Omset</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-slate-300 font-semibold block mb-1">Kategori Transaksi *</label>
                          <select
                            value={txCategory}
                            onChange={(e) => setTxCategory(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                          >
                            {txType === "EXPENSE" ? (
                              <>
                                <option value="OPERATIONAL">📦 Belanja Operasional (Akrilik, Stiker, NFC, Packing)</option>
                                <option value="INVENTORY_ASSET">📷 Inventaris / Aset Bisnis (Domain, Kamera, Alat, Meja)</option>
                                <option value="MONTHLY_LIABILITY">⚡ Tanggungan Bulanan (Server, Database, Wifi)</option>
                                <option value="OTHER">Lain-lain</option>
                              </>
                            ) : (
                              <>
                                <option value="MANUAL_INCOME">💰 Pemasukan Penjualan Manual / Offline</option>
                                <option value="ORDER_SALES">🛒 Penjualan Paket Kartu Reseller</option>
                                <option value="OTHER">Pemasukan Lainnya</option>
                              </>
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="text-slate-300 font-semibold block mb-1">Tanggal Transaksi</label>
                          <input
                            type="date"
                            value={txDate}
                            onChange={(e) => setTxDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-slate-300 font-semibold block mb-1">Nama / Keterangan Transaksi *</label>
                          <input
                            type="text"
                            required
                            value={txTitle}
                            onChange={(e) => setTxTitle(e.target.value)}
                            placeholder="Contoh: Beli Domain qr-inaja.com 1 Tahun / Beli Kamera Mirrorless / Cetak Akrilik 50 pcs"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="text-slate-300 font-semibold block mb-1">Nominal (Rp) *</label>
                          <input
                            type="number"
                            required
                            min={1}
                            value={txAmount}
                            onChange={(e) => setTxAmount(e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder="Contoh: 350000"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-slate-400 font-medium block mb-1">Catatan Tambahan (Opsional)</label>
                          <input
                            type="text"
                            value={txNotes}
                            onChange={(e) => setTxNotes(e.target.value)}
                            placeholder="Contoh: Dibeli di Tokopedia / Bukti nota disimpan di drive"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingTx(false)}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingTx}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
                        >
                          {isSubmittingTx ? "Menyimpan..." : "Simpan ke Buku Kas"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Transactions Table / List */}
                  {filteredTransactions.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 space-y-1">
                      <p className="text-sm font-semibold">Belum Ada Transaksi Tercatat</p>
                      <p className="text-xs">Klik tombol &ldquo;Catat Transaksi Baru&rdquo; untuk menambahkan belanja operasional atau inventaris.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTransactions.map((tx: any) => {
                        const isIncome = tx.type === "INCOME";
                        return (
                          <div
                            key={tx.id}
                            className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                                  isIncome
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    : tx.category === "INVENTORY_ASSET"
                                    ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                                    : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                }`}
                              >
                                {isIncome ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-white text-xs sm:text-sm">{tx.title}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                                    {tx.category === "INVENTORY_ASSET"
                                      ? "📷 Inventaris/Aset"
                                      : tx.category === "MONTHLY_LIABILITY"
                                      ? "⚡ Tanggungan Rutin"
                                      : tx.category === "OPERATIONAL"
                                      ? "📦 Operasional"
                                      : tx.category}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                  <span>{new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                                  {tx.notes && <span>• {tx.notes}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 self-end sm:self-center">
                              <span
                                className={`font-mono font-black text-sm sm:text-base ${
                                  isIncome ? "text-emerald-400" : "text-rose-400"
                                }`}
                              >
                                {isIncome ? "+ " : "- "}Rp {tx.amount.toLocaleString("id-ID")}
                              </span>

                              {isMaster && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTransaction(tx.id, tx.title)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Transaksi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 3: INVENTARIS & ASET BISNIS (Domain, Kamera, Alat, dll)   */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === "ASSETS" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/40 via-slate-950 to-indigo-950/40 border border-sky-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Camera className="w-4 h-4 text-sky-400" />
                        <span>Inventaris & Aset Modal Bisnis</span>
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Barang modal berharga yang dibeli untuk menunjang operasional (Domain, Kamera, Tripod, Alat, dsb).
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTxType("EXPENSE");
                          setTxCategory("INVENTORY_ASSET");
                          setIsAddingTx(true);
                          setActiveTab("TRANSACTIONS");
                        }}
                        className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-600/25 transition-all cursor-pointer shrink-0 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Catat Inventaris Baru</span>
                      </button>

                      <div className="px-4 py-1.5 rounded-xl bg-slate-900 border border-sky-500/30 text-right shrink-0">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Total Nilai Aset</span>
                        <span className="font-mono font-black text-sm sm:text-base text-sky-400">
                          Rp {summary.inventoryAssetTotal.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {assetTransactions.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 space-y-3">
                      <Camera className="w-10 h-10 mx-auto text-slate-600" />
                      <p className="text-sm font-semibold text-slate-300">Belum Ada Inventaris Tercatat</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Anda bisa mencatat pembelian domain web, kamera, tripod, atau printer thermal resi sekarang.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setTxType("EXPENSE");
                          setTxCategory("INVENTORY_ASSET");
                          setIsAddingTx(true);
                          setActiveTab("TRANSACTIONS");
                        }}
                        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-sky-600/25 transition-all cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Catat Inventaris (Domain/Kamera/dll)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {assetTransactions.map((asset: any) => (
                        <div
                          key={asset.id}
                          className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-sky-500/40 transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-mono text-[10px] border border-sky-500/20 font-bold">
                              ASET TETAP
                            </span>
                            <span className="text-slate-500 text-[10px]">
                              {new Date(asset.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>

                          <div>
                            <h5 className="font-bold text-white text-sm">{asset.title}</h5>
                            {asset.notes && <p className="text-xs text-slate-400 mt-0.5">{asset.notes}</p>}
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">Harga Perolehan:</span>
                            <span className="font-mono font-extrabold text-sky-400 text-sm">
                              Rp {asset.amount.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 4: PENGATURAN MODAL & PERSENTASE GAJI                     */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === "SETTINGS" && (
                <form
                  onSubmit={handleSaveSettings}
                  className="space-y-4 animate-in fade-in duration-200 max-w-2xl mx-auto p-4 sm:p-6 rounded-3xl bg-slate-950 border border-slate-800"
                >
                  <div className="pb-3 border-b border-slate-800">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-emerald-400" />
                      <span>Pengaturan Modal & Rumus Bagi Hasil</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sesuaikan modal awal kas, tanggal tutup buku (gajian), dan persentase pembagian laba bersih
                    </p>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    {/* Modal Awal Kas */}
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold block">Modal Awal Kas Bisnis (Rp)</label>
                      <input
                        type="number"
                        min={0}
                        value={initialBalance}
                        onChange={(e) => setInitialBalance(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono font-bold outline-none focus:border-emerald-500"
                      />
                      <span className="text-[10px] text-slate-500">
                        Saldo modal dasar yang disetor untuk operasional.
                      </span>
                    </div>

                    {/* Tanggal Gajian */}
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold block">Tanggal Tutup Buku / Gajian Bulanan</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={settlementDay}
                        onChange={(e) => setSettlementDay(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono font-bold outline-none focus:border-emerald-500"
                      />
                      <span className="text-[10px] text-slate-500">
                        Default tanggal <strong>25</strong> setiap bulan.
                      </span>
                    </div>

                    {/* Persentase Bagi Hasil */}
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Skema Persentase Bagi Hasil (Total Wajib 100%)
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Kas 10% */}
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                          <label className="text-slate-300 font-semibold block">1. Kas Usaha (%)</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={kasPercentage}
                            onChange={(e) => setKasPercentage(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold outline-none focus:border-emerald-500"
                          />
                          <input
                            type="text"
                            value={kasName}
                            onChange={(e) => setKasName(e.target.value)}
                            placeholder="Nama Label Kas"
                            className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-400 outline-none"
                          />
                        </div>

                        {/* Chika 40% */}
                        <div className="p-3 rounded-xl bg-slate-900 border border-purple-500/30 space-y-1.5">
                          <label className="text-purple-300 font-semibold block">2. Chika (%)</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={chikaPercentage}
                            onChange={(e) => setChikaPercentage(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold outline-none focus:border-purple-500"
                          />
                          <input
                            type="text"
                            value={chikaName}
                            onChange={(e) => setChikaName(e.target.value)}
                            placeholder="Nama Penerima"
                            className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-400 outline-none"
                          />
                        </div>

                        {/* Adit 50% */}
                        <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-1.5">
                          <label className="text-emerald-300 font-semibold block">3. Adit (%)</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={aditPercentage}
                            onChange={(e) => setAditPercentage(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold outline-none focus:border-emerald-500"
                          />
                          <input
                            type="text"
                            value={aditName}
                            onChange={(e) => setAditName(e.target.value)}
                            placeholder="Nama Penerima"
                            className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-400 outline-none"
                          />
                        </div>
                      </div>

                      {/* Total Check Indicator */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                        <span className="text-slate-400 font-medium">Total Akumulasi Persentase:</span>
                        <span
                          className={`font-mono font-bold ${
                            Number(kasPercentage) + Number(chikaPercentage) + Number(aditPercentage) === 100
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {Number(kasPercentage) + Number(chikaPercentage) + Number(aditPercentage)}%{" "}
                          {Number(kasPercentage) + Number(chikaPercentage) + Number(aditPercentage) === 100 ? "✓ Pas 100%" : "(Harus 100%)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSavingSettings ? "Menyimpan..." : "Simpan Konfigurasi"}
                    </button>
                  </div>
                </form>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 5: RIWAYAT TUTUP BUKU & SLIP GAJIAN LALU                  */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === "HISTORY" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-1">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <History className="w-4 h-4 text-emerald-400" />
                        <span>Arsip Tutup Buku & Slip Pembagian Hasil</span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        Catatan riwayat pencairan periode bulanan yang telah dikunci
                      </p>
                    </div>
                  </div>

                  {settlementHistories.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 space-y-1">
                      <p className="text-sm font-semibold">Belum Ada Riwayat Tutup Buku</p>
                      <p className="text-xs">Ketika Anda menekan tombol &ldquo;Cairkan Gaji & Tutup Buku&rdquo;, arsip periode akan otomatis tersimpan di sini.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {settlementHistories.map((hist) => {
                        let shares: any = {};
                        try {
                          shares = JSON.parse(hist.sharesBreakdown || "{}");
                        } catch {}

                        return (
                          <div
                            key={hist.id}
                            className="p-4 sm:p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                              <div>
                                <span className="font-black text-sm text-white block">{hist.periodName}</span>
                                <span className="text-[10px] text-slate-400">
                                  Dicairkan pada: {new Date(hist.settledAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCopySlipToWhatsApp(hist)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                                >
                                  {copiedSlipId === hist.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                  <span>{copiedSlipId === hist.id ? "Slip Tersalin!" : "Salin Slip WA"}</span>
                                </button>
                              </div>
                            </div>

                            {/* Breakdown Numbers */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                                <span className="text-[10px] text-slate-400 block">Pemasukan:</span>
                                <span className="font-mono font-bold text-white">
                                  Rp {hist.totalIncome.toLocaleString("id-ID")}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                                <span className="text-[10px] text-slate-400 block">Belanja & Beban:</span>
                                <span className="font-mono font-bold text-rose-400">
                                  Rp {(hist.totalExpense + hist.totalLiability + hist.totalInventory).toLocaleString("id-ID")}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                                <span className="text-[10px] text-slate-400 block">Laba Bersih:</span>
                                <span className="font-mono font-black text-emerald-400">
                                  Rp {hist.netProfit.toLocaleString("id-ID")}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                                <span className="text-[10px] text-slate-400 block">Kas Cadangan (10%):</span>
                                <span className="font-mono font-bold text-slate-300">
                                  Rp {hist.kasAmount.toLocaleString("id-ID")}
                                </span>
                              </div>
                            </div>

                            {/* Gaji Chika & Adit */}
                            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-4">
                                <div>
                                  <span className="text-[10px] text-purple-400 font-bold block">
                                    {shares.chika?.name || "Chika"} ({shares.chika?.percentage || 40}%):
                                  </span>
                                  <span className="font-mono font-extrabold text-purple-300 text-sm">
                                    Rp {hist.chikaAmount.toLocaleString("id-ID")}
                                  </span>
                                </div>
                                <div className="h-6 w-px bg-slate-800" />
                                <div>
                                  <span className="text-[10px] text-emerald-400 font-bold block">
                                    {shares.adit?.name || "Adit"} ({shares.adit?.percentage || 50}%):
                                  </span>
                                  <span className="font-mono font-extrabold text-emerald-300 text-sm">
                                    Rp {hist.aditAmount.toLocaleString("id-ID")}
                                  </span>
                                </div>
                              </div>

                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                                ✓ Lunas & Tutup Buku
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── MODAL POPUP: TUTUP BUKU & CAIRKAN GAJI ── */}
        {isSettling && (
          <div className="fixed inset-0 z-60 p-4 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
            <form
              onSubmit={handleSettlePeriod}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Konfirmasi Tutup Buku & Gajian</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsSettling(false)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5 text-xs text-slate-300">
                <span className="text-emerald-300 font-bold block">Laba Bersih yang Akan Dicairkan:</span>
                <span className="text-xl font-black text-white font-mono block">
                  Rp {summary.netProfit.toLocaleString("id-ID")}
                </span>
                <div className="pt-1.5 border-t border-emerald-500/20 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span>{summary.shares.chika.name} (40%):</span>
                    <span className="font-mono font-bold text-purple-300">Rp {summary.shares.chika.amount.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{summary.shares.adit.name} (50%):</span>
                    <span className="font-mono font-bold text-emerald-300">Rp {summary.shares.adit.amount.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{summary.shares.kas.name} (10%):</span>
                    <span className="font-mono font-bold text-slate-300">Rp {summary.shares.kas.amount.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Nama Periode Tutup Buku *</label>
                  <input
                    type="text"
                    required
                    value={settlementPeriodName}
                    onChange={(e) => setSettlementPeriodName(e.target.value)}
                    placeholder="Misal: Periode s/d 25 Oktober 2026"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-medium block mb-1">Catatan Tambahan (Opsional)</label>
                  <input
                    type="text"
                    value={settlementNotes}
                    onChange={(e) => setSettlementNotes(e.target.value)}
                    placeholder="Contoh: Sudah ditransfer via BCA / BNI"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSettling(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSettlement || summary.netProfit <= 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  {isSubmittingSettlement ? "Memproses..." : "Konfirmasi & Cairkan Sekarang"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
