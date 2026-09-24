"use client";

import { useState } from "react";
import {
  X,
  Crown,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { updateOutletMembershipExpiryAction } from "@/lib/actions/membership.actions";
import { formatMembershipExpiry, getDefaultSeptember30Expiry, isOutletMemberActive } from "@/lib/membership-utils";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";

interface EditMembershipDateModalProps {
  outlet: {
    id: string;
    name: string;
    isMember?: boolean;
    membershipExpiresAt?: string | Date | null;
  } | null;
  onClose: () => void;
  onSuccess: (updated: { id: string; isMember: boolean; membershipExpiresAt: Date }) => void;
}

export function EditMembershipDateModal({
  outlet,
  onClose,
  onSuccess,
}: EditMembershipDateModalProps) {
  const currentExpiry = outlet?.membershipExpiresAt ? new Date(outlet.membershipExpiresAt) : null;
  const isCurrentlyActive = isOutletMemberActive(outlet);

  // Default date in input (YYYY-MM-DD)
  const initialDateStr = currentExpiry && !isNaN(currentExpiry.getTime())
    ? currentExpiry.toISOString().split("T")[0]
    : "2026-09-30";

  const [dateInput, setDateInput] = useState<string>(initialDateStr);
  const [isActiveStatus, setIsActiveStatus] = useState<boolean>(
    outlet?.isMember !== undefined ? outlet.isMember : true
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!outlet) return null;

  // Preset button handlers
  const handleSetPreset = (preset: "SEPT_30" | "PLUS_7" | "PLUS_30" | "PLUS_90" | "PLUS_365") => {
    let targetDate: Date;
    const baseDate = currentExpiry && currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();

    switch (preset) {
      case "SEPT_30":
        targetDate = getDefaultSeptember30Expiry();
        break;
      case "PLUS_7":
        targetDate = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case "PLUS_30":
        targetDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case "PLUS_90":
        targetDate = new Date(baseDate.getTime() + 90 * 24 * 60 * 60 * 1000);
        break;
      case "PLUS_365":
        targetDate = new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        targetDate = getDefaultSeptember30Expiry();
    }

    // Set to local YYYY-MM-DD
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
    const dd = String(targetDate.getDate()).padStart(2, "0");
    setDateInput(`${yyyy}-${mm}-${dd}`);
    setIsActiveStatus(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateInput) {
      showErrorAlert("Peringatan", "Silakan pilih tanggal kedaluwarsa.");
      return;
    }

    // Combine dateInput with end of day: 23:59:59.999 WIB (+07:00)
    const combinedIso = `${dateInput}T23:59:59.999+07:00`;
    const targetDate = new Date(combinedIso);

    if (isNaN(targetDate.getTime())) {
      showErrorAlert("Error", "Format tanggal tidak valid.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateOutletMembershipExpiryAction(
        outlet.id,
        targetDate,
        isActiveStatus
      );

      if (res.success) {
        showSuccessAlert("Berhasil Disimpan! 📅", res.message, 1800);
        onSuccess({
          id: outlet.id,
          isMember: isActiveStatus && targetDate.getTime() > Date.now(),
          membershipExpiresAt: targetDate,
        });
        onClose();
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal memperbarui masa aktif member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#090d16] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Kelola Masa Aktif Member</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/30">
                  SUPER ADMIN
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs sm:max-w-sm" title={outlet.name}>
                Outlet: <strong className="text-slate-200 font-medium">{outlet.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Current Status Badge Card */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Status Saat Ini:</span>
              <div className="flex items-center gap-2 mt-0.5">
                {isCurrentlyActive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    👑 Member VIP Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    Bukan Member / Kedaluwarsa
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-medium">Masa Berlaku:</span>
              <span className="text-xs font-bold text-slate-200 mt-0.5 block">
                {currentExpiry ? formatMembershipExpiry(currentExpiry) : "Belum Diatur"}
              </span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Pintasan Cepat Masa Aktif:</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSetPreset("SEPT_30")}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all text-center cursor-pointer shadow-sm"
                title="Sesuai kebijakan: seluruh masa aktif member hanya sampai 30 September"
              >
                🎯 30 September 2026
              </button>

              <button
                type="button"
                onClick={() => handleSetPreset("PLUS_7")}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium transition-all text-center cursor-pointer"
              >
                +7 Hari
              </button>

              <button
                type="button"
                onClick={() => handleSetPreset("PLUS_30")}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium transition-all text-center cursor-pointer"
              >
                +30 Hari (1 Bulan)
              </button>

              <button
                type="button"
                onClick={() => handleSetPreset("PLUS_90")}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium transition-all text-center cursor-pointer"
              >
                +90 Hari (3 Bulan)
              </button>

              <button
                type="button"
                onClick={() => handleSetPreset("PLUS_365")}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium transition-all text-center cursor-pointer"
              >
                +1 Tahun (365 Hari)
              </button>
            </div>
          </div>

          {/* Date Picker Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>Pilih Tanggal Kedaluwarsa:</span>
              </span>
              <span className="text-[11px] text-slate-500">Pukul 23:59 WIB</span>
            </label>
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-medium cursor-pointer"
              required
            />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Jika tanggal yang dipilih telah lewat, sistem otomatis menganggap outlet tidak lagi member dan seluruh fitur VIP dinonaktifkan.
            </p>
          </div>

          {/* Status Toggle Switch */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="pr-4">
              <span className="text-xs font-bold text-white block">Status Keanggotaan Member</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {isActiveStatus
                  ? "Member diaktifkan dengan masa berlaku sesuai tanggal di atas."
                  : "Member dinonaktifkan (fitur dering & ulasan terkunci)."}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsActiveStatus(!isActiveStatus)}
              className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                isActiveStatus ? "bg-amber-500" : "bg-slate-800"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                  isActiveStatus ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan Masa Aktif 💾</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
