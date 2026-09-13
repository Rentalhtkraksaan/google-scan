"use client";

import { useState, useEffect, useTransition } from "react";
import { X, Sparkles, MessageCircle, Globe, Loader2, Save, Info, Search } from "lucide-react";
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
  const [seoTitle, setSeoTitle] = useState(
    initialSetting?.seoTitle || "Smart QR Review — Akselerasi Ulasan Bintang 5 Google Bisnis"
  );
  const [seoDescription, setSeoDescription] = useState(
    initialSetting?.seoDescription ||
      "Platform SaaS Dynamic QR Code & NFC Card untuk meningkatkan rating dan ulasan Google Review outlet Anda secara otomatis dan instan."
  );
  
  const [dashboardLogoUrl, setDashboardLogoUrl] = useState(initialSetting?.dashboardLogoUrl || "");
  const [dashboardLogoFile, setDashboardLogoFile] = useState<File | null>(null);

  const [landingPageLogoUrl, setLandingPageLogoUrl] = useState(initialSetting?.landingPageLogoUrl || "");
  const [landingPageLogoFile, setLandingPageLogoFile] = useState<File | null>(null);

  const [faviconUrl, setFaviconUrl] = useState(initialSetting?.faviconUrl || "");
  const [faviconFile, setFaviconFile] = useState<File | null>(null);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setUrlSetter: React.Dispatch<React.SetStateAction<string>>,
    setFileSetter: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showErrorAlert("File Terlalu Besar", "Ukuran maksimal logo adalah 2MB.");
      return;
    }

    setFileSetter(file);
    const objectUrl = URL.createObjectURL(file);
    setUrlSetter(objectUrl);
  };

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
        formData.append("seoTitle", seoTitle);
        formData.append("seoDescription", seoDescription);
        
        if (dashboardLogoFile) {
          formData.append("dashboardLogoFile", dashboardLogoFile);
        } else if (dashboardLogoUrl === "") {
          formData.append("dashboardLogoUrl", ""); // User deleted the logo
        }

        if (landingPageLogoFile) {
          formData.append("landingPageLogoFile", landingPageLogoFile);
        } else if (landingPageLogoUrl === "") {
          formData.append("landingPageLogoUrl", ""); // User deleted the logo
        }

        if (faviconFile) {
          formData.append("faviconFile", faviconFile);
        } else if (faviconUrl === "") {
          formData.append("faviconUrl", ""); // User deleted the favicon
        }

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
          {/* Section: Logos */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4.5 space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Pengaturan Logo Sistem</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dashboard Logo */}
              <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-xl space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Logo Dashboard</label>
                  <p className="text-[10px] text-slate-500 mb-2">Menggantikan tulisan &quot;Sistem CRM &amp; Dashboard...&quot;</p>
                </div>

                {dashboardLogoUrl && (
                  <div className="flex justify-center p-2 bg-slate-950 rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={dashboardLogoUrl} alt="Dashboard Logo Preview" className="h-8 object-contain" />
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    id="dashboardLogoInput"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, setDashboardLogoUrl, setDashboardLogoFile)}
                  />
                  <label
                    htmlFor="dashboardLogoInput"
                    className="flex-1 text-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium rounded-lg cursor-pointer transition-colors"
                  >
                    {dashboardLogoUrl ? "Ganti Logo" : "Upload Logo"}
                  </label>
                  {dashboardLogoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setDashboardLogoUrl("");
                        setDashboardLogoFile(null);
                      }}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-medium rounded-lg cursor-pointer transition-colors"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              {/* Landing Page Logo */}
              <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-xl space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Logo Landing Page</label>
                  <p className="text-[10px] text-slate-500 mb-2">Menggantikan ikon bawaan di pojok kiri atas halaman utama.</p>
                </div>

                {landingPageLogoUrl && (
                  <div className="flex justify-center p-2 bg-slate-950 rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={landingPageLogoUrl} alt="Landing Page Logo Preview" className="h-8 object-contain" />
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    id="landingPageLogoInput"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, setLandingPageLogoUrl, setLandingPageLogoFile)}
                  />
                  <label
                    htmlFor="landingPageLogoInput"
                    className="flex-1 text-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium rounded-lg cursor-pointer transition-colors"
                  >
                    {landingPageLogoUrl ? "Ganti Logo" : "Upload Logo"}
                  </label>
                  {landingPageLogoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setLandingPageLogoUrl("");
                        setLandingPageLogoFile(null);
                      }}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-medium rounded-lg cursor-pointer transition-colors"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              {/* Favicon Logo */}
              <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-xl space-y-3 sm:col-span-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Favicon (Ikon Tab Browser)</label>
                  <p className="text-[10px] text-slate-500 mb-2">Ikon kotak untuk tab browser. Harus rasio 1:1.</p>
                </div>

                {faviconUrl && (
                  <div className="flex justify-center p-2 bg-slate-950 rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={faviconUrl} alt="Favicon Preview" className="h-8 w-8 object-cover rounded-md" />
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    id="faviconInput"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, setFaviconUrl, setFaviconFile)}
                  />
                  <label
                    htmlFor="faviconInput"
                    className="flex-1 text-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium rounded-lg cursor-pointer transition-colors"
                  >
                    {faviconUrl ? "Ganti Ikon" : "Upload Ikon"}
                  </label>
                  {faviconUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setFaviconUrl("");
                        setFaviconFile(null);
                      }}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-medium rounded-lg cursor-pointer transition-colors"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section: SEO & Meta Website (Judul & Deskripsi) */}
          <div className="bg-slate-950/60 border border-sky-500/30 rounded-2xl p-4.5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs uppercase tracking-wider">
                <Search className="w-4 h-4 text-sky-400" />
                <span>SEO, Judul Tab Browser &amp; Deskripsi Website</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 font-medium border border-sky-500/20">
                Google &amp; WhatsApp Preview
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  Judul Halaman / SEO Title (Tampil di Tab Browser &amp; Google) <span className="text-rose-400">*</span>
                </label>
                <span className={`text-[10px] font-mono ${seoTitle.length > 70 ? "text-amber-400 font-semibold" : "text-slate-400"}`}>
                  {seoTitle.length}/70 karakter
                </span>
              </div>
              <input
                type="text"
                required
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Smart QR Review — Akselerasi Ulasan Bintang 5 Google Bisnis"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-medium"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Judul utama website yang tampil pada tab browser dan judul tautan di hasil pencarian Google.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  Deskripsi Halaman / SEO Meta Description <span className="text-rose-400">*</span>
                </label>
                <span className={`text-[10px] font-mono ${seoDescription.length > 160 ? "text-amber-400 font-semibold" : "text-slate-400"}`}>
                  {seoDescription.length}/160 karakter
                </span>
              </div>
              <textarea
                required
                rows={3}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Platform SaaS Dynamic QR Code & NFC Card untuk meningkatkan rating dan ulasan Google Review outlet Anda secara otomatis dan instan."
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 resize-none text-xs leading-relaxed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Cuplikan deskripsi yang dibaca Google dan tampil saat link website dibagikan ke WhatsApp atau media sosial.
              </p>
            </div>

            {/* Live Google Search Preview Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>Simulasi Tampilan di Hasil Pencarian Google &amp; WhatsApp:</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/60 font-sans space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <div className="w-3.5 h-3.5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[9px] font-bold">
                    G
                  </div>
                  <span className="truncate text-slate-400 text-[11px]">https://qr-inaja.vercel.app</span>
                </div>
                <div className="text-sm font-semibold text-sky-400 hover:underline cursor-pointer truncate">
                  {seoTitle || "Smart QR Review — Akselerasi Ulasan Bintang 5 Google Bisnis"}
                </div>
                <div className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {seoDescription ||
                    "Platform SaaS Dynamic QR Code & NFC Card untuk meningkatkan rating dan ulasan Google Review outlet Anda secara otomatis dan instan."}
                </div>
              </div>
            </div>
          </div>

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
