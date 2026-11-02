"use client";

import { useState } from "react";
import { ShoppingCart, Truck, Sparkles, CheckCircle2 } from "lucide-react";
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

  if (siteSetting?.showRetailOrderButtons === false) {
    return null;
  }

  if (variant === "navbar") {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRetailModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Pesan Kartu</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTrackModalOpen(true)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Truck className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Lacak Pesanan</span>
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
          className="hover:text-indigo-600 font-medium transition-colors cursor-pointer"
        >
          Pesan Kartu Smart QR
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={() => setIsTrackModalOpen(true)}
          className="hover:text-indigo-600 font-medium transition-colors cursor-pointer"
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
          <button
            type="button"
            onClick={() => setIsRetailModalOpen(true)}
            className="flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-4 bg-gradient-to-r from-indigo-600 via-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Pesan Sekarang (Satuan / Grosir)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTrackModalOpen(true)}
            className="sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-4 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 font-bold text-sm rounded-2xl border border-slate-200 hover:border-indigo-200 transition-all cursor-pointer shadow-sm"
          >
            <Truck className="w-4 h-4 text-indigo-600" />
            <span>Lacak Pesanan</span>
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
      <div className="bg-gradient-to-br from-indigo-50 via-white to-sky-50 border border-indigo-100 rounded-3xl p-6 sm:p-10 shadow-xl shadow-indigo-950/5 relative overflow-hidden text-left">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100/80 border border-indigo-200 text-indigo-700 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pesan Langsung & Praktis</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Tingkatkan Ulasan Bintang 5 Outlet Anda Hari Ini
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Pesan kartu QR akrilik meja mulai dari 1 pcs. Pembayaran QRIS instan otomatis, gratis bantu setting link Google Maps toko Anda, dan langsung siap pakai begitu paket tiba.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-semibold text-slate-700">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Bisa Beli 1 Pcs
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Akrilik Tebal Premium
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Gratis Trial VIP 30 Hari
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsRetailModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Pesan Kartu Sekarang</span>
            </button>

            <button
              type="button"
              onClick={() => setIsTrackModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-4 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 font-bold text-xs sm:text-sm rounded-2xl border border-slate-200 transition-all cursor-pointer shadow-xs"
            >
              <Truck className="w-4 h-4 text-indigo-600" />
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
