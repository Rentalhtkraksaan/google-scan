"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  QrCode,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  TrendingUp,
  MessageCircle,
  HelpCircle,
  Star,
  Edit3,
  CreditCard,
  PlusCircle,
  ShieldCheck,
  BookOpen,
  ShieldAlert,
  Volume2,
  X,
} from "lucide-react";
import { getCardScanUrl } from "@/lib/qr-export";
import { showSuccessAlert, showWelcomeAlert } from "@/lib/swal";
import { EditProfileModal } from "@/components/dashboard/EditProfileModal";
import { RequestCardModal } from "@/components/dashboard/RequestCardModal";
import ActivityLogTable from "@/components/dashboard/ActivityLogTable";
import { Interactive3DCard } from "@/components/dashboard/Interactive3DCard";
import { UserGuideModal } from "@/components/dashboard/UserGuideModal";
import { InstallPwaButton } from "@/components/pwa/InstallPwaPrompt";
import { PwaWelcomeModal } from "@/components/pwa/PwaWelcomeModal";
import { NotificationPrompt } from "@/components/pwa/NotificationPrompt";
import {
  playCashierDing,
  speakVoiceAnnouncement,
  triggerSmartphoneVibration,
  sendSmartphoneNotification,
  unlockAudioContext,
} from "@/lib/notification-sound";

interface PortalClientViewProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    whatsappNumber: string | null;
  };
  outlet: {
    id: string;
    name: string;
    googleReviewUrl: string;
    qrCards?: {
      code: string;
      status: string;
      scanCount: number;
    }[];
    qrCard?: {
      code: string;
      status: string;
      scanCount: number;
    } | null;
  } | null;
  adminContact: {
    fullName: string;
    whatsappNumber: string | null;
    email: string;
  } | null;
}

export function PortalClientView({ user, outlet, adminContact }: PortalClientViewProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRequestCardModalOpen, setIsRequestCardModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const prevScansRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && sessionStorage.getItem("just_logged_in") === "true") {
      sessionStorage.removeItem("just_logged_in");
      showWelcomeAlert(user.fullName || "Pemilik Outlet", "Owner Outlet");
    }
  }, [user.fullName]);

  const cards = outlet?.qrCards && outlet.qrCards.length > 0
    ? outlet.qrCards
    : outlet?.qrCard
    ? [outlet.qrCard]
    : [];

  const activeCard = cards[selectedCardIndex] || cards[0] || null;
  const initialTotalScans = cards.reduce((sum, c) => sum + (c.scanCount || 0), 0);
  const [liveTotalScans, setLiveTotalScans] = useState(initialTotalScans);
  const [realtimeAlert, setRealtimeAlert] = useState<{
    id: string;
    title: string;
    desc: string;
    type: "FIVE_STAR" | "SCAN";
  } | null>(null);
  const scanUrl = activeCard ? getCardScanUrl(activeCard.code) : "";

  // Auto-sync live total scans if initial props change
  useEffect(() => {
    setLiveTotalScans(initialTotalScans);
  }, [initialTotalScans]);

  // Auto dismiss in-app realtime toast after 7 seconds
  useEffect(() => {
    if (!realtimeAlert) return;
    const timer = setTimeout(() => setRealtimeAlert(null), 7000);
    return () => clearTimeout(timer);
  }, [realtimeAlert]);

  // Realtime Poller (Checks every 2.5s for live scans & 5-star review events)
  const lastPolledRef = useRef<number>(Date.now());
  const processedEventIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!outlet?.id) return;

    let isSubscribed = true;

    const pollRealtime = async () => {
      try {
        const res = await fetch(`/api/portal/realtime?outletId=${outlet.id}&since=${lastPolledRef.current}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isSubscribed || !data.success) return;

        lastPolledRef.current = data.serverTime || Date.now();

        // Update live total scan counter dynamically
        if (typeof data.totalScans === "number" && data.totalScans !== liveTotalScans) {
          setLiveTotalScans(data.totalScans);
        }

        // Process new events (5-star ratings or customer scans)
        if (Array.isArray(data.events) && data.events.length > 0) {
          for (const ev of data.events) {
            if (processedEventIdsRef.current.has(ev.id)) continue;
            processedEventIdsRef.current.add(ev.id);

            if (ev.action === "FIVE_STAR_REVIEW") {
              // 1. Double Cashier Bell Ring
              playCashierDing();
              // 2. Physical Smartphone Vibration
              triggerSmartphoneVibration([300, 150, 300, 150, 500]);
              // 3. Indonesian Voice Speech
              speakVoiceAnnouncement(`Selamat! Ada ulasan bintang 5 baru masuk di ${outlet.name}!`);
              // 4. Mobile System Notification
              sendSmartphoneNotification(
                "⭐⭐⭐⭐⭐ Ulasan Bintang 5 Baru!",
                `Pelanggan di meja baru saja memberikan rating bintang 5 untuk ${outlet.name}!`
              );
              // 5. In-App Golden Glowing Banner
              setRealtimeAlert({
                id: ev.id,
                title: "Ulasan Bintang 5 Baru! ⭐⭐⭐⭐⭐",
                desc: ev.description || "Pelanggan baru saja memberikan rating bintang 5 di Google Review!",
                type: "FIVE_STAR",
              });
            } else if (ev.action === "SCAN_CARD") {
              // Bell ding
              playCashierDing();
              // Vibration
              triggerSmartphoneVibration([200, 100, 200]);
              // Notification
              sendSmartphoneNotification(
                "🛎️ Ada Pengunjung Scan Kartu!",
                `Pengunjung baru saja scan kartu ulasan meja di ${outlet.name}.`
              );
              // In-App Toast
              setRealtimeAlert({
                id: ev.id,
                title: "Pengunjung Scan Kartu Meja 🛎️",
                desc: ev.description || "Ada pengunjung sedang membuka ulasan di meja Anda.",
                type: "SCAN",
              });
            }
          }
        }
      } catch {
        // Retry next interval
      }
    };

    const interval = setInterval(pollRealtime, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [outlet?.id, outlet?.name, liveTotalScans]);

  const handleCopy = async () => {
    if (!scanUrl) return;
    try {
      await navigator.clipboard.writeText(scanUrl);
      setCopied(true);
      showSuccessAlert("Link Disalin!", `Link scan kartu ${activeCard?.code || ""} berhasil disalin ke clipboard.`, 1200);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const adminWaUrl = adminContact?.whatsappNumber
    ? `https://wa.me/${adminContact.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
        `Halo ${adminContact.fullName}, saya ${user.fullName} dari outlet ${outlet?.name || ""}.`
      )}`
    : null;

  if (!mounted) {
    return null;
  }

  if (!outlet) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
        <Store className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Outlet Belum Terhubung</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Akun Anda belum memiliki data outlet yang terhubung dengan kartu QR. Silakan hubungi admin lapangan yang mendaftarkan Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in relative">
      {/* Realtime In-App Floating Notification Banner */}
      {realtimeAlert && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 z-50 sm:max-w-md animate-in slide-in-from-top-4 duration-300">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-indigo-950/80 border-2 border-amber-400 shadow-2xl shadow-amber-500/30 flex items-start gap-3 backdrop-blur-xl">
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 shrink-0 font-extrabold shadow-lg animate-bounce">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <span>{realtimeAlert.title}</span>
              </h4>
              <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed">
                {realtimeAlert.desc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRealtimeAlert(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900/60 via-slate-900/80 to-sky-950/60 border border-indigo-500/20 rounded-2xl sm:rounded-3xl p-4 sm:p-8 card-glow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] sm:text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Smart Google Review Card
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
              {outlet.name}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-300 mt-1 flex-wrap">
              <span>Pemilik: <strong className="text-white font-medium">{user.fullName}</strong></span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 font-semibold">
                <CreditCard className="w-3 h-3" />
                {cards.length} Kartu Fisik
              </span>
            </div>
          </div>

          {/* Action & Live Scan Metric */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
            <NotificationPrompt outletName={outlet.name} />

            <InstallPwaButton variant="compact" label="Pasang Aplikasi di HP" />

            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/40 rounded-xl sm:rounded-2xl text-xs font-bold transition-all shadow-md shadow-sky-500/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              title="Buka Buku Panduan Outlet Mitra"
            >
              <BookOpen className="w-4 h-4 text-sky-300 shrink-0" />
              <span>Panduan Outlet</span>
            </button>

            {/* Big Live Scan Metric */}
            <div className="flex items-center gap-3 sm:gap-4 bg-slate-950/70 border border-slate-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
                  Total Scan Seluruh Kartu
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-4xl font-black text-white">
                    {liveTotalScans}
                  </span>
                  <span className="text-xs font-medium text-emerald-400">kali scan</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left: Digital Smart QR Card Status & Action buttons (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col items-center justify-between text-center">
          <div className="w-full flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                Status Kartu Smart QR
              </span>
              <span className="text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                {cards.length} Unit Terdaftar
              </span>
            </div>

            {/* Multi-Card Switcher Tabs (If outlet has > 1 cards) */}
            {cards.length > 1 && (
              <div className="w-full mb-3 bg-slate-950/70 p-1.5 rounded-2xl border border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400 text-left px-2 mb-1.5 flex items-center justify-between">
                  <span>Pilih Kartu Fisik:</span>
                  <span className="text-sky-400 font-bold">{cards.length} Unit Kartu</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {cards.map((c, idx) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setSelectedCardIndex(idx)}
                      className={`flex-1 min-w-[105px] sm:min-w-[110px] py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center cursor-pointer shrink-0 ${
                        selectedCardIndex === idx
                          ? "bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/30"
                          : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                      }`}
                    >
                      <span className="truncate max-w-[95px] sm:max-w-[100px]">Kartu {idx + 1} ({c.code})</span>
                      <span className={`text-[10px] font-medium ${selectedCardIndex === idx ? "text-sky-200" : "text-emerald-400"}`}>
                        {c.scanCount} scan
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Visual Digital 3D Interactive Card Widget */}
            <div className="w-full my-2">
              <Interactive3DCard
                cardCode={activeCard?.code || "-"}
                outletName={outlet.name}
                scanUrl={scanUrl}
                scanCount={activeCard?.scanCount || 0}
              />
            </div>
          </div>

          <div className="w-full mt-4 sm:mt-5 space-y-2">
            {/* Primary Action: Minta Tambah Kartu ke Mitra Lapangan */}
            <button
              onClick={() => setIsRequestCardModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl transition-all shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Minta Tambah Kartu QR</span>
            </button>

            {/* Secondary Actions: Tes Link Scan & Salin Link */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={scanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Tes Scan</span>
              </a>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                )}
                <span>{copied ? "Tersalin" : "Salin Link"}</span>
              </button>
            </div>

            {/* Peringatan Hak Cipta & Larangan Penggandaan Desain Fisik */}
            <div className="w-full mt-3.5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-amber-500/15 via-amber-950/25 to-slate-950/80 border border-amber-500/30 text-left space-y-3 shadow-lg shadow-amber-500/5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Peringatan Hak Cipta (HAKI)</span>
                </div>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 tracking-wider">
                  RESMI
                </span>
              </div>

              <p className="text-slate-300 leading-relaxed text-[11px]">
                Desain fisik standee akrilik, kartu NFC, dan tata letak Smart QR dilindungi oleh <strong>Undang-Undang Hak Cipta</strong>. Pengguna/mitra toko <strong>dilarang keras menggandakan</strong>, meniru, atau mencetak ulang secara mandiri tanpa izin resmi.
              </p>

              <div className="pt-2 border-t border-amber-500/20 space-y-2">
                <span className="text-[10.5px] text-amber-200/90 font-medium block">
                  ⚠️ Tambah unit kartu baru untuk meja Anda:
                </span>
                <button
                  type="button"
                  onClick={() => setIsRequestCardModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-slate-950 shrink-0 stroke-[2.5]" />
                  <span>Minta Tambah Kartu QR</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Info & Google Review Link Destination (7 Cols) */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-6">
          {/* Target URL Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              Tujuan Ulasan Google Review
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Setiap kali pelanggan melakukan tap/scan kartu QR di meja kasir/meja makan, mereka akan langsung dialihkan ke URL ini.
            </p>

            <div className="p-3 sm:p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-4">
              <div className="break-all sm:truncate text-xs font-mono text-slate-300">
                {outlet.googleReviewUrl}
              </div>
              <a
                href={scanUrl || outlet.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-medium transition-colors"
              >
                <span>Buka Link Review</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs mb-4">
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 block mb-1">Nama Pemilik Akun:</span>
                <strong className="text-white font-semibold">{user.fullName}</strong>
              </div>
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 block mb-1">No. WhatsApp:</span>
                <strong className="text-white font-semibold">{user.whatsappNumber || "-"}</strong>
              </div>
            </div>

            <button
              onClick={() => setIsEditModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profil Saya</span>
            </button>
          </div>

          {/* Tips for Getting More 5-Star Reviews */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              Tips Mengumpulkan 100+ Ulasan Bintang 5
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold">
                  1
                </div>
                <span>
                  <strong>Letakkan di Meja Kasir & Meja Makan:</strong> Taruh kartu fisik di tempat yang paling sering dilihat pelanggan saat menunggu makanan atau saat membayar tagihan.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold">
                  2
                </div>
                <span>
                  <strong>Minta Ulasan Langsung (Script Kasir):</strong> &ldquo;Kak, boleh bantu review 5 bintang di Google Maps dengan scan kartu ini? Sangat membantu usaha kami.&rdquo;
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold">
                  3
                </div>
                <span>
                  <strong>Berikan Reward Kecil:</strong> Beri diskon 5% atau bonus es teh/dessert kecil untuk setiap review yang masuk.
                </span>
              </li>
            </ul>

            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span>Buka Panduan Outlet & Tips Bintang 5</span>
            </button>

            {/* Admin Lapangan Support */}
            {adminContact && (
              <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 block">Mitra Lapangan Anda:</span>
                  <span className="text-xs font-semibold text-slate-200">{adminContact.fullName}</span>
                </div>
                {adminWaUrl && (
                  <a
                    href={adminWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition-colors shadow-sm"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Hubungi Mitra Lapangan</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Riwayat Aktivitas Outlet */}
      <div className="pt-2">
        <ActivityLogTable
          title="Riwayat Aktivitas Login & Logout"
          subtitle="Catatan riwayat kapan pemilik akun outlet login dan logout dari sistem."
          isOutletView={true}
        />
      </div>

      {isEditModalOpen && (
        <EditProfileModal
          user={{
            fullName: user.fullName,
            email: user.email,
            whatsappNumber: user.whatsappNumber,
            role: "USER",
          }}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => router.refresh()}
        />
      )}

      {isRequestCardModalOpen && (
        <RequestCardModal
          mode="OUTLET"
          user={{
            fullName: user.fullName,
            whatsappNumber: user.whatsappNumber,
          }}
          outlet={{
            name: outlet.name,
          }}
          currentCardCount={cards.length}
          targetContact={adminContact}
          onClose={() => setIsRequestCardModalOpen(false)}
        />
      )}

      {/* User Guide / Buku Modul Panduan Toko */}
      <UserGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        initialRole="OUTLET"
      />

      {/* Pop-Up Sambutan Tawarkan Pasang Aplikasi di HP Saat Login */}
      <PwaWelcomeModal
        ownerName={user.fullName || "Pemilik Toko"}
        outletName={outlet.name}
      />
    </div>
  );
}
