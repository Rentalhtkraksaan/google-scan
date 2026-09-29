"use client";

import { useState } from "react";
import { ShoppingCart, Truck, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { RetailOrderModal } from "./RetailOrderModal";
import { TrackOrderModal } from "./TrackOrderModal";
import { SiteSettingModel } from "@/types/models";

interface LandingRetailButtonsProps {
  siteSetting?: SiteSettingModel;
  variant?: "hero" | "section" | "navbar" | "footer-links";
}

export function LandingRetailButtons({ siteSetting, variant = "hero" }: LandingRetailButtonsProps) {
  const [isRetailModalOpen, setIsRetailModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackingInitialQuery, setTrackingInitialQuery] = useState("");

  const handleOpenTrackingFromSuccess = (orderNumber?: string) => {
    if (orderNumber) setTrackingInitialQuery(orderNumber);
    setIsTrackModalOpen(true);
  };

  if (variant === "navbar") {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRetailModalOpen(true)}
            className="px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Pesan Sekarang</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTrackModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Lacak</span>
          </button>
        </div>

        <RetailOrderModal
          isOpen={isRetailModalOpen}
          onClose={() => setIsRetailModalOpen(false)}
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

  if (variant === "footer-links") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsRetailModalOpen(true)}
          className="hover:text-emerald-400 transition-colors cursor-pointer"
        >
          Pesan Kartu Smart QR
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={() => setIsTrackModalOpen(true)}
          className="hover:text-sky-400 transition-colors cursor-pointer"
        >
          Lacak Pesanan
        </button>

        <RetailOrderModal
          isOpen={isRetailModalOpen}
          onClose={() => setIsRetailModalOpen(false)}
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

  if (variant === "hero") {
    return (
      <>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsRetailModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Pesan Sekarang (Bisa Beli 1/Banyak)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTrackModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs sm:text-sm rounded-2xl border border-slate-700/80 transition-all cursor-pointer shadow-md"
          >
            <Truck className="w-4 h-4 text-sky-400" />
            <span>Lacak Status Pesanan</span>
          </button>
        </div>

        <RetailOrderModal
          isOpen={isRetailModalOpen}
          onClose={() => setIsRetailModalOpen(false)}
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

  // variant === "section"
  return (
    <>
      <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-slate-950 border border-indigo-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-left">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pesan Langsung Tanpa Antri</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Tingkatkan Ulasan Bintang 5 Outlet Anda Hari Ini
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Pesan kartu QR akrilik atau standee meja mulai dari 1 pcs. Dukungan QRIS instan otomatis, gratis setting link Google Maps toko, dan pengiriman aman bergaransi.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsRetailModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Pesan Sekarang</span>
            </button>

            <button
              type="button"
              onClick={() => setIsTrackModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs sm:text-sm rounded-xl border border-slate-700/80 transition-all cursor-pointer shadow-sm"
            >
              <Truck className="w-4 h-4 text-sky-400" />
              <span>Lacak Pesanan</span>
            </button>
          </div>
        </div>
      </div>

      <RetailOrderModal
        isOpen={isRetailModalOpen}
        onClose={() => setIsRetailModalOpen(false)}
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
