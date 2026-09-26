"use client";

import { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Crown,
  Save,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  AlertCircle,
  Zap,
  Search,
  Calendar,
  DollarSign,
  Plus,
  Check,
  Copy,
  Store,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Edit2,
  ChevronRight,
  Sliders,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "@/lib/swal";
import {
  getMembershipRequestsAction,
  approvePaymentProofAction,
  rejectPaymentProofAction,
  updateMembershipSettingsAction,
  getAllOutletsMembershipAction,
  toggleOutletMembershipAction,
  updateOutletMembershipExpiryAction,
  updateOutletCustomVipPriceAction,
} from "@/lib/actions/membership.actions";
import { formatMembershipExpiry, getMembershipDaysRemaining } from "@/lib/membership-utils";
import { MembershipPaymentItem, SiteSettingModel } from "@/types/models";

interface OutletMembershipRow {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  ownerWa: string;
  isMember: boolean;
  isExpired: boolean;
  daysRemaining: number;
  membershipStartedAt?: Date | string | null;
  membershipExpiresAt?: Date | string | null;
  customVipPrice?: number | null;
  cardsCount: number;
  createdAt: Date | string;
}

interface MembershipManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteSetting?: SiteSettingModel;
  onRefreshData?: () => void;
}

export function MembershipManagementModal({
  isOpen,
  onClose,
  siteSetting,
  onRefreshData,
}: MembershipManagementModalProps) {
  const [activeTab, setActiveTab] = useState<"OUTLETS" | "REQUESTS" | "SETTINGS">("OUTLETS");
  
  // Tab Outlets State
  const [outlets, setOutlets] = useState<OutletMembershipRow[]>([]);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(false);
  const [searchOutlet, setSearchOutlet] = useState("");
  const [outletFilter, setOutletFilter] = useState<"ALL" | "ACTIVE" | "EXPIRING" | "NON_MEMBER">("ALL");

  // Tab Requests State
  const [requests, setRequests] = useState<MembershipPaymentItem[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  // Tab Settings State
  const [price, setPrice] = useState(siteSetting?.membershipPrice || 45000);
  const [trialDurationDays, setTrialDurationDays] = useState(siteSetting?.trialDurationDays ?? 30);
  const [autoVipTrialOnActivation, setAutoVipTrialOnActivation] = useState(siteSetting?.autoVipTrialOnActivation ?? true);
  const [bankName, setBankName] = useState(siteSetting?.membershipBankName || "BCA");
  const [accountNumber, setAccountNumber] = useState(siteSetting?.membershipAccountNumber || "0885172288");
  const [accountName, setAccountName] = useState(siteSetting?.membershipAccountName || "Smart QR Review");
  const [notes, setNotes] = useState(siteSetting?.membershipNotes || "Harap transfer tepat sesuai nominal dan lampirkan bukti foto transfer.");
  const [trialNotice, setTrialNotice] = useState(siteSetting?.membershipTrialNotice || "");
  const [midtransServerKey, setMidtransServerKey] = useState(siteSetting?.midtransServerKey || "");
  const [midtransClientKey, setMidtransClientKey] = useState(siteSetting?.midtransClientKey || "");
  const [midtransIsProduction, setMidtransIsProduction] = useState(siteSetting?.midtransIsProduction || false);
  const [showServerKey, setShowServerKey] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Sub-modal: Atur Harga Khusus Outlet
  const [editingPriceOutlet, setEditingPriceOutlet] = useState<{
    id: string;
    name: string;
    currentPrice: number | null;
  } | null>(null);
  const [inputCustomPrice, setInputCustomPrice] = useState<string>("");
  const [isSavingCustomPrice, setIsSavingCustomPrice] = useState(false);

  // Sub-modal: Custom Expiry Datepicker
  const [editingExpiryOutlet, setEditingExpiryOutlet] = useState<{
    id: string;
    name: string;
    currentExpiry: string | Date | null;
  } | null>(null);
  const [inputExpiryDate, setInputExpiryDate] = useState<string>("");
  const [isSavingExpiry, setIsSavingExpiry] = useState(false);

  const fetchOutlets = async () => {
    setIsLoadingOutlets(true);
    try {
      const res = await getAllOutletsMembershipAction();
      if (res.success && res.outlets) {
        setOutlets(res.outlets as OutletMembershipRow[]);
      }
    } catch (err) {
      console.error("Error fetchOutlets:", err);
    } finally {
      setIsLoadingOutlets(false);
    }
  };

  const fetchRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const res = await getMembershipRequestsAction();
      if (res.success && res.requests) {
        setRequests(res.requests as unknown as MembershipPaymentItem[]);
      }
    } catch (err) {
      console.error("Error fetchRequests:", err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOutlets();
      fetchRequests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const pendingRequests = requests.filter((r) => r.status === "PENDING");

  // Summary Metrics
  const totalOutlets = outlets.length;
  const activeVipCount = outlets.filter((o) => o.isMember && !o.isExpired).length;
  const expiringCount = outlets.filter((o) => o.isMember && o.daysRemaining <= 7 && o.daysRemaining > 0).length;
  const customPriceCount = outlets.filter((o) => o.customVipPrice && o.customVipPrice > 0).length;

  // Filtered Outlets
  const filteredOutlets = outlets.filter((o) => {
    const matchesSearch =
      o.name.toLowerCase().includes(searchOutlet.toLowerCase()) ||
      o.ownerName.toLowerCase().includes(searchOutlet.toLowerCase()) ||
      o.ownerWa.includes(searchOutlet);

    if (!matchesSearch) return false;

    if (outletFilter === "ACTIVE") return o.isMember && !o.isExpired;
    if (outletFilter === "EXPIRING") return o.daysRemaining <= 7;
    if (outletFilter === "NON_MEMBER") return !o.isMember || o.isExpired;
    return true;
  });

  // Handle Quick Toggle VIP
  const handleToggleVip = async (outlet: OutletMembershipRow) => {
    const nextStatus = !outlet.isMember;
    const confirmMsg = nextStatus
      ? `Aktifkan status Member VIP untuk "${outlet.name}"? Masa aktif akan diatur otomatis 30 hari ke depan.`
      : `Nonaktifkan status VIP untuk "${outlet.name}"? Fasilitas dering ulasan & multi-kasir outlet akan dihentikan.`;

    const resConfirm = await showConfirmAlert(
      nextStatus ? "Aktifkan VIP Outlet?" : "Nonaktifkan VIP Outlet?",
      confirmMsg,
      nextStatus ? "Ya, Aktifkan VIP" : "Ya, Nonaktifkan",
      nextStatus ? "#f59e0b" : "#ef4444"
    );

    if (!resConfirm.isConfirmed) return;

    try {
      const res = await toggleOutletMembershipAction(outlet.id, nextStatus);
      if (res.success) {
        showSuccessAlert("Berhasil", res.message);
        fetchOutlets();
        if (onRefreshData) onRefreshData();
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal memperbarui status VIP.");
    }
  };

  // Handle Quick Extension (+1M, +3M, +6M, +1Y)
  const handleExtendDuration = async (outlet: OutletMembershipRow, monthsToAdd: number) => {
    // Hitung tanggal baru dari expiry yang ada (atau dari sekarang jika sudah expired)
    const baseDate = outlet.membershipExpiresAt && new Date(outlet.membershipExpiresAt).getTime() > Date.now()
      ? new Date(outlet.membershipExpiresAt)
      : new Date();

    const newDate = new Date(baseDate);
    newDate.setMonth(newDate.getMonth() + monthsToAdd);

    const label = monthsToAdd === 12 ? "1 Tahun" : `${monthsToAdd} Bulan`;

    const resConfirm = await showConfirmAlert(
      `Perpanjang VIP ${label}?`,
      `Masa aktif "${outlet.name}" akan diperpanjang hingga ${formatMembershipExpiry(newDate)}.`,
      `Ya, Tambah +${label}`,
      "#f59e0b"
    );

    if (!resConfirm.isConfirmed) return;

    try {
      const res = await updateOutletMembershipExpiryAction(outlet.id, newDate, true);
      if (res.success) {
        showSuccessAlert("Berhasil Diperpanjang!", res.message);
        fetchOutlets();
        if (onRefreshData) onRefreshData();
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal memperpanjang masa aktif.");
    }
  };

  // Handle Save Custom Price
  const handleSaveCustomPrice = async () => {
    if (!editingPriceOutlet) return;
    setIsSavingCustomPrice(true);
    try {
      const numericPrice = inputCustomPrice.trim() === "" ? null : Number(inputCustomPrice);
      const res = await updateOutletCustomVipPriceAction(editingPriceOutlet.id, numericPrice);
      if (res.success) {
        showSuccessAlert("Tersimpan!", res.message);
        setEditingPriceOutlet(null);
        fetchOutlets();
        if (onRefreshData) onRefreshData();
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal menyimpan harga khusus.");
    } finally {
      setIsSavingCustomPrice(false);
    }
  };

  // Handle Save Custom Expiry Date
  const handleSaveCustomExpiry = async () => {
    if (!editingExpiryOutlet || !inputExpiryDate) return;
    setIsSavingExpiry(true);
    try {
      const chosenDate = new Date(inputExpiryDate + "T23:59:59.999Z");
      const res = await updateOutletMembershipExpiryAction(editingExpiryOutlet.id, chosenDate, true);
      if (res.success) {
        showSuccessAlert("Tersimpan!", res.message);
        setEditingExpiryOutlet(null);
        fetchOutlets();
        if (onRefreshData) onRefreshData();
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal mengubah tanggal kadaluarsa.");
    } finally {
      setIsSavingExpiry(false);
    }
  };

  // Handle Approve Payment Request (Manual)
  const handleApproveRequest = async (id: string, outletName: string) => {
    const resConfirm = await showConfirmAlert(
      `Setujui Pembayaran ${outletName}?`,
      "Status outlet akan otomatis menjadi Member Premium seketika dan fitur dering suara akan aktif.",
      "Ya, Setujui Sekarang ✅",
      "#10b981"
    );

    if (!resConfirm.isConfirmed) return;

    try {
      const res = await approvePaymentProofAction(id);
      if (res.success) {
        showSuccessAlert("Disetujui!", res.message);
        fetchRequests();
        fetchOutlets();
        if (onRefreshData) onRefreshData();
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal memproses persetujuan.");
    }
  };

  // Handle Reject Payment Request (Manual)
  const handleRejectRequest = async (id: string, outletName: string) => {
    const reason = prompt(`Masukkan alasan penolakan untuk ${outletName}:`, "Bukti transfer tidak valid atau dana belum masuk rekening.");
    if (reason === null) return;

    try {
      const res = await rejectPaymentProofAction(id, reason.trim() || "Bukti transfer tidak valid.");
      if (res.success) {
        showSuccessAlert("Ditolak", res.message);
        fetchRequests();
        if (onRefreshData) onRefreshData();
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal memproses penolakan.");
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await updateMembershipSettingsAction(
        Number(price) || 45000,
        bankName.trim() || "BCA",
        accountNumber.trim(),
        accountName.trim(),
        notes.trim() || undefined,
        trialNotice.trim() || undefined,
        midtransServerKey.trim() || undefined,
        midtransClientKey.trim() || undefined,
        midtransIsProduction,
        Number(trialDurationDays) || 30,
        autoVipTrialOnActivation
      );

      if (res.success) {
        showSuccessAlert("Berhasil Disimpan", res.message);
        if (onRefreshData) onRefreshData();
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal menyimpan pengaturan.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/midtrans`
    : "https://yourdomain.com/api/webhooks/midtrans";

  const handleCopyWebhook = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-850 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Manajemen Member Premium VIP & Midtrans QRIS
                </h3>
                {pendingRequests.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs animate-pulse">
                    {pendingRequests.length} Verifikasi
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Atur status & jangka waktu member, harga khusus per outlet, integrasi QRIS Midtrans, serta masa free trial 1 bulan.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 sm:px-6 pt-2 border-b border-slate-800 flex items-center gap-2 bg-slate-900 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("OUTLETS")}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "OUTLETS"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Daftar Member Outlet ({outlets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("REQUESTS")}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "REQUESTS"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Riwayat Pembayaran & Struk ({requests.length})</span>
            {pendingRequests.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("SETTINGS")}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "SETTINGS"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Tarif Master & Midtrans QRIS</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: DAFTAR MEMBER OUTLET */}
          {activeTab === "OUTLETS" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Metric Cards Top */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-850/80 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-medium">Total Outlet</span>
                  <div className="text-xl sm:text-2xl font-black text-white mt-0.5">{totalOutlets}</div>
                  <span className="text-[10px] text-slate-500">Terdaftar di sistem</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[11px] text-amber-300 block font-medium">VIP Aktif</span>
                  <div className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">{activeVipCount}</div>
                  <span className="text-[10px] text-amber-400/70">Fitur aktif</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[11px] text-rose-300 block font-medium">H-7 / Expired</span>
                  <div className="text-xl sm:text-2xl font-black text-rose-400 mt-0.5">{expiringCount}</div>
                  <span className="text-[10px] text-rose-400/70">Perlu perpanjangan</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20">
                  <span className="text-[11px] text-sky-300 block font-medium">Harga Khusus</span>
                  <div className="text-xl sm:text-2xl font-black text-sky-400 mt-0.5">{customPriceCount}</div>
                  <span className="text-[10px] text-sky-400/70">Custom tarif outlet</span>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-850 p-3 rounded-2xl border border-slate-800">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchOutlet}
                    onChange={(e) => setSearchOutlet(e.target.value)}
                    placeholder="Cari nama outlet, pemilik, atau no. WA..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setOutletFilter("ALL")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      outletFilter === "ALL"
                        ? "bg-slate-700 text-white font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Semua ({outlets.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutletFilter("ACTIVE")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      outletFilter === "ACTIVE"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    VIP Aktif ({activeVipCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutletFilter("EXPIRING")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      outletFilter === "EXPIRING"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    H-7 Habis ({expiringCount})
                  </button>

                  <button
                    type="button"
                    onClick={fetchOutlets}
                    disabled={isLoadingOutlets}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer shrink-0 ml-1"
                    title="Segarkan data outlet"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOutlets ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Outlet List Table */}
              {isLoadingOutlets ? (
                <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Memuat data outlet...</span>
                </div>
              ) : filteredOutlets.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                  <Store className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">Tidak Ada Outlet yang Cocok</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Coba ganti filter atau kata kunci pencarian Anda.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOutlets.map((item) => {
                    const isVip = item.isMember && !item.isExpired;
                    const isExpiring = item.isMember && item.daysRemaining <= 7 && item.daysRemaining > 0;
                    const isExpired = item.isMember && item.isExpired;
                    const effectivePrice = item.customVipPrice && item.customVipPrice > 0 ? item.customVipPrice : price;
                    const isCustomPrice = !!(item.customVipPrice && item.customVipPrice > 0);

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isVip
                            ? "bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900 border-amber-500/30 shadow-md shadow-amber-500/5"
                            : isExpired
                            ? "bg-slate-900 border-rose-500/30"
                            : "bg-slate-900 border-slate-800 opacity-90"
                        }`}
                      >
                        {/* Top Row: Outlet Name & Badges */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                          <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h4 className="font-bold text-white text-sm sm:text-base">
                                {item.name}
                              </h4>

                              {/* Status Badge */}
                              {isVip ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[10px] font-black shadow-sm">
                                  <Crown className="w-3 h-3" />
                                  <span>VIP AKTIF ({item.daysRemaining} hari)</span>
                                </span>
                              ) : isExpired ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-black">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>VIP KEDALUWARSA</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold">
                                  <span>NON-MEMBER</span>
                                </span>
                              )}

                              {/* Custom Price Badge */}
                              {isCustomPrice && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 text-[10px] font-bold">
                                  <DollarSign className="w-2.5 h-2.5" />
                                  <span>Tarif Khusus</span>
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                              <span>Pemilik: <strong className="text-slate-200">{item.ownerName}</strong></span>
                              <span>•</span>
                              <span>WA: <strong className="text-slate-200">{item.ownerWa}</strong></span>
                              {item.ownerWa && item.ownerWa !== "-" && (
                                <a
                                  href={`https://wa.me/${item.ownerWa.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                    `Halo ${item.ownerName} (${item.name}), terkait status keanggotaan VIP Smart Review toko Anda...`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 text-[11px]"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  <span>Hubungi</span>
                                </a>
                              )}
                            </p>
                          </div>

                          {/* VIP Status Toggle Switch */}
                          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleVip(item)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                                item.isMember
                                  ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40"
                              }`}
                            >
                              <Crown className="w-3.5 h-3.5" />
                              <span>{item.isMember ? "Nonaktifkan VIP" : "Aktifkan VIP"}</span>
                            </button>
                          </div>
                        </div>

                        {/* Middle Row: Masa Aktif & Tarif */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 text-xs border-b border-slate-800/80">
                          {/* Masa Aktif Box */}
                          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium">Masa Aktif VIP:</span>
                              <strong className="text-white text-xs">
                                {formatMembershipExpiry(item.membershipExpiresAt)}
                              </strong>
                              {isExpiring && (
                                <span className="block text-[10px] text-amber-400 font-bold mt-0.5">
                                  ⚠️ Segera berakhir dalam {item.daysRemaining} hari!
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingExpiryOutlet({
                                  id: item.id,
                                  name: item.name,
                                  currentExpiry: item.membershipExpiresAt || null,
                                });
                                setInputExpiryDate(
                                  item.membershipExpiresAt
                                    ? new Date(item.membershipExpiresAt).toISOString().split("T")[0]
                                    : new Date().toISOString().split("T")[0]
                                );
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Pilih tanggal kadaluarsa khusus"
                            >
                              <Calendar className="w-3 h-3" />
                              <span>Ubah Tanggal</span>
                            </button>
                          </div>

                          {/* Tarif VIP Box */}
                          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium">Tarif VIP Outlet:</span>
                              <div className="flex items-baseline gap-1.5">
                                <strong className="text-amber-300 text-xs font-black">
                                  Rp {effectivePrice.toLocaleString("id-ID")}/bln
                                </strong>
                                <span className="text-[10px] text-slate-500">
                                  ({isCustomPrice ? "Harga Khusus" : "Harga Master"})
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingPriceOutlet({
                                  id: item.id,
                                  name: item.name,
                                  currentPrice: item.customVipPrice || null,
                                });
                                setInputCustomPrice(item.customVipPrice ? item.customVipPrice.toString() : "");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Ubah tarif VIP khusus untuk outlet ini"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>{isCustomPrice ? "Ubah Khusus" : "Atur Khusus"}</span>
                            </button>
                          </div>
                        </div>

                        {/* Bottom Row: Quick Extension Buttons */}
                        <div className="pt-3 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>Perpanjang Cepat:</span>
                          </span>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleExtendDuration(item, 1)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-amber-300 text-slate-300 text-[11px] font-bold transition-all cursor-pointer border border-slate-700"
                            >
                              +1 Bulan
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExtendDuration(item, 3)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-amber-300 text-slate-300 text-[11px] font-bold transition-all cursor-pointer border border-slate-700"
                            >
                              +3 Bulan
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExtendDuration(item, 6)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-amber-300 text-slate-300 text-[11px] font-bold transition-all cursor-pointer border border-slate-700"
                            >
                              +6 Bulan
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExtendDuration(item, 12)}
                              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 hover:bg-amber-500/30 text-[11px] font-black transition-all cursor-pointer border border-amber-500/30"
                            >
                              +1 Tahun ⭐
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RIWAYAT PEMBAYARAN & STRUK */}
          {activeTab === "REQUESTS" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Daftar seluruh riwayat pembayaran QRIS Midtrans dan pengajuan bukti transfer manual.
                </span>
                <button
                  type="button"
                  onClick={fetchRequests}
                  disabled={isLoadingRequests}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRequests ? "animate-spin" : ""}`} />
                  <span>Segarkan</span>
                </button>
              </div>

              {requests.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                  <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">Belum Ada Riwayat Pembayaran</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Transaksi Midtrans QRIS dan transfer manual akan tercatat otomatis di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((item) => {
                    const isPending = item.status === "PENDING";
                    const isApproved = item.status === "APPROVED";
                    const isQris = item.paymentType === "MIDTRANS_QRIS";

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isPending
                            ? "bg-slate-850/80 border-amber-500/40 shadow-lg shadow-amber-500/5"
                            : "bg-slate-900 border-slate-800 opacity-80"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-sm">
                                {item.outlet?.name || "Outlet"}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  isPending
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : isApproved
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                }`}
                              >
                                {item.status}
                              </span>

                              {isQris && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  MIDTRANS QRIS ⚡
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Pemesan: {item.senderName || item.outlet?.owner?.fullName || "—"} •{" "}
                              {item.outlet?.owner?.whatsappNumber || "Tanpa WA"}
                            </p>
                          </div>

                          <div className="text-left sm:text-right">
                            <span className="text-sm font-black text-amber-400 block">
                              Rp {item.amount.toLocaleString("id-ID")}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(item.createdAt).toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>

                        {item.senderNotes && (
                          <div className="mt-2 text-xs text-slate-300 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 font-semibold">Keterangan: </span>
                            {item.senderNotes}
                            {item.midtransOrderId && (
                              <span className="block font-mono text-[10px] text-slate-500 mt-0.5">
                                Order ID: {item.midtransOrderId}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between gap-2 pt-1">
                          {item.proofImageUrl ? (
                            <button
                              type="button"
                              onClick={() => setSelectedProof(item.proofImageUrl || null)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-sky-400" />
                              <span>Lihat Foto Struk</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">
                              {isQris ? "Otomatis via QRIS (Tanpa Struk Foto)" : "Tanpa lampiran foto"}
                            </span>
                          )}

                          {isPending && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleRejectRequest(item.id, item.outlet?.name || "Outlet")}
                                className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                              >
                                Tolak ❌
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproveRequest(item.id, item.outlet?.name || "Outlet")}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1 transition-all cursor-pointer hover:scale-105 active:scale-95"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Setujui & Aktifkan Member ✅</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PENGATURAN HARGA & MIDTRANS */}
          {activeTab === "SETTINGS" && (
            <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
              {/* Section: Master Price & Trial Duration */}
              <div className="p-5 rounded-2xl bg-slate-850 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold text-white">Tarif Master VIP & Masa Free Trial</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1">
                      Harga Master VIP Global (Rp/Bulan) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                        Rp
                      </span>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Harga default untuk seluruh outlet yang tidak memiliki tarif khusus.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1">
                      Durasi Free Trial Outlet Baru (Hari) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={trialDurationDays}
                        onChange={(e) => setTrialDurationDays(Number(e.target.value))}
                        required
                        min={0}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-amber-500"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
                        Hari
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Default: 30 hari. Outlet baru otomatis aktif VIP selama masa uji coba ini.
                    </span>
                  </div>
                </div>

                {/* Toggle Otomatis Hidup VIP Free saat Pertama Kali Diaktivasi */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">
                        Otomatis Berikan VIP Free ({trialDurationDays} Hari) untuk Outlet Baru
                      </span>
                      {autoVipTrialOnActivation ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          AKTIF
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-700/50 text-slate-400 border border-slate-700">
                          NONAKTIF
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Jika aktif, setiap kartu / outlet yang baru pertama kali diregistrasi langsung otomatis aktif status VIP gratis tanpa harus bayar duluan.
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={autoVipTrialOnActivation}
                      onChange={(e) => setAutoVipTrialOnActivation(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>

              {/* Section: Midtrans QRIS Integration */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-indigo-950/40 via-slate-850 to-slate-850 border border-indigo-500/30 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-sm font-bold text-white">Payment Gateway Midtrans (QRIS Otomatis)</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black">
                    INSTANT CHECKOUT
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
                  ⚡ <strong>QRIS Langsung & Hemat Biaya</strong>: Outlet dapat perpanjang VIP cukup scan QRIS (BCA, Mandiri, GoPay, OVO, Dana, ShopeePay). Fitur VIP aktif seketika tanpa perlu upload struk bukti transfer atau menunggu verifikasi manual!
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center justify-between">
                      <span>Midtrans Server Key</span>
                      <button
                        type="button"
                        onClick={() => setShowServerKey(!showServerKey)}
                        className="text-[10px] text-sky-400 hover:text-sky-300 cursor-pointer"
                      >
                        {showServerKey ? "Sembunyikan" : "Tampilkan"}
                      </button>
                    </label>
                    <input
                      type={showServerKey ? "text" : "password"}
                      value={midtransServerKey}
                      onChange={(e) => setMidtransServerKey(e.target.value)}
                      placeholder="Mid-server-XXXXX / SB-Mid-server-XXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1">
                      Midtrans Client Key
                    </label>
                    <input
                      type="text"
                      value={midtransClientKey}
                      onChange={(e) => setMidtransClientKey(e.target.value)}
                      placeholder="Mid-client-XXXXX / SB-Mid-client-XXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-white block">Mode Midtrans</span>
                    <span className="text-[11px] text-slate-400 block">
                      {midtransIsProduction ? "Mode Produksi (Transaksi Uang Asli QRIS)" : "Mode Sandbox (Pengujian Gratis)"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMidtransIsProduction(false)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        !midtransIsProduction
                          ? "bg-slate-700 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Sandbox
                    </button>
                    <button
                      type="button"
                      onClick={() => setMidtransIsProduction(true)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        midtransIsProduction
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Production (Live)
                    </button>
                  </div>
                </div>

                {/* Webhook URL Helper */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">
                      Midtrans Webhook Notification URL:
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyWebhook}
                      className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                    >
                      {copiedWebhook ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedWebhook ? "Tersalin!" : "Salin URL"}</span>
                    </button>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-300 break-all border border-slate-800">
                    {webhookUrl}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Tempelkan URL ini di <strong>Midtrans Dashboard &gt; Settings &gt; Configuration &gt; Payment Notification URL</strong>.
                  </p>
                </div>
              </div>

              {/* Section: Manual Bank Transfer */}
              <div className="p-5 rounded-2xl bg-slate-850 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <h4 className="text-sm font-bold text-white">Rekening Bank Manual (Opsi Sekunder)</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1">
                      Nama Bank / E-Wallet <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="BCA / Mandiri / BRI / DANA"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs uppercase focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1">
                      Nomor Rekening <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="0885172288"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Atas Nama (a/n) Rekening <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Smart QR Review"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Catatan Transfer untuk Outlet (Instruksi)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingSettings ? "Menyimpan..." : "Simpan Pengaturan Tarif & Midtrans"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Sub-Modal: Atur Harga Khusus VIP Outlet */}
      {editingPriceOutlet && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-white text-sm">
                  Atur Harga Khusus VIP Outlet
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingPriceOutlet(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-300">
                Outlet: <strong className="text-white font-semibold">{editingPriceOutlet.name}</strong>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Harga Master Global saat ini: <strong>Rp {price.toLocaleString("id-ID")}/bulan</strong>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Nominal Harga Khusus (Rp/Bulan)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  Rp
                </span>
                <input
                  type="number"
                  value={inputCustomPrice}
                  onChange={(e) => setInputCustomPrice(e.target.value)}
                  placeholder={`Contoh: 25000`}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-850 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Kosongkan atau hapus jika ingin outlet ini kembali menggunakan Harga Master Global.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPriceOutlet(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSavingCustomPrice}
                onClick={handleSaveCustomPrice}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-black shadow-md hover:from-amber-400 hover:to-yellow-400 transition-all"
              >
                {isSavingCustomPrice ? "Menyimpan..." : "Simpan Harga"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Custom Expiration Datepicker */}
      {editingExpiryOutlet && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-400" />
                <h4 className="font-bold text-white text-sm">
                  Atur Tanggal Kadaluarsa VIP
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingExpiryOutlet(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-300">
                Outlet: <strong className="text-white font-semibold">{editingExpiryOutlet.name}</strong>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Masa aktif saat ini: {formatMembershipExpiry(editingExpiryOutlet.currentExpiry)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Pilih Tanggal Berakhir Baru
              </label>
              <input
                type="date"
                value={inputExpiryDate}
                onChange={(e) => setInputExpiryDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-850 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingExpiryOutlet(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSavingExpiry}
                onClick={handleSaveCustomExpiry}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md transition-all"
              >
                {isSavingExpiry ? "Menyimpan..." : "Simpan Tanggal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal Pratinjau Struk */}
      {selectedProof && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
          <div className="relative max-w-lg w-full bg-slate-900 p-3 rounded-2xl border border-slate-700">
            <button
              onClick={() => setSelectedProof(null)}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-xs font-bold text-white mb-2 px-1">
              Foto Bukti Transfer Pembayaran
            </h4>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedProof}
              alt="Bukti Transfer"
              className="w-full max-h-[75vh] object-contain rounded-xl bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
}
