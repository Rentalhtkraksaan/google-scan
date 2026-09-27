"use client";

import { useState } from "react";
import {
  X,
  BookOpen,
  Download,
  FileText,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Crown,
  Tag,
  Zap,
} from "lucide-react";
import { SiteSettingModel } from "@/types/models";

interface ResellerModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteSetting?: SiteSettingModel;
  adminVipOutletsCount?: number;
  adminClaimedRewards?: number;
}

export function ResellerModuleModal({
  isOpen,
  onClose,
  siteSetting,
  adminVipOutletsCount = 0,
  adminClaimedRewards = 0,
}: ResellerModuleModalProps) {
  if (!isOpen) return null;

  const pdfUrl = siteSetting?.resellerModulePdfUrl;
  const moduleTitle = siteSetting?.resellerModuleTitle || "Starter Kit & Modul Resmi Kemitraan Smart QR";
  const discountPerCard = siteSetting?.resellerVipDiscountPerCard || 5000;
  const cardBasePrice = siteSetting?.resellerCardBasePrice || 25000;
  const availableDiscounts = Math.max(0, adminVipOutletsCount - adminClaimedRewards);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Modul & Materi Reseller Resmi</h3>
              <p className="text-xs text-slate-400">Panduan penjualan, SOP closing toko, & hak reward VIP</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Title */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-sky-950/70 border border-indigo-500/30 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold border border-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>LISENSI RESELLER AKTIF</span>
          </div>
          <h4 className="text-base sm:text-lg font-black text-white">{moduleTitle}</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {siteSetting?.resellerModuleDesc ||
              "Gunakan materi ini untuk mempercepat penetrasi ke pemilik toko/kafe di wilayah Anda. Pelajari cara menawarkan ulasan bintang 5 instan dan jadikan setiap outlet sebagai pelanggan VIP."}
          </p>
        </div>

        {/* Status Reward Outlet VIP Anda */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-950 to-indigo-950/20 border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Status Reward Outlet VIP Binaan Anda</span>
            </span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black border border-amber-500/40">
              {availableDiscounts} Kuota Diskon Tersedia
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-1 text-xs">
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">Total Outlet VIP</span>
              <strong className="text-white text-sm">{adminVipOutletsCount} Toko</strong>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">Diskon Terpakai</span>
              <strong className="text-slate-300 text-sm">{adminClaimedRewards} Kartu</strong>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-emerald-400 block font-semibold">Diskon / Kartu</span>
              <strong className="text-emerald-400 text-sm">Rp {discountPerCard.toLocaleString("id-ID")}</strong>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 italic">
            *Setiap kali outlet binaan Anda upgrade ke VIP, Anda mendapat jatah potongan harga Rp {discountPerCard.toLocaleString("id-ID")} untuk 1 kartu saat repeat order jatah kartu ke Super Admin!
          </p>
        </div>

        {/* 3 Modul Cards */}
        <div className="space-y-3">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Materi & Dokumen Panduan:</h5>

          {/* E-Book PDF Modul */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">E-Book SOP & Panduan Jualan (PDF)</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Panduan langkah demi langkah cara closing toko dalam 2 menit</span>
              </div>
            </div>

            {pdfUrl ? (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </a>
            ) : (
              <span className="text-[11px] text-slate-500 italic shrink-0">Tersedia di Dashboard</span>
            )}
          </div>

          {/* Script Closing 2 Menit */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Script Closing 2 Menit ke Pemilik Kafe</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Kata demi kata kalimat pitching ulasan bintang 5 tanpa penolakan</span>
              </div>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20 shrink-0">
              Termasuk di Modul
            </span>
          </div>

          {/* Desain Brosur & Canva */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Materi Brosur & Banner Promosi</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Template siap cetak untuk demo & presentasi langsung</span>
              </div>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20 shrink-0">
              Siap Pakai
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
