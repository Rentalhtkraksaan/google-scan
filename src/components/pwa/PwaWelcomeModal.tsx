"use client";

import { useState, useEffect } from "react";
import {
  Smartphone,
  Sparkles,
  Zap,
  Bell,
  CheckCircle2,
  X,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { usePwaInstall } from "@/components/pwa/InstallPwaPrompt";

interface PwaWelcomeModalProps {
  ownerName?: string;
  outletName?: string;
}

export function PwaWelcomeModal({
  ownerName = "Mitra",
  outletName = "Outlet",
}: PwaWelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isInstalled, triggerInstall } = usePwaInstall();

  useEffect(() => {
    // Check if running on client
    if (typeof window === "undefined") return;

    // Check if already installed
    if (isInstalled) return;

    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem("pwa_welcome_modal_seen");
    if (isDismissed) return;

    // Trigger shortly after login welcome alert
    const timer = setTimeout(() => {
      setIsOpen(true);
      sessionStorage.setItem("pwa_welcome_modal_seen", "true");
    }, 1200);

    return () => clearTimeout(timer);
  }, [isInstalled]);

  if (!isOpen || isInstalled) return null;

  const handleInstallClick = () => {
    setIsOpen(false);
    triggerInstall();
  };

  const handleDismiss = () => {
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-emerald-500/20 text-center overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Glow ambient background */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-teal-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
          title="Tutup penawaran"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div className="relative z-10 flex flex-col items-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 mb-3 animate-bounce">
            <Smartphone className="w-7 h-7" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>PENAWARAN SPESIAL OUTLET</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Pasang Aplikasi di Layar HP Anda!
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs leading-relaxed">
            Halo <strong className="text-white">{ownerName}</strong>, pasang aplikasi <strong className="text-emerald-400">Smart QR Review</strong> di smartphone Anda sekarang.
          </p>
        </div>

        {/* Advantages List */}
        <div className="relative z-10 space-y-2 text-left text-xs mb-5">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-white block font-semibold text-[11.5px]">Akses Cepat 1-Klik di Beranda</strong>
              <span className="text-[10.5px] text-slate-400">Buka toko tanpa repot ketik alamat web atau login berulang kali.</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-white block font-semibold text-[11.5px]">Notifikasi Realtime di HP</strong>
              <span className="text-[10.5px] text-slate-400">HP berdering saat ada pelanggan memberikan ulasan ulasan baru.</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-white block font-semibold text-[11.5px]">Ringan & 0 MB Download</strong>
              <span className="text-[10.5px] text-slate-400">Teknologi PWA resmi, tidak membebani memori smartphone Anda.</span>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="relative z-10 space-y-2">
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Pasang Aplikasi di HP Sekarang (1-Klik)</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );
}
