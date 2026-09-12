"use client";

import { useState, useEffect, useTransition } from "react";
import { X, Sparkles, MessageCircle, Globe, Loader2, Save, Info } from "lucide-react";
import { updateSiteSettingAction } from "@/lib/actions/site-setting.actions";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";
import { SiteSettingModel } from "@/types/models";

interface LandingPageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSetting: SiteSettingModel;
}

export function LandingPageSettingsModal({
  isOpen,
  onClose,
  initialSetting,
}: LandingPageSettingsModalProps) {
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const [appVersion, setAppVersion] = useState(initialSetting?.appVersion || "V 1.1.2");
  const [whatsappNumber, setWhatsappNumber] = useState(initialSetting?.whatsappNumber || "6281234567890");
  const [globalFallbackUrl, setGlobalFallbackUrl] = useState(
    initialSetting?.globalFallbackUrl || "http://localhost:3000"
  );
  const [isApplyingMass, setIsApplyingMass] = useState(false);
  const [heroBadge, setHeroBadge] = useState(initialSetting?.heroBadge || "🔥 Solusi Cerdas Ulasan Bintang 5 Google Bisnis");
  const [heroHeadline, setHeroHeadline] = useState(initialSetting?.heroHeadline || "Dapatkan Ratusan Ulasan Bintang 5 Dengan Sekali Tap");
  const [heroSubheadline, setHeroSubheadline] = useState(
    initialSetting?.heroSubheadline ||
      "Ubah setiap pelanggan yang puas menjadi ulasan bintang 5 resmi di Google Maps secara instan menggunakan Kartu Dynamic QR & Smart NFC."
  );
  const [ctaPrimaryText, setCtaPrimaryText] = useState(initialSetting?.ctaPrimaryText || "Pesan Kartu & Konsultasi WhatsApp");
  const [ctaSecondaryText, setCtaSecondaryText] = useState(initialSetting?.ctaSecondaryText || "Coba Scan Demo (c-001)");
  const [ctaSecondaryUrl, setCtaSecondaryUrl] = useState(initialSetting?.ctaSecondaryUrl || "/c/c-001");
  const [step1Title, setStep1Title] = useState(initialSetting?.step1Title || "Letakkan di Meja / Kasir");
  const [step1Desc, setStep1Desc] = useState(
    initialSetting?.step1Desc ||
      "Pasang kartu akrilik atau standee QR pintar di meja makan, resepsionis, atau meja kasir saat pelanggan membayar."
  );
  const [step2Title, setStep2Title] = useState(initialSetting?.step2Title || "Pelanggan Scan / Tap");
  const [step2Desc, setStep2Desc] = useState(
    initialSetting?.step2Desc ||
      "Pelanggan cukup mengarahkan kamera smartphone atau mendekatkan HP tanpa perlu mengetik atau mencari nama outlet di Google Maps."
  );
  const [step3Title, setStep3Title] = useState(initialSetting?.step3Title || "Pop-up Review Langsung Terbuka");
  const [step3Desc, setStep3Desc] = useState(
    initialSetting?.step3Desc ||
      "Halaman rating bintang 5 Google resmi langsung muncul seketika di layar HP pelanggan, siap dikirim dalam 5 detik!"
  );
  const [footerText, setFooterText] = useState(initialSetting?.footerText || "Smart QR Review Platform. Seluruh hak cipta dilindungi.");

  if (!isOpen) return null;

  const handleApplyMassFallback = async () => {
    try {
      setIsApplyingMass(true);
      const { applyGlobalFallbackUrlToAllCardsAction } = await import("@/lib/actions/site-setting.actions");
      const res = await applyGlobalFallbackUrlToAllCardsAction(globalFallbackUrl);
      if (res.success) {
        showSuccessAlert("Berhasil Diterapkan!", res.message, 2000);
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal menerapkan link massal.");
    } finally {
      setIsApplyingMass(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("appVersion", appVersion);
        formData.append("whatsappNumber", whatsappNumber);
        formData.append("globalFallbackUrl", globalFallbackUrl);
        formData.append("heroBadge", heroBadge);
        formData.append("heroHeadline", heroHeadline);
        formData.append("heroSubheadline", heroSubheadline);
        formData.append("ctaPrimaryText", ctaPrimaryText);
        formData.append("ctaSecondaryText", ctaSecondaryText);
        formData.append("ctaSecondaryUrl", ctaSecondaryUrl);
        formData.append("step1Title", step1Title);
        formData.append("step1Desc", step1Desc);
        formData.append("step2Title", step2Title);
        formData.append("step2Desc", step2Desc);
        formData.append("step3Title", step3Title);
        formData.append("step3Desc", step3Desc);
        formData.append("footerText", footerText);

        const res = await updateSiteSettingAction(formData);
        if (res.success) {
          showSuccessAlert("Tersimpan!", res.message, 1800);
          onClose();
        } else {
          showErrorAlert("Gagal Menyimpan", res.message);
        }
      } catch {
        showErrorAlert("Kesalahan", "Terjadi kesalahan koneksi server.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">CMS Pengaturan Versi & Landing Page</h3>
              <p className="text-xs text-slate-400">
                Ubah versi sistem/kartu, nomor WhatsApp, link pengalihan akun nonaktif, dan konten landing page
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body with Scroll */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Section 0: App & Card Version Setting */}
          <div className="bg-slate-950/60 border border-indigo-500/30 rounded-2xl p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Versi Sistem & Label Kartu QR (Pojok Kiri Atas)</span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-mono font-bold border border-indigo-500/20">
                {appVersion}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Teks Versi (Tampil di Dashboard & Pojok Kiri Atas Kartu Cetak)
              </label>
              <input
                type="text"
                required
                value={appVersion}
                onChange={(e) => setAppVersion(e.target.value)}
                placeholder="V 1.1.2"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Mengubah teks versi di sini otomatis memperbarui label versi di pojok kiri atas kartu QR cetak dan badge versi pada dashboard Super Admin.
              </p>
            </div>
          </div>
          {/* Section 1: WhatsApp Contact & Master Fallback Link */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4.5 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              <MessageCircle className="w-4 h-4" />
              <span>Kontak WhatsApp & Link Pengalihan Master Saat Akun Nonaktif</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nomor WhatsApp Admin / Support (Awali dengan 62 atau 08)
              </label>
              <input
                type="text"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="6281234567890"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Seluruh tombol WhatsApp pada Landing Page akan otomatis mengarah ke nomor ini.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <label className="block text-xs font-medium text-amber-300 mb-1">
                Link Pengalihan Master (Global Fallback URL) Saat Akun / Kartu Dimatikan
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={globalFallbackUrl}
                  onChange={(e) => setGlobalFallbackUrl(e.target.value)}
                  placeholder="http://localhost:3000 atau https://wa.me/..."
                  className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleApplyMassFallback}
                  disabled={isApplyingMass}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold shrink-0 cursor-pointer transition-colors"
                  title="Terapkan link ini ke seluruh kartu QR di sistem secara massal"
                >
                  {isApplyingMass ? "Menerapkan..." : "Terapkan ke Semua Kartu (Massal)"}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Ketika Admin Lapangan / Super Admin mematikan kartu atau menonaktifkan akun outlet, pelanggan yang melakukan scan otomatis dialihkan ke link ini.
              </p>
            </div>
          </div>

          {/* Section 2: Hero Banner Text */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4.5 space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Hero & Headline Utama Landing Page</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Badge Atas Hero</label>
              <input
                type="text"
                value={heroBadge}
                onChange={(e) => setHeroBadge(e.target.value)}
                placeholder="🔥 Solusi Cerdas Ulasan Bintang 5 Google Bisnis"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Judul Utama (Headline) <span className="text-rose-400">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={heroHeadline}
                onChange={(e) => setHeroHeadline(e.target.value)}
                placeholder="Dapatkan Ratusan Ulasan Bintang 5 Dengan Sekali Tap"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Subjudul / Deskripsi Utama</label>
              <textarea
                rows={3}
                value={heroSubheadline}
                onChange={(e) => setHeroSubheadline(e.target.value)}
                placeholder="Ubah setiap pelanggan yang puas menjadi ulasan bintang 5 resmi..."
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Teks Tombol WhatsApp Utama</label>
                <input
                  type="text"
                  value={ctaPrimaryText}
                  onChange={(e) => setCtaPrimaryText(e.target.value)}
                  placeholder="Pesan Kartu & Konsultasi WhatsApp"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Teks Tombol Demo</label>
                <input
                  type="text"
                  value={ctaSecondaryText}
                  onChange={(e) => setCtaSecondaryText(e.target.value)}
                  placeholder="Coba Scan Demo (c-001)"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">URL Tombol Demo</label>
              <input
                type="text"
                value={ctaSecondaryUrl}
                onChange={(e) => setCtaSecondaryUrl(e.target.value)}
                placeholder="/c/c-001"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Section 3: 3 Steps How It Works */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4.5 space-y-4">
            <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs uppercase tracking-wider">
              <Info className="w-4 h-4" />
              <span>3 Langkah Cara Kerja</span>
            </div>

            {/* Step 1 */}
            <div className="space-y-2 border-l-2 border-indigo-500 pl-3">
              <span className="text-[11px] font-bold text-indigo-400 uppercase">Langkah 01</span>
              <input
                type="text"
                value={step1Title}
                onChange={(e) => setStep1Title(e.target.value)}
                placeholder="Judul Langkah 1"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <textarea
                rows={2}
                value={step1Desc}
                onChange={(e) => setStep1Desc(e.target.value)}
                placeholder="Deskripsi Langkah 1"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Step 2 */}
            <div className="space-y-2 border-l-2 border-sky-500 pl-3">
              <span className="text-[11px] font-bold text-sky-400 uppercase">Langkah 02</span>
              <input
                type="text"
                value={step2Title}
                onChange={(e) => setStep2Title(e.target.value)}
                placeholder="Judul Langkah 2"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
              />
              <textarea
                rows={2}
                value={step2Desc}
                onChange={(e) => setStep2Desc(e.target.value)}
                placeholder="Deskripsi Langkah 2"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>

            {/* Step 3 */}
            <div className="space-y-2 border-l-2 border-emerald-500 pl-3">
              <span className="text-[11px] font-bold text-emerald-400 uppercase">Langkah 03</span>
              <input
                type="text"
                value={step3Title}
                onChange={(e) => setStep3Title(e.target.value)}
                placeholder="Judul Langkah 3"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <textarea
                rows={2}
                value={step3Desc}
                onChange={(e) => setStep3Desc(e.target.value)}
                placeholder="Deskripsi Langkah 3"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Section 4: Footer */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4.5 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">Teks Copyright Footer</label>
            <input
              type="text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Smart QR Review Platform. Seluruh hak cipta dilindungi."
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Footer Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
