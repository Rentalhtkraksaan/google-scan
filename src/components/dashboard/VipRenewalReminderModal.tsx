"use client";

import { Crown, Clock, AlertTriangle, Sparkles, X, ChevronRight } from "lucide-react";
import { formatMembershipExpiry } from "@/lib/membership-utils";

interface VipRenewalReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  outletName: string;
  daysRemaining: number;
  membershipExpiresAt?: string | Date | null;
  onRenewClick: () => void;
}

export function VipRenewalReminderModal({
  isOpen,
  onClose,
  outletName,
  daysRemaining,
  membershipExpiresAt,
  onRenewClick,
}: VipRenewalReminderModalProps) {
  if (!isOpen) return null;

  const isExpired = daysRemaining <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-amber-500/10 overflow-hidden my-auto">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          title="Tutup Pengingat"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
            {isExpired ? <AlertTriangle className="w-6 h-6" /> : <Crown className="w-6 h-6" />}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-0.5">
              <Clock className="w-3 h-3" />
              {isExpired ? "Status VIP Berakhir" : `Tersisa ${daysRemaining} Hari`}
            </div>
            <h3 className="text-lg font-black text-white tracking-tight">
              {isExpired ? "Masa Aktif VIP Telah Habis" : "Pengingat Perpanjangan VIP"}
            </h3>
          </div>
        </div>

        {/* Message Card */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 mb-5 space-y-2">
          <p className="text-xs text-slate-300 leading-relaxed">
            Masa aktif member VIP toko <strong className="text-white font-semibold">{outletName}</strong>{" "}
            {isExpired ? (
              <span className="text-rose-400 font-bold">telah berakhir</span>
            ) : (
              <>
                akan berakhir pada{" "}
                <strong className="text-amber-300 font-bold">
                  {formatMembershipExpiry(membershipExpiresAt)}
                </strong>{" "}
                (tersisa {daysRemaining} hari lagi).
              </>
            )}
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isExpired
              ? "Fasilitas dering ulasan real-time dan notifikasi HP kasir sedang nonaktif. Perpanjang sekarang agar fasilitas aktif kembali!"
              : "Perpanjang sekarang agar fitur dering lonceng HP kasir dan pengumuman audio tetap aktif tanpa terputus."}
          </p>
        </div>

        {/* Features Checklist */}
        <div className="space-y-2 mb-6 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Dering lonceng ulasan HP kasir instan 24 jam</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Pembayaran instan langsung QRIS (BCA, Mandiri, GoPay, OVO, Dana)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Otomatis aktif seketika tanpa perlu kirim bukti transfer</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => {
              onClose();
              onRenewClick();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Perpanjang VIP Sekarang (QRIS)</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs border border-slate-800 transition-colors cursor-pointer"
          >
            Nanti Saja (Ingatkan Lagi Nanti)
          </button>
        </div>
      </div>
    </div>
  );
}
