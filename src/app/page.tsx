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
  Layers,
  MessageCircle,
  LayoutDashboard,
  ExternalLink,
  CheckCircle2,
  BellRing,
  Store,
  ArrowRight,
  BookOpen,
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 selection:bg-indigo-600 selection:text-white relative overflow-x-hidden font-sans">
      {/* Instant PWA & Stored Session Auto-Redirect */}
      <PwaInstantRedirect />

      {/* Auto Order & Referral Link Listener (?ref=..., ?buy=..., ?order=..., ?track=...) */}
      <LandingAutoOrderHandler siteSetting={siteSetting || undefined} />

      {/* Soft Pastel Ambient Background (Ramah di Mata & Modern) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] bg-gradient-to-b from-indigo-100/80 via-sky-100/50 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[550px] -right-40 w-96 h-96 bg-amber-100/60 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[1100px] -left-40 w-96 h-96 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ─── Sticky Friendly Navbar ───────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {siteSetting?.landingPageLogoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={siteSetting.landingPageLogoUrl}
                alt="QR-INAJA Logo"
                className="w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow-xs shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 flex items-center gap-1.5">
                QR-INAJA{" "}
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/80 font-bold">
                  Smart QR
                </span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Solusi Rating Bintang 5 Google Maps
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/reseller"
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-colors"
            >
              <Store className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kemitraan Reseller</span>
            </Link>

            <Link
              href={getPortalHref()}
              prefetch={true}
              className="px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-indigo-600 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
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

      {/* ─── Hero Section (2 Kolom Ramah & Mudah Dipahami) ────────────── */}
      <section className="pt-10 pb-16 sm:pt-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Kolom Kiri: Headline & Tombol Aksi */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6">
            <FadeIn delay={0}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/90 text-xs sm:text-sm font-bold shadow-2xs">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{heroBadge}</span>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-slate-900 leading-[1.15]">
                {heroHeadline}
              </h1>
            </FadeIn>

            <FadeIn delay={0.2}>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                {heroSubheadline}
              </p>
            </FadeIn>

            {/* Poin Keunggulan Singkat yang Nyaman Dibaca */}
            <FadeIn delay={0.25}>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-5 text-xs sm:text-sm font-semibold text-slate-700 pt-1">
                <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Tanpa Aplikasi Tambahan
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Filter Bintang 1–3 ke WA
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Bunyi Dering di Kasir
                </span>
              </div>
            </FadeIn>

            {/* Tombol Order & Konsultasi */}
            <FadeIn delay={0.3}>
              <div className="pt-2 space-y-3 max-w-xl mx-auto lg:mx-0">
                <LandingRetailButtons siteSetting={siteSetting || undefined} variant="hero" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-emerald-50/90 hover:bg-emerald-100/80 border border-emerald-200 text-left transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-emerald-950 truncate">
                          {ctaPrimaryText}
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-700 block truncate">
                        Tanya admin / bantu setting toko
                      </span>
                    </div>
                  </a>

                  <a
                    href={ctaSecondaryUrl}
                    target={ctaSecondaryUrl.startsWith("http") ? "_blank" : undefined}
                    rel={ctaSecondaryUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="group flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 text-left transition-all shadow-2xs"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-700 truncate">
                          {ctaSecondaryText}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate">
                        Klik untuk lihat simulasi kartu
                      </span>
                    </div>
                  </a>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Kolom Kanan: Ilustrasi Visual Kartu & Simulasi Ulasan yang Ramah di Mata */}
          <div className="lg:col-span-5">
            <FadeIn delay={0.2}>
              <div className="relative mx-auto max-w-md">
                {/* Soft Decorative Halo */}
                <div className="absolute -inset-3 bg-gradient-to-tr from-indigo-200/60 via-sky-200/50 to-amber-200/60 rounded-[36px] blur-2xl -z-10" />

                <div className="bg-white border border-slate-200/90 rounded-[32px] p-6 sm:p-7 shadow-xl shadow-slate-900/5 space-y-5">
                  {/* Top Pill: Simulasi Pelanggan Scan */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-slate-900 block">
                          Standee Akrilik Meja Kasir
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Sekali scan langsung buka bintang 5
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                      Aktif 24 Jam
                    </span>
                  </div>

                  {/* Mockup Layar HP Pelanggan */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-center space-y-3">
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 shadow-2xs">
                      <span>⭐ Google Maps Review Resmi</span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Bagaimana Pengalaman Anda Hari Ini?
                    </h3>
                    <div className="flex items-center justify-center gap-1.5 py-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shadow-2xs"
                        >
                          <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Bintang <strong>4 & 5</strong> langsung diteruskan ke{" "}
                      <span className="text-indigo-600 font-semibold">Google Maps</span>. Komplain
                      bintang <strong>1–3</strong> dialihkan privat ke{" "}
                      <span className="text-emerald-600 font-semibold">WhatsApp Owner</span>!
                    </p>
                  </div>

                  {/* Real-time Cashier Sound Notification Badge */}
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                      <BellRing className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-extrabold text-slate-900 block">
                        Dering Kasir Real-Time &ldquo;Cha-Ching!&rdquo; 🔔
                      </span>
                      <span className="text-[11px] text-slate-600">
                        HP kasir & speaker toko otomatis berbunyi saat pelanggan scan kartu meja.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
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
                  <div className="relative bg-white border-2 border-amber-300 rounded-3xl overflow-hidden shadow-lg shadow-amber-500/10">
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
                      <div className="shrink-0 p-6 sm:px-10 sm:py-8 bg-amber-50/50 flex flex-col items-center justify-center text-center min-w-[250px]">
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
                          className="mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-md shadow-amber-500/20"
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/80 text-xs font-bold mb-2">
              Sangat Mudah Digunakan
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Bagaimana Cara Kerja Kartu QR-INAJA?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              3 langkah praktis tanpa membuat pelanggan Anda repot mengetik di Google Maps
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <FadeIn delay={0.1} direction="up">
            <div className="bg-white border border-slate-200/90 rounded-3xl p-7 h-full shadow-sm hover:shadow-md hover:border-indigo-300 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mb-5 font-black text-lg">
                01
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">{step1Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step1Desc}</p>
            </div>
          </FadeIn>

          {/* Step 2 */}
          <FadeIn delay={0.2} direction="up">
            <div className="bg-white border border-slate-200/90 rounded-3xl p-7 h-full shadow-sm hover:shadow-md hover:border-sky-300 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center mb-5 font-black text-lg">
                02
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">{step2Title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step2Desc}</p>
            </div>
          </FadeIn>

          {/* Step 3 */}
          <FadeIn delay={0.3} direction="up">
            <div className="bg-white border border-slate-200/90 rounded-3xl p-7 h-full shadow-sm hover:shadow-md hover:border-emerald-300 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-5 font-black text-lg">
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold mb-2">
                Galeri Produk Fisik
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Tampilan Standee & Kartu Akrilik Kami
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Cetakan tajam kualitas tinggi, tahan air, dan elegan untuk meja kasir maupun meja makan
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
                  <div className="snap-center shrink-0 w-64 sm:w-76 rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all group">
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

      {/* ─── Keunggulan Fitur Lengkap ─────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-white border border-slate-200/90 rounded-[32px] p-7 sm:p-12 shadow-sm">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold mb-2">
                Fitur Lengkap untuk UMKM & Resto
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
                Kenapa Ribuan Toko Memilih QR-INAJA?
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <FadeIn delay={0.1}>
              <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/70 h-full space-y-2.5">
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-base text-slate-900">
                  Smart Filter Rating 1–3
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Keluhan bintang 1–3 masuk privat ke WhatsApp pemilik toko, sedangkan bintang 4–5 langsung menuju Google Maps.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/70 h-full space-y-2.5">
                <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <BellRing className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-base text-slate-900">
                  Notifikasi Dering Kasir
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  HP kasir langsung berbunyi dering saat pelanggan scan kartu meja, memudahkan kasir memvalidasi promo ulasan.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/70 h-full space-y-2.5">
                <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-base text-slate-900">
                  Buku Menu Digital & Sosmed
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Tampilkan foto menu makanan/katalog harga, link Instagram, dan TikTok toko Anda dalam 1 kartu meja yang sama.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/70 h-full space-y-2.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-base text-slate-900">
                  QR Dinamis Anti-Mati
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Link Google Maps atau nama toko dapat diubah kapan saja lewat dashboard tanpa perlu mencetak ulang kartu akrilik.
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
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 rounded-[32px] p-8 sm:p-12 shadow-xl shadow-indigo-900/10 text-white">
            <h2 className="text-2xl sm:text-4xl font-extrabold mb-3">
              Siap Menaikkan Rating Bisnis Anda di Google Maps?
            </h2>
            <p className="text-sm sm:text-base text-emerald-50 max-w-xl mx-auto mb-7 leading-relaxed">
              Konsultasikan kebutuhan kartu QR akrilik toko Anda bersama tim kami atau daftar sebagai mitra reseller di kota Anda.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 bg-white hover:bg-emerald-50 text-emerald-900 font-extrabold text-sm sm:text-base rounded-2xl shadow-lg transition-all hover:scale-105"
              >
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <span>Chat WhatsApp Sekarang</span>
              </a>

              <Link
                href="/reseller"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 bg-emerald-800/40 hover:bg-emerald-800/60 text-white border border-white/25 font-bold text-sm sm:text-base rounded-2xl transition-all"
              >
                <TrendingUp className="w-5 h-5" />
                <span>Info Kemitraan Reseller</span>
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200/80 bg-white py-10 px-4 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-3 sm:gap-5 flex-wrap mb-4 font-medium text-slate-600">
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
