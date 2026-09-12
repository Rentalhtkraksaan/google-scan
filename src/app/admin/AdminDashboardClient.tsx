"use client";

import { useState, useEffect } from "react";
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
  Camera,
  Power,
  Lock,
  UserCheck,
} from "lucide-react";
import ActivityLogTable from "@/components/dashboard/ActivityLogTable";
import { RegisterOutletModal } from "@/components/forms/RegisterOutletModal";
import { EditOutletModal } from "@/components/forms/EditOutletModal";
import { EditProfileModal } from "@/components/dashboard/EditProfileModal";
import { RequestCardModal } from "@/components/dashboard/RequestCardModal";
import { AssignCardToOutletModal } from "@/components/dashboard/AssignCardToOutletModal";
import { QrCameraScannerModal } from "@/components/dashboard/QrCameraScannerModal";
import { useRouter } from "next/navigation";
import { deleteOutletUserAction, toggleUserActiveStatusAction } from "@/lib/actions/auth.actions";
import { toggleCardStatusAction } from "@/lib/actions/qr.actions";
import {
  showSuccessAlert,
  showErrorAlert,
  showConfirmAlert,
  showToggleCardConfirmAlert,
  showTwoStepDeleteConfirmAlert,
  showWelcomeAlert,
} from "@/lib/swal";
import { OutletUserItem, QrCardModel } from "@/types/models";

interface AdminDashboardClientProps {
  currentAdmin: {
    id: string;
    fullName: string;
    email: string;
    whatsappNumber?: string | null;
  };
  superAdminContact?: {
    fullName: string;
    whatsappNumber: string | null;
    email?: string;
  } | null;
  assignedCards: QrCardModel[];
  createdUsers: OutletUserItem[];
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
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"OUTLETS" | "BLANK_CARDS" | "ACTIVITY_LOGS">("OUTLETS");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<"ALL" | "OUTLET" | "CODE">("ALL");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && sessionStorage.getItem("just_logged_in") === "true") {
      sessionStorage.removeItem("just_logged_in");
      showWelcomeAlert(currentAdmin.fullName || "Admin Mitra", "Admin Lapangan / Mitra");
    }
  }, [currentAdmin.fullName]);

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [prefilledCardCode, setPrefilledCardCode] = useState<string>("");
  const [editingOutlet, setEditingOutlet] = useState<EditingOutletType | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isRequestCardModalOpen, setIsRequestCardModalOpen] = useState(false);
  const [assigningOutlet, setAssigningOutlet] = useState<{
    id: string;
    name: string;
    currentCards?: { code: string }[];
  } | null>(null);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  // Derived metrics
  const totalAssignedCards = assignedCards.length;
  const blankCards = assignedCards.filter((c) => !c.outletId);
  const claimedCards = assignedCards.filter((c) => !!c.outletId);
  const totalScans = assignedCards.reduce((acc, c) => acc + (c.scanCount || 0), 0);

  // Filtered outlets
  const filteredUsers = createdUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

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

  // Filtered blank cards
  const filteredBlankCards = blankCards.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return c.code.toLowerCase().includes(q);
  });

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

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              Mitra Lapangan
            </span>
            <span className="text-xs text-slate-400">{currentAdmin.email}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Selamat Datang, {currentAdmin.fullName}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola pendaftaran outlet baru dan pantau ulasan kartu QR di lapangan
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsScannerModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-semibold text-xs rounded-xl border border-indigo-500/30 transition-all cursor-pointer shadow-sm"
            title="Pindai Kartu Fisik QR dengan Kamera untuk Cek Status / Pulihkan Kartu"
          >
            <Camera className="w-4 h-4 text-indigo-400" />
            <span>Scan Kamera QR</span>
          </button>

          <button
            onClick={() => setIsRequestCardModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs rounded-xl border border-amber-500/30 transition-all cursor-pointer shadow-sm"
            title="Minta Tambahan Jatah Kuota Kartu ke Super Admin via WhatsApp"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Minta Tambah Jatah Kartu</span>
          </button>

          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
            title="Edit Profil & Password Saya"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Profil Saya</span>
          </button>

          <button
            onClick={() => {
              setPrefilledCardCode("");
              setIsRegisterModalOpen(true);
            }}
            disabled={blankCards.length === 0}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Daftarkan Outlet Baru</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Kartu */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 stats-card stats-card-indigo">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Jatah Kartu</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-bold text-white">{totalAssignedCards}</span>
            <span className="text-xs text-slate-400 font-medium">kartu</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Dialokasikan oleh Super Admin</span>
        </div>

        {/* Outlet Terdaftar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 stats-card stats-card-emerald">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Outlet Binaan Aktif</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-400">{claimedCards.length}</span>
            <span className="text-xs text-slate-400 font-medium">outlet</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Toko aktif mengumpulkan review</span>
        </div>

        {/* Sisa Kartu Kosong */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 stats-card stats-card-amber">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Sisa Kartu Kosong</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-bold text-amber-400">{blankCards.length}</span>
            <span className="text-xs text-slate-400 font-medium">siap aktivasi</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Siap didaftarkan ke toko baru</span>
        </div>

        {/* Total Scan */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 stats-card stats-card-cyan">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Scan Pelanggan</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-bold text-sky-400">{totalScans}</span>
            <span className="text-xs text-slate-400 font-medium">scan</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Akumulasi scan seluruh outlet</span>
        </div>
      </div>

      {/* Main Section: Tabs & Search */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("OUTLETS")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "OUTLETS"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                  : "bg-slate-800/80 text-slate-400 hover:text-white"
              }`}
            >
              Outlet Binaan ({searchQuery.trim() ? filteredUsers.length : createdUsers.length})
            </button>
            <button
              onClick={() => setActiveTab("BLANK_CARDS")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "BLANK_CARDS"
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-600/25"
                  : "bg-slate-800/80 text-slate-400 hover:text-white"
              }`}
            >
              Kartu Kosong Siap Pakai ({searchQuery.trim() ? filteredBlankCards.length : blankCards.length})
            </button>
            <button
              onClick={() => setActiveTab("ACTIVITY_LOGS")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
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

        {/* TAB 1: OUTLETS TABLE */}
        {activeTab === "OUTLETS" && (
          <div className="mt-5">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Store className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-300">Belum Ada Outlet Binaan</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? "Tidak ada outlet yang sesuai dengan pencarian."
                    : "Gunakan tombol '+ Daftarkan Outlet Baru' di atas untuk mengaktifkan kartu jatah Anda."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                                <a
                                  href={getWaLink(user.whatsappNumber, user.outlet?.name)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                                  title="Chat WhatsApp Pemilik Toko"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
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

      {/* Modals */}
      {isRegisterModalOpen && (
        <RegisterOutletModal
          prefilledCode={prefilledCardCode}
          blankCards={blankCards.map((c) => ({ code: c.code }))}
          onClose={() => {
            setIsRegisterModalOpen(false);
            setPrefilledCardCode("");
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
          onClose={() => setIsRequestCardModalOpen(false)}
        />
      )}

      {assigningOutlet && (
        <AssignCardToOutletModal
          outlet={assigningOutlet}
          blankCards={blankCards.map((c) => ({ code: c.code, status: c.status }))}
          onClose={() => setAssigningOutlet(null)}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* QR Camera Scanner & Physical Card Recovery Modal */}
      <QrCameraScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        currentUserRole="ADMIN"
        outlets={createdUsers
          .filter((u) => u.outlet)
          .map((u) => ({ id: u.outlet!.id, name: u.outlet!.name }))}
        onCardRestored={() => router.refresh()}
      />
    </div>
  );
}
