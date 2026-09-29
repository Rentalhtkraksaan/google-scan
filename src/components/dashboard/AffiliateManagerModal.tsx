"use client";

import { useState, useEffect } from "react";
import {
  X,
  Users,
  Search,
  Sparkles,
  DollarSign,
  TrendingUp,
  CreditCard,
  Edit2,
  CheckCircle2,
  XCircle,
  Plus,
  Loader2,
  ExternalLink,
  Phone,
  Tag,
  Gift,
  Building2,
  AlertCircle,
  ArrowDownRight,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  getAffiliateAccountsAction,
  updateAffiliateAccountAction,
  payoutAffiliateCommissionAction,
  registerAffiliateAccountAction,
} from "@/lib/actions/affiliate.actions";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "@/lib/swal";

interface AffiliateItem {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  referralCode: string;
  socialMediaUrl: string | null;
  followersCount: number;
  commissionPerPcs: number;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  status: string;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  notes: string | null;
  createdAt: Date | string;
  totalOrders?: number;
  totalCards?: number;
  totalSales?: number;
}

interface AffiliateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AffiliateManagerModal({ isOpen, onClose }: AffiliateManagerModalProps) {
  const [affiliates, setAffiliates] = useState<AffiliateItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Payout modal state
  const [selectedForPayout, setSelectedForPayout] = useState<AffiliateItem | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<string>("");
  const [payoutNotes, setPayoutNotes] = useState<string>("");
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);

  // Edit commission modal state
  const [selectedForEdit, setSelectedForEdit] = useState<AffiliateItem | null>(null);
  const [editCommission, setEditCommission] = useState<string>("");
  const [editFollowers, setEditFollowers] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Create new affiliate state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newFollowers, setNewFollowers] = useState("");
  const [newSocialUrl, setNewSocialUrl] = useState("");
  const [newCustomCode, setNewCustomCode] = useState("");
  const [newBankName, setNewBankName] = useState("");
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [newAccountHolder, setNewAccountHolder] = useState("");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  const loadAffiliates = async () => {
    setIsLoading(true);
    try {
      const res = await getAffiliateAccountsAction();
      if (res.success && res.affiliates) {
        setAffiliates(res.affiliates as AffiliateItem[]);
      }
    } catch (err) {
      console.error("Load affiliates error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAffiliates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredAffiliates = affiliates.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      a.fullName.toLowerCase().includes(q) ||
      a.referralCode.toLowerCase().includes(q) ||
      a.phone.includes(q) ||
      a.email.toLowerCase().includes(q)
    );
  });

  const totalBalanceAll = affiliates.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalEarnedAll = affiliates.reduce((sum, a) => sum + (a.totalEarned || 0), 0);
  const totalOrdersAll = affiliates.reduce((sum, a) => sum + (a.totalOrders || 0), 0);
  const totalCardsAll = affiliates.reduce((sum, a) => sum + (a.totalCards || 0), 0);

  // Payout Handler
  const handleConfirmPayout = async () => {
    if (!selectedForPayout) return;
    const amount = Number(payoutAmount);
    if (!amount || amount <= 0) {
      showErrorAlert("Input Tidak Valid", "Masukkan nominal pencairan komisi yang valid.");
      return;
    }

    if (amount > selectedForPayout.balance) {
      showErrorAlert("Saldo Kurang", `Saldo affiliate tidak mencukupi (Saldo: Rp ${selectedForPayout.balance.toLocaleString("id-ID")}).`);
      return;
    }

    setIsProcessingPayout(true);
    try {
      const res = await payoutAffiliateCommissionAction(selectedForPayout.id, amount, payoutNotes);
      if (res.success) {
        showSuccessAlert("Berhasil Dicairkan", res.message);
        setSelectedForPayout(null);
        setPayoutAmount("");
        setPayoutNotes("");
        await loadAffiliates();
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal memproses pencairan komisi.");
    } finally {
      setIsProcessingPayout(false);
    }
  };

  // Edit Handler
  const handleSaveEdit = async () => {
    if (!selectedForEdit) return;
    const comm = Number(editCommission);
    const flw = Number(editFollowers);

    setIsSavingEdit(true);
    try {
      const res = await updateAffiliateAccountAction(selectedForEdit.id, {
        commissionPerPcs: isNaN(comm) ? undefined : comm,
        followersCount: isNaN(flw) ? undefined : flw,
      });

      if (res.success) {
        showSuccessAlert("Berhasil", "Data affiliate berhasil diperbarui.");
        setSelectedForEdit(null);
        await loadAffiliates();
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal memperbarui data affiliate.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Toggle Status Handler
  const handleToggleStatus = async (aff: AffiliateItem) => {
    const nextStatus = aff.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await updateAffiliateAccountAction(aff.id, {
        status: nextStatus,
      });
      if (res.success) {
        setAffiliates((prev) =>
          prev.map((item) => (item.id === aff.id ? { ...item, status: nextStatus } : item))
        );
        showSuccessAlert("Status Diperbarui", `Akun ${aff.fullName} sekarang ${nextStatus === "ACTIVE" ? "Aktif" : "Dinonaktifkan"}.`);
      }
    } catch {
      showErrorAlert("Error", "Gagal mengubah status akun.");
    }
  };

  // Create New Affiliate Handler
  const handleCreateAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newPhone.trim() || !newEmail.trim()) {
      showErrorAlert("Wajib Diisi", "Nama, Nomor WhatsApp, dan Email wajib diisi.");
      return;
    }

    setIsSubmittingNew(true);
    try {
      const res = await registerAffiliateAccountAction({
        fullName: newFullName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        followersCount: Number(newFollowers) || 0,
        socialMediaUrl: newSocialUrl.trim() || undefined,
        customReferralCode: newCustomCode.trim() || undefined,
        bankName: newBankName.trim() || undefined,
        accountNumber: newAccountNumber.trim() || undefined,
        accountHolder: newAccountHolder.trim() || undefined,
      });

      if (res.success) {
        showSuccessAlert("Affiliate Terdaftar", res.message);
        setIsCreateModalOpen(false);
        setNewFullName("");
        setNewPhone("");
        setNewEmail("");
        setNewFollowers("");
        setNewSocialUrl("");
        setNewCustomCode("");
        setNewBankName("");
        setNewAccountNumber("");
        setNewAccountHolder("");
        await loadAffiliates();
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal mendaftarkan affiliate baru.");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 p-2 sm:p-4 bg-black/85 backdrop-blur-md flex items-center justify-center animate-in fade-in"
    >
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                Kelola Mitra Affiliate & Komisi
              </h3>
              <p className="text-xs text-slate-400">
                Atur komisi per pcs berdasarkan followers, pantau omset referral & proses pencairan
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Tambah Affiliate</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 py-4 shrink-0">
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Mitra</span>
            <span className="text-lg font-black text-white font-mono">{affiliates.length} Orang</span>
          </div>

          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Pesanan Referral</span>
            <span className="text-lg font-black text-indigo-400 font-mono">{totalOrdersAll} Order ({totalCardsAll} pcs)</span>
          </div>

          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Sisa Saldo Komisi</span>
            <span className="text-lg font-black text-amber-400 font-mono">Rp {totalBalanceAll.toLocaleString("id-ID")}</span>
          </div>

          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Komisi Keluar</span>
            <span className="text-lg font-black text-emerald-400 font-mono">Rp {totalEarnedAll.toLocaleString("id-ID")}</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama affiliate, kode referral, atau no. WhatsApp..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-purple-500/60 rounded-2xl text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        {/* Affiliates List */}
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="py-12 text-center space-y-2">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Memuat data affiliate & komisi...</p>
            </div>
          ) : filteredAffiliates.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">Belum ada data mitra affiliate yang terdaftar.</p>
            </div>
          ) : (
            filteredAffiliates.map((aff) => {
              const waLink = `https://wa.me/${aff.phone.startsWith("08") ? "62" + aff.phone.slice(1) : aff.phone}`;

              return (
                <div
                  key={aff.id}
                  className="p-4 bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-3 transition-all shadow-sm"
                >
                  {/* Top Bar Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black flex items-center justify-center text-sm shrink-0">
                        {aff.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">{aff.fullName}</h4>
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {aff.referralCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(aff)}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                              aff.status === "ACTIVE"
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {aff.status === "ACTIVE" ? "AKTIF" : "NONAKTIF"}
                          </button>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                          <span>{aff.phone}</span>
                          <span>•</span>
                          <span>{aff.email}</span>
                          {aff.socialMediaUrl && (
                            <>
                              <span>•</span>
                              <a
                                href={aff.socialMediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:underline inline-flex items-center gap-0.5 text-[11px]"
                              >
                                <span>Akun Medsos</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                        title="Chat WhatsApp"
                      >
                        <Phone className="w-4 h-4" />
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedForEdit(aff);
                          setEditCommission(String(aff.commissionPerPcs));
                          setEditFollowers(String(aff.followersCount));
                        }}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                        title="Edit Tarif Komisi / Followers"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedForPayout(aff);
                          setPayoutAmount(String(aff.balance));
                          setPayoutNotes("");
                        }}
                        disabled={aff.balance <= 0}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-40 text-slate-950 font-black text-xs shadow transition-all cursor-pointer flex items-center gap-1"
                      >
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        <span>Cairkan Komisi</span>
                      </button>
                    </div>
                  </div>

                  {/* Metrics & Banking Detail */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Followers Medsos</span>
                      <span className="font-bold text-white text-xs">
                        {aff.followersCount.toLocaleString("id-ID")} Followers
                      </span>
                    </div>

                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Tarif Komisi / Pcs</span>
                      <span className="font-bold text-indigo-400 text-xs">
                        Rp {aff.commissionPerPcs.toLocaleString("id-ID")} / pcs
                      </span>
                    </div>

                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Saldo Belum Dicairkan</span>
                      <span className="font-bold text-amber-400 text-xs font-mono">
                        Rp {aff.balance.toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Rekening Penarikan</span>
                      <span className="font-bold text-slate-300 text-xs truncate block" title={`${aff.bankName || "-"} ${aff.accountNumber || ""}`}>
                        {aff.bankName ? `${aff.bankName} ${aff.accountNumber}` : "Belum diisi"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── EDIT COMMISSION MODAL ── */}
        {selectedForEdit && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="font-extrabold text-sm text-white">Edit Komisi: {selectedForEdit.fullName}</h4>
                <button
                  type="button"
                  onClick={() => setSelectedForEdit(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Jumlah Followers Medsos</label>
                  <input
                    type="number"
                    value={editFollowers}
                    onChange={(e) => setEditFollowers(e.target.value)}
                    placeholder="Contoh: 15000"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Tarif Komisi Per Pcs (Rp)</label>
                  <input
                    type="number"
                    value={editCommission}
                    onChange={(e) => setEditCommission(e.target.value)}
                    placeholder="Contoh: 7500"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Default tier: &lt;10k: 5rb | 10k-50k: 7.5rb | &gt;50k: 10rb
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedForEdit(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
                >
                  {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Simpan</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PAYOUT COMMISSION MODAL ── */}
        {selectedForPayout && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="font-extrabold text-sm text-white">Pencairan Komisi: {selectedForPayout.fullName}</h4>
                <button
                  type="button"
                  onClick={() => setSelectedForPayout(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Sisa Saldo Komisi:</span>
                  <span className="font-mono font-bold text-amber-400">Rp {selectedForPayout.balance.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Rekening Tujuan:</span>
                  <span className="font-semibold text-white">{selectedForPayout.bankName || "Manual"} - {selectedForPayout.accountNumber || "-"} ({selectedForPayout.accountHolder || selectedForPayout.fullName})</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Nominal Dicairkan (Rp) *</label>
                  <input
                    type="number"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Contoh: 100000"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Catatan / Bukti Transfer (Opsional)</label>
                  <input
                    type="text"
                    value={payoutNotes}
                    onChange={(e) => setPayoutNotes(e.target.value)}
                    placeholder="Contoh: Transfer via BCA tgl 29 Sep"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedForPayout(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayout}
                  disabled={isProcessingPayout}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
                >
                  {isProcessingPayout ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                  <span>Proses Cairkan</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CREATE NEW AFFILIATE MODAL ── */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="font-extrabold text-sm text-white">Tambah Mitra Affiliate Baru</h4>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateAffiliate} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="Contoh: Rian Pratama"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">No. WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="Contoh: 08123456789"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Contoh: rian@gmail.com"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Custom Kode Referral (Opsional)</label>
                    <input
                      type="text"
                      value={newCustomCode}
                      onChange={(e) => setNewCustomCode(e.target.value.toUpperCase())}
                      placeholder="Auto jika kosong"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Followers Medsos (TikTok/IG)</label>
                    <input
                      type="number"
                      value={newFollowers}
                      onChange={(e) => setNewFollowers(e.target.value)}
                      placeholder="Contoh: 25000"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Link Profil Medsos</label>
                    <input
                      type="url"
                      value={newSocialUrl}
                      onChange={(e) => setNewSocialUrl(e.target.value)}
                      placeholder="https://tiktok.com/@rian"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Nama Bank (BCA/BNI/Mandiri)</label>
                    <input
                      type="text"
                      value={newBankName}
                      onChange={(e) => setNewBankName(e.target.value)}
                      placeholder="Contoh: BCA"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Nomor Rekening</label>
                    <input
                      type="text"
                      value={newAccountNumber}
                      onChange={(e) => setNewAccountNumber(e.target.value)}
                      placeholder="Contoh: 1234567890"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNew}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
                  >
                    {isSubmittingNew ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Daftarkan Affiliate</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
