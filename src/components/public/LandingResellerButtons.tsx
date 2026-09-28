"use client";

import { useState } from "react";
import { ShoppingCart, Truck, Sparkles, Search } from "lucide-react";
import { PublicResellerRegistrationModal } from "./PublicResellerRegistrationModal";
import { TrackOrderModal } from "./TrackOrderModal";
import { SiteSettingModel } from "@/types/models";

interface LandingResellerButtonsProps {
  siteSetting?: SiteSettingModel;
  variant?: "header" | "hero" | "banner";
}

export function LandingResellerButtons({ siteSetting, variant = "hero" }: LandingResellerButtonsProps) {
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackingInitialQuery, setTrackingInitialQuery] = useState("");

  const handleOpenTrackingFromSuccess = (orderNumber?: string) => {
    if (orderNumber) setTrackingInitialQuery(orderNumber);
    setIsTrackModalOpen(true);
  };

  if (variant === "header") {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTrackModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Lacak status pengiriman pesanan Anda"
          >
            <Truck className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Lacak Pesanan</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRegisterModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/25 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title="Daftar jadi mitra reseller resmi"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Daftar Reseller</span>
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

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setIsRegisterModalOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>Daftar Jadi Reseller (Beli Kartu)</span>
        </button>

        <button
          type="button"
          onClick={() => setIsTrackModalOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-sm sm:text-base rounded-2xl border border-slate-800 transition-all cursor-pointer"
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
