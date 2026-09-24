"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
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
  Crown,
  Clock,
  LogOut,
  Loader2,
  Menu,
  ChevronRight,
  Globe,
  Bell,
  CheckCircle2,
  History,
  Info,
  Zap,
} from "lucide-react";
import { getCardScanUrl } from "@/lib/qr-export";
import { showSuccessAlert, showWelcomeAlert } from "@/lib/swal";
import { logLogoutAction } from "@/lib/actions/auth.actions";
import { EditProfileModal } from "@/components/dashboard/EditProfileModal";
import { RequestCardModal } from "@/components/dashboard/RequestCardModal";
import { UpgradeMemberModal } from "@/components/dashboard/UpgradeMemberModal";
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
import { SiteSettingModel } from "@/types/models";

type PortalTab = "OVERVIEW" | "CARDS" | "REVIEWS" | "GOOGLE_REVIEW" | "MEMBERSHIP";

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
    isMember?: boolean;
    membershipStartedAt?: string | Date | null;
    membershipExpiresAt?: string | Date | null;
    hasPendingPayment?: boolean;
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
  siteSetting?: SiteSettingModel;
}

export function PortalClientView({ user, outlet, adminContact, siteSetting }: PortalClientViewProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<PortalTab>("OVERVIEW");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRequestCardModalOpen, setIsRequestCardModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);

  // Sync login status to localStorage for instant PWA redirection
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("smartqr_logged_in", "true");
      localStorage.setItem("smartqr_user_role", "USER");
    }
  }, []);

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
    type: "FIVE_STAR" | "FOUR_STAR" | "SCAN";
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

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        lastPolledRef.current = Date.now();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const pollRealtime = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      try {
        const res = await fetch(`/api/portal/realtime?outletId=${outlet.id}&since=${lastPolledRef.current}`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const data = await res.json();
        if (!isSubscribed) return;

        if (typeof data.totalScans === "number") {
          setLiveTotalScans((prev) => (data.totalScans > prev ? data.totalScans : prev));
        }

        if (Array.isArray(data.newEvents) && data.newEvents.length > 0) {
          const freshEvents = data.newEvents.filter(
            (ev: { id: string }) => !processedEventIdsRef.current.has(ev.id)
          );

          freshEvents.forEach((ev: { id: string }) => processedEventIdsRef.current.add(ev.id));

          if (freshEvents.length > 0) {
            const fiveStarEvent = freshEvents.find((ev: { action: string }) => ev.action === "FIVE_STAR_REVIEW");
            const fourStarEvent = freshEvents.find((ev: { action: string }) => ev.action === "FOUR_STAR_REVIEW");
            const scanEvent = freshEvents.find((ev: { action: string }) => ev.action === "SCAN_CARD");

            if (fiveStarEvent) {
              if (outlet.isMember) {
                unlockAudioContext();
                playCashierDing();
                speakVoiceAnnouncement("Ulasan bintang 5 baru saja diterima!");
                triggerSmartphoneVibration();
                sendSmartphoneNotification(
                  "Ulasan Bintang 5 Masuk! ⭐⭐⭐⭐⭐",
                  fiveStarEvent.description || "Seorang pelanggan baru saja memberikan ulasan 5 bintang di outlet Anda."
                );
              }
              setRealtimeAlert({
                id: fiveStarEvent.id,
                title: "Ulasan Bintang 5 Diterima! ⭐⭐⭐⭐⭐",
                desc: fiveStarEvent.description || "Pengunjung baru saja memberikan ulasan bintang 5 untuk toko Anda!",
                type: "FIVE_STAR",
              });
            } else if (fourStarEvent) {
              if (outlet.isMember) {
                unlockAudioContext();
                playCashierDing();
                speakVoiceAnnouncement("Ulasan bintang 4 baru saja diterima!");
                triggerSmartphoneVibration();
                sendSmartphoneNotification(
                  "Ulasan Bintang 4 Masuk! ⭐⭐⭐⭐",
                  fourStarEvent.description || "Seorang pelanggan baru saja memberikan ulasan 4 bintang di outlet Anda."
                );
              }
              setRealtimeAlert({
                id: fourStarEvent.id,
                title: "Ulasan Bintang 4 Diterima! ⭐⭐⭐⭐",
                desc: fourStarEvent.description || "Pengunjung baru saja memberikan ulasan bintang 4 untuk toko Anda!",
                type: "FOUR_STAR",
              });
            } else if (scanEvent) {
              if (outlet.isMember) {
                unlockAudioContext();
                speakVoiceAnnouncement("Pengunjung baru saja scan kartu ulasan meja!");
              }
              setRealtimeAlert({
                id: scanEvent.id,
                title: "Pelanggan Scan Meja! 🛎️",
                desc: scanEvent.description || "Ada pengunjung yang baru saja melakukan scan kartu QR meja.",
                type: "SCAN",
              });
            }
          }
        }

        lastPolledRef.current = Date.now();
      } catch (err) {
        console.error("Realtime poll error:", err);
      }
    };

    const interval = setInterval(pollRealtime, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [outlet?.id, outlet?.isMember, outlet?.name]);

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

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    if (typeof window !== "undefined") {
      localStorage.removeItem("smartqr_logged_in");
      localStorage.removeItem("smartqr_user_role");
    }
    try {
      await logLogoutAction();
    } catch (e) {
      console.error("Error logging logout activity:", e);
    } finally {
      await signOut({ callbackUrl: "/login" });
    }
  };

  const adminWaUrl = adminContact?.whatsappNumber
    ? `https://wa.me/${adminContact.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
        `Halo ${adminContact.fullName}, saya ${user.fullName} dari outlet ${outlet?.name || ""}.`
      )}`
    : null;

  const getTabTitle = (tab: PortalTab) => {
    switch (tab) {
      case "OVERVIEW":
        return "Ringkasan Outlet";
      case "CARDS":
        return "Kartu Smart QR";
      case "REVIEWS":
        return "Riwayat Scan & Ulasan";
      case "GOOGLE_REVIEW":
        return "Google Review & Tips";
      case "MEMBERSHIP":
        return "Member Premium VIP";
      default:
        return "Portal Outlet";
    }
  };

  if (!mounted) {
    return null;
  }

  if (!outlet) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center max-w-md w-full shadow-2xl">
          <Store className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Outlet Belum Terhubung</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Akun Anda belum memiliki data outlet yang terhubung dengan kartu QR. Silakan hubungi admin lapangan yang mendaftarkan Anda.
          </p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex relative selection:bg-indigo-500 selection:text-white">
      {/* Realtime In-App Floating Notification Banner */}
      {realtimeAlert && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 z-[60] sm:max-w-md animate-in slide-in-from-top-4 duration-300">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/25 via-slate-900 to-indigo-950/90 border-2 border-amber-400 shadow-2xl shadow-amber-500/30 flex items-start gap-3 backdrop-blur-xl">
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

      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Modern Left Sidebar Navigation */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#090d16] border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0 shadow-2xl shadow-indigo-950/50" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {siteSetting?.dashboardLogoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={siteSetting.dashboardLogoUrl}
                alt="Logo"
                className="w-10 h-10 object-contain drop-shadow-md shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5 truncate">
                Smart QR <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 font-semibold">Outlet</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium truncate" title={outlet.name}>
                {outlet.name}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Nav List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Section: Menu Utama */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Menu Utama
            </div>

            {/* 1. Ringkasan */}
            <button
              onClick={() => {
                setActiveTab("OVERVIEW");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "OVERVIEW"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span className="truncate">Ringkasan Outlet</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-800/80 text-slate-300 border border-slate-700/50">
                Utama
              </span>
            </button>

            {/* 2. Kartu Smart QR */}
            <button
              onClick={() => {
                setActiveTab("CARDS");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "CARDS"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <CreditCard className="w-4 h-4 shrink-0" />
                <span className="truncate">Kartu Smart QR</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                {cards.length} Unit
              </span>
            </button>

            {/* 3. Riwayat Scan & Ulasan */}
            <button
              onClick={() => {
                setActiveTab("REVIEWS");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "REVIEWS"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <History className="w-4 h-4 shrink-0" />
                <span className="truncate">Riwayat & Ulasan</span>
              </div>
              {outlet.isMember ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  👑 VIP
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-800 text-slate-400">
                  {liveTotalScans}
                </span>
              )}
            </button>

            {/* 4. Google Review & Tips */}
            <button
              onClick={() => {
                setActiveTab("GOOGLE_REVIEW");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "GOOGLE_REVIEW"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Star className="w-4 h-4 shrink-0" />
                <span className="truncate">Review Google & Tips</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                5 ⭐
              </span>
            </button>

            {/* 5. Member Premium VIP */}
            <button
              onClick={() => {
                setActiveTab("MEMBERSHIP");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "MEMBERSHIP"
                  ? "bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-slate-950 shadow-lg shadow-amber-500/25 font-black"
                  : "text-amber-300/90 hover:text-amber-200 hover:bg-amber-500/10"
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Crown className={`w-4 h-4 shrink-0 ${activeTab === "MEMBERSHIP" ? "text-slate-950" : "text-amber-400"}`} />
                <span className="truncate">Member Premium VIP</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black border ${
                activeTab === "MEMBERSHIP"
                  ? "bg-slate-950 text-amber-300 border-slate-950"
                  : outlet.isMember
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}>
                {outlet.isMember ? "AKTIF" : "UPGRADE"}
              </span>
            </button>
          </div>

          {/* Section: Bantuan & Pintasan */}
          <div className="space-y-1 pt-2 border-t border-slate-800/60">
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Bantuan & Pintasan
            </div>

            {/* Buku Modul Panduan */}
            <button
              onClick={() => {
                setIsGuideModalOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-sky-300 hover:text-white bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-all cursor-pointer text-left shadow-sm group"
            >
              <div className="flex items-center gap-3 truncate">
                <BookOpen className="w-4 h-4 shrink-0 text-sky-400 group-hover:scale-110 transition-transform" />
                <span className="truncate">Buku Panduan Outlet</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                PANDUAN
              </span>
            </button>

            {/* Pasang Aplikasi di HP */}
            <InstallPwaButton variant="drawer" label="Pasang Aplikasi di HP" />

            {/* Hubungi Mitra Lapangan WhatsApp */}
            {adminWaUrl && (
              <a
                href={adminWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 truncate">
                  <MessageCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="truncate">Mitra Lapangan</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>
            )}

            {/* Buka Landing Page Publik */}
            <a
              href="/?view=landing"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 truncate">
                <Globe className="w-4 h-4 shrink-0 text-indigo-400" />
                <span className="truncate">Lihat Landing Page</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          </div>
        </div>

        {/* Sidebar Footer User Profile Card */}
        <div className="p-3 border-t border-slate-800/80 shrink-0">
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2.5 shadow-sm">
            <div
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
              title="Klik untuk Edit Profil"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : "O"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-xs text-white truncate group-hover:text-sky-300 transition-colors">
                  {user.fullName || "Pemilik Outlet"}
                </span>
                <span className={`inline-flex items-center w-fit text-[9px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 border ${
                  outlet.isMember
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-sky-500/20 text-sky-300 border-sky-500/30"
                }`}>
                  {outlet.isMember ? "👑 VIP MEMBER" : "OUTLET MITRA"}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-xl transition-all cursor-pointer shrink-0 disabled:opacity-50"
              title="Logout / Keluar Akun"
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area (Offset by Sidebar on desktop) */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0 min-h-screen">
        {/* Modern Sticky Top Header */}
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Buka Navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="truncate">{outlet.name}</span>
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                <span className="text-slate-300 font-semibold">{getTabTitle(activeTab)}</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {getTabTitle(activeTab)}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <NotificationPrompt outletName={outlet.name} outletId={outlet.id} />

            {/* Member Status Badge / Upgrade Button */}
            {outlet.isMember ? (
              <button
                onClick={() => setActiveTab("MEMBERSHIP")}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold shadow-sm hover:scale-105 transition-all cursor-pointer"
                title="Lihat status Member VIP"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>VIP Member</span>
              </button>
            ) : (
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-slate-950 text-xs font-extrabold shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse"
                title="Tingkatkan ke Member VIP"
              >
                <Crown className="w-3.5 h-3.5 text-slate-950" />
                <span className="hidden sm:inline">Tingkatkan Member</span>
                <span className="sm:hidden">Upgrade</span>
              </button>
            )}

            {/* Quick Tes Scan Button */}
            {scanUrl && (
              <a
                href={scanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                title="Uji coba scan kartu pelanggan"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Tes Scan</span>
              </a>
            )}

            <InstallPwaButton variant="compact" label="Pasang APK" />
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* TAB 1: OVERVIEW (Ringkasan Outlet) */}
          {activeTab === "OVERVIEW" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Welcome Hero Banner */}
              <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900/60 via-slate-900/80 to-sky-950/60 border border-indigo-500/20 rounded-2xl sm:rounded-3xl p-5 sm:p-8 card-glow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold mb-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Smart Google Review Card
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {outlet.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                      Kelola kartu scan meja, pantau statistik ulasan pelanggan Google Review, dan aktifkan fitur dering real-time.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-3 flex-wrap">
                      <span>Pemilik: <strong className="text-white font-medium">{user.fullName}</strong></span>
                      <span>•</span>
                      <span>WhatsApp: <strong className="text-white font-medium">{user.whatsappNumber || "-"}</strong></span>
                    </div>
                  </div>

                  {/* Big Live Scan Metric */}
                  <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-slate-400">
                          Total Scan Ulasan
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-3xl sm:text-4xl font-black text-white">
                          {liveTotalScans}
                        </span>
                        <span className="text-xs font-semibold text-emerald-400">kali scan</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Scan */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 stats-card stats-card-cyan">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Total Scan Pengunjung</span>
                    <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-bold text-white">{liveTotalScans}</span>
                    <span className="text-xs text-sky-400 font-medium">scan</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block truncate">Akumulasi ulasan toko</span>
                </div>

                {/* Total Kartu */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 stats-card stats-card-indigo">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Unit Kartu Terdaftar</span>
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-bold text-white">{cards.length}</span>
                    <span className="text-xs text-indigo-400 font-medium">unit meja</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block truncate">Kartu akrilik fisik</span>
                </div>

                {/* Google Review URL */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 stats-card stats-card-amber">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Target Google Review</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Star className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-base sm:text-lg font-bold text-amber-300 truncate">
                      {outlet.googleReviewUrl ? "Terhubung" : "Belum Diatur"}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block truncate">Google Maps Business</span>
                </div>

                {/* Membership */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 stats-card stats-card-emerald">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Status Keanggotaan</span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Crown className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-base sm:text-lg font-bold text-emerald-400 truncate">
                      {outlet.isMember ? "👑 VIP Member" : "Non-Member"}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block truncate">
                    {outlet.isMember ? "Fitur Dering Terbuka" : "Bisa Upgrade Rp 45rb"}
                  </span>
                </div>
              </div>

              {/* Membership Status / Upgrade Banner */}
              {outlet.isMember ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-950/20 border border-amber-500/40 text-amber-200 shadow-xl shadow-amber-500/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shrink-0 shadow-lg shadow-amber-500/30">
                        <Crown className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-sm sm:text-base">MEMBER PREMIUM AKTIF</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] tracking-wide">
                            👑 VIP OUTLET
                          </span>
                        </div>
                        <p className="text-xs text-amber-200/90 mt-0.5">
                          Lonceng kasir berbunyi di HP pelanggan, notifikasi dering & getar HP mati aktif, serta riwayat ulasan tersimpan rapi.
                          {outlet.membershipExpiresAt && (
                            <span className="text-slate-300 ml-1 font-semibold">
                              (Aktif s/d {new Date(outlet.membershipExpiresAt).toLocaleDateString("id-ID")})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab("MEMBERSHIP")}
                      className="shrink-0 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Lihat Detail VIP
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-2 border-amber-500/50 shadow-xl shadow-amber-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>FITUR DERING & NOTIFIKASI TERKUNCI</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Tingkatkan ke Member Premium (Hanya Rp {(siteSetting?.membershipPrice || 45000).toLocaleString("id-ID")})
                    </h3>
                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                      Dapatkan lonceng kasir & sambutan audio di HP pengunjung, notifikasi dering saat HP tertutup, dan pencatatan riwayat ulasan lengkap di database.
                    </p>
                    {outlet.hasPendingPayment && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Bukti transfer telah dikirim & sedang diverifikasi oleh Super Admin.</span>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsUpgradeModalOpen(true)}
                      className="w-full md:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <Crown className="w-4 h-4" />
                      <span>{outlet.hasPendingPayment ? "Cek Status / Kirim Ulang Bukti" : "Tingkatkan ke Member 🚀"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Actions Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => setActiveTab("CARDS")}
                  className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left transition-all hover:scale-[1.01] cursor-pointer group"
                >
                  <CreditCard className="w-5 h-5 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white block">Kartu Smart QR</span>
                  <span className="text-[11px] text-slate-400">Lihat visual 3D & unit</span>
                </button>

                {scanUrl && (
                  <a
                    href={scanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left transition-all hover:scale-[1.01] cursor-pointer group"
                  >
                    <ExternalLink className="w-5 h-5 text-sky-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-white block">Uji Tes Scan</span>
                    <span className="text-[11px] text-slate-400">Buka link kartu meja</span>
                  </a>
                )}

                <button
                  onClick={handleCopy}
                  className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left transition-all hover:scale-[1.01] cursor-pointer group"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-emerald-400 mb-2" />
                  ) : (
                    <Copy className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="text-xs font-bold text-white block">
                    {copied ? "Link Tersalin!" : "Salin Link Scan"}
                  </span>
                  <span className="text-[11px] text-slate-400">Untuk bagikan ke medsos</span>
                </button>

                <button
                  onClick={() => setIsRequestCardModalOpen(true)}
                  className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left transition-all hover:scale-[1.01] cursor-pointer group"
                >
                  <PlusCircle className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white block">Tambah Kartu QR</span>
                  <span className="text-[11px] text-slate-400">Minta ke mitra lapangan</span>
                </button>
              </div>

              {/* Admin Lapangan Contact Card */}
              {adminContact && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                        Mitra Lapangan Pendamping Toko
                      </span>
                      <span className="text-sm font-bold text-white">{adminContact.fullName}</span>
                    </div>
                  </div>

                  {adminWaUrl && (
                    <a
                      href={adminWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Chat WhatsApp Mitra Lapangan</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CARDS (Kartu Smart QR) */}
          {activeTab === "CARDS" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Visualisasi & Pengaturan Kartu Smart QR</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pilih kartu meja fisik Anda untuk melihat animasi 3D, jumlah scan per meja, dan link ulasan.
                  </p>
                </div>

                <button
                  onClick={() => setIsRequestCardModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer self-start sm:self-auto"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Minta Tambah Kartu QR</span>
                </button>
              </div>

              {/* Multi-Card Switcher Tabs (If outlet has > 1 cards) */}
              {cards.length > 1 && (
                <div className="bg-slate-900/90 p-2 rounded-2xl border border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 px-2 mb-2 flex items-center justify-between">
                    <span>Pilih Kartu Meja Fisik:</span>
                    <span className="text-sky-400 font-bold">{cards.length} Unit Kartu Terdaftar</span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {cards.map((c, idx) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setSelectedCardIndex(idx)}
                        className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center cursor-pointer shrink-0 ${
                          selectedCardIndex === idx
                            ? "bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/40"
                            : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                        }`}
                      >
                        <span className="truncate max-w-[120px]">Meja {idx + 1} ({c.code})</span>
                        <span className={`text-[10px] font-medium mt-0.5 ${selectedCardIndex === idx ? "text-sky-200" : "text-emerald-400"}`}>
                          {c.scanCount} kali scan
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Grid 2 Kolom: Kiri Visual 3D, Kanan Detail & HAKI */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Visual 3D Card Widget */}
                <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 flex flex-col items-center text-center">
                  <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-indigo-400" />
                      Visual Kartu Fisik
                    </span>
                    <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                      {activeCard?.code || "-"}
                    </span>
                  </div>

                  <div className="w-full my-2">
                    <Interactive3DCard
                      cardCode={activeCard?.code || "-"}
                      outletName={outlet.name}
                      scanUrl={scanUrl}
                      scanCount={activeCard?.scanCount || 0}
                    />
                  </div>

                  <div className="w-full mt-4 grid grid-cols-2 gap-2">
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
                </div>

                {/* Info Detail Kartu & HAKI */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-sky-400" />
                      Informasi Kartu Aktif ({activeCard?.code || "-"})
                    </h3>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block mb-1">Kode Kartu:</span>
                        <strong className="text-white font-mono font-bold text-sm">{activeCard?.code || "-"}</strong>
                      </div>

                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block mb-1">Total Scan Meja Ini:</span>
                        <strong className="text-emerald-400 font-bold text-sm">{activeCard?.scanCount || 0} kali</strong>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-xs mb-1.5">Link Scan Kartu Meja:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={scanUrl}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs px-3 py-2 rounded-lg focus:outline-none"
                        />
                        <button
                          onClick={handleCopy}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors"
                        >
                          Salin
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Peringatan Hak Cipta & Larangan Penggandaan Desain Fisik */}
                  <div className="p-5 rounded-3xl bg-gradient-to-b from-amber-500/15 via-amber-950/25 to-slate-950/80 border border-amber-500/30 space-y-3 shadow-lg shadow-amber-500/5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Peringatan Hak Cipta & Keaslian (HAKI)</span>
                      </div>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 tracking-wider">
                        RESMI
                      </span>
                    </div>

                    <p className="text-slate-300 leading-relaxed text-xs">
                      Desain fisik standee akrilik, kartu chip NFC, dan tata letak Smart QR dilindungi oleh <strong>Undang-Undang Hak Cipta</strong>. Pengguna/mitra toko <strong>dilarang keras menggandakan</strong>, meniru, atau mencetak ulang secara mandiri tanpa izin resmi.
                    </p>

                    <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-xs text-amber-200/90 font-medium">
                        Butuh tambahan unit kartu untuk meja toko Anda?
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsRequestCardModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/25 cursor-pointer shrink-0 transition-transform active:scale-95"
                      >
                        + Minta Tambah Kartu
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REVIEWS (Riwayat Scan & Ulasan) */}
          {activeTab === "REVIEWS" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="pb-3 border-b border-slate-800">
                <h2 className="text-lg sm:text-xl font-bold text-white">Riwayat Scan Meja & Ulasan Pelanggan</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pantau setiap pelanggan yang melakukan tap kartu meja atau memberikan penilaian bintang di Google Review.
                </p>
              </div>

              {outlet.isMember && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-sky-950/30 to-purple-950/40 border border-indigo-500/20 flex items-start gap-3.5 shadow-lg">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400 mt-0.5">
                    <Zap className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span>Notifikasi Real-time Aktif (Bebas Memori Database)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Live Dering 🛎️
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Setiap kali pelanggan scan kartu meja atau memberikan bintang 5, lonceng kasir & push notifikasi di HP Anda langsung berdering secara instan. Notifikasi diproses langsung ke perangkat secara real-time tanpa membebani penyimpanan database.
                    </p>
                  </div>
                </div>
              )}

              <ActivityLogTable
                title={outlet.isMember ? "Riwayat Scan Kartu & Ulasan Pelanggan 🛎️" : "Riwayat Aktivitas Akun"}
                subtitle={
                  outlet.isMember
                    ? "Catatan riwayat setiap pengunjung yang scan kartu meja, ulasan bintang 5 & 4, serta akses akun outlet Anda."
                    : "Catatan riwayat kapan pemilik akun outlet login dan logout dari sistem. (Tingkatkan ke Member Premium untuk membuka fitur lonceng kasir & notifikasi ulasan)."
                }
                isOutletView={true}
                isMember={outlet.isMember}
              />
            </div>
          )}

          {/* TAB 4: GOOGLE_REVIEW (Tujuan Google Review & Tips) */}
          {activeTab === "GOOGLE_REVIEW" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="pb-3 border-b border-slate-800">
                <h2 className="text-lg sm:text-xl font-bold text-white">Tujuan Ulasan Google Review & Tips Bintang 5</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Konfigurasi link destinasi Google Maps toko Anda dan pelajari teknik efektif mengumpulkan ulasan bintang 5.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Target URL Box */}
                <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    Destinasi Google Review
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Setiap kali pengunjung memindai kartu QR di meja kasir atau meja makan, mereka akan langsung dialihkan ke URL Google Review ini.
                  </p>

                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[11px] text-slate-400 block font-medium">URL Google Maps Review Anda:</span>
                    <div className="break-all font-mono text-xs text-slate-200 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                      {outlet.googleReviewUrl}
                    </div>
                    <div className="pt-1 flex items-center justify-end">
                      <a
                        href={scanUrl || outlet.googleReviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <span>Buka Link Review</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-2">
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

                {/* Tips Mengumpulkan 100+ Ulasan Bintang 5 */}
                <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-emerald-400" />
                    Tips Mengumpulkan 100+ Ulasan Bintang 5
                  </h3>

                  <ul className="space-y-3 text-xs text-slate-300">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold border border-emerald-500/30">
                        1
                      </div>
                      <span>
                        <strong className="text-white">Letakkan di Meja Kasir & Meja Makan:</strong> Taruh kartu fisik di tempat yang paling sering dilihat pelanggan saat menunggu makanan atau saat membayar tagihan.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold border border-emerald-500/30">
                        2
                      </div>
                      <span>
                        <strong className="text-white">Script Ramah Kasir:</strong> &ldquo;Kak, boleh bantu review 5 bintang di Google Maps dengan scan kartu ini? Sangat membantu usaha kami.&rdquo;
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold border border-emerald-500/30">
                        3
                      </div>
                      <span>
                        <strong className="text-white">Reward / Apresiasi Kecil:</strong> Berikan diskon 5% atau bonus es teh/dessert kecil untuk setiap pengunjung yang menunjukkan bukti ulasan bintang 5.
                      </span>
                    </li>
                  </ul>

                  <button
                    onClick={() => setIsGuideModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer mt-2"
                  >
                    <BookOpen className="w-4 h-4 text-sky-400" />
                    <span>Buka Panduan Lengkap Outlet</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MEMBERSHIP (Keanggotaan Member Premium VIP) */}
          {activeTab === "MEMBERSHIP" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="pb-3 border-b border-slate-800">
                <h2 className="text-lg sm:text-xl font-bold text-white">Status & Keanggotaan Member Premium VIP</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Buka fitur suara lonceng kasir di HP pengunjung, dering notifikasi smartphone realtime, dan pencatatan riwayat ulasan.
                </p>
              </div>

              {outlet.isMember ? (
                /* VIP Active Box */
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-amber-950/30 border-2 border-amber-500/50 shadow-2xl shadow-amber-500/10 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/30 shrink-0">
                        👑
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl sm:text-2xl font-black text-white">MEMBER PREMIUM AKTIF</h3>
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs">
                            VIP
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-amber-200/90 mt-1">
                          Selamat! Seluruh fitur premium ulasan ulasan digital telah aktif untuk outlet Anda.
                        </p>
                      </div>
                    </div>

                    {outlet.membershipExpiresAt && (
                      <div className="bg-slate-950/80 p-3 rounded-xl border border-amber-500/30 text-right">
                        <span className="text-[11px] text-slate-400 block">Masa Aktif Hingga:</span>
                        <strong className="text-sm font-bold text-amber-300">
                          {new Date(outlet.membershipExpiresAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/20 space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-white">Lonceng Kasir & Suara</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Lonceng kasir berdentang ganda & suara sambutan bahasa Indonesia di HP pelanggan saat ulasan 5 bintang.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/20 space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                        <Bell className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-white">Dering HP Layar Mati</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        HP pemilik outlet berdering kencang & bergetar saat ulasan masuk, bahkan saat aplikasi ditutup total.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/20 space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                        <History className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-white">Riwayat Database</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Seluruh aktivitas scan meja & ulasan bintang 5 tersimpan permanen di cloud storage akun Anda.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/20 space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                        <Crown className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-white">Status VIP Outlet</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Lencana emas VIP tampil di profil toko dan sistem audit trail seluruh mitra.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Non-Member Upgrade Presentation */
                <div className="space-y-6">
                  <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-2 border-amber-500/50 shadow-xl shadow-amber-500/10 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                          <span>UPGRADE KEANGGOTAAN</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-white">
                          Buka Seluruh Fitur Dering & Riwayat Ulasan
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                          Hanya dengan biaya terjangkau <strong>Rp {(siteSetting?.membershipPrice || 45000).toLocaleString("id-ID")}</strong>, toko Anda akan menjadi outlet prioritas dengan notifikasi dering instan saat pelanggan memberi bintang 5.
                        </p>
                      </div>

                      <div className="bg-slate-950/90 p-5 rounded-2xl border border-amber-500/40 text-center shrink-0">
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                          Biaya Langganan
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
                          Rp {(siteSetting?.membershipPrice || 45000).toLocaleString("id-ID")}
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsUpgradeModalOpen(true)}
                          className="mt-3 w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition-transform active:scale-95 cursor-pointer"
                        >
                          Tingkatkan Sekarang 🚀
                        </button>
                      </div>
                    </div>

                    {outlet.hasPendingPayment && (
                      <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center gap-3">
                        <Clock className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
                        <div className="text-xs text-amber-200">
                          <strong>Bukti Pembayaran Terkirim:</strong> Pembayaran Anda sedang dalam proses verifikasi oleh Super Admin. Setelah disetujui, fitur Member VIP akan aktif secara otomatis.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Perbandingan Fitur */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
                    <h4 className="text-sm font-bold text-white mb-4">Perbandingan Akun Non-Member vs Member VIP</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="pb-3 font-semibold">Fitur Sistem</th>
                            <th className="pb-3 font-semibold text-center w-36">Non-Member</th>
                            <th className="pb-3 font-semibold text-center w-44 text-amber-400">Member Premium VIP 👑</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          <tr>
                            <td className="py-3 text-slate-300">Scan Kartu Meja Pengunjung</td>
                            <td className="py-3 text-center text-emerald-400 font-semibold">Aktif</td>
                            <td className="py-3 text-center text-emerald-400 font-bold">Aktif</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-slate-300">Suara Lonceng Kasir di HP Pengunjung</td>
                            <td className="py-3 text-center text-slate-500">Mati (Hening)</td>
                            <td className="py-3 text-center text-amber-400 font-bold">Aktif (Dering Ganda) 🔔</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-slate-300">Dering & Getar HP Pemilik (Layar Mati)</td>
                            <td className="py-3 text-center text-slate-500">Tidak Tersedia</td>
                            <td className="py-3 text-center text-amber-400 font-bold">Aktif (Push Realtime) 📲</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-slate-300">Pencatatan Riwayat Scan di Database</td>
                            <td className="py-3 text-center text-slate-500">Tidak Disimpan</td>
                            <td className="py-3 text-center text-emerald-400 font-bold">Tersimpan Lengkap 📊</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-slate-300">Lencana VIP Gold di Dashboard</td>
                            <td className="py-3 text-center text-slate-500">Standar</td>
                            <td className="py-3 text-center text-amber-400 font-bold">👑 VIP Gold</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <footer className="pt-8 pb-4 border-t border-slate-900 text-center text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Smart QR Review Platform. Portal Klien & Toko Mitra.
          </footer>
        </main>
      </div>

      {/* Modals */}
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

      {/* Modal Upgrade Member & Kirim Bukti Transfer */}
      <UpgradeMemberModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        outlet={outlet}
        siteSetting={siteSetting}
        onSuccess={() => router.refresh()}
      />

      {/* Pop-Up Sambutan Tawarkan Pasang Aplikasi di HP Saat Login */}
      <PwaWelcomeModal
        ownerName={user.fullName || "Pemilik Toko"}
        outletName={outlet.name}
      />
    </div>
  );
}
