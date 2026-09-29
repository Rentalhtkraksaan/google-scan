"use client";

import { useState } from "react";
import Link from "next/link";
import {
  QrCode,
  Sparkles,
  Package,
  Truck,
  ShieldCheck,
  TrendingUp,
  MessageCircle,
  LayoutDashboard,
  ShoppingCart,
  Users,
  CheckCircle2,
  ArrowRight,
  Zap,
} from "lucide-react";
import { PublicResellerRegistrationModal } from "@/components/public/PublicResellerRegistrationModal";
import { TrackOrderModal } from "@/components/public/TrackOrderModal";
import { SiteSettingModel } from "@/types/models";
import { FadeIn } from "@/components/ui/FadeIn";

interface ResellerPageClientProps {
  siteSetting?: SiteSettingModel;
}

export function ResellerPageClient({ siteSetting }: ResellerPageClientProps) {
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackingInitialQuery, setTrackingInitialQuery] = useState("");

  const handleOpenTrackingFromSuccess = (orderNumber?: string) => {
    if (orderNumber) setTrackingInitialQuery(orderNumber);
    setIsTrackModalOpen(true);
  };

  const whatsappNumber = siteSetting?.whatsappNumber || "6281234567890";
  const whatsappUrl =
    `https://wa.me/${whatsappNumber}?text=` +
    encodeURIComponent("Halo Admin Smart QR, saya ingin konsultasi mengenai program kemitraan Reseller & pembelian grosir.");

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-emerald-600/20 via-teal-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[600px] -right-40 w-96 h-96 bg-indigo-600/10 blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            {siteSetting?.landingPageLogoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={siteSetting.landingPageLogoUrl}
                alt="Logo"
                className="w-10 h-10 object-contain drop-shadow-md shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                Smart QR <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">RESELLER</span>
              </span>
              <span className="text-[10px] text-slate-400">Portal Kemitraan Resmi</span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Login Admin Reseller</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <FadeIn>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Peluang Bisnis Lapangan Berkelanjutan</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Menjadi Mitra Reseller <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
              Smart QR Google Review
            </span>
          </h1>

          <p className="mt-5 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Dapatkan paket perdana kartu ulasan Google Review mulai dari <strong>8 pcs</strong> dengan harga grosir khusus mitra, dashboard admin lapangan mandiri, dan reward potongan harga per outlet aktif.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Daftar & Pesan Paket (Min. 8 pcs)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsTrackModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs sm:text-sm rounded-2xl border border-slate-800 transition-all cursor-pointer"
            >
              <Truck className="w-4 h-4 text-sky-400" />
              <span>Lacak Pesanan Reseller</span>
            </button>
          </div>
        </FadeIn>
      </section>

      {/* Reseller Benefits Grid */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Keuntungan Mitra</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Kenapa Bergabung Jadi Reseller?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-black text-lg">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-white">Harga Grosir Spesial</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dapatkan harga modal kartu murah mulai 8 pcs dan tentukan harga jual bebas ke toko/resto di wilayah Anda.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-teal-500/40 transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center font-black text-lg">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-white">Dashboard Admin Mandiri</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Kelola dan daftarkan outlet mitra secara instan dari smartphone Anda tanpa ketergantungan kantor pusat.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-sky-500/40 transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center font-black text-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-white">Reward Diskon VIP</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Setiap outlet binaan Anda yang berlangganan membership VIP akan memberikan potongan harga pembelian kartu berikutnya.
            </p>
          </div>
        </div>
      </section>

      {/* Direct CTA */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
        <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/50 border border-emerald-500/30 rounded-3xl p-8 sm:p-10 space-y-4 shadow-2xl">
          <h3 className="text-xl sm:text-3xl font-extrabold text-white">
            Siap Mengembangkan Jaringan di Kota Anda?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            Klik tombol di bawah untuk mengisi formulir kemitraan reseller dan memesan paket perdana Anda sekarang.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/30 transition-all hover:scale-105 cursor-pointer"
            >
              Mulai Pesan Paket Reseller (Min. 8 pcs)
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-sm rounded-2xl border border-slate-700 transition-all flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Tanya Admin via WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900/80 py-8 px-4 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-4 flex-wrap mb-2 text-slate-400">
          <Link href="/" className="hover:text-white transition-colors">
            Halaman Utama (Eceran)
          </Link>
          <span>•</span>
          <Link href="/login" className="hover:text-white transition-colors">
            Login Portal
          </Link>
          <span>•</span>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            WhatsApp CS
          </a>
        </div>
        <p>&copy; {new Date().getFullYear()} Smart QR Review. Seluruh hak cipta dilindungi.</p>
      </footer>

      {/* Modals */}
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
    </div>
  );
}
