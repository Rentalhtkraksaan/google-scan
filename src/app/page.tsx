import Link from "next/link";
import { FadeIn } from "@/components/ui/FadeIn";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedSiteSetting } from "@/lib/site-settings-cache";
import { after } from "next/server";
import { headers } from "next/headers";
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
  MessageCircle,
  LayoutDashboard,
  ExternalLink,
  CheckCircle2,
  Store,
  ArrowRight,
  Award,
  MapPin,
  HeartHandshake,
  Globe,
} from "lucide-react";

import type { Metadata } from "next";
import { PwaInstantRedirect } from "@/components/pwa/PwaInstantRedirect";
import { LandingRetailButtons } from "@/components/public/LandingRetailButtons";
import { LandingAutoOrderHandler } from "@/components/public/LandingAutoOrderHandler";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  let title = "QR-INAJA | Smart QR Review — Akselerasi Ulasan Bintang 5 Google Bisnis";
  let description =
    "Platform SaaS Dynamic QR Code & Kartu Akrilik Smart Review untuk meningkatkan rating dan ulasan Google Review outlet Anda secara otomatis dan instan.";
  let faviconUrl = "/favicon.ico";

  try {
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

export default async function LandingPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; ref?: string; buy?: string; order?: string }>;
}) {
  if (searchParams) await searchParams;
  const session = await auth();

  const [siteSetting, activePromos, productPhotos] = await Promise.all([
    getCachedSiteSetting(),
    getActivePromosAction(),
    getProductPhotosAction(),
  ]);

  // Visitor tracking dijalankan SETELAH response dikirim ke browser (non-blocking)
  after(async () => {
    try {
      const headerList = await headers();
      const userAgent = (headerList.get("user-agent") || "").toLowerCase();
      if (/bot|crawl|spider|slurp|curl|wget|python|scanner|headless|postman/i.test(userAgent)) {
        return;
      }
    } catch {
      // Abaikan jika headers tidak dapat diakses
    }

    try {
      await prisma.siteSetting.update({
        where: { id: "default" },
        data: { visitorCount: { increment: 1 } },
      });
    } catch (e) {
      console.error("Gagal increment visitor count:", e);
    }

    try {
      const dateOpts = {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      } as const;
      const parts = new Intl.DateTimeFormat("en-CA", dateOpts).formatToParts(new Date());
      const year = parts.find((p) => p.type === "year")?.value;
      const month = parts.find((p) => p.type === "month")?.value;
      const day = parts.find((p) => p.type === "day")?.value;
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

  // Seluruh konten dinamis yang dikendalikan penuh oleh Super Admin 1 (Master)
  const whatsappNumber = siteSetting?.whatsappNumber || "6281234567890";
  const heroBadge = siteSetting?.heroBadge || "🔥 Solusi Cerdas Ulasan Bintang 5 Google Bisnis";
  const heroHeadline =
    siteSetting?.heroHeadline || "Dapatkan Ratusan Ulasan Bintang 5 Dengan Sekali Tap";
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
  const footerText =
    siteSetting?.footerText || "Smart QR Review Platform. Seluruh hak cipta dilindungi.";

  const whatsappUrl =
    `https://wa.me/${whatsappNumber}?text=` +
    encodeURIComponent(
      "Halo Admin Smart QR Review, saya ingin konsultasi pemesanan kartu Smart QR Google Review untuk outlet saya."
    );

  const getPortalHref = () => {
    if (!session?.user) return "/login";
    if (session.user.role === "SUPER_ADMIN") return "/super-admin";
    if (session.user.role === "ADMIN") return "/admin";
    if (session.user.role === "AFFILIATE") return "/affiliate";
    return "/portal";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F7FF] via-[#FAFCFF] to-[#F1F5F9] text-slate-800 selection:bg-indigo-600 selection:text-white relative overflow-x-hidden font-sans">
      {/* Instant PWA & Stored Session Auto-Redirect */}
      <PwaInstantRedirect />

      {/* Auto Order & Referral Link Listener (?ref=..., ?buy=..., ?order=..., ?track=...) */}
      <LandingAutoOrderHandler siteSetting={siteSetting || undefined} />

      {/* Soft Modern Mesh Gradient Orbs (Ramah di Mata & Kece) */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[1200px] h-[650px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200/60 via-sky-100/40 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[480px] -right-32 w-[450px] h-[450px] bg-amber-200/35 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[950px] -left-32 w-[450px] h-[450px] bg-teal-200/35 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ─── Floating Glass Navbar ────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/80 bg-white/75 backdrop-blur-2xl shadow-[0_4px_30px_rgba(15,23,42,0.03)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {siteSetting?.landingPageLogoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={siteSetting.landingPageLogoUrl}
                alt="QR-INAJA Logo"
                className="w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow-xs shrink-0"
              />
            ) : (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-black text-base sm:text-xl tracking-tight text-slate-900 flex items-center gap-2">
                QR-INAJA
                <span className="text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-50 to-sky-50 text-indigo-600 border border-indigo-200/70 font-extrabold">
                  Smart QR
                </span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Google Review Accelerator Resmi
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/reseller"
              className="hidden md:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-emerald-700 bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-200/80 transition-all hover:scale-[1.02]"
            >
              <Store className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kemitraan Reseller</span>
            </Link>

            <Link
              href={getPortalHref()}
              prefetch={true}
              className="px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-slate-900 to-slate-800 hover:from-indigo-600 hover:to-sky-600 rounded-2xl transition-all flex items-center gap-1.5 shadow-md shadow-slate-900/10 hover:shadow-indigo-500/25 hover:scale-[1.02]"
            >
              {session?.user ? (
                <>
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </>
              ) : (
                <span>Masuk Akun</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero Section (Centered Modern & Kece) ────────────────────── */}
      <section className="pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
        <FadeIn delay={0}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 text-indigo-700 border border-indigo-200/80 text-xs sm:text-sm font-extrabold shadow-sm shadow-indigo-500/5 mb-6">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{heroBadge}</span>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.14]">
            {heroHeadline}
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="mt-5 text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            {heroSubheadline}
          </p>
        </FadeIn>

        {/* Pill Keunggulan Cepat */}
        <FadeIn delay={0.25}>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 text-xs sm:text-sm font-bold text-slate-700">
            <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              Tanpa Aplikasi Tambahan
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
              100% Resmi Google Maps
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
              Akrilik Tebal & Elegan
            </span>
          </div>
        </FadeIn>

        {/* Tombol Utama & Konsultasi */}
        <FadeIn delay={0.3}>
          <div className="mt-8 space-y-3.5 max-w-xl mx-auto">
            <LandingRetailButtons siteSetting={siteSetting || undefined} variant="hero" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white hover:bg-emerald-50/70 border border-slate-200/90 hover:border-emerald-300 text-left transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-emerald-800 truncate">
                      {ctaPrimaryText}
                    </span>
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 group-hover:text-emerald-700 block truncate">
                    Chat CS & gratis setting toko
                  </span>
                </div>
              </a>

              <a
                href={ctaSecondaryUrl}
                target={ctaSecondaryUrl.startsWith("http") ? "_blank" : undefined}
                rel={ctaSecondaryUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                className="group flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white hover:bg-indigo-50/70 border border-slate-200/90 hover:border-indigo-300 text-left transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-sm shadow-indigo-500/25 shrink-0 group-hover:scale-105 transition-transform">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-indigo-800 truncate">
                      {ctaSecondaryText}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                  </div>
                  <span className="text-[11px] text-slate-500 group-hover:text-indigo-600 block truncate">
                    Klik untuk coba simulasi scan
                  </span>
                </div>
              </a>
            </div>
          </div>
        </FadeIn>

        {/* Visual Showcase Banner: 3 Kartu Preview Bersih & Elegan */}
        <FadeIn delay={0.4}>
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto text-left">
            <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 shadow-lg shadow-slate-900/[0.03] flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0">
                <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
              </div>
              <div>
                <div className="text-lg font-black text-slate-900">Rating 4.9+ ⭐</div>
                <p className="text-xs text-slate-500">
                  Meningkatkan kepercayaan pelanggan baru di Google Maps
                </p>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 shadow-lg shadow-slate-900/[0.03] flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <div className="text-lg font-black text-slate-900">Hanya 3 Detik</div>
                <p className="text-xs text-slate-500">
                  Scan kamera HP langsung buka pop-up ulasan bintang 5
                </p>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 shadow-lg shadow-slate-900/[0.03] flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <div className="text-lg font-black text-slate-900">Sekali Beli</div>
                <p className="text-xs text-slate-500">
                  Kartu fisik awet bertahun-tahun untuk meja & kasir toko
                </p>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── Section: Promo & Diskon (Dikelola Super Admin) ───────────── */}
      {activePromos.length > 0 && (
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold mb-2">
                🔥 Promo Spesial Terbatas
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Penawaran Hemat untuk Outlet Anda
              </h2>
            </div>
          </FadeIn>

          <div className="space-y-5">
            {activePromos.map((promo, i) => {
              const isExpiringSoon = promo.expiredAt
                ? new Date(promo.expiredAt).getTime() - Date.now() < 7 * 24 * 3600 * 1000
                : false;
              const savedPct = Math.round(
                (1 -
                  Number(promo.discountPrice.replace(/[^0-9.]/g, "")) /
                    Number(promo.originalPrice.replace(/[^0-9.]/g, ""))) *
                  100
              );
              return (
                <FadeIn key={promo.id} delay={i * 0.1}>
                  <div className="relative bg-white border-2 border-amber-300/90 rounded-3xl overflow-hidden shadow-xl shadow-amber-500/10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                      {/* Info Promo */}
                      <div className="flex-1 p-6 sm:p-8 md:border-r border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          {isExpiringSoon && promo.expiredAt && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold">
                              ⏰ Segera Berakhir!
                            </span>
                          )}
                          {savedPct > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                              Hemat {savedPct}%
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
                          {promo.label}
                        </h3>
                        {promo.description && (
                          <p className="text-sm text-slate-600 leading-relaxed mb-3">
                            {promo.description}
                          </p>
                        )}

                        {promo.expiredAt && (
                          <p className="text-xs text-slate-500 font-medium">
                            📅 Berlaku s/d{" "}
                            {new Date(promo.expiredAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>

                      {/* Harga & Tombol Klaim */}
                      <div className="shrink-0 p-6 sm:px-10 sm:py-8 bg-gradient-to-b from-amber-50/70 to-amber-50/30 flex flex-col items-center justify-center text-center min-w-[250px]">
                        <span className="text-slate-400 line-through text-base font-semibold">
                          Rp {promo.originalPrice} {promo.priceUnit}
                        </span>
                        <div className="flex items-baseline gap-1 my-1">
                          <span className="text-amber-600 font-black text-4xl sm:text-5xl tracking-tight">
                            {promo.discountPrice}
                          </span>
                          <span className="text-amber-700 font-bold text-base">
                            {promo.priceUnit}
                          </span>
                        </div>

                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-amber-500/25 hover:scale-[1.02]"
                        >
                          <span>🎉 Ambil Promo Ini</span>
                          <ArrowRight className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Cara Kerja (3 Langkah Mudah - Dikelola Super Admin) ──────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/80 text-xs font-bold mb-2">
              Sangat Mudah & Praktis
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Bagaimana Cara Kerja Kartu QR-INAJA?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              3 langkah mudah dan nyaman bagi setiap pelanggan toko Anda
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <FadeIn delay={0.1} direction="up">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-7 h-full shadow-md shadow-slate-900/[0.02] hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center mb-5 font-black text-lg shadow-md shadow-indigo-500/20">
                01
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">{step1Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step1Desc}</p>
            </div>
          </FadeIn>

          {/* Step 2 */}
          <FadeIn delay={0.2} direction="up">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-7 h-full shadow-md shadow-slate-900/[0.02] hover:shadow-xl hover:border-sky-300 hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-white flex items-center justify-center mb-5 font-black text-lg shadow-md shadow-sky-500/20">
                02
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">{step2Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step2Desc}</p>
            </div>
          </FadeIn>

          {/* Step 3 */}
          <FadeIn delay={0.3} direction="up">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-7 h-full shadow-md shadow-slate-900/[0.02] hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mb-5 font-black text-lg shadow-md shadow-emerald-500/20">
                03
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">{step3Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step3Desc}</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── Galeri Foto Produk (Dikelola Super Admin) ────────────────── */}
      {productPhotos.length > 0 && (
        <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold mb-2">
                Galeri Produk Fisik
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Tampilan Standee & Kartu Akrilik Kami
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Desain estetik, bahan akrilik tebal tahan air, siap mempercantik meja kasir Anda
              </p>
            </div>
          </FadeIn>

          <div className="relative">
            <div
              className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {productPhotos.map((photo, i) => (
                <FadeIn key={photo.id} delay={i * 0.05}>
                  <div className="snap-center shrink-0 w-64 sm:w-76 rounded-3xl overflow-hidden border border-slate-200/90 bg-white shadow-md hover:shadow-xl transition-all group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.imageData}
                      alt={photo.caption || `Foto produk ${i + 1}`}
                      className="w-full h-60 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {photo.caption && (
                      <div className="px-4 py-3.5 bg-white">
                        <p className="text-xs sm:text-sm text-slate-700 text-center font-semibold">
                          {photo.caption}
                        </p>
                      </div>
                    )}
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 font-medium mt-2">
            ← Geser ke samping untuk melihat foto lainnya →
          </p>
        </section>
      )}

      {/* ─── Keunggulan Teknologi (Bento Grid Ramah & Bersih) ─────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-white border border-slate-200/90 rounded-[36px] p-7 sm:p-12 shadow-xl shadow-slate-900/[0.03]">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold mb-2">
                Keunggulan Teknologi
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900">
                Kenapa Memilih Kartu Smart QR-INAJA?
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                Dirancang khusus untuk mendongkrak reputasi Cafe, Resto, Barbershop, Klinik, hingga UMKM
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <FadeIn delay={0.1}>
              <div className="p-6 rounded-3xl bg-gradient-to-b from-indigo-50/50 to-white border border-indigo-100 h-full space-y-3 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <MapPin className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-base text-slate-900">
                  Naik Peringkat di Google
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Semakin banyak ulasan bintang 5 masuk, titik lokasi bisnis Anda makin direkomendasikan paling atas di Google Maps.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="p-6 rounded-3xl bg-gradient-to-b from-sky-50/50 to-white border border-sky-100 h-full space-y-3 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-base text-slate-900">
                  Statistik Scan Real-Time
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Pantau jumlah pelanggan yang men-scan kartu setiap hari langsung dari portal dashboard toko Anda.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="p-6 rounded-3xl bg-gradient-to-b from-emerald-50/50 to-white border border-emerald-100 h-full space-y-3 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <Globe className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-base text-slate-900">
                  E-Menu & Link Sosmed
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Integrasikan katalog menu digital, Instagram, dan TikTok outlet Anda ke dalam 1 kartu pintar di meja.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-50/50 to-white border border-amber-100 h-full space-y-3 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-base text-slate-900">
                  Dynamic QR Anti-Mati
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Tautan Google Maps atau profil toko dapat diperbarui kapan saja dari dashboard tanpa perlu cetak kartu baru.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── Retail Direct Order & Tracking Section ───────────────────── */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <FadeIn direction="up">
          <LandingRetailButtons siteSetting={siteSetting || undefined} variant="section" />
        </FadeIn>
      </section>

      {/* ─── CTA Bottom Banner (Ramah & Mengundang) ───────────────────── */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <FadeIn direction="up">
          <div className="bg-gradient-to-r from-indigo-600 via-sky-600 to-teal-500 rounded-[36px] p-8 sm:p-12 shadow-2xl shadow-indigo-900/15 text-white relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold mb-4">
                <HeartHandshake className="w-4 h-4" />
                <span>Siap Membantu Pertumbuhan Bisnis Anda</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black mb-3">
                Siap Melejitkan Rating Bisnis Anda di Google?
              </h2>
              <p className="text-sm sm:text-base text-indigo-50 max-w-xl mx-auto mb-7 leading-relaxed">
                Dapatkan kartu Smart QR Google Review fisik berkualitas tinggi untuk outlet Anda hari ini atau bergabung sebagai mitra reseller.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 bg-white hover:bg-indigo-50 text-indigo-950 font-extrabold text-sm sm:text-base rounded-2xl shadow-lg transition-all hover:scale-105"
                >
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                  <span>Chat WhatsApp Customer Support</span>
                </a>

                <Link
                  href="/reseller"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 bg-white/15 hover:bg-white/25 text-white border border-white/30 font-bold text-sm sm:text-base rounded-2xl transition-all backdrop-blur-md"
                >
                  <Store className="w-5 h-5" />
                  <span>Program Kemitraan Reseller</span>
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200/80 bg-white/90 py-10 px-4 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-3 sm:gap-5 flex-wrap mb-4 font-semibold text-slate-600">
          <Link href="/login" className="hover:text-indigo-600 transition-colors">
            Login Portal
          </Link>
          <span>•</span>
          <Link
            href="/reseller"
            className="text-emerald-700 hover:text-emerald-600 font-bold transition-colors"
          >
            Kemitraan Reseller (Grosir)
          </Link>
          <span>•</span>
          <LandingRetailButtons siteSetting={siteSetting || undefined} variant="footer-links" />
          <span>•</span>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-indigo-600 transition-colors"
          >
            WhatsApp CS
          </a>
        </div>
        <p className="text-slate-400">
          &copy; {new Date().getFullYear()} {footerText}
        </p>
      </footer>
    </div>
  );
}
