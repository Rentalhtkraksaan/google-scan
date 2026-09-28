"use client";

import { useState } from "react";
import { ShoppingCart, Truck, Sparkles, Package, ShieldCheck } from "lucide-react";
import { PublicResellerRegistrationModal } from "./PublicResellerRegistrationModal";
import { TrackOrderModal } from "./TrackOrderModal";
import { SiteSettingModel } from "@/types/models";

interface LandingResellerButtonsProps {
  siteSetting?: SiteSettingModel;
  variant?: "section" | "footer-links" | "buttons-only";
}

export function LandingResellerButtons({ siteSetting, variant = "section" }: LandingResellerButtonsProps) {
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackingInitialQuery, setTrackingInitialQuery] = useState("");

  const handleOpenTrackingFromSuccess = (orderNumber?: string) => {
    if (orderNumber) setTrackingInitialQuery(orderNumber);
    setIsTrackModalOpen(true);
  };

  if (variant === "footer-links") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsRegisterModalOpen(true)}
          className="hover:text-emerald-400 transition-colors cursor-pointer"
        >
          Daftar Jadi Reseller
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={() => setIsTrackModalOpen(true)}
          className="hover:text-sky-400 transition-colors cursor-pointer"
        >
          Lacak Pesanan
        </button>

        <PublicResellerRegistrationModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          siteSetting={siteSetting}
          onOpenTracking={handleOpenTrackingFromSuccess}
        />

        <TrackOrderModal
          isOpen={isTrackModalOpen}
          onClose={() => setIsTrackModalOpen(false)}
          initialQuery={trackingInitialQuery}
        />
      </>
    );
  }

  if (variant === "buttons-only") {
    return (
      <>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsRegisterModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Daftar Reseller (Beli Kartu)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTrackModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs sm:text-sm rounded-xl border border-slate-800 transition-all cursor-pointer"
          >
            <Truck className="w-4 h-4 text-sky-400" />
            <span>Lacak Pesanan</span>
          </button>
        </div>

        <PublicResellerRegistrationModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          siteSetting={siteSetting}
          onOpenTracking={handleOpenTrackingFromSuccess}
        />

        <TrackOrderModal
          isOpen={isTrackModalOpen}
          onClose={() => setIsTrackModalOpen(false)}
          initialQuery={trackingInitialQuery}
        />
      </>
    );
  }

  // Default: variant === "section"
  return (
    <>
      <div className="bg-gradient-to-br from-slate-900/90 via-[#0a101d] to-slate-950 border border-slate-800/90 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-left">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Peluang Kemitraan Lapangan</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Tertarik Menjadi Mitra Reseller Smart QR?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Dapatkan paket perdana kartu ulasan Google Review mulai dari 8 pcs dengan harga khusus mitra, dashboard admin lapangan mandiri, dan reward potongan harga per outlet aktif.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Daftar Jadi Reseller</span>
            </button>

            <button
              type="button"
              onClick={() => setIsTrackModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs sm:text-sm rounded-xl border border-slate-700/80 transition-all cursor-pointer shadow-sm"
            >
              <Truck className="w-4 h-4 text-sky-400" />
              <span>Lacak Pesanan</span>
            </button>
          </div>
        </div>
      </div>

      <PublicResellerRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        siteSetting={siteSetting}
        onOpenTracking={handleOpenTrackingFromSuccess}
      />

      <TrackOrderModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        initialQuery={trackingInitialQuery}
      />
    </>
  );
}

