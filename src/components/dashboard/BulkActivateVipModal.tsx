"use client";

import { useState } from "react";
import {
  X,
  Zap,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { bulkActivateAllMembersAction } from "@/lib/actions/membership.actions";
import { formatMembershipExpiry, getDefaultSeptember30Expiry } from "@/lib/membership-utils";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";

interface BulkActivateVipModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalOutlets: number;
  onSuccess: (expiryDate: Date, count: number) => void;
}

export function BulkActivateVipModal({
  isOpen,
  onClose,
  totalOutlets,
  onSuccess,
}: BulkActivateVipModalProps) {
  // Default to 30 September 2026 or 1 month ahead
  const defaultSept30 = getDefaultSeptember30Expiry();
  const formatInputDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [dateInput, setDateInput] = useState<string>(formatInputDate(defaultSept30));
  const [activePreset, setActivePreset] = useState<string>("SEPT_30");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Preset button handlers
  const handleSetPreset = (preset: "PLUS_30" | "PLUS_90" | "PLUS_180" | "PLUS_365" | "SEPT_30") => {
    setActivePreset(preset);
    const now = new Date();
    let targetDate: Date;

    switch (preset) {
      case "PLUS_30":
        targetDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case "PLUS_90":
        targetDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        break;
      case "PLUS_180":
        targetDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
        break;
      case "PLUS_365":
        targetDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        break;
      case "SEPT_30":
      default:
        targetDate = getDefaultSeptember30Expiry();
        break;
    }

    setDateInput(formatInputDate(targetDate));
  };

  // Compute preview date
  const parsedTargetDate = dateInput ? new Date(`${dateInput}T23:59:59.999+07:00`) : null;
  const isFuture = parsedTargetDate && parsedTargetDate.getTime() > Date.now();
  const daysDiff = parsedTargetDate
    ? Math.max(0, Math.ceil((parsedTargetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateInput) {
      showErrorAlert("Peringatan", "Silakan tentukan tanggal berakhir VIP.");
      return;
    }

    const combinedIso = `${dateInput}T23:59:59.999+07:00`;
    const targetDate = new Date(combinedIso);

    if (isNaN(targetDate.getTime())) {
      showErrorAlert("Error", "Format tanggal tidak valid.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await bulkActivateAllMembersAction(targetDate);
      if (res.success) {
        showSuccessAlert(
          "Luar Biasa! 🎉",
          `Seluruh ${res.count || totalOutlets} outlet kini aktif Member Premium s/d ${formatMembershipExpiry(targetDate)}!`
        );
        onSuccess(targetDate, res.count || totalOutlets);
        onClose();
      } else {
        showErrorAlert("Gagal", res.message || "Gagal mengaktifkan member.");
      }
    } catch (err) {
      console.error("bulkActivateAllMembersAction error:", err);
      showErrorAlert("Error", "Terjadi kesalahan saat memproses aktivasi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Glow Header */}
        <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-transparent p-5 sm:p-6 border-b border-amber-500/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30">
                <Zap className="w-6 h-6 fill-slate-950" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>Aktifkan Semua Member VIP</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    BULK VIP
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Atur tanggal kedaluwarsa serentak untuk seluruh{" "}
                  <strong className="text-amber-400 font-bold">{totalOutlets} outlet</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Pilih Cepat Durasi / Preset Tanggal:</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSetPreset("PLUS_30")}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  activePreset === "PLUS_30"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm"
                    : "bg-slate-850 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white"
                }`}
              >
                +1 Bulan (30 Hari)
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset("PLUS_90")}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  activePreset === "PLUS_90"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm"
                    : "bg-slate-850 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white"
                }`}
              >
                +3 Bulan (90 Hari)
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset("PLUS_180")}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  activePreset === "PLUS_180"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm"
                    : "bg-slate-850 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white"
                }`}
              >
                +6 Bulan (180 Hari)
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset("PLUS_365")}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  activePreset === "PLUS_365"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm"
                    : "bg-slate-850 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white"
                }`}
              >
                +1 Tahun (365 Hari)
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset("SEPT_30")}
                className={`col-span-2 sm:col-span-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  activePreset === "SEPT_30"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm"
                    : "bg-slate-850 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white"
                }`}
              >
                ⭐ 30 September 2026 (Preset Sistem)
              </button>
            </div>
          </div>

          {/* Custom Date Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Atur Bebas Tanggal Berakhir VIP:</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Pukul 23:59:59 WIB
              </span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateInput}
                onChange={(e) => {
                  setDateInput(e.target.value);
                  setActivePreset("CUSTOM");
                }}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-850 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Bisa klik ikon kalender untuk memilih tanggal berapa saja sesuai keinginan Anda.
            </p>
          </div>

          {/* Real-time Preview Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-slate-850 to-slate-900 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Target Kadaluarsa:
              </span>
              <span className="text-amber-400 font-bold">
                {daysDiff > 0 ? `${daysDiff} Hari Lagi` : "Hari Ini"}
              </span>
            </div>
            <div className="text-sm sm:text-base font-black text-white">
              {parsedTargetDate && !isNaN(parsedTargetDate.getTime())
                ? formatMembershipExpiry(parsedTargetDate)
                : "-"}
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed border-t border-slate-700/60 pt-2">
              ⚡ Sebanyak <strong className="text-yellow-300 font-bold">{totalOutlets} outlet</strong> yang terhubung akan langsung aktif status VIP Premium dan semua fitur eksklusif terbuka hingga tanggal tersebut.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !dateInput}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs sm:text-sm font-black shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Memproses Semua Outlet...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-slate-950 text-slate-950" />
                  <span>Aktifkan Semua VIP Sekarang ⚡</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
