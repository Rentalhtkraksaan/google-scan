"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Layers,
  Store,
  QrCode,
  TrendingUp,
  Plus,
  MessageCircle,
  Trash2,
  Edit,
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  X,
  ChevronDown,
  History,
  Power,
  Lock,
  UserCheck,
  Send,
  BookOpen,
  Crown,
  Menu,
  LogOut,
  Sparkles,
  LayoutDashboard,
  Volume2,
  VolumeX,
  HelpCircle,
  ShoppingCart,
} from "lucide-react";
import ActivityLogTable from "@/components/dashboard/ActivityLogTable";
import { LiveActivityTicker } from "@/components/dashboard/LiveActivityTicker";
import { RegisterOutletModal } from "@/components/forms/RegisterOutletModal";
import { EditOutletModal } from "@/components/forms/EditOutletModal";
import { EditProfileModal } from "@/components/dashboard/EditProfileModal";
import { RequestCardModal } from "@/components/dashboard/RequestCardModal";
import { AssignCardToOutletModal } from "@/components/dashboard/AssignCardToOutletModal";
import { UserGuideModal } from "@/components/dashboard/UserGuideModal";
import { ResellerModuleModal } from "@/components/dashboard/ResellerModuleModal";
import { ResellerShopModal } from "@/components/dashboard/ResellerShopModal";
import { InstallPwaButton } from "@/components/pwa/InstallPwaPrompt";
import { deleteOutletUserAction, toggleUserActiveStatusAction, logLogoutAction } from "@/lib/actions/auth.actions";
import { toggleCardStatusAction } from "@/lib/actions/qr.actions";
import { playCashierDing, unlockAudioContext } from "@/lib/notification-sound";
import {
  showSuccessAlert,
  showErrorAlert,
  showConfirmAlert,
  showToggleCardConfirmAlert,
  showTwoStepDeleteConfirmAlert,
  showWelcomeAlert,
} from "@/lib/swal";
import { OutletUserItem, QrCardModel, SiteSettingModel } from "@/types/models";

interface AdminDashboardClientProps {
  currentAdmin: {
    id: string;
    fullName: string;
    email: string;
    whatsappNumber?: string | null;
    avatarUrl?: string | null;
    isResellerUnlocked?: boolean;
    resellerVipRewardsClaimed?: number;
  };
  superAdminContact?: {
    fullName: string;
    whatsappNumber: string | null;
    email?: string;
    avatarUrl?: string | null;
    isSuperAdminMaster?: boolean;
    role?: string;
  } | null;
  assignedCards: QrCardModel[];
  createdUsers: OutletUserItem[];
  siteSetting?: SiteSettingModel;
  vipOutletsCount?: number;
}

interface EditingOutletType {
  id: string;
  name: string;
  googleReviewUrl: string;
  owner: {
    fullName: string;
    whatsappNumber: string | null;
    email: string;
  };
}

export function AdminDashboardClient({
  currentAdmin,
  superAdminContact = null,
  assignedCards,
  createdUsers,
  siteSetting,
  vipOutletsCount = 0,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"OUTLETS" | "BLANK_CARDS" | "ACTIVITY_LOGS">("OUTLETS");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<"ALL" | "OUTLET" | "CODE">("ALL");

  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && sessionStorage.getItem("just_logged_in") === "true") {
      sessionStorage.removeItem("just_logged_in");
      showWelcomeAlert(currentAdmin.fullName || "Admin Mitra", "Admin Lapangan / Mitra");
    }
  }, [currentAdmin.fullName]);

  // Click outside user menu dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [prefilledCardCode, setPrefilledCardCode] = useState<string>("");
  const [editingOutlet, setEditingOutlet] = useState<EditingOutletType | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isRequestCardModalOpen, setIsRequestCardModalOpen] = useState(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isResellerModuleModalOpen, setIsResellerModuleModalOpen] = useState(false);
  const [assigningOutlet, setAssigningOutlet] = useState<{
    id: string;
    name: string;
    currentCards?: { code: string }[];
  } | null>(null);

  // Derived metrics (Memoized)
  const totalAssignedCards = assignedCards.length;
  const blankCards = useMemo(() => assignedCards.filter((c) => !c.outletId), [assignedCards]);
  const claimedCards = useMemo(() => assignedCards.filter((c) => !!c.outletId), [assignedCards]);
  const totalScans = useMemo(() => assignedCards.reduce((acc, c) => acc + (c.scanCount || 0), 0), [assignedCards]);

  // Filtered outlets (Memoized)
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return createdUsers;
    const q = searchQuery.toLowerCase().trim();

    return createdUsers.filter((u) => {
      if (searchScope === "CODE") {
        return u.outlet?.qrCard?.code && u.outlet.qrCard.code.toLowerCase().includes(q);
      }
      if (searchScope === "OUTLET") {
        return (
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.whatsappNumber && u.whatsappNumber.includes(q)) ||
          (u.outlet?.name && u.outlet.name.toLowerCase().includes(q))
        );
      }

      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.whatsappNumber && u.whatsappNumber.includes(q)) ||
        (u.outlet?.name && u.outlet.name.toLowerCase().includes(q)) ||
        (u.outlet?.qrCard?.code && u.outlet.qrCard.code.toLowerCase().includes(q))
      );
    });
  }, [createdUsers, searchQuery, searchScope]);

  // Filtered blank cards (Memoized)
  const filteredBlankCards = useMemo(() => {
    if (!searchQuery.trim()) return blankCards;
    const q = searchQuery.toLowerCase().trim();
    return blankCards.filter((c) => c.code.toLowerCase().includes(q));
  }, [blankCards, searchQuery]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logLogoutAction();
    } catch {}
    if (typeof window !== "undefined") {
      localStorage.removeItem("smartqr_logged_in");
      sessionStorage.clear();
    }
    await signOut({ callbackUrl: "/login" });
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    const confirmed = await showTwoStepDeleteConfirmAlert(
      `Hapus Outlet "${name}"`,
      `Data outlet <b>${name}</b> beserta akun pemiliknya akan dihapus permanen. Kartu QR yang terhubung akan dikembalikan ke status kosong siap didaftarkan lagi.`,
      `Outlet "${name}"`,
      "HAPUS"
    );
    if (!confirmed) return;

    try {
      const res = await deleteOutletUserAction(userId);
      if (res.success) {
        showSuccessAlert("Outlet Dihapus", res.message, 1500);
      } else {
        showErrorAlert("Gagal Menghapus", res.message);
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal menghapus user/outlet.");
    }
  };

  const handleToggleUserActive = async (userId: string, name: string, currentActive: boolean) => {
    const actionText = currentActive ? "Matikan / Nonaktifkan" : "Aktifkan Kembali";
    const result = await showConfirmAlert(
      `${actionText} Outlet ${name}?`,
      currentActive
        ? `Semua kartu QR yang terhubung ke outlet <b>${name}</b> otomatis akan MATI / NONAKTIF dan dialihkan ke link fallback.`
        : `Semua kartu QR yang terhubung ke outlet <b>${name}</b> akan AKTIF kembali dan dapat menerima ulasan review pelanggan.`,
      currentActive ? "Ya, Nonaktifkan Toko & Kartu" : "Ya, Aktifkan Toko & Kartu",
      currentActive ? "#ef4444" : "#10b981"
    );
    if (!result.isConfirmed) return;

    try {
      const res = await toggleUserActiveStatusAction(userId);
      if (res.success) {
        showSuccessAlert("Status Berhasil Diubah", res.message, 1500);
      } else {
        showErrorAlert("Gagal Mengubah Status", res.message);
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal mengubah status outlet.");
    }
  };

  const handleOpenClaimForCard = (code: string) => {
    setPrefilledCardCode(code);
    setIsRegisterModalOpen(true);
  };

  const handleToggleStatus = async (code: string, outletName?: string | null, currentStatus = "ACTIVE") => {
    const confirmed = await showToggleCardConfirmAlert(code, outletName, currentStatus);
    if (!confirmed) return;

    try {
      const res = await toggleCardStatusAction(code);
      if (res.success) {
        showSuccessAlert("Status Diperbarui", res.message, 1200);
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal memperbarui status kartu.");
    }
  };

  const getWaLink = (waNumber: string | null, outletName?: string) => {
    if (!waNumber) return "#";
    let clean = waNumber.replace(/[^0-9]/g, "");
    if (clean.startsWith("08")) clean = "62" + clean.slice(1);
    const text = encodeURIComponent(`Halo dari Admin Smart QR Review. Mengenai outlet ${outletName || "Anda"}...`);
    return `https://wa.me/${clean}?text=${text}`;
  };

  const getWaOnboardingLink = (
    waNumber: string | null,
    outletName?: string,
    email?: string,
    ownerName?: string,
    cardCode?: string
  ) => {
    if (!waNumber) return "#";
    let clean = waNumber.replace(/[^0-9]/g, "");
    if (clean.startsWith("08")) clean = "62" + clean.slice(1);
    const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "https://qr-inaja.vercel.app/login";
    const reviewUrl = cardCode && typeof window !== "undefined" ? `${window.location.origin}/c/${cardCode}` : "";
    const msg = 
`Halo Kak ${ownerName || ""} dari *${outletName || "Outlet"}*! 👋✨

Berikut detail akun Portal Mitra Google Review Anda:
🌐 *Link Portal*: ${portalUrl}
📧 *Email*: ${email || "-"}
${cardCode ? `💳 *Kode Kartu*: ${cardCode}\n⭐ *Link Scan Review*: ${reviewUrl}\n` : ""}
Gunakan portal ini untuk melihat analitik scan ulasan, download materi promosi kartu QR, dan kelola widget ulasan toko Anda.

Salam sukses,
Tim Layanan Smart QR`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[300px] bg-indigo-600/10 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[300px] bg-emerald-600/10 blur-[120px] pointer-events-none -z-10" />

      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/75 z-40 lg:hidden backdrop-blur-sm transition-opacity"
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5 truncate">
                Smart QR <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">Mitra</span>
              </span>
              <span className="text-[10px] text-slate-400 truncate">Admin Lapangan & Reseller</span>
            </div>
          </div>

          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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

            {/* Outlet Binaan */}
            <button
              onClick={() => {
                setActiveTab("OUTLETS");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "OUTLETS"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Store className="w-4 h-4 shrink-0" />
                <span className="truncate">Outlet Binaan</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                {createdUsers.length}
              </span>
            </button>

            {/* Kartu Kosong */}
            <button
              onClick={() => {
                setActiveTab("BLANK_CARDS");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "BLANK_CARDS"
                  ? "bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Layers className="w-4 h-4 shrink-0" />
                <span className="truncate">Kartu Kosong Siap Pakai</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                {blankCards.length}
              </span>
            </button>

            {/* Log Aktivitas */}
            <button
              onClick={() => {
                setActiveTab("ACTIVITY_LOGS");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "ACTIVITY_LOGS"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              }`}
            >
              <History className="w-4 h-4 shrink-0 text-sky-400" />
              <span className="truncate">Log Aktivitas</span>
            </button>
          </div>

          {/* Section: Alat & Kontrol Cepat */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Alat & Manajemen
            </div>

            {/* Tambah / Daftarkan Outlet Baru */}
            <button
              onClick={() => {
                setPrefilledCardCode("");
                setIsRegisterModalOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              disabled={blankCards.length === 0}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer text-left shadow-sm group disabled:opacity-50"
              title="Daftarkan outlet baru menggunakan kuota kartu kosong Anda"
            >
              <div className="flex items-center gap-3 truncate">
                <Plus className="w-4 h-4 shrink-0 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="truncate">+ Daftarkan Outlet</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                BARU
              </span>
            </button>

            {/* Beli Kartu Fisik & Standee (Katalog Reseller Shopee) */}
            <button
              onClick={() => {
                setIsShopModalOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 transition-all cursor-pointer text-left shadow-sm group"
              title="Buka katalog produk & keranjang belanja kartu resmi reseller"
            >
              <div className="flex items-center gap-3 truncate">
                <ShoppingCart className="w-4 h-4 shrink-0 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="truncate">Keranjang Reseller</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-md font-extrabold bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
                TOKO
              </span>
            </button>

            {/* Minta Tambah Kuota Kartu */}
            <button
              onClick={() => {
                setIsRequestCardModalOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer text-left shadow-sm group"
              title="Kirim pesan WhatsApp ke Super Admin untuk meminta tambahan jatah kartu fisik"
            >
              <div className="flex items-center gap-3 truncate">
                <Layers className="w-4 h-4 shrink-0 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="truncate">Minta Kuota Kartu</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                WA
              </span>
            </button>

            {/* Modul Reseller & SOP */}
            <button
              onClick={() => {
                setIsResellerModuleModalOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all cursor-pointer text-left shadow-sm group"
              title="Buka modul panduan & materi promosi reseller"
            >
              <div className="flex items-center gap-3 truncate">
                <BookOpen className="w-4 h-4 shrink-0 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="truncate">Modul Reseller</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PDF
              </span>
            </button>

            {/* Buku Modul Panduan Sistem */}
            <button
              onClick={() => {
                setIsGuideModalOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-sky-300 hover:text-white bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-all cursor-pointer text-left shadow-sm group"
              title="Buka panduan lengkap sistem Smart QR Review"
            >
              <div className="flex items-center gap-3 truncate">
                <HelpCircle className="w-4 h-4 shrink-0 text-sky-400 group-hover:scale-110 transition-transform" />
                <span className="truncate">Buku Panduan</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                SOP
              </span>
            </button>

            {/* Pasang Aplikasi di HP (PWA) */}
            <InstallPwaButton variant="drawer" label="Pasang Aplikasi di HP" />

            {/* Buka Landing Page Publik */}
            <a
              href="/?view=landing"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 truncate">
                <ExternalLink className="w-4 h-4 shrink-0 text-slate-400" />
                <span className="truncate">Lihat Landing Page</span>
              </div>
            </a>
          </div>
        </div>

        {/* Sidebar Footer User Profile Card */}
        <div className="p-3 border-t border-slate-800/80 shrink-0">
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2.5 shadow-sm">
            <div
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
              title="Klik untuk Edit Profil"
            >
              {currentAdmin.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={currentAdmin.avatarUrl}
                  alt={currentAdmin.fullName || "Admin Lapangan"}
                  className="w-9 h-9 rounded-full object-cover shrink-0 shadow-md ring-2 ring-emerald-500/50 group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                  {currentAdmin.fullName ? currentAdmin.fullName.charAt(0).toUpperCase() : "A"}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-xs text-white truncate group-hover:text-emerald-300 transition-colors">
                  {currentAdmin.fullName || "Admin Lapangan"}
                </span>
                <span className="inline-flex items-center w-fit text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mt-0.5">
                  MITRA LAPANGAN
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer shrink-0"
              title="Keluar dari Akun"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area (Offset by Sidebar width on desktop) */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0 min-h-screen">
        {/* Modern Sticky Top Header */}
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              title="Buka Navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-base sm:text-xl lg:text-2xl font-extrabold text-white tracking-tight truncate">
                  {activeTab === "OUTLETS" && "Outlet Binaan"}
                  {activeTab === "BLANK_CARDS" && "Kartu Kosong Siap Pakai"}
                  {activeTab === "ACTIVITY_LOGS" && "Log Aktivitas Lapangan"}
                </h1>
                <span className="text-[10px] font-mono font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0 hidden sm:inline-block">
                  {siteSetting?.appVersion || "V 1.1.2"}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden md:block truncate">
                Selamat datang kembali, <strong className="text-slate-200">{currentAdmin.fullName}</strong> (Mitra Lapangan)
              </p>
            </div>
          </div>

          {/* Top-Right Quick Action CTA Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 1. Toggle Suara Notifikasi (Desktop only) */}
            <button
              type="button"
              onClick={() => {
                unlockAudioContext();
                if (!isSoundEnabled) {
                  playCashierDing();
                }
                setIsSoundEnabled(!isSoundEnabled);
              }}
              className={`hidden md:flex p-2 sm:px-2.5 sm:py-2 rounded-xl border text-xs font-semibold items-center gap-1.5 transition-all cursor-pointer ${
                isSoundEnabled
                  ? "bg-slate-900 border-indigo-500/30 text-indigo-400 hover:bg-slate-800 shadow-sm shadow-indigo-500/10"
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
              }`}
              title={isSoundEnabled ? "Suara Notifikasi Aktif (Klik untuk matikan)" : "Suara Notifikasi Senyap (Klik untuk aktifkan)"}
            >
              {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5 text-indigo-400" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden lg:inline text-[11px] font-bold">
                {isSoundEnabled ? "Suara Aktif" : "Senyap"}
              </span>
            </button>

            {/* 2. Keranjang Belanja Reseller (Tablet & Desktop) */}
            <button
              onClick={() => setIsShopModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs border border-emerald-400/40 transition-all cursor-pointer shadow-md shadow-emerald-900/30 hover:scale-[1.02] active:scale-[0.98] shrink-0"
              title="Beli kartu & standee fisik via Keranjang Reseller"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-white shrink-0" />
              <span>Beli Kartu</span>
            </button>

            {/* 3. Minta Tambah Kuota Kartu (Tablet & Desktop) */}
            <button
              onClick={() => setIsRequestCardModalOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-white font-bold text-xs border border-amber-500/40 hover:border-amber-500/70 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] shrink-0"
              title="Minta tambahan kuota kartu fisik ke Super Admin"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Minta Kuota</span>
            </button>

            {/* 4. Primary CTA Button: Daftarkan Outlet Baru */}
            <button
              onClick={() => {
                setPrefilledCardCode("");
                setIsRegisterModalOpen(true);
              }}
              disabled={blankCards.length === 0}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">+ Daftarkan Outlet</span>
              <span className="sm:hidden font-bold">+ Outlet</span>
            </button>

            {/* 5. User Profile Avatar with Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 sm:p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all cursor-pointer"
                title="Menu Pengguna"
              >
                {currentAdmin.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={currentAdmin.avatarUrl}
                    alt={currentAdmin.fullName}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover ring-1 ring-emerald-500/50"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-center">
                    {currentAdmin.fullName ? currentAdmin.fullName.charAt(0).toUpperCase() : "A"}
                  </div>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="p-2 border-b border-slate-800">
                    <p className="text-xs font-bold text-white truncate">{currentAdmin.fullName}</p>
                    <p className="text-[11px] text-slate-400 truncate">{currentAdmin.email}</p>
                    <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      MITRA LAPANGAN
                    </span>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <button
                      onClick={() => {
                        setIsProfileModalOpen(true);
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      <span>Edit Profil & Password</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsResellerModuleModalOpen(true);
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                      <span>Modul & SOP Reseller</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsGuideModalOpen(true);
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-sky-400" />
                      <span>Buku Panduan Sistem</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-800">
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer font-semibold"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Viewport Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Top Banner with Quick Actions & Ambient Glow */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
            <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none -z-10" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    Mitra Lapangan & Reseller
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{currentAdmin.email}</span>
                  {vipOutletsCount > 0 && (
                    <span className="text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-400" />
                      {vipOutletsCount} Outlet VIP Aktif
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                  Selamat Datang, {currentAdmin.fullName} 👋
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                  Kelola pendaftaran outlet baru, pantau analitik scan kartu ulasan, dan perluas jaringan kemitraan Anda di lapangan.
                </p>
              </div>

              {/* Quick Action Buttons Grid */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto shrink-0">
                <button
                  onClick={() => setIsShopModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  title="Beli Kartu Fisik & Standee via Katalog Shopee Reseller"
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>Beli Kartu</span>
                </button>

                <button
                  onClick={() => setIsResellerModuleModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-semibold text-xs rounded-xl border border-indigo-500/30 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                  title="Buka Modul & Materi Kemitraan Reseller"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Modul Mitra</span>
                </button>

                <button
                  onClick={() => setIsRequestCardModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs rounded-xl border border-amber-500/30 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                  title="Minta Tambahan Jatah Kuota Kartu ke Super Admin"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Minta Kuota</span>
                </button>

                <button
                  onClick={() => setIsGuideModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 font-semibold text-xs rounded-xl border border-sky-500/30 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                  title="Buka Buku Panduan Admin Lapangan"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Buku Panduan</span>
                </button>
              </div>
            </div>
          </div>

          {/* Realtime Live Activity Ticker Bar */}
          <LiveActivityTicker />

          {/* 4 Stat Cards - Balanced & Harmonious */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* Total Jatah Kartu */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-indigo-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Jatah Kartu</span>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-white">{totalAssignedCards}</span>
                <span className="text-xs text-indigo-400 font-semibold">kartu</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block truncate">Dialokasikan Super Admin</span>
            </div>

            {/* Outlet Binaan */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Outlet Binaan Aktif</span>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <Store className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{claimedCards.length}</span>
                <span className="text-xs text-emerald-300 font-semibold">outlet</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block truncate">Toko aktif ulasan</span>
            </div>

            {/* Sisa Kartu Kosong */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-amber-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sisa Kartu Kosong</span>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-400">{blankCards.length}</span>
                <span className="text-xs text-amber-300 font-semibold">siap aktivasi</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block truncate">Siap didaftarkan ke toko baru</span>
            </div>

            {/* Total Scan */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-sky-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Scan Pelanggan</span>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-sky-400">{totalScans}</span>
                <span className="text-xs text-sky-300 font-semibold">scan</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block truncate">Akumulasi ulasan outlet</span>
            </div>
          </div>

          {/* Main Section: Tabs & Search */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-nowrap w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab("OUTLETS")}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === "OUTLETS"
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                      : "bg-slate-800/80 text-slate-400 hover:text-white"
                  }`}
                >
                  Outlet Binaan ({searchQuery.trim() ? filteredUsers.length : createdUsers.length})
                </button>
                <button
                  onClick={() => setActiveTab("BLANK_CARDS")}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === "BLANK_CARDS"
                      ? "bg-amber-600 text-white shadow-lg shadow-amber-600/25"
                      : "bg-slate-800/80 text-slate-400 hover:text-white"
                  }`}
                >
                  Kartu Kosong ({searchQuery.trim() ? filteredBlankCards.length : blankCards.length})
                </button>
                <button
                  onClick={() => setActiveTab("ACTIVITY_LOGS")}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    activeTab === "ACTIVITY_LOGS"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                      : "bg-slate-800/80 text-blue-300 hover:text-white"
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Log Aktivitas</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                {/* Dropdown Kategori Pencarian */}
                <div className="relative">
                  <select
                    value={searchScope}
                    onChange={(e) => setSearchScope(e.target.value as "ALL" | "OUTLET" | "CODE")}
                    className="w-full sm:w-auto px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer pr-8 appearance-none"
                  >
                    <option value="ALL">🔍 Semua Kategori</option>
                    <option value="OUTLET">🏪 Cari Outlet / Pemilik</option>
                    <option value="CODE">💳 Cari Kode Kartu</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Input Search */}
                <div className="relative flex-1 sm:w-64 md:w-72">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      searchScope === "OUTLET"
                        ? "Cari nama outlet / pemilik..."
                        : searchScope === "CODE"
                        ? "Cari kode kartu (cth: c-002)..."
                        : "Cari outlet, pemilik, kode kartu..."
                    }
                    className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Bersihkan pencarian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Info Banner Hasil Pencarian jika ada query atau filter aktif */}
            {(searchQuery.trim() || searchScope !== "ALL") && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Menampilkan <strong className="text-white font-bold">{
                      activeTab === "OUTLETS" ? filteredUsers.length : filteredBlankCards.length
                    }</strong> data
                    {searchQuery.trim() && (
                      <> untuk pencarian &ldquo;<span className="text-amber-300 font-semibold">{searchQuery}</span>&rdquo;</>
                    )}
                    {searchScope !== "ALL" && (
                      <span className="text-emerald-300 ml-1">
                        (Target: {searchScope === "OUTLET" ? "Outlet / Pemilik" : "Kode Kartu"})
                      </span>
                    )}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchScope("ALL");
                  }}
                  className="self-start sm:self-auto flex items-center gap-1 text-[11px] font-medium text-emerald-300 hover:text-white bg-emerald-900/60 hover:bg-emerald-800/80 px-2.5 py-1 rounded-lg border border-emerald-500/30 transition-all cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Reset Pencarian</span>
                </button>
              </div>
            )}

            {/* TAB 1: OUTLETS TABLE & MOBILE CARDS */}
            {activeTab === "OUTLETS" && (
              <div className="mt-5">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Store className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">Belum Ada Outlet Binaan</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {searchQuery
                        ? "Tidak ada outlet yang sesuai dengan pencarian."
                        : "Gunakan tombol '+ Daftarkan Outlet' di atas untuk mengaktifkan kartu jatah Anda."}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Cards View (< md) */}
                    <div className="block md:hidden space-y-3">
                      {filteredUsers.map((user) => {
                        const isOwnerActive = user.isActive !== false;
                        const cards = user.outlet?.qrCards && user.outlet.qrCards.length > 0
                          ? user.outlet.qrCards
                          : user.outlet?.qrCard
                          ? [user.outlet.qrCard]
                          : [];
                        const isOverOneCard = cards.length > 1;
                        const totalScans = cards.reduce((s, c) => s + (c.scanCount || 0), 0);
                        const primaryCard = cards[0];
                        const targetUrl = primaryCard ? `/c/${primaryCard.code}` : user.outlet?.googleReviewUrl;

                        return (
                          <div
                            key={user.id}
                            className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md hover:border-slate-700 transition-all"
                          >
                            {/* Card Top: Store Header & Scan Badge */}
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div
                                  className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
                                    isOwnerActive
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  }`}
                                >
                                  <Store className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-sm font-bold truncate ${!isOwnerActive ? "text-slate-400 line-through" : "text-white"}`}>
                                      {user.outlet?.name || "-"}
                                    </span>
                                    {!isOwnerActive && (
                                      <span className="text-[9px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                        Nonaktif
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                                    {user.email}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                  title="Total scan seluruh kartu outlet"
                                >
                                  <TrendingUp className="w-3 h-3" />
                                  {totalScans}
                                </span>
                              </div>
                            </div>

                            {/* Owner Info & WhatsApp Contacts */}
                            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-[11px] text-slate-400 block truncate">
                                  Pemilik: <strong className="text-slate-200">{user.fullName}</strong>
                                </span>
                                <span className="text-[11px] font-mono text-slate-400 block truncate">
                                  {user.whatsappNumber || "-"}
                                </span>
                              </div>

                              {user.whatsappNumber && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <a
                                    href={getWaLink(user.whatsappNumber, user.outlet?.name)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                                    title="Chat WhatsApp Pemilik Toko"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                  <a
                                    href={getWaOnboardingLink(
                                      user.whatsappNumber,
                                      user.outlet?.name,
                                      user.email,
                                      user.fullName,
                                      cards[0]?.code
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition-colors inline-flex items-center gap-1 text-[10px] font-semibold"
                                    title="Kirim Detail Akses Portal ke WhatsApp Klien"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>Kirim Akses</span>
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Linked QR Cards */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
                                <span className="font-semibold">Kartu Terhubung ({cards.length}):</span>
                                {user.outlet && (
                                  <button
                                    onClick={() => {
                                      setAssigningOutlet({
                                        id: user.outlet!.id,
                                        name: user.outlet!.name,
                                        currentCards: cards.map((c) => ({ code: c.code })),
                                      });
                                    }}
                                    className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 text-[11px] cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Tambah Kartu</span>
                                  </button>
                                )}
                              </div>

                              {cards.length === 0 ? (
                                <span className="text-slate-500 italic text-xs block px-1">Belum terhubung kartu</span>
                              ) : (
                                <div className="space-y-1.5">
                                  {cards.map((c, idx) => {
                                    const isInduk = idx === 0;
                                    return (
                                      <div
                                        key={c.code}
                                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                                      >
                                        <div className="flex items-center gap-1.5">
                                          <span
                                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                              isInduk
                                                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                                : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                                            }`}
                                          >
                                            {isInduk ? "👑 Induk" : "🔗 Anakan"}
                                          </span>
                                          <a
                                            href={`/c/${c.code}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-mono font-bold text-slate-200 hover:text-sky-400 hover:underline transition-colors inline-flex items-center gap-1"
                                            title="Tes Scan QR"
                                          >
                                            {c.code}
                                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                          </a>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                            {c.scanCount || 0} scan
                                          </span>

                                          <button
                                            onClick={() => handleToggleStatus(c.code, user.outlet?.name, c.status)}
                                            className="focus:outline-none cursor-pointer"
                                            title="Klik untuk aktifkan / nonaktifkan kartu"
                                          >
                                            {c.status === "ACTIVE" ? (
                                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                <CheckCircle2 className="w-2.5 h-2.5" /> Aktif
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                                <XCircle className="w-2.5 h-2.5" /> Mati
                                              </span>
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Action Buttons Toolbar on Mobile */}
                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                              {targetUrl ? (
                                <a
                                  href={targetUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-800 text-[11px] font-medium transition-colors"
                                  title="Buka URL Google Review Toko"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Buka Review</span>
                                </a>
                              ) : <div />}

                              <div className="flex items-center gap-1.5">
                                {user.outlet && (
                                  <button
                                    onClick={() =>
                                      setEditingOutlet({
                                        id: user.outlet!.id,
                                        name: user.outlet!.name,
                                        googleReviewUrl: user.outlet!.googleReviewUrl,
                                        owner: {
                                          fullName: user.fullName,
                                          whatsappNumber: user.whatsappNumber,
                                          email: user.email,
                                        },
                                      })
                                    }
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                                    title="Edit Data Toko"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  onClick={() => handleToggleUserActive(user.id, user.outlet?.name || user.fullName, isOwnerActive)}
                                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                    isOwnerActive
                                      ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"
                                      : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                  }`}
                                  title={isOwnerActive ? "Nonaktifkan Toko (Semua kartu otomatis mati)" : "Aktifkan Toko & Kartu Kembali"}
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>

                                {isOverOneCard ? (
                                  <button
                                    disabled
                                    className="p-1.5 rounded-lg bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60"
                                    title="Outlet ini memegang > 1 kartu. Tidak dapat dihapus, hanya dapat dinonaktifkan."
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleDeleteUser(user.id, user.outlet?.name || user.fullName)}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                                    title="Hapus Outlet"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table View (>= md) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="py-3 px-4">Nama Outlet</th>
                            <th className="py-3 px-4">Pemilik & WhatsApp</th>
                            <th className="py-3 px-4">Kartu Terhubung (Induk & Anakan)</th>
                            <th className="py-3 px-4 text-center">Total Scan</th>
                            <th className="py-3 px-4 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredUsers.map((user) => {
                            const isOwnerActive = user.isActive !== false;
                            const cards = user.outlet?.qrCards && user.outlet.qrCards.length > 0
                              ? user.outlet.qrCards
                              : user.outlet?.qrCard
                              ? [user.outlet.qrCard]
                              : [];
                            const isOverOneCard = cards.length > 1;

                            return (
                              <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-3.5 px-4 font-semibold text-white align-top">
                                  <div className="flex items-start gap-2.5">
                                    <div
                                      className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
                                        isOwnerActive
                                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                      }`}
                                    >
                                      <Store className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <div className={`text-sm font-bold leading-snug ${!isOwnerActive ? "text-slate-400 line-through" : "text-white"}`}>
                                          {user.outlet?.name || "-"}
                                        </div>
                                        {!isOwnerActive && (
                                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                            Nonaktif
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] font-mono text-slate-400 truncate max-w-[200px] mt-0.5">
                                        {user.email}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 align-top">
                                  <div className="flex items-center gap-2">
                                    <div>
                                      <div className="font-semibold text-slate-200">{user.fullName}</div>
                                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                        {user.whatsappNumber || "-"}
                                      </div>
                                    </div>
                                    {user.whatsappNumber && (
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <a
                                          href={getWaLink(user.whatsappNumber, user.outlet?.name)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                                          title="Chat WhatsApp Pemilik Toko"
                                        >
                                          <MessageCircle className="w-3.5 h-3.5" />
                                        </a>
                                        <a
                                          href={getWaOnboardingLink(
                                            user.whatsappNumber,
                                            user.outlet?.name,
                                            user.email,
                                            user.fullName,
                                            cards[0]?.code
                                          )}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition-colors inline-flex items-center gap-1 text-[10px] font-semibold"
                                          title="Kirim / Forward Detail Akses Portal ke WhatsApp Klien"
                                        >
                                          <Send className="w-3 h-3" />
                                          <span className="hidden xl:inline">Kirim Akses</span>
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 align-top">
                                  {(() => {
                                    if (cards.length === 0) {
                                      return <span className="text-slate-500 italic text-xs">Belum terhubung</span>;
                                    }

                                    return (
                                      <div className="space-y-1.5 min-w-[230px]">
                                        {cards.map((c, idx) => {
                                          const isInduk = idx === 0;
                                          return (
                                            <div
                                              key={c.code}
                                              className="flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs hover:border-slate-700 transition-colors"
                                            >
                                              <div className="flex items-center gap-1.5">
                                                <span
                                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                                    isInduk
                                                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                                      : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                                                  }`}
                                                  title={isInduk ? "Kartu Utama / Induk Outlet" : "Kartu Tambahan / Anakan"}
                                                >
                                                  {isInduk ? "👑 Induk" : "🔗 Anakan"}
                                                </span>
                                                <a
                                                  href={`/c/${c.code}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="font-mono font-bold text-slate-200 hover:text-sky-400 hover:underline transition-colors inline-flex items-center gap-1"
                                                  title={`Uji Coba Scan QR ${c.code} (Buka & tambah scan +1)`}
                                                >
                                                  {c.code}
                                                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                                </a>
                                              </div>

                                              <div className="flex items-center gap-2">
                                                <span
                                                  className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20"
                                                  title={`${c.scanCount || 0} scan`}
                                                >
                                                  {c.scanCount || 0} scan
                                                </span>

                                                <button
                                                  onClick={() => handleToggleStatus(c.code, user.outlet?.name, c.status)}
                                                  className="focus:outline-none group cursor-pointer"
                                                  title={`Klik untuk aktifkan / nonaktifkan kartu ${c.code}`}
                                                >
                                                  {c.status === "ACTIVE" ? (
                                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500/25 transition-all">
                                                      <CheckCircle2 className="w-2.5 h-2.5" /> Aktif
                                                    </span>
                                                  ) : (
                                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 group-hover:bg-rose-500/25 transition-all">
                                                      <XCircle className="w-2.5 h-2.5" /> Nonaktif
                                                    </span>
                                                  )}
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()}
                                </td>

                                <td className="py-3.5 px-4 text-center align-top">
                                  {(() => {
                                    const totalScans = cards.reduce((s, c) => s + (c.scanCount || 0), 0);
                                    return (
                                      <span
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/20 mt-0.5"
                                        title={cards.length > 1 ? cards.map((c) => `${c.code}: ${c.scanCount} scan`).join(", ") : undefined}
                                      >
                                        <TrendingUp className="w-3 h-3" />
                                        {totalScans}
                                      </span>
                                    );
                                  })()}
                                </td>

                                <td className="py-3.5 px-4 text-right align-top">
                                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                    {user.outlet && (() => {
                                      const primaryCard = cards[0];
                                      const targetUrl = primaryCard ? `/c/${primaryCard.code}` : user.outlet.googleReviewUrl;

                                      return targetUrl ? (
                                        <a
                                          href={targetUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 transition-colors"
                                          title={primaryCard ? `Uji Coba Scan QR (${primaryCard.code}) & Buka Review (Tambah Scan +1)` : "Buka URL Google Review"}
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                      ) : null;
                                    })()}

                                    {user.outlet && (
                                      <button
                                        onClick={() => {
                                          setAssigningOutlet({
                                            id: user.outlet!.id,
                                            name: user.outlet!.name,
                                            currentCards: cards.map((c) => ({ code: c.code })),
                                          });
                                        }}
                                        className="px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                                        title="Tambah Kartu Fisik Kosong ke Outlet Ini"
                                      >
                                        <Plus className="w-3 h-3 text-indigo-400" />
                                        <span>+ Kartu</span>
                                      </button>
                                    )}

                                    {user.outlet && (
                                      <button
                                        onClick={() =>
                                          setEditingOutlet({
                                            id: user.outlet!.id,
                                            name: user.outlet!.name,
                                            googleReviewUrl: user.outlet!.googleReviewUrl,
                                            owner: {
                                              fullName: user.fullName,
                                              whatsappNumber: user.whatsappNumber,
                                              email: user.email,
                                            },
                                          })
                                        }
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                                        title="Edit Data Toko"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {/* Tombol Power: Nonaktifkan / Aktifkan Outlet & Kartu Terhubung */}
                                    <button
                                      onClick={() => handleToggleUserActive(user.id, user.outlet?.name || user.fullName, isOwnerActive)}
                                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                        isOwnerActive
                                          ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"
                                          : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                      }`}
                                      title={isOwnerActive ? "Nonaktifkan Toko (Semua kartu otomatis mati)" : "Aktifkan Toko & Kartu Kembali"}
                                    >
                                      <Power className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Tombol Hapus: Jika outlet memegang > 1 kartu, tombol disabled / terkunci */}
                                    {isOverOneCard ? (
                                      <button
                                        disabled
                                        className="p-1.5 rounded-lg bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60"
                                        title={`Outlet ini memegang ${cards.length} kartu (> 1 kartu). Tidak dapat dihapus, hanya dapat dinonaktifkan.`}
                                      >
                                        <Lock className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleDeleteUser(user.id, user.outlet?.name || user.fullName)}
                                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                                        title="Hapus Outlet"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 2: BLANK CARDS INVENTORY */}
            {activeTab === "BLANK_CARDS" && (
              <div className="mt-5">
                {filteredBlankCards.length === 0 ? (
                  <div className="text-center py-12">
                    <QrCode className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">Tidak Ada Kartu Kosong</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                      Semua kartu jatah Anda telah terpakai atau belum ada kuota yang dialokasikan oleh Super Admin.
                    </p>
                    <button
                      onClick={() => setIsRequestCardModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    >
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span>Minta Tambahan Jatah Kartu ke Super Admin</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredBlankCards.map((card) => (
                      <div
                        key={card.code}
                        className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-amber-500/40 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <QrCode className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-sm font-bold font-mono text-white block">{card.code}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-amber-400 font-medium">Belum Terhubung</span>
                              <span className="text-slate-600">•</span>
                              <button
                                onClick={() => handleToggleStatus(card.code, null, card.status)}
                                className="focus:outline-none cursor-pointer group"
                                title="Klik untuk aktifkan / nonaktifkan kartu jatah Anda"
                              >
                                {card.status === "ACTIVE" ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400 group-hover:underline">
                                    <CheckCircle2 className="w-2.5 h-2.5" /> Aktif
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-400 group-hover:underline">
                                    <XCircle className="w-2.5 h-2.5" /> Nonaktif
                                  </span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenClaimForCard(card.code)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Aktivasi</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ACTIVITY LOGS */}
            {activeTab === "ACTIVITY_LOGS" && (
              <div className="mt-5">
                <ActivityLogTable
                  title="Log Aktivitas Lapangan & Outlet Binaan"
                  subtitle="Audit trail aktivitas operasional Anda dan outlet yang Anda daftarkan."
                />
              </div>
            )}
          </div>
        </main>

        {/* Unified Dashboard Footer */}
        <footer className="border-t border-slate-900/80 py-6 text-center text-xs text-slate-500 shrink-0">
          &copy; {new Date().getFullYear()} Smart QR Review Platform. Dashboard Admin Lapangan.
        </footer>
      </div>

      {/* Modals */}
      {isRegisterModalOpen && (
        <RegisterOutletModal
          prefilledCode={prefilledCardCode}
          blankCards={blankCards.map((c) => ({ code: c.code }))}
          onClose={() => {
            setIsRegisterModalOpen(false);
            setPrefilledCardCode("");
          }}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {editingOutlet && (
        <EditOutletModal
          outlet={editingOutlet}
          onClose={() => setEditingOutlet(null)}
          onSuccess={() => router.refresh()}
        />
      )}

      {isProfileModalOpen && (
        <EditProfileModal
          user={{
            fullName: currentAdmin.fullName,
            email: currentAdmin.email,
            whatsappNumber: currentAdmin.whatsappNumber,
            role: "ADMIN",
          }}
          onClose={() => setIsProfileModalOpen(false)}
          onSuccess={() => router.refresh()}
        />
      )}

      {isRequestCardModalOpen && (
        <RequestCardModal
          mode="ADMIN"
          user={{
            fullName: currentAdmin.fullName,
            whatsappNumber: currentAdmin.whatsappNumber,
          }}
          targetContact={superAdminContact}
          vipOutletsCount={vipOutletsCount}
          claimedVipRewards={currentAdmin.resellerVipRewardsClaimed || 0}
          resellerCardBasePrice={siteSetting?.resellerCardBasePrice || 25000}
          resellerVipDiscountPerCard={siteSetting?.resellerVipDiscountPerCard || 5000}
          onClose={() => setIsRequestCardModalOpen(false)}
        />
      )}

      {/* Reseller Shop / Keranjang Belanja Shopee Modal */}
      <ResellerShopModal
        isOpen={isShopModalOpen}
        onClose={() => setIsShopModalOpen(false)}
        user={{
          fullName: currentAdmin.fullName,
          email: currentAdmin.email,
          whatsappNumber: currentAdmin.whatsappNumber,
        }}
        siteSetting={siteSetting}
        vipOutletsCount={vipOutletsCount}
        claimedVipRewards={currentAdmin.resellerVipRewardsClaimed || 0}
      />

      {/* Reseller Module & SOP Modal */}
      <ResellerModuleModal
        isOpen={isResellerModuleModalOpen}
        onClose={() => setIsResellerModuleModalOpen(false)}
        siteSetting={siteSetting}
        adminVipOutletsCount={vipOutletsCount}
        adminClaimedRewards={currentAdmin.resellerVipRewardsClaimed || 0}
      />

      {assigningOutlet && (
        <AssignCardToOutletModal
          outlet={assigningOutlet}
          blankCards={blankCards.map((c) => ({ code: c.code, status: c.status }))}
          onClose={() => setAssigningOutlet(null)}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* User Guide / Buku Modul Panduan Sistem */}
      <UserGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        initialRole="ADMIN"
      />
    </div>
  );
}
