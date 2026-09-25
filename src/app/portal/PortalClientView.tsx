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
  Smartphone,
  RotateCcw,
} from "lucide-react";
import { getCardScanUrl, generateQrDataUrl } from "@/lib/qr-export";
import { showSuccessAlert, showWelcomeAlert, showErrorAlert } from "@/lib/swal";
import { logLogoutAction } from "@/lib/actions/auth.actions";
import {
  updateOutletVipSettingsAction,
  resetStaffPairingTokenAction,
} from "@/lib/actions/membership.actions";
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
  playSoundEffect,
  SOUND_EFFECT_OPTIONS,
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
    soundEffect?: string;
    customGreetingText?: string | null;
    staffPairingToken?: string | null;
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

  // VIP Sound & Greeting Settings State
  const [selectedSoundEffect, setSelectedSoundEffect] = useState<string>(outlet?.soundEffect || "BELL_DOUBLE");
  const [customGreetingText, setCustomGreetingText] = useState<string>(outlet?.customGreetingText || "");
  const [isSavingVipSettings, setIsSavingVipSettings] = useState(false);

  // Staff Pairing QR State
  const [activePairingToken, setActivePairingToken] = useState<string>(outlet?.staffPairingToken || "");
  const [staffQrDataUrl, setStaffQrDataUrl] = useState<string>("");
  const [isResettingPairing, setIsResettingPairing] = useState(false);
  const [copiedStaffLink, setCopiedStaffLink] = useState(false);

  // Auto-generate Staff QR code when activePairingToken changes
  useEffect(() => {
    if (activePairingToken && typeof window !== "undefined") {
      const staffUrl = `${window.location.origin}/kasir/${activePairingToken}`;
      generateQrDataUrl(staffUrl)
        .then((url) => setStaffQrDataUrl(url))
        .catch((err) => console.error("Staff QR gen error:", err));
    }
  }, [activePairingToken]);

  const handleTestSoundChime = (effectId: string) => {
    unlockAudioContext();
    playSoundEffect(effectId);
    triggerSmartphoneVibration([200, 100, 200]);
  };

  const handleTestVoice = (customText?: string) => {
    unlockAudioContext();
    const textToSpeak =
      customText?.trim() ||
      `Terima kasih banyak kak sudah mampir ke ${outlet?.name || "outlet kami"}! Ulasan bintang 5 kakak sangat berharga bagi kemajuan usaha kami.`;
    speakVoiceAnnouncement(textToSpeak);
  };

  const handleSaveVipSettings = async () => {
    if (!outlet?.id) return;
    setIsSavingVipSettings(true);
    try {
      const res = await updateOutletVipSettingsAction({
        outletId: outlet.id,
        soundEffect: selectedSoundEffect,
        customGreetingText: customGreetingText.trim() || undefined,
      });
      if (res.success) {
        showSuccessAlert("Berhasil Disimpan! 🎉", "Pengaturan nada dering dan suara sambutan AI toko Anda telah diperbarui.");
      } else {
        showErrorAlert("Gagal Menyimpan", res.message || "Terjadi kesalahan.");
      }
    } catch {
      showErrorAlert("Error", "Gagal menghubungi server.");
    } finally {
      setIsSavingVipSettings(false);
    }
  };

  const handleResetStaffPairing = async () => {
    if (!outlet?.id) return;
    if (
      !confirm(
        "Konfirmasi: Apakah Anda yakin ingin mereset Kode Pairing Kasir? Semua HP staf kasir yang terhubung sebelumnya harus scan ulang QR terbaru."
      )
    )
      return;
    setIsResettingPairing(true);
    try {
      const res = await resetStaffPairingTokenAction(outlet.id);
      if (res.success && res.newToken) {
        setActivePairingToken(res.newToken);
        showSuccessAlert("QR Kasir Direset! 🔄", "Kode pairing kasir berhasil diperbarui. Perangkat staf lama telah diputus.");
      } else {
        showErrorAlert("Gagal", res.message || "Gagal mereset token.");
      }
    } catch {
      showErrorAlert("Error", "Gagal menghubungi server.");
    } finally {
      setIsResettingPairing(false);
    }
  };

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
        return "Riwayat & Sesi Akun";
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

            {/* 3. Notifikasi & Log Sesi */}
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
                <span className="truncate">Riwayat Sesi Akun</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-800 text-slate-400">
                Log
              </span>
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

            {/* Status Dering & Notifikasi HP */}
            <div className="pt-1">
              <NotificationPrompt outletName={outlet.name} outletId={outlet.id} className="w-full justify-between" />
            </div>

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
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Buka Navigasi"
            >
              <Menu className="w-5 h-5 shrink-0" />
            </button>

            <div className="flex flex-col min-w-0">
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="truncate max-w-[150px] lg:max-w-xs">{outlet.name}</span>
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                <span className="text-slate-300 font-semibold truncate">{getTabTitle(activeTab)}</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {getTabTitle(activeTab)}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Tes Scan Button - Desktop only */}
            {scanUrl && (
              <a
                href={scanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                title="Uji coba scan kartu pelanggan"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Tes Scan</span>
              </a>
            )}

            {/* Member Status Badge / Upgrade Button */}
            {outlet.isMember ? (
              <button
                onClick={() => setActiveTab("MEMBERSHIP")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold shadow-sm hover:scale-105 transition-all cursor-pointer shrink-0"
                title="Lihat status Member VIP"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>VIP Member</span>
              </button>
            ) : (
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-slate-950 text-xs font-extrabold shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse shrink-0"
                title="Tingkatkan ke Member VIP"
              >
                <Crown className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                <span>Tingkatkan Member</span>
              </button>
            )}
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

                {/* Hero Quick Actions & Live Status Bar */}
                <div className="mt-5 pt-4 border-t border-indigo-500/20 flex flex-wrap items-center justify-between gap-3 relative z-10">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <NotificationPrompt outletName={outlet.name} outletId={outlet.id} />
                    {scanUrl && (
                      <a
                        href={scanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-all shadow-sm cursor-pointer"
                        title="Uji coba scan kartu pelanggan"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>Tes Scan Meja</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <InstallPwaButton variant="compact" label="Pasang Aplikasi (APK)" />
                  </div>
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Scan */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 stats-card stats-card-cyan">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Total Scan Pengunjung</span>
                    <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                      {siteSetting?.landingPageLogoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={siteSetting.landingPageLogoUrl}
                          alt="Smart QR Logo"
                          className="w-full h-full object-contain drop-shadow"
                        />
                      ) : (
                        <div className="w-full h-full rounded-lg bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white">
                          <QrCode className="w-3.5 h-3.5" />
                        </div>
                      )}
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
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
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
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1.5 shrink-0 shadow-sm">
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12c0 2.03.45 3.84 1.25 5.42l4.03-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
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
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
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
                          Lonceng kasir berbunyi di HP pelanggan, sambutan suara ramah, serta notifikasi dering & getar HP mati aktif.
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
                <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-2 border-amber-500/50 shadow-xl shadow-amber-500/10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>FITUR VIP & MULTI-KASIR TERKUNCI</span>
                    </div>
                    <h3 className="text-base sm:text-xl font-black text-white">
                      Tingkatkan ke Member VIP Premium (Hanya Rp {(siteSetting?.membershipPrice || 45000).toLocaleString("id-ID")})
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                      Buka 5 fasilitas eksklusif: Sambutan Suara AI sebut nama toko Anda, pengumuman ulasan bintang 5 ke speaker kafe/toko via Bluetooth, 4 pilihan nada kasir cuan (&quot;Cha-Ching! 💵&quot;), multi-kasir QR pairing staf, & dering getar layar mati.
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-300">🎙️ Suara AI Toko</span>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-300">📢 Speaker Bluetooth Kafe</span>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-300">🔔 Suara Kasir Cha-Ching</span>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-300">📲 Multi-Kasir QR Staf</span>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-300">⚡ Dering Layar Mati</span>
                    </div>
                    {outlet.hasPendingPayment && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Bukti transfer telah dikirim & sedang diverifikasi oleh Super Admin.</span>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsUpgradeModalOpen(true)}
                      className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <Crown className="w-4 h-4" />
                      <span>{outlet.hasPendingPayment ? "Cek Status / Kirim Ulang Bukti" : "Tingkatkan ke Member 🚀"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Actions Row - Equal Height Precision */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => setActiveTab("CARDS")}
                  className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left transition-all hover:scale-[1.01] cursor-pointer group h-full flex flex-col justify-between"
                >
                  <CreditCard className="w-5 h-5 text-indigo-400 mb-2 group-hover:scale-110 transition-transform shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">Kartu Smart QR</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Lihat visual 3D & unit</span>
                  </div>
                </button>

                {scanUrl && (
                  <a
                    href={scanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left transition-all hover:scale-[1.01] cursor-pointer group h-full flex flex-col justify-between"
                  >
                    <ExternalLink className="w-5 h-5 text-sky-400 mb-2 group-hover:scale-110 transition-transform shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-white block">Uji Tes Scan</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Buka link kartu meja</span>
                    </div>
                  </a>
                )}

                <button
                  onClick={handleCopy}
                  className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left transition-all hover:scale-[1.01] cursor-pointer group h-full flex flex-col justify-between"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-emerald-400 mb-2 shrink-0" />
                  ) : (
                    <Copy className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform shrink-0" />
                  )}
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {copied ? "Link Tersalin!" : "Salin Link Scan"}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Untuk bagikan ke medsos</span>
                  </div>
                </button>

                <button
                  onClick={() => setIsRequestCardModalOpen(true)}
                  className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left transition-all hover:scale-[1.01] cursor-pointer group h-full flex flex-col justify-between"
                >
                  <PlusCircle className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">Tambah Kartu QR</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Minta ke mitra lapangan</span>
                  </div>
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

          {/* TAB 3: REVIEWS (Riwayat & Sesi Akun) */}
          {activeTab === "REVIEWS" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="pb-3 border-b border-slate-800">
                <h2 className="text-lg sm:text-xl font-bold text-white">Riwayat Sesi & Log Akun</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Catatan riwayat aktivitas masuk (login), keluar (logout), dan keamanan akses akun outlet Anda.
                </p>
              </div>

              <ActivityLogTable
                title="Riwayat Aktivitas & Sesi Akun"
                subtitle="Catatan riwayat sesi login, logout, dan status keamanan akun outlet Anda."
                isOutletView={true}
                isMember={false}
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
                  Buka fitur suara AI sebut nama brand toko, 4 pilihan efek suara kasir, dan pairing QR multi-kasir.
                </p>
              </div>

              {outlet.isMember ? (
                /* VIP Active Box & Controls */
                <div className="space-y-6">
                  {/* Status Banner */}
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
                            Selamat! Seluruh fitur premium eksklusif ulasan & sistem multi-kasir telah aktif untuk outlet Anda.
                          </p>
                        </div>
                      </div>

                      {outlet.membershipExpiresAt && (
                        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-amber-500/30 text-right shrink-0">
                          <span className="text-[11px] text-slate-400 block">Masa Aktif Berlangganan:</span>
                          <strong className="text-sm font-bold text-amber-300">
                            s/d {new Date(outlet.membershipExpiresAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* 5 Poin Fitur Unggulan VIP */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-amber-500/20 space-y-1.5 flex flex-col justify-between">
                        <div>
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold mb-2">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <h4 className="text-xs font-bold text-white">Suara AI Sebut Toko</h4>
                          <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                            Menyebut nama toko Anda di HP pelanggan saat ulasan 5 bintang.
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-amber-500/20 space-y-1.5 flex flex-col justify-between">
                        <div>
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold mb-2">
                            <Volume2 className="w-4 h-4" />
                          </div>
                          <h4 className="text-xs font-bold text-white">4 Efek Suara Kasir</h4>
                          <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                            Nada dering kasir: Lonceng Kasir, Cha-Ching Uang, Kristal, Fanfare.
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-amber-500/20 space-y-1.5 flex flex-col justify-between">
                        <div>
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold mb-2">
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <h4 className="text-xs font-bold text-white">Multi-Kasir Pairing</h4>
                          <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                            Konek hingga 3-5 HP staf kasir/barista tanpa bagi-bagi password.
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-indigo-500/30 space-y-1.5 flex flex-col justify-between bg-indigo-950/20">
                        <div>
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold mb-2">
                            📢
                          </div>
                          <h4 className="text-xs font-bold text-white">Speaker Bluetooth</h4>
                          <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                            Umumkan ulasan bintang 5 ke seluruh ruangan kafe via sound system.
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-amber-500/20 space-y-1.5 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
                        <div>
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold mb-2">
                            <Bell className="w-4 h-4" />
                          </div>
                          <h4 className="text-xs font-bold text-white">Dering HP Layar Mati</h4>
                          <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                            HP kasir berdering kencang walau aplikasi ditutup / layar standby.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PUSAT PENGATURAN FITUR VIP - Equal Height Panels */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    {/* PANEL 1: EFEK SUARA KASIR */}
                    <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between h-full">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                              <Volume2 className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-white">1. Pilihan Efek Suara Kasir</h3>
                              <p className="text-[11px] text-slate-400">Pilih nada dering yang berbunyi di meja & kasir</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {SOUND_EFFECT_OPTIONS.map((opt) => (
                            <div
                              key={opt.id}
                              onClick={() => setSelectedSoundEffect(opt.id)}
                              className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                                selectedSoundEffect === opt.id
                                  ? "bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10"
                                  : "bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xl">{opt.icon}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300">
                                    {opt.badge}
                                  </span>
                                </div>
                                <div className="text-xs font-bold text-white leading-tight">{opt.name}</div>
                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{opt.desc}</p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTestSoundChime(opt.id);
                                }}
                                className="w-full py-1.5 mt-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <span>▶️ Tes Dering</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          disabled={isSavingVipSettings}
                          onClick={handleSaveVipSettings}
                          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          {isSavingVipSettings ? "Menyimpan..." : "💾 Terapkan Nada Dering Kasir"}
                        </button>
                      </div>
                    </div>

                    {/* PANEL 2: SAMBUTAN SUARA AI SEBUT NAMA TOKO */}
                    <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between h-full">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-white">2. Suara AI Menyebut Nama Toko</h3>
                              <p className="text-[11px] text-slate-400">Diputar langsung di HP pelanggan saat ulasan 5 bintang</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[11px] font-bold text-slate-300">
                            Teks Ucapan Terima Kasih (Bahasa Indonesia):
                          </label>
                          <textarea
                            rows={4}
                            value={customGreetingText}
                            onChange={(e) => setCustomGreetingText(e.target.value)}
                            placeholder={`Terima kasih banyak kak sudah mampir ke ${outlet.name}! Ulasan bintang 5 kakak sangat berharga bagi kemajuan usaha kami.`}
                            className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed"
                          />
                          <p className="text-[10px] text-slate-400">
                            💡 <em>Biarkan kosong untuk menggunakan teks sambutan otomatis yang sudah ramah & menyebut nama brand toko Anda.</em>
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleTestVoice(customGreetingText)}
                          className="flex-1 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>▶️ Dengarkan AI</span>
                        </button>
                        <button
                          type="button"
                          disabled={isSavingVipSettings}
                          onClick={handleSaveVipSettings}
                          className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          {isSavingVipSettings ? "Menyimpan..." : "💾 Simpan Ucapan AI"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* PANEL 3: MULTI-KASIR PAIRING (QR STAF) */}
                  <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-amber-500/30 space-y-6 shadow-2xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center font-bold text-xl shadow-lg shadow-emerald-500/20">
                          📲
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base sm:text-lg font-black text-white">
                              3. Multi-Kasir Pairing (QR Staf & Kasir)
                            </h3>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                              BEBAS BAGI PASSWORD
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Hubungkan HP kasir, barista, atau pelayan tanpa perlu memberikan password akun toko Anda.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isResettingPairing}
                        onClick={handleResetStaffPairing}
                        className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 self-start md:self-auto transition-colors"
                        title="Reset kode pairing jika staf berhenti bekerja"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isResettingPairing ? "animate-spin" : ""}`} />
                        <span>{isResettingPairing ? "Mereset..." : "🔄 Reset QR Kasir (Kick Staf Resign)"}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                      {/* Kolom QR Code Kasir */}
                      <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 text-center space-y-3">
                        <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center">
                          {staffQrDataUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={staffQrDataUrl}
                              alt="QR Pairing Kasir"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="text-xs text-slate-600 animate-pulse font-medium">
                              Membuat QR Pairing...
                            </div>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-amber-300">
                          📷 Arahkan Kamera HP Kasir ke QR Ini
                        </div>
                      </div>

                      {/* Kolom Petunjuk & Tautan Kasir */}
                      <div className="md:col-span-2 space-y-4">
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Cara Menghubungkan HP Kasir / Karyawan:
                          </h4>
                          <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                            <li>Buka kamera di HP kasir, barista, atau pelayan toko Anda.</li>
                            <li>Arahkan kamera ke QR Code di samping atau kirim tautan kasir di bawah.</li>
                            <li>Layar kasir langsung terbuka dan otomatis siaga berdering saat ulasan bintang 5 masuk.</li>
                            <li>Klik tombol <em>&quot;Aktifkan Dering HP Layar Mati&quot;</em> di HP kasir agar tetap bunyi saat layar dikunci.</li>
                          </ol>
                        </div>

                        {/* Input Link Kasir - Responsive & Touch Friendly */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-400 block">
                            Tautan Layar Kasir Khusus (Bisa Dikirim ke WhatsApp Staf):
                          </label>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={typeof window !== "undefined" ? `${window.location.origin}/kasir/${activePairingToken}` : `/kasir/${activePairingToken}`}
                              className="w-full sm:flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none min-w-0"
                            />
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (typeof window !== "undefined") {
                                    navigator.clipboard.writeText(`${window.location.origin}/kasir/${activePairingToken}`);
                                    setCopiedStaffLink(true);
                                    setTimeout(() => setCopiedStaffLink(false), 2000);
                                  }
                                }}
                                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                {copiedStaffLink ? <CheckCircle2 className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                                <span>{copiedStaffLink ? "Tersalin!" : "Salin Link"}</span>
                              </button>
                              <a
                                href={`/kasir/${activePairingToken}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <ExternalLink className="w-4 h-4" />
                                <span>Tes Layar</span>
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-200/90 leading-relaxed flex items-start gap-2.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>
                            <strong>Keamanan 100% Terjaga:</strong> Layar kasir terisolasi khusus untuk monitoring dering ulasan. Staf kasir tidak bisa melihat password, tidak bisa mengedit data outlet, dan tidak bisa mengubah link Google Maps Anda.
                          </span>
                        </div>
                      </div>
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
                          Buka Suara AI Sebut Nama Toko, Mode Speaker Bluetooth, 4 Efek Suara Kasir, & Multi-Kasir Staf
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                          Hanya dengan biaya terjangkau <strong>Rp {(siteSetting?.membershipPrice || 45000).toLocaleString("id-ID")}</strong>, jadikan outlet Anda modern setara brand waralaba internasional! Dapatkan sambutan suara AI ramah menyebutkan brand toko Anda, pengumuman ulasan bintang 5 ke speaker kafe/toko via Bluetooth, efek suara kasir cuan (&quot;Cha-Ching! 💵&quot;), dan hubungkan banyak HP kasir/barista tanpa bagi-bagi password toko.
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

                  {/* 5 Kartu Fitur Menjual */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 hover:border-amber-500/40 transition-colors flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl">
                          🎙️
                        </div>
                        <h4 className="text-xs font-bold text-white">Suara AI Sebut Nama Toko</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          HP pengunjung otomatis menyapa ramah berbahasa Indonesia dan menyebutkan nama brand toko Anda saat kartu ulasan di-tap.
                        </p>
                      </div>
                      <span className="inline-block mt-2 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md self-start">Kesan Eksklusif</span>
                    </div>

                    <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 hover:border-amber-500/40 transition-colors flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl">
                          🔔
                        </div>
                        <h4 className="text-xs font-bold text-white">4 Efek Suara Kasir Pilihan</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Bebas pilih nada kasir: Register Uang Masuk (&quot;Cha-Ching! 💵&quot;), Lonceng Kasir Ganda, Lonceng Kristal Mewah, atau Nada Fanfare.
                        </p>
                      </div>
                      <span className="inline-block mt-2 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md self-start">Sensasi Cuan</span>
                    </div>

                    <div className="p-5 rounded-3xl bg-slate-900 border border-amber-500/40 bg-gradient-to-b from-amber-950/20 to-slate-900 space-y-2 hover:border-amber-500/60 transition-colors flex flex-col justify-between shadow-lg shadow-amber-500/5">
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl">
                          📢
                        </div>
                        <h4 className="text-xs font-bold text-white">Mode Speaker Toko (Bluetooth)</h4>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          Umumkan ulasan bintang 5 langsung ke sound system / speaker kafe via Bluetooth! Pengunjung lain ikut terkesan & terinspirasi review.
                        </p>
                      </div>
                      <span className="inline-block mt-2 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md self-start">Fitur Primadona ⭐</span>
                    </div>

                    <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 hover:border-amber-500/40 transition-colors flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl">
                          📲
                        </div>
                        <h4 className="text-xs font-bold text-white">Multi-Kasir QR Pairing</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Hubungkan banyak HP kasir & barista cukup scan QR tanpa bagi-bagi password akun utama toko Anda. Aman jika ada staf yang resign.
                        </p>
                      </div>
                      <span className="inline-block mt-2 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md self-start">Keamanan 100%</span>
                    </div>

                    <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 hover:border-amber-500/40 transition-colors flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl">
                          ⚡
                        </div>
                        <h4 className="text-xs font-bold text-white">Dering & Getar Layar Mati</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Sinyal push notifikasi instan langsung berdering kencang & bergetar ke HP Anda meski layar terkunci atau aplikasi ditutup total.
                        </p>
                      </div>
                      <span className="inline-block mt-2 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md self-start">Anti Ketinggalan</span>
                    </div>
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
                            <th className="pb-3 font-semibold text-center w-52 text-amber-400">Member Premium VIP 👑</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          <tr>
                            <td className="py-3 text-slate-300">Scan Kartu Meja Pengunjung</td>
                            <td className="py-3 text-center text-emerald-400 font-semibold">Aktif</td>
                            <td className="py-3 text-center text-emerald-400 font-bold">Aktif</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-slate-300">Suara Sambutan Ramah di HP Pelanggan</td>
                            <td className="py-3 text-center text-slate-500">Mati (Hening)</td>
                            <td className="py-3 text-center text-emerald-400 font-bold">Suara AI Sebut Nama Toko 🎙️</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-slate-300">Efek Suara Nada Kasir Cuan</td>
                            <td className="py-3 text-center text-slate-500">Standar</td>
                            <td className="py-3 text-center text-amber-400 font-bold">Bebas Pilih (Cha-Ching, Lonceng, Kristal) 🔔</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-slate-300">Mode Speaker Kafe / Bluetooth Toko</td>
                            <td className="py-3 text-center text-slate-500">Tidak Tersedia ❌</td>
                            <td className="py-3 text-center text-emerald-400 font-bold">Umumkan Ulasan Otomatis 📢</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-slate-300">Multi-Kasir Staf (Banyak HP Karyawan)</td>
                            <td className="py-3 text-center text-slate-500">Bagi Password Beresiko ⚠️</td>
                            <td className="py-3 text-center text-emerald-400 font-bold">QR Pairing Kasir Aman (Tanpa Password) 📲</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-slate-300">Dering & Getar HP Pemilik (Layar Mati)</td>
                            <td className="py-3 text-center text-slate-500">Tidak Tersedia</td>
                            <td className="py-3 text-center text-amber-400 font-bold">Aktif (Push Realtime Kencang) ⚡</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-slate-300">Lencana VIP Gold di Dashboard</td>
                            <td className="py-3 text-center text-slate-500">Standar</td>
                            <td className="py-3 text-center text-amber-400 font-bold">👑 VIP Gold Member</td>
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
