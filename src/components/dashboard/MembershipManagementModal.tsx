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
} from "lucide-react";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "@/lib/swal";
import {
  getMembershipRequestsAction,
  approvePaymentProofAction,
  rejectPaymentProofAction,
  updateMembershipSettingsAction,
} from "@/lib/actions/membership.actions";
import { MembershipPaymentItem, SiteSettingModel } from "@/types/models";

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
  const [activeTab, setActiveTab] = useState<"REQUESTS" | "SETTINGS">("REQUESTS");
  const [requests, setRequests] = useState<MembershipPaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  // Form Settings State
  const [price, setPrice] = useState(siteSetting?.membershipPrice || 45000);
  const [bankName, setBankName] = useState(siteSetting?.membershipBankName || "BCA");
  const [accountNumber, setAccountNumber] = useState(siteSetting?.membershipAccountNumber || "0885172288");
  const [accountName, setAccountName] = useState(siteSetting?.membershipAccountName || "Smart QR Review");
  const [notes, setNotes] = useState(siteSetting?.membershipNotes || "Harap transfer tepat sesuai nominal dan lampirkan bukti foto transfer.");
  const [trialNotice, setTrialNotice] = useState(siteSetting?.membershipTrialNotice || "");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await getMembershipRequestsAction();
      if (res.success && res.requests) {
        setRequests(res.requests as unknown as MembershipPaymentItem[]);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const pendingRequests = requests.filter((r) => r.status === "PENDING");

  const handleApprove = async (id: string, outletName: string) => {
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
        if (onRefreshData) onRefreshData();
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal memproses persetujuan.");
    }
  };

  const handleReject = async (id: string, outletName: string) => {
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
        trialNotice.trim() || undefined
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-850 border-b border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Kelola Pembayaran & Harga Member Premium
                </h3>
                {pendingRequests.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs animate-pulse">
                    {pendingRequests.length} Baru
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Verifikasi bukti transfer outlet & tentukan nomor rekening serta tarif membership.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-800 flex items-center gap-2 bg-slate-900 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("REQUESTS")}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "REQUESTS"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Bukti Transfer Masuk ({requests.length})</span>
            {pendingRequests.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("SETTINGS")}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "SETTINGS"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Pengaturan Harga & Rekening</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {activeTab === "REQUESTS" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Daftar pengajuan bukti transfer yang diunggah oleh pemilik outlet.
                </span>
                <button
                  type="button"
                  onClick={fetchRequests}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  <span>Segarkan</span>
                </button>
              </div>

              {requests.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                  <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">Belum Ada Bukti Transfer</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Permintaan bukti transfer yang diunggah outlet akan tampil di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((item) => {
                    const isPending = item.status === "PENDING";
                    const isApproved = item.status === "APPROVED";
                    const isRejected = item.status === "REJECTED";

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
                            <div className="flex items-center gap-2">
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
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Pemilik: {item.senderName || item.outlet?.owner?.fullName || "—"} •{" "}
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
                            <span className="text-slate-400 font-semibold">Catatan: </span>
                            {item.senderNotes}
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedProof(item.proofImageUrl)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-400" />
                            <span>Lihat Foto Struk</span>
                          </button>

                          {isPending && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleReject(item.id, item.outlet?.name || "Outlet")}
                                className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                              >
                                Tolak ❌
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApprove(item.id, item.outlet?.name || "Outlet")}
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

          {activeTab === "SETTINGS" && (
            <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl mx-auto">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                💡 <strong>Informasi Rekening Resmi</strong>: Pengaturan di bawah ini akan otomatis tampil saat pemilik outlet menekan tombol <em>"Tingkatkan ke Member"</em>.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Nominal Biaya Member Premium (Rp) <span className="text-rose-400">*</span>
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-850 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-850 border border-slate-700 text-white text-xs uppercase focus:outline-none focus:border-amber-500"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-850 border border-slate-700 text-white text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-850 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
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
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Pengumuman Promo / Masa Uji Coba (Opsional)
                </label>
                <input
                  type="text"
                  value={trialNotice}
                  onChange={(e) => setTrialNotice(e.target.value)}
                  placeholder="Contoh: Promo Spesial Uji Coba Member 30 Hari Aktif!"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-850 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingSettings ? "Menyimpan..." : "Simpan Pengaturan Rekening & Harga"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

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
