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
  KeyRound,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Mail,
  User,
  FileText,
} from "lucide-react";
import {
  getAffiliateAccountsAction,
  updateAffiliateAccountAction,
  payoutAffiliateCommissionAction,
  registerAffiliateAccountAction,
  resetAffiliatePasswordAction,
  deleteAffiliateAccountAction,
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
  hasPassword?: boolean;
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
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Payout modal state
  const [selectedForPayout, setSelectedForPayout] = useState<AffiliateItem | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<string>("");
  const [payoutNotes, setPayoutNotes] = useState<string>("");
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);

  // Quick Reset Password modal state
  const [selectedForPassword, setSelectedForPassword] = useState<AffiliateItem | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Full Edit modal state
  const [selectedForEditFull, setSelectedForEditFull] = useState<AffiliateItem | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editReferralCode, setEditReferralCode] = useState("");
  const [editNewPassword, setEditNewPassword] = useState("");
  const [editFollowers, setEditFollowers] = useState("");
  const [editCommission, setEditCommission] = useState("");
  const [editSocialUrl, setEditSocialUrl] = useState("");
  const [editBankName, setEditBankName] = useState("");
  const [editAccountNumber, setEditAccountNumber] = useState("");
  const [editAccountHolder, setEditAccountHolder] = useState("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "SUSPENDED">("ACTIVE");
  const [editNotes, setEditNotes] = useState("");
  const [isSavingFullEdit, setIsSavingFullEdit] = useState(false);

  // Create new affiliate state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("affiliate123");
  const [newFollowers, setNewFollowers] = useState("");
  const [newCommission, setNewCommission] = useState("");
  const [newSocialUrl, setNewSocialUrl] = useState("");
  const [newCustomCode, setNewCustomCode] = useState("");
  const [newBankName, setNewBankName] = useState("");
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [newAccountHolder, setNewAccountHolder] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [showNewPasswordText, setShowNewPasswordText] = useState(false);
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

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

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

  // Open Full Edit Modal
  const handleOpenEditFull = (aff: AffiliateItem) => {
    setSelectedForEditFull(aff);
    setEditFullName(aff.fullName);
    setEditPhone(aff.phone);
    setEditEmail(aff.email);
    setEditReferralCode(aff.referralCode);
    setEditNewPassword("");
    setEditFollowers(String(aff.followersCount || 0));
    setEditCommission(String(aff.commissionPerPcs || 5000));
    setEditSocialUrl(aff.socialMediaUrl || "");
    setEditBankName(aff.bankName || "");
    setEditAccountNumber(aff.accountNumber || "");
    setEditAccountHolder(aff.accountHolder || "");
    setEditStatus((aff.status as "ACTIVE" | "SUSPENDED") || "ACTIVE");
    setEditNotes(aff.notes || "");
  };

  // Save Full Edit Handler
  const handleSaveFullEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForEditFull) return;

    if (!editFullName.trim() || !editPhone.trim() || !editEmail.trim()) {
      showErrorAlert("Data Wajib", "Nama, Nomor WhatsApp, dan Email wajib diisi.");
      return;
    }

    setIsSavingFullEdit(true);
    try {
      const res = await updateAffiliateAccountAction(selectedForEditFull.id, {
        fullName: editFullName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        referralCode: editReferralCode.trim().toUpperCase(),
        password: editNewPassword.trim() || undefined,
        followersCount: Number(editFollowers) || 0,
        commissionPerPcs: Number(editCommission) || 5000,
        socialMediaUrl: editSocialUrl.trim() || undefined,
        bankName: editBankName.trim() || undefined,
        accountNumber: editAccountNumber.trim() || undefined,
        accountHolder: editAccountHolder.trim() || undefined,
        status: editStatus,
        notes: editNotes.trim() || undefined,
      });

      if (res.success) {
        showSuccessAlert("Berhasil Diperbarui", res.message);
        setSelectedForEditFull(null);
        await loadAffiliates();
      } else {
        showErrorAlert("Gagal Update", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal memperbarui data affiliate.");
    } finally {
      setIsSavingFullEdit(false);
    }
  };

  // Reset Password Handler
  const handleSaveQuickPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForPassword) return;

    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 4) {
      showErrorAlert("Password Terlalu Pendek", "Password minimal 4 karakter.");
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await resetAffiliatePasswordAction(selectedForPassword.id, newPasswordInput.trim());
      if (res.success) {
        showSuccessAlert("Password Diperbarui", res.message);
        setSelectedForPassword(null);
        setNewPasswordInput("");
        await loadAffiliates();
      } else {
        showErrorAlert("Gagal Reset", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal mereset password affiliate.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Delete Affiliate Handler
  const handleDeleteAffiliate = async (aff: AffiliateItem) => {
    const confirmed = await showConfirmAlert(
      `Hapus Affiliate "${aff.fullName}"?`,
      `Akun affiliate dengan kode referral ${aff.referralCode} akan dihapus permanen.`
    );

    if (!confirmed) return;

    try {
      const res = await deleteAffiliateAccountAction(aff.id);
      if (res.success) {
        showSuccessAlert("Berhasil Dihapus", res.message);
        await loadAffiliates();
      } else {
        showErrorAlert("Gagal Hapus", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal menghapus akun affiliate.");
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
        password: newPassword.trim() || "affiliate123",
        followersCount: Number(newFollowers) || 0,
        commissionPerPcs: Number(newCommission) || undefined,
        socialMediaUrl: newSocialUrl.trim() || undefined,
        customReferralCode: newCustomCode.trim() || undefined,
        bankName: newBankName.trim() || undefined,
        accountNumber: newAccountNumber.trim() || undefined,
        accountHolder: newAccountHolder.trim() || undefined,
        notes: newNotes.trim() || undefined,
      });

      if (res.success) {
        showSuccessAlert("Affiliate Terdaftar 🎉", res.message);
        setIsCreateModalOpen(false);
        setNewFullName("");
        setNewPhone("");
        setNewEmail("");
        setNewPassword("affiliate123");
        setNewFollowers("");
        setNewCommission("");
        setNewSocialUrl("");
        setNewCustomCode("");
        setNewBankName("");
        setNewAccountNumber("");
        setNewAccountHolder("");
        setNewNotes("");
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
              <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                <span>Kelola Mitra Affiliate & Komisi</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  Login 1 Pintu
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Atur komisi per pcs, buat akun password login affiliate, pantau omset referral & proses pencairan
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Affiliate</span>
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
                        <div className="flex items-center gap-2 flex-wrap">
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
                        <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-0.5 flex-wrap">
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
                                <span>Medsos</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap">
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                        title="Chat WhatsApp Affiliate"
                      >
                        <Phone className="w-4 h-4" />
                      </a>

                      {/* Tombol Ganti / Reset Password */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedForPassword(aff);
                          setNewPasswordInput("");
                          setShowPasswordText(false);
                        }}
                        className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                        title="Ubah / Reset Password Akun Login Affiliate"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>

                      {/* Tombol Edit Data Lengkap */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditFull(aff)}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                        title="Edit Data Lengkap Affiliate"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Tombol Cairkan Komisi */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedForPayout(aff);
                          setPayoutAmount(String(aff.balance));
                          setPayoutNotes("");
                        }}
                        disabled={aff.balance <= 0}
                        className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-40 text-slate-950 font-black text-xs shadow transition-all cursor-pointer flex items-center gap-1"
                        title="Cairkan Saldo Komisi Affiliate"
                      >
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        <span>Cairkan Komisi</span>
                      </button>

                      {/* Tombol Hapus */}
                      <button
                        type="button"
                        onClick={() => handleDeleteAffiliate(aff)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                        title="Hapus Akun Affiliate"
                      >
                        <Trash2 className="w-4 h-4" />
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
                      <span className="font-bold text-emerald-400 text-xs">
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
                      <span className="text-slate-300 text-xs truncate block" title={`${aff.bankName || ""} ${aff.accountNumber || ""} a.n ${aff.accountHolder || ""}`}>
                        {aff.bankName ? `${aff.bankName} - ${aff.accountNumber}` : "Belum diisi"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL 1: RESET / UBAH PASSWORD AFFILIATE */}
      {selectedForPassword && (
        <div className="fixed inset-0 z-60 p-4 bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <KeyRound className="w-4 h-4" />
                <span>Ubah Password Akun Affiliate</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForPassword(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1 text-xs">
              <span className="text-slate-400 block font-semibold">Akun Mitra Affiliate:</span>
              <span className="text-white font-bold text-sm block">{selectedForPassword.fullName}</span>
              <span className="text-slate-400 block text-[11px]">Email: {selectedForPassword.email} • Kode: {selectedForPassword.referralCode}</span>
            </div>

            <form onSubmit={handleSaveQuickPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password Baru *</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPasswordText ? "text" : "password"}
                    required
                    minLength={4}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Minimal 4 karakter (misal: affiliate123)"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Mitra affiliate akan menggunakan email dan password ini untuk login di halaman <strong>/login</strong>.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedForPassword(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FULL EDIT DATA AFFILIATE */}
      {selectedForEditFull && (
        <div className="fixed inset-0 z-60 p-4 bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Edit2 className="w-4 h-4 text-purple-400" />
                <span>Edit Data Lengkap Affiliate: {selectedForEditFull.fullName}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForEditFull(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFullEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">No. WhatsApp Aktif *</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email Pemilik Akun *</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kode Referral Unik *</label>
                  <input
                    type="text"
                    required
                    value={editReferralCode}
                    onChange={(e) => setEditReferralCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Password Baru (Kosongkan jika tidak ganti)</label>
                  <input
                    type="password"
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    placeholder="Isi untuk ganti password login"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status Akun</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as "ACTIVE" | "SUSPENDED")}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="ACTIVE">AKTIF (Bisa login & dapat komisi)</option>
                    <option value="SUSPENDED">NONAKTIF (Ditangguhkan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jumlah Followers Medsos</label>
                  <input
                    type="number"
                    value={editFollowers}
                    onChange={(e) => setEditFollowers(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tarif Komisi per Pcs (Rp)</label>
                  <input
                    type="number"
                    value={editCommission}
                    onChange={(e) => setEditCommission(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Link Profil Akun Medsos / Portofolio</label>
                  <input
                    type="url"
                    value={editSocialUrl}
                    onChange={(e) => setEditSocialUrl(e.target.value)}
                    placeholder="https://instagram.com/username atau tiktok.com/@username"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nama Bank / E-Wallet</label>
                  <input
                    type="text"
                    value={editBankName}
                    onChange={(e) => setEditBankName(e.target.value)}
                    placeholder="BCA / Mandiri / GoPay / Dana"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nomor Rekening / No. E-Wallet</label>
                  <input
                    type="text"
                    value={editAccountNumber}
                    onChange={(e) => setEditAccountNumber(e.target.value)}
                    placeholder="1234567890"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Atas Nama Rekening</label>
                  <input
                    type="text"
                    value={editAccountHolder}
                    onChange={(e) => setEditAccountHolder(e.target.value)}
                    placeholder="Nama pemilik rekening bank"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Catatan Tambahan (Internal Super Admin)</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Catatan khusus tentang mitra affiliate"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedForEditFull(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingFullEdit}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingFullEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Perubahan Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PENCAIRAN KOMISI (PAYOUT) */}
      {selectedForPayout && (
        <div className="fixed inset-0 z-60 p-4 bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <ArrowDownRight className="w-4 h-4" />
                <span>Proses Pencairan Komisi Affiliate</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForPayout(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Nama Affiliate:</span>
                <span className="text-white font-bold">{selectedForPayout.fullName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Sisa Saldo Komisi:</span>
                <span className="text-amber-400 font-mono font-bold">
                  Rp {selectedForPayout.balance.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Rekening Tujuan:</span>
                <span className="text-slate-200 font-mono">
                  {selectedForPayout.bankName || "-"} {selectedForPayout.accountNumber || "-"} ({selectedForPayout.accountHolder || "-"})
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nominal Pencairan (Rp) *</label>
                <input
                  type="number"
                  max={selectedForPayout.balance}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Nominal transfer"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Catatan / Bukti Transfer (Opsional)</label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="Misal: Transfer BCA jam 14:00"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedForPayout(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmPayout}
                disabled={isProcessingPayout}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isProcessingPayout && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Konfirmasi Pencairan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: TAMBAH AFFILIATE BARU DENGAN PASSWORD */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-60 p-4 bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Pendaftaran Mitra Affiliate Baru (Siap Login)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAffiliate} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nama Lengkap Mitra *</label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Nama Lengkap Affiliate"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">No. WhatsApp Aktif *</label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email Akun Login *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="affiliate@gmail.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Password Login *</label>
                  <div className="relative">
                    <input
                      type={showNewPasswordText ? "text" : "password"}
                      required
                      minLength={4}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Password login akun"
                      className="w-full px-3 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPasswordText(!showNewPasswordText)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showNewPasswordText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jumlah Followers Medsos</label>
                  <input
                    type="number"
                    value={newFollowers}
                    onChange={(e) => setNewFollowers(e.target.value)}
                    placeholder="Contoh: 15000"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tarif Komisi Khusus / Pcs (Opsional)</label>
                  <input
                    type="number"
                    value={newCommission}
                    onChange={(e) => setNewCommission(e.target.value)}
                    placeholder="Kosongkan jika ingin auto tier"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Custom Kode Referral (Opsional)</label>
                  <input
                    type="text"
                    value={newCustomCode}
                    onChange={(e) => setNewCustomCode(e.target.value.toUpperCase())}
                    placeholder="Otomatis jika kosong (misal: NDUT123)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Link Akun Medsos</label>
                  <input
                    type="url"
                    value={newSocialUrl}
                    onChange={(e) => setNewSocialUrl(e.target.value)}
                    placeholder="https://instagram.com/username"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nama Bank / E-Wallet</label>
                  <input
                    type="text"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    placeholder="BCA / BRI / Mandiri / Dana"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">No. Rekening / E-Wallet</label>
                  <input
                    type="text"
                    value={newAccountNumber}
                    onChange={(e) => setNewAccountNumber(e.target.value)}
                    placeholder="1234567890"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Atas Nama Rekening</label>
                  <input
                    type="text"
                    value={newAccountHolder}
                    onChange={(e) => setNewAccountHolder(e.target.value)}
                    placeholder="Nama pemilik rekening bank"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingNew && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Daftarkan & Buat Akun</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
