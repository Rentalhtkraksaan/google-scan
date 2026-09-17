import Link from "next/link";
import { FadeIn } from "@/components/ui/FadeIn";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedSiteSetting } from "@/lib/site-settings-cache";
import { after } from "next/server";
import { getActivePromosAction } from "@/lib/actions/promo.actions";
import { getProductPhotosAction } from "@/lib/actions/product-photo.actions";
import {
  QrCode,
  Sparkles,
  Star,
  Zap,
  TrendingUp,
  ShieldCheck,
  Smartphone,
  Layers,
  MessageCircle,
  LayoutDashboard,
} from "lucide-react";

import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  let title = "Smart QR Review — Akselerasi Ulasan Bintang 5 Google Bisnis";
  let description =
    "Platform SaaS Dynamic QR Code & NFC Card untuk meningkatkan rating dan ulasan Google Review outlet Anda secara otomatis dan instan.";
  let faviconUrl = "/favicon.ico";

  try {
    // Pakai cached fetch — tidak hit DB jika cache masih valid
    const siteSetting = await getCachedSiteSetting();

    if (siteSetting?.seoTitle?.trim()) {
      title = siteSetting.seoTitle.trim();
    }
    if (siteSetting?.seoDescription?.trim()) {
      description = siteSetting.seoDescription.trim();
    }
    if (siteSetting?.faviconUrl) {
      faviconUrl = siteSetting.faviconUrl;
    }
  } catch (error) {
    console.error("Gagal memuat metadata landing page:", error);
  }

  return {
    title: {
      absolute: title,
    },
    description,
    icons: {
      icon: faviconUrl,
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: "/api/og",
          width: 800,
          height: 800,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function LandingPage() {
  // Parallelkan auth check + fetch siteSetting + promo + foto dari cache/DB
  const [session, siteSetting, activePromos, productPhotos] = await Promise.all([
    auth(),
    getCachedSiteSetting(),
    getActivePromosAction(),
    getProductPhotosAction(),
  ]);

  // Visitor tracking dijalankan SETELAH response dikirim ke browser
  // agar tidak memblokir render halaman (non-blocking)
  after(async () => {
    try {
      await prisma.siteSetting.update({
        where: { id: "default" },
        data: { visitorCount: { increment: 1 } },
      });
    } catch (e) {
      console.error("Gagal increment visitor count:", e);
    }

    try {
      // Gunakan tanggal lokal Indonesia (WIB) untuk pencatatan harian
      const dateOpts = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' } as const;
      const parts = new Intl.DateTimeFormat('en-CA', dateOpts).formatToParts(new Date());
      const year = parts.find(p => p.type === 'year')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const today = `${year}-${month}-${day}`;

      await prisma.dailyVisitor.upsert({
        where: { date: today },
        update: { visits: { increment: 1 } },
        create: { date: today, visits: 1 },
      });
    } catch (e) {
      console.error("Gagal mencatat kunjungan harian:", e);
    }
  });

  const whatsappNumber = siteSetting?.whatsappNumber || "6281234567890";
  const heroBadge = siteSetting?.heroBadge || "🔥 Solusi Cerdas Ulasan Bintang 5 Google Bisnis";
  const heroHeadline = siteSetting?.heroHeadline || "Dapatkan Ratusan Ulasan Bintang 5 Dengan Sekali Tap";
  const heroSubheadline =
    siteSetting?.heroSubheadline ||
    "Ubah setiap pelanggan yang puas menjadi ulasan bintang 5 resmi di Google Maps secara instan menggunakan Kartu Dynamic QR & Smart NFC.";
  const ctaPrimaryText = siteSetting?.ctaPrimaryText || "Pesan Kartu & Konsultasi WhatsApp";
  const ctaSecondaryText = siteSetting?.ctaSecondaryText || "Coba Scan Demo (c-001)";
  const ctaSecondaryUrl = siteSetting?.ctaSecondaryUrl || "/c/c-001";
  const step1Title = siteSetting?.step1Title || "Letakkan di Meja / Kasir";
  const step1Desc =
    siteSetting?.step1Desc ||
    "Pasang kartu akrilik atau standee QR pintar di meja makan, resepsionis, atau meja kasir saat pelanggan membayar.";
  const step2Title = siteSetting?.step2Title || "Pelanggan Scan / Tap";
  const step2Desc =
    siteSetting?.step2Desc ||
    "Pelanggan cukup mengarahkan kamera smartphone atau mendekatkan HP tanpa perlu mengetik atau mencari nama outlet di Google Maps.";
  const step3Title = siteSetting?.step3Title || "Pop-up Review Langsung Terbuka";
  const step3Desc =
    siteSetting?.step3Desc ||
    "Halaman rating bintang 5 Google resmi langsung muncul seketika di layar HP pelanggan, siap dikirim dalam 5 detik!";
  const footerText = siteSetting?.footerText || "Smart QR Review Platform. Seluruh hak cipta dilindungi.";

  const whatsappUrl =
    `https://wa.me/${whatsappNumber}?text=` +
    encodeURIComponent("Halo Admin Smart QR Review, saya ingin konsultasi pemesanan kartu Smart QR Google Review untuk outlet saya.");

  const getPortalHref = () => {
    if (!session?.user) return "/login";
    if (session.user.role === "SUPER_ADMIN") return "/super-admin";
    if (session.user.role === "ADMIN") return "/admin";
    return "/portal";
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-indigo-600/20 via-sky-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[600px] -right-40 w-96 h-96 bg-purple-600/10 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[1200px] -left-40 w-96 h-96 bg-blue-600/10 blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {siteSetting?.landingPageLogoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={siteSetting.landingPageLogoUrl}
                alt="Landing Page Logo"
                className="w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow-md shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                Smart QR <span className="text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 font-medium">Review</span>
              </span>
              <span className="text-[10px] text-slate-400">Google Review Accelerator</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={getPortalHref()}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              {session?.user ? (
                <>
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Buka Dashboard</span>
                </>
              ) : (
                <span>Masuk Portal</span>
              )}
            </Link>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/25 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Hubungi WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <FadeIn delay={0}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{heroBadge}</span>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
            {heroHeadline}
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="mt-6 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {heroSubheadline}
          </p>
        </FadeIn>

        {/* CTA Buttons */}
        <FadeIn delay={0.3}>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{ctaPrimaryText}</span>
            </a>

            <a
              href={ctaSecondaryUrl}
              target={ctaSecondaryUrl.startsWith("http") ? "_blank" : undefined}
              rel={ctaSecondaryUrl.startsWith("http") ? "noopener noreferrer" : undefined}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm sm:text-base rounded-2xl border border-slate-800 transition-all"
            >
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span>{ctaSecondaryText}</span>
            </a>
          </div>
        </FadeIn>

        {/* 5-Star Social Proof Banner */}
        <FadeIn delay={0.4}>
          <div className="mt-12 inline-flex items-center gap-3 p-3 px-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex -space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <span className="text-xs text-slate-300 font-medium">
              <strong className="text-white">100% Langsung</strong> membuka pop-up review resmi Google Maps
            </span>
          </div>
        </FadeIn>
      </section>

      {/* ─── Section: Promo & Diskon ───────────────────────────────────── */}
      {activePromos.length > 0 && (
        <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold mb-3">
                🔥 Penawaran Terbatas
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Harga Spesial untuk Anda
              </h2>
            </div>
          </FadeIn>

          <div className="space-y-5">
            {activePromos.map((promo, i) => {
              const isExpiringSoon = promo.expiredAt
                ? (new Date(promo.expiredAt).getTime() - Date.now()) < 7 * 24 * 3600 * 1000
                : false;
              const savedPct = Math.round(
                (1 - Number(promo.discountPrice.replace(/[^0-9.]/g, "")) /
                  Number(promo.originalPrice.replace(/[^0-9.]/g, ""))) * 100
              );
              return (
                <FadeIn key={promo.id} delay={i * 0.1}>
                  <div className="relative bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl overflow-hidden shadow-xl shadow-amber-900/20">
                    {/* Glow */}
                    <div className="absolute -top-16 -right-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-600/5 rounded-full blur-2xl pointer-events-none" />

                    {/* ── DESKTOP LAYOUT (md ke atas): horizontal ── */}
                    <div className="hidden md:flex items-center gap-0">
                      {/* Kiri: info */}
                      <div className="flex-1 p-8 pr-6 border-r border-amber-500/20">
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          {isExpiringSoon && promo.expiredAt && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold">
                              ⏰ Segera Berakhir!
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-bold">
                            Hemat {savedPct}%
                          </span>
                        </div>

                        <h3 className="text-xl font-extrabold text-white mb-2">{promo.label}</h3>
                        {promo.description && (
                          <p className="text-sm text-slate-400 leading-relaxed mb-4">{promo.description}</p>
                        )}

                        {promo.expiredAt && (
                          <p className="text-xs text-slate-500">
                            📅 Berlaku s/d {new Date(promo.expiredAt).toLocaleDateString("id-ID", {
                              day: "numeric", month: "long", year: "numeric",
                            })}
                          </p>
                        )}
                      </div>

                      {/* Kanan: harga + CTA */}
                      <div className="shrink-0 px-10 py-8 flex flex-col items-center justify-center text-center min-w-[260px]">
                        {/* Harga coret */}
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-slate-500 line-through text-xl font-medium">
                            {promo.originalPrice}{promo.priceUnit}
                          </span>
                        </div>
                        {/* Harga diskon — BESAR di desktop */}
                        <div className="text-amber-400 font-black text-6xl leading-none tracking-tight mb-1">
                          {promo.discountPrice}
                        </div>
                        <div className="text-amber-300/70 font-bold text-lg mb-5">
                          {promo.priceUnit}
                        </div>

                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-2xl transition-all hover:scale-[1.03] active:scale-[0.97] shadow-lg shadow-amber-600/30 whitespace-nowrap"
                        >
                          🎉 Klaim Promo Ini
                        </a>
                      </div>
                    </div>

                    {/* ── MOBILE LAYOUT (di bawah md): vertikal compact ── */}
                    <div className="md:hidden p-5">
                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        {isExpiringSoon && promo.expiredAt && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold">
                            ⏰ Segera Berakhir!
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                          Hemat {savedPct}%
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white mb-1">{promo.label}</h3>
                      {promo.description && (
                        <p className="text-xs text-slate-400 mb-3 leading-relaxed">{promo.description}</p>
                      )}

                      {/* Harga — inline di mobile */}
                      <div className="flex items-end gap-3 mb-3">
                        <span className="text-slate-500 line-through text-sm font-medium self-center">
                          {promo.originalPrice}{promo.priceUnit}
                        </span>
                        <span className="text-amber-400 font-black text-4xl leading-none">
                          {promo.discountPrice}
                        </span>
                        <span className="text-amber-300/70 font-bold text-base self-end mb-0.5">
                          {promo.priceUnit}
                        </span>
                      </div>

                      {promo.expiredAt && (
                        <p className="text-[10px] text-slate-500 mb-3">
                          📅 s/d {new Date(promo.expiredAt).toLocaleDateString("id-ID", {
                            day: "numeric", month: "long", year: "numeric",
                          })}
                        </p>
                      )}

                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-xl transition-all"
                      >
                        🎉 Klaim Promo Ini
                      </a>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </section>
      )}


      {/* How it Works (3 Steps) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Bagaimana Smart Review Card Bekerja?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              3 langkah mudah dan tanpa hambatan bagi pelanggan toko Anda
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <FadeIn delay={0.1} direction="up">
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-7 relative group hover:border-indigo-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <span className="font-extrabold text-lg">01</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{step1Title}</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {step1Desc}
              </p>
            </div>
          </FadeIn>

          {/* Step 2 */}
          <FadeIn delay={0.2} direction="up">
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-7 relative group hover:border-sky-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <span className="font-extrabold text-lg">02</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{step2Title}</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {step2Desc}
              </p>
            </div>
          </FadeIn>

          {/* Step 3 */}
          <FadeIn delay={0.3} direction="up">
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-7 relative group hover:border-emerald-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <span className="font-extrabold text-lg">03</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{step3Title}</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {step3Desc}
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── Section: Galeri Foto Produk (Carousel) ───────────────────── */}
      {productPhotos.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Produk Kami</span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-1 tracking-tight">
                Lihat Tampilan Kartu Kami
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2">Desain premium, siap dipajang di outlet Anda</p>
            </div>
          </FadeIn>

          {/* Carousel wrapper */}
          <div className="relative overflow-hidden">
            <div
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {productPhotos.map((photo, i) => (
                <FadeIn key={photo.id} delay={i * 0.05}>
                  <div className="snap-center shrink-0 w-64 sm:w-72 rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.imageData}
                      alt={photo.caption || `Foto produk ${i + 1}`}
                      className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {photo.caption && (
                      <div className="px-4 py-3">
                        <p className="text-xs text-slate-300 text-center font-medium">{photo.caption}</p>
                      </div>
                    )}
                  </div>
                </FadeIn>
              ))}
            </div>

            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-[#070b14] to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-[#070b14] to-transparent pointer-events-none" />
          </div>

          <p className="text-center text-xs text-slate-600 mt-2">← Geser untuk lihat lebih banyak →</p>
        </section>
      )}

      {/* Key Advantages Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-slate-950 border border-indigo-500/20 rounded-3xl p-8 sm:p-12 card-glow">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Keunggulan Teknologi</span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-1">
                Kenapa Memilih Dynamic Smart Review?
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <FadeIn delay={0.1}>
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 h-full">
                <Zap className="w-6 h-6 text-amber-400 mb-3" />
                <h4 className="font-bold text-sm text-white mb-1">Dynamic Redirect</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tautan review atau cabang toko bisa diganti kapan saja tanpa perlu mencetak kartu baru.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 h-full">
                <TrendingUp className="w-6 h-6 text-sky-400 mb-3" />
                <h4 className="font-bold text-sm text-white mb-1">Real-time Analytics</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pantau statistik scan secara real-time untuk melihat efektivitas tim kasir dan penempatan kartu.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 h-full">
                <Layers className="w-6 h-6 text-indigo-400 mb-3" />
                <h4 className="font-bold text-sm text-white mb-1">Batch Export Percetakan</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Unduh file manifest CSV & arsip ZIP gambar QR code resolusi tinggi siap kirim ke percetakan.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 h-full">
                <ShieldCheck className="w-6 h-6 text-emerald-400 mb-3" />
                <h4 className="font-bold text-sm text-white mb-1">Fallback Anti-Deadlink</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Proteksi otomatis bila kartu nonaktif akan diarahkan ke landing page dan tidak merusak user experience.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <FadeIn direction="up">
          <div className="bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-slate-900 border border-emerald-500/30 rounded-3xl p-8 sm:p-12 shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
              Siap Melejitkan Rating Bisnis Anda di Google?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto mb-6">
              Dapatkan kartu Smart QR Google Review fisik berkualitas tinggi untuk outlet Anda hari ini.
            </p>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base rounded-2xl shadow-xl shadow-emerald-600/30 transition-all hover:scale-105"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Chat WhatsApp Customer Support</span>
            </a>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900/80 py-8 px-4 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-4 mb-3">
          <Link href="/login" className="hover:text-slate-300 transition-colors">
            Login Portal
          </Link>
          <span>•</span>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">
            WhatsApp Order
          </a>
        </div>
        <p>&copy; {new Date().getFullYear()} {footerText}</p>
      </footer>
    </div>
  );
}

