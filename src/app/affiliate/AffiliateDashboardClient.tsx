"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  Sparkles,
  DollarSign,
  TrendingUp,
  CreditCard,
  Copy,
  Check,
  Share2,
  Package,
  LogOut,
  Users,
  MessageCircle,
  Phone,
  Edit2,
  KeyRound,
  User,
  X,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  LayoutDashboard,
  Tag,
  Gift,
  ArrowRight,
  ArrowUpRight,
  Menu,
  CheckCircle2,
  Settings,
  HelpCircle,
  Wallet,
  Search,
  ChevronRight,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "@/lib/swal";
import {
  updateAffiliateReferralCodeSelfAction,
  updateAffiliateBankInfoSelfAction,
  updateAffiliateProfileSelfAction,
} from "@/lib/actions/affiliate.actions";

type ActiveTab = "OVERVIEW" | "ORDERS" | "REFERRAL" | "PAYOUT" | "SETTINGS";

interface AffiliateDashboardClientProps {
  affiliate: {
    id: string;
    fullName: string;
    phone: string;
    email: string;
    referralCode: string;
    referralCodeChangeCount: number;
    followersCount: number;
    commissionPerPcs: number;
    balance: number;
    totalEarned: number;
    totalWithdrawn: number;
    bankName: string | null;
    accountNumber: string | null;
    accountHolder: string | null;
    status: string;
    createdAt: string;
  };
  orders: {
    id: string;
    orderNumber: string;
    customerName: string;
    totalQuantity: number;
    subtotal?: number;
    shippingFee?: number;
    discountAmount?: number;
    totalAmount: number;
    paymentStatus: string;
    orderStatus: string;
    affiliateCommission: number;
    createdAt: string;
  }[];
  siteSetting?: {
    whatsappNumber: string;
    affiliateShippingDiscount: number;
    landingPageLogoUrl?: string | null;
    dashboardLogoUrl?: string | null;
  };
}

export function AffiliateDashboardClient({
  affiliate: initialAffiliate,
  orders,
  siteSetting,
}: AffiliateDashboardClientProps) {
  const [affiliate, setAffiliate] = useState(initialAffiliate);
  const [activeTab, setActiveTab] = useState<ActiveTab>("OVERVIEW");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");

  // Modal 1: Ubah Kode Referral (Max 1x)
  const [isChangeCodeModalOpen, setIsChangeCodeModalOpen] = useState(false);
  const [newCodeInput, setNewCodeInput] = useState("");
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  // Modal 2: Ubah Data Rekening
  const [isEditBankModalOpen, setIsEditBankModalOpen] = useState(false);
  const [bankNameInput, setBankNameInput] = useState(affiliate.bankName || "");
  const [accountNumberInput, setAccountNumberInput] = useState(affiliate.accountNumber || "");
  const [accountHolderInput, setAccountHolderInput] = useState(affiliate.accountHolder || affiliate.fullName);
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);

  // Modal 3: Ubah Profil & Password
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState(affiliate.fullName);
  const [profilePhoneInput, setProfilePhoneInput] = useState(affiliate.phone);
  const [profileEmailInput, setProfileEmailInput] = useState(affiliate.email);
  const [profilePasswordInput, setProfilePasswordInput] = useState("");
  const [profileSocialInput, setProfileSocialInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  // Referral link
  const origin = typeof window !== "undefined" ? window.location.origin : "https://qr-inaja.vercel.app";
  const referralLink = `${origin}?ref=${affiliate.referralCode}`;
  const totalCardsSold = orders.reduce((sum, o) => sum + (o.paymentStatus === "PAID" ? o.totalQuantity : 0), 0);
  const paidOrders = orders.filter((o) => o.paymentStatus === "PAID");
  const paidOrdersCount = paidOrders.length;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    showSuccessAlert("Link Disalin! 🔗", "Link referral affiliate berhasil disalin.");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(affiliate.referralCode);
    setCopiedCode(true);
    showSuccessAlert("Kode Disalin! 📋", `Kode referral "${affiliate.referralCode}" berhasil disalin.`);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleLogout = async () => {
    const confirmed = await showConfirmAlert(
      "Konfirmasi Logout",
      "Apakah Anda yakin ingin keluar dari Akun Affiliate ini?"
    );
    if (!confirmed) return;

    setIsLoggingOut(true);
    await signOut({ callbackUrl: "/login" });
  };

  // 1. Submit Ubah Kode Referral (Max 1x)
  const handleSubmitNewCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodeInput.trim()) {
      showErrorAlert("Wajib Diisi", "Masukkan kode referral baru Anda.");
      return;
    }

    const clean = newCodeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length < 3 || clean.length > 20) {
      showErrorAlert("Format Salah", "Kode referral harus terdiri dari 3 - 20 karakter alfanumerik (huruf dan angka).");
      return;
    }

    const confirmed = await showConfirmAlert(
      `Ubah Kode Menjadi "${clean}"?`,
      "PERHATIAN: Anda hanya memiliki 1x kesempatan untuk mengubah kode referral seumur hidup!"
    );

    if (!confirmed) return;

    setIsSubmittingCode(true);
    try {
      const res = await updateAffiliateReferralCodeSelfAction(clean);
      if (res.success && res.newCode) {
        showSuccessAlert("Berhasil Diubah 🎉", res.message);
        setAffiliate((prev) => ({
          ...prev,
          referralCode: res.newCode!,
          referralCodeChangeCount: res.changeCount || 1,
        }));
        setIsChangeCodeModalOpen(false);
        setNewCodeInput("");
      } else {
        showErrorAlert("Gagal Mengubah Kode", res.message);
      }
    } catch {
      showErrorAlert("Error", "Terjadi kesalahan saat memperbarui kode referral.");
    } finally {
      setIsSubmittingCode(false);
    }
  };

  // 2. Submit Ubah Rekening
  const handleSubmitBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankNameInput.trim() || !accountNumberInput.trim() || !accountHolderInput.trim()) {
      showErrorAlert("Data Belum Lengkap", "Nama Bank/E-Wallet, Nomor Rekening, dan Nama Pemilik Rekening wajib diisi.");
      return;
    }

    setIsSubmittingBank(true);
    try {
      const res = await updateAffiliateBankInfoSelfAction({
        bankName: bankNameInput.trim(),
        accountNumber: accountNumberInput.trim(),
        accountHolder: accountHolderInput.trim(),
      });

      if (res.success && res.bankInfo) {
        showSuccessAlert("Rekening Disimpan 💳", res.message);
        setAffiliate((prev) => ({
          ...prev,
          bankName: res.bankInfo!.bankName,
          accountNumber: res.bankInfo!.accountNumber,
          accountHolder: res.bankInfo!.accountHolder,
        }));
        setIsEditBankModalOpen(false);
      } else {
        showErrorAlert("Gagal Menyimpan", res.message);
      }
    } catch {
      showErrorAlert("Error", "Terjadi kesalahan saat menyimpan data rekening.");
    } finally {
      setIsSubmittingBank(false);
    }
  };

  // 3. Submit Ubah Profil & Password
  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileNameInput.trim() || !profilePhoneInput.trim() || !profileEmailInput.trim()) {
      showErrorAlert("Data Wajib", "Nama lengkap, nomor WhatsApp, dan Email wajib diisi.");
      return;
    }

    setIsSubmittingProfile(true);
    try {
      const res = await updateAffiliateProfileSelfAction({
        fullName: profileNameInput.trim(),
        phone: profilePhoneInput.trim(),
        email: profileEmailInput.trim(),
        newPassword: profilePasswordInput.trim() || undefined,
        socialMediaUrl: profileSocialInput.trim() || undefined,
      });

      if (res.success && res.affiliate) {
        showSuccessAlert("Profil Diperbarui ✨", res.message);
        setAffiliate((prev) => ({
          ...prev,
          fullName: res.affiliate!.fullName,
          phone: res.affiliate!.phone,
          email: res.affiliate!.email,
        }));
        setIsProfileModalOpen(false);
        setProfilePasswordInput("");
      } else {
        showErrorAlert("Gagal Update", res.message);
      }
    } catch {
      showErrorAlert("Error", "Terjadi kesalahan saat memperbarui profil.");
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const superAdminWa = siteSetting?.whatsappNumber || "6281234567890";
  const cleanAdminWa = superAdminWa.startsWith("08") ? "62" + superAdminWa.slice(1) : superAdminWa;
  const payoutRequestText = encodeURIComponent(
    `Halo Super Admin Smart QR, saya mitra affiliate *${affiliate.fullName}* (Kode: *${affiliate.referralCode}*).\n\nSaya ingin konfirmasi pencairan saldo komisi saya sebesar *Rp ${affiliate.balance.toLocaleString("id-ID")}* ke rekening *${affiliate.bankName || "BCA"} ${affiliate.accountNumber || "-"} a.n ${affiliate.accountHolder || affiliate.fullName}*.\n\nTerima kasih banyak!`
  );
  const payoutWaUrl = `https://wa.me/${cleanAdminWa}?text=${payoutRequestText}`;

  const shareWaText = encodeURIComponent(
    `Halo! Mau bisnismu kebanjiran ulasan Bintang 5 di Google Maps secara instan? Coba pakai Smart QR Review Card!\n\nPesan sekarang lewat link ini untuk dapat subsidi diskon ongkir Rp ${(siteSetting?.affiliateShippingDiscount ?? 10000).toLocaleString("id-ID")}:\n${referralLink}`
  );
  const shareWaUrl = `https://wa.me/?text=${shareWaText}`;

  const isCodeChangeLocked = (affiliate.referralCodeChangeCount || 0) >= 1;

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (!orderSearchQuery.trim()) return true;
    const q = orderSearchQuery.toLowerCase().trim();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.paymentStatus.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden animate-in fade-in"
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 1. LEFT SIDEBAR NAVIGATION (MIRIP SUPER ADMIN & OUTLET)       */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#090d16] border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0 shadow-2xl shadow-purple-950/50" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header Brand */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {siteSetting?.landingPageLogoUrl || siteSetting?.dashboardLogoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={siteSetting.landingPageLogoUrl || siteSetting.dashboardLogoUrl || ""}
                alt="Logo"
                className="w-10 h-10 object-contain drop-shadow-md shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/25 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5 truncate">
                Smart QR <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">AFFILIATE</span>
              </span>
              <span className="text-[10px] text-slate-400 truncate">Mitra Komisi Penjualan</span>
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

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
          {/* Section: Menu Utama */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Navigasi Mitra
            </div>

            {/* Tab: Overview */}
            <button
              onClick={() => {
                setActiveTab("OVERVIEW");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "OVERVIEW"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0 text-purple-400" />
              <span className="truncate">Ringkasan & Statistik</span>
            </button>

            {/* Tab: Orders */}
            <button
              onClick={() => {
                setActiveTab("ORDERS");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "ORDERS"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Package className="w-4 h-4 shrink-0 text-sky-400" />
                <span className="truncate">Riwayat Pesanan & Komisi</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                {orders.length}
              </span>
            </button>

            {/* Tab: Referral Tools */}
            <button
              onClick={() => {
                setActiveTab("REFERRAL");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "REFERRAL"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              }`}
            >
              <Share2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="truncate">Link & Kode Referral</span>
            </button>

            {/* Tab: Payout / Banking */}
            <button
              onClick={() => {
                setActiveTab("PAYOUT");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "PAYOUT"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <CreditCard className="w-4 h-4 shrink-0 text-amber-400" />
                <span className="truncate">Rekening & Penarikan</span>
              </div>
              {affiliate.balance > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                  Rp {(affiliate.balance / 1000).toFixed(0)}k
                </span>
              )}
            </button>

            {/* Tab: Settings */}
            <button
              onClick={() => {
                setActiveTab("SETTINGS");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "SETTINGS"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              }`}
            >
              <Settings className="w-4 h-4 shrink-0 text-slate-400" />
              <span className="truncate">Profil & Keamanan Akun</span>
            </button>
          </div>

          {/* Quick Action Button: Salin Link Referral */}
          <div className="pt-2">
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-600/20 hover:shadow-purple-600/30 transition-all cursor-pointer group active:scale-[0.98]"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 transition-transform group-hover:scale-110" />}
              <span>{copiedLink ? "Link Disalin!" : "Salin Link Referral"}</span>
            </button>
          </div>

          {/* Sisa Saldo Quick Box */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Sisa Saldo Komisi:</span>
              <span className="font-mono font-bold text-amber-400">
                Rp {affiliate.balance.toLocaleString("id-ID")}
              </span>
            </div>
            <a
              href={payoutWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                affiliate.balance > 0
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow"
                  : "bg-slate-800 text-slate-500 pointer-events-none opacity-50"
              }`}
            >
              <MessageCircle className="w-3 h-3" />
              <span>Cairkan Saldo</span>
            </a>
          </div>
        </div>

        {/* Sidebar Footer User Info & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-[#070b14] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 font-bold flex items-center justify-center text-xs shrink-0">
              {affiliate.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">
                {affiliate.fullName}
              </span>
              <span className="text-[10px] text-purple-400 font-mono truncate">
                Kode: {affiliate.referralCode}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/20 transition-all cursor-pointer shrink-0"
            title="Logout dari Akun"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 2. MAIN APP CONTENT AREA (WITH TOP BAR & TABS)                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors"
              title="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h2 className="font-extrabold text-sm sm:text-base text-white truncate flex items-center gap-2">
                {activeTab === "OVERVIEW" && "Dashboard & Statistik Kemitraan"}
                {activeTab === "ORDERS" && "Riwayat Pesanan & Komisi Transparan"}
                {activeTab === "REFERRAL" && "Pusat Promosi & Link Referral"}
                {activeTab === "PAYOUT" && "Rekening & Pencairan Saldo Komisi"}
                {activeTab === "SETTINGS" && "Pengaturan Profil & Keamanan"}
              </h2>
              <span className="text-[11px] text-slate-400 hidden sm:block">
                Portal Resmi Mitra Affiliate Smart QR Review
              </span>
            </div>
          </div>

          {/* Top Right Quick Badges */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Referral Pill */}
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Klik untuk Salin Kode Referral"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{affiliate.referralCode}</span>
              {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
            </button>

            {/* Live Balance Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <Wallet className="w-3.5 h-3.5" />
              <span>Rp {affiliate.balance.toLocaleString("id-ID")}</span>
            </div>

            {/* Profile Button */}
            <button
              onClick={() => {
                setProfileNameInput(affiliate.fullName);
                setProfilePhoneInput(affiliate.phone);
                setProfileEmailInput(affiliate.email);
                setProfilePasswordInput("");
                setIsProfileModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <User className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden md:inline">Profil</span>
            </button>
          </div>
        </header>

        {/* Tab Content Body */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 space-y-6 max-w-7xl w-full mx-auto">
          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 1: OVERVIEW (RINGKASAN & METRIK)                        */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === "OVERVIEW" && (
            <div className="space-y-6 animate-in fade-in">
              {/* Modern Clean Hero Banner */}
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-950/80 via-indigo-950/60 to-slate-900 border border-purple-500/30 shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3 max-w-xl">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Program Komisi Resmi Mitra Affiliate</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                      Dapatkan Komisi{" "}
                      <span className="text-emerald-400">
                        {affiliate.commissionPerPcs <= 100
                          ? `${affiliate.commissionPerPcs}%`
                          : `Rp ${affiliate.commissionPerPcs.toLocaleString("id-ID")}`}
                      </span>{" "}
                      {affiliate.commissionPerPcs <= 100 ? "dari Subtotal Belanja Kartu" : "/ Kartu Terjual"}
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Setiap pembeli yang checkout menggunakan link atau kode referral Anda akan mendapatkan{" "}
                      <strong className="text-emerald-300">subsidi potongan ongkir Rp {(siteSetting?.affiliateShippingDiscount ?? 10000).toLocaleString("id-ID")}</strong>. Komisi dihitung murni dari total belanja kartu (tidak dipotong ongkir) dan langsung masuk ke saldo Anda!
                    </p>
                  </div>

                  {/* Kode & Share Box */}
                  <div className="p-5 bg-slate-900/95 border border-slate-800 rounded-2xl space-y-3 shrink-0 md:w-80 shadow-xl">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Kode Referral Anda:
                        </span>
                        {isCodeChangeLocked ? (
                          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Paten (1x)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setNewCodeInput(affiliate.referralCode);
                              setIsChangeCodeModalOpen(true);
                            }}
                            className="text-[11px] font-bold text-purple-400 hover:text-purple-300 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Ubah (1x)</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-purple-500/40">
                        <span className="text-lg font-mono font-black text-purple-300 tracking-wider">
                          {affiliate.referralCode}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 transition-colors cursor-pointer"
                          title="Salin Kode"
                        >
                          {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                      <span>{copiedLink ? "Link Referral Disalin!" : "Salin Link Referral"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Cards Summary Metrik Keuangan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Sisa Saldo */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-amber-500/30 shadow-lg space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between text-amber-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Sisa Saldo Komisi</span>
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-black text-amber-400 font-mono">
                    Rp {affiliate.balance.toLocaleString("id-ID")}
                  </div>
                  <div className="pt-2 border-t border-slate-800">
                    <a
                      href={payoutWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow ${
                        affiliate.balance > 0
                          ? "bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
                          : "bg-slate-800 text-slate-500 pointer-events-none opacity-60"
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Cairkan ke WhatsApp</span>
                    </a>
                  </div>
                </div>

                {/* Card 2: Total Komisi Didapat */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-emerald-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Komisi Didapat</span>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    Rp {affiliate.totalEarned.toLocaleString("id-ID")}
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1">
                    Akumulasi seluruh penjualan sukses
                  </p>
                </div>

                {/* Card 3: Kartu Terjual */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-sky-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Kartu Terjual</span>
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-black text-sky-300 font-mono">
                    {totalCardsSold} <span className="text-sm font-semibold text-slate-400">pcs ({paidOrdersCount} order)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1">
                    Dari pembeli via link referral Anda
                  </p>
                </div>

                {/* Card 4: Tarif Komisi */}
                <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-purple-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Tarif Komisi</span>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-black text-purple-300 font-mono">
                    {affiliate.commissionPerPcs <= 100 ? (
                      <>
                        {affiliate.commissionPerPcs}% <span className="text-xs text-slate-400 font-normal">subtotal kartu</span>
                      </>
                    ) : (
                      <>
                        Rp {affiliate.commissionPerPcs.toLocaleString("id-ID")} <span className="text-xs text-slate-400 font-normal">/ pcs</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1">
                    {affiliate.commissionPerPcs <= 100
                      ? "Dihitung dari subtotal kartu (tanpa ongkir)"
                      : `Tier: ${affiliate.followersCount.toLocaleString("id-ID")} Followers`}
                  </p>
                </div>
              </div>

              {/* Grid: Preview Pesanan Terakhir & Info Rekening */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tabel Preview Pesanan */}
                <div className="lg:col-span-2 p-5 sm:p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2 font-extrabold text-sm text-white">
                      <Package className="w-4 h-4 text-purple-400" />
                      <span>Pesanan Referral Terbaru ({orders.slice(0, 5).length})</span>
                    </div>
                    {orders.length > 5 && (
                      <button
                        onClick={() => setActiveTab("ORDERS")}
                        className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Lihat Semua</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {orders.length === 0 ? (
                    <div className="py-10 text-center space-y-2">
                      <Users className="w-10 h-10 text-slate-600 mx-auto" />
                      <h4 className="text-sm font-semibold text-slate-300">Belum Ada Transaksi Referral</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Bagikan link referral Anda ke WhatsApp, media sosial, atau teman bisnis Anda.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                            <th className="pb-2.5 font-bold">No. Pesanan</th>
                            <th className="pb-2.5 font-bold">Pembeli</th>
                            <th className="pb-2.5 font-bold text-center">Jumlah</th>
                            <th className="pb-2.5 font-bold text-right">Subtotal Produk</th>
                            <th className="pb-2.5 font-bold text-right">Komisi Anda</th>
                            <th className="pb-2.5 font-bold text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {orders.slice(0, 5).map((ord) => {
                            const productSubtotal = ord.subtotal || Math.max(0, ord.totalAmount - (ord.shippingFee || 0));
                            return (
                              <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-3 font-mono font-bold text-white">
                                  #{ord.orderNumber}
                                </td>
                                <td className="py-3 text-slate-300 font-medium">
                                  {ord.customerName}
                                </td>
                                <td className="py-3 text-center text-slate-300 font-mono">
                                  {ord.totalQuantity} pcs
                                </td>
                                <td className="py-3 text-right font-mono font-bold text-slate-200">
                                  Rp {productSubtotal.toLocaleString("id-ID")}
                                </td>
                                <td className="py-3 text-right font-mono font-bold text-emerald-400">
                                  + Rp {ord.affiliateCommission.toLocaleString("id-ID")}
                                </td>
                                <td className="py-3 text-center">
                                  {ord.paymentStatus === "PAID" ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      LUNAS
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      MENUNGGU
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Quick Share & Banking Mini Card */}
                <div className="space-y-6">
                  {/* Share Box */}
                  <div className="p-5 sm:p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-3">
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-emerald-400" />
                      <span>Promosikan Sekarang</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Bagikan pesan promo langsung ke WhatsApp pembeli dengan sekali klik:
                    </p>
                    <a
                      href={shareWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Kirim Promo ke WhatsApp</span>
                    </a>
                  </div>

                  {/* Rekening Card */}
                  <div className="p-5 sm:p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-amber-400" />
                        <span>Rekening Pencairan</span>
                      </h3>
                      <button
                        onClick={() => {
                          setBankNameInput(affiliate.bankName || "");
                          setAccountNumberInput(affiliate.accountNumber || "");
                          setAccountHolderInput(affiliate.accountHolder || affiliate.fullName);
                          setIsEditBankModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
                      >
                        Ubah
                      </button>
                    </div>

                    <div className="text-xs space-y-1 text-slate-300">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Bank / E-Wallet:</span>
                        <span className="font-bold text-white">{affiliate.bankName || "Belum diisi"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Nomor Rekening:</span>
                        <span className="font-mono font-bold text-white">{affiliate.accountNumber || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Atas Nama:</span>
                        <span className="font-semibold text-slate-200">{affiliate.accountHolder || affiliate.fullName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 2: ORDERS (RIWAYAT PESANAN LENGKAP & TRANSPARAN)        */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === "ORDERS" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-5 sm:p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                      <Package className="w-5 h-5 text-purple-400" />
                      <span>Seluruh Riwayat Transaksi Referral ({orders.length})</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Rincian transparan komisi yang Anda peroleh murni dari harga produk
                    </p>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      placeholder="Cari No. Order / Pembeli..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <Package className="w-10 h-10 text-slate-600 mx-auto" />
                    <h4 className="text-sm font-semibold text-slate-300">Tidak Ada Data Pesanan</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {orderSearchQuery ? "Tidak ditemukan pesanan dengan kata kunci tersebut." : "Belum ada pembeli yang memesan menggunakan kode referral Anda."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                            <th className="pb-3 font-bold">No. Pesanan</th>
                            <th className="pb-3 font-bold">Nama Pembeli</th>
                            <th className="pb-3 font-bold text-center">Jumlah (pcs)</th>
                            <th className="pb-3 font-bold text-right">Subtotal Produk</th>
                            <th className="pb-3 font-bold text-center">Tarif Komisi</th>
                            <th className="pb-3 font-bold text-right">Komisi Anda</th>
                            <th className="pb-3 font-bold text-center">Status Bayar</th>
                            <th className="pb-3 font-bold text-center">Tanggal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredOrders.map((ord) => {
                            const productSubtotal = ord.subtotal || Math.max(0, ord.totalAmount - (ord.shippingFee || 0));
                            const rateDisplay = affiliate.commissionPerPcs <= 100
                              ? `${affiliate.commissionPerPcs}%`
                              : `Rp ${affiliate.commissionPerPcs.toLocaleString("id-ID")}/pcs`;

                            const orderDate = new Date(ord.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            });

                            return (
                              <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="py-3 font-mono font-bold text-white">
                                  #{ord.orderNumber}
                                </td>
                                <td className="py-3 text-slate-300 font-medium">
                                  {ord.customerName}
                                </td>
                                <td className="py-3 text-center text-slate-300 font-mono">
                                  {ord.totalQuantity} pcs
                                </td>
                                <td className="py-3 text-right font-mono font-bold text-slate-200">
                                  Rp {productSubtotal.toLocaleString("id-ID")}
                                </td>
                                <td className="py-3 text-center font-mono text-[11px] text-purple-300">
                                  {rateDisplay}
                                </td>
                                <td className="py-3 text-right font-mono font-bold text-emerald-400">
                                  + Rp {ord.affiliateCommission.toLocaleString("id-ID")}
                                </td>
                                <td className="py-3 text-center">
                                  {ord.paymentStatus === "PAID" ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      LUNAS
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      MENUNGGU
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 text-center text-slate-400 text-[11px]">
                                  {orderDate}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-xs text-slate-300 flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <strong className="text-white block font-bold">Kebijakan Transparansi Komisi Affiliate:</strong>
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                          Komisi dihitung murni dari harga total subtotal produk kartu yang dibeli oleh pembeli. Subsidi ongkir atau biaya pengiriman tidak dipotong dari komisi Anda. Komisi akan otomatis bertambah ke saldo saat status pesanan menjadi LUNAS.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 3: REFERRAL TOOLS & PROMOSI                             */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === "REFERRAL" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Box 1: Link & Kode Referral */}
                <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <Tag className="w-4 h-4 text-purple-400" />
                      <span>Kode & Link Referral Anda</span>
                    </h3>
                    {isCodeChangeLocked ? (
                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Paten (1x)
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setNewCodeInput(affiliate.referralCode);
                          setIsChangeCodeModalOpen(true);
                        }}
                        className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Ubah Kode (1x)</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Kode Referral Unik:</span>
                      <div className="p-3 bg-slate-950 rounded-2xl border border-purple-500/30 flex items-center justify-between">
                        <span className="font-mono text-xl font-black text-purple-300 tracking-wider">
                          {affiliate.referralCode}
                        </span>
                        <button
                          onClick={handleCopyCode}
                          className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCode ? "Tersalin" : "Salin Kode"}</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Link Referral Langsung:</span>
                      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-slate-300 truncate">
                          {referralLink}
                        </span>
                        <button
                          onClick={handleCopyLink}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? "Tersalin" : "Salin Link"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Box 2: Bagikan Cepat ke WhatsApp */}
                <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>Bagikan Promo ke WhatsApp</span>
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Template pesan ini sudah dilengkapi kode referral Anda dan penawaran subsidi ongkir resmi untuk menarik calon pembeli:
                  </p>

                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 font-mono space-y-2">
                    <p>
                      Mau bisnismu kebanjiran ulasan Bintang 5 di Google Maps secara instan? Coba pakai Smart QR Review Card!
                    </p>
                    <p className="text-emerald-400 font-semibold">
                      Dapatkan subsidi diskon ongkir Rp {(siteSetting?.affiliateShippingDiscount ?? 10000).toLocaleString("id-ID")} dengan kode: {affiliate.referralCode}
                    </p>
                    <p className="text-sky-400 underline truncate">{referralLink}</p>
                  </div>

                  <a
                    href={shareWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Kirim Pesan Promo Sekarang</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 4: PAYOUT & REKENING                                    */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === "PAYOUT" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Kartu Saldo & Payout */}
                <div className="lg:col-span-2 p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-amber-400" />
                      <span>Saldo Komisi & Pencairan Dana</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-1">
                      <span className="text-xs text-slate-400">Saldo Tersedia untuk Ditarik:</span>
                      <div className="text-2xl font-black text-amber-400 font-mono">
                        Rp {affiliate.balance.toLocaleString("id-ID")}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                      <span className="text-xs text-slate-400">Total Komisi yang Sudah Dicairkan:</span>
                      <div className="text-2xl font-black text-slate-300 font-mono">
                        Rp {affiliate.totalWithdrawn.toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Alur Pencairan Komisi:</span>
                    </h4>
                    <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-5">
                      <li>Pencairan dapat diajukan kapan saja tanpa batas minimum saldo.</li>
                      <li>Dana akan ditransfer oleh Super Admin langsung ke rekening/e-wallet terdaftar Anda.</li>
                      <li>Klik tombol di bawah untuk konfirmasi permintaan pencairan secara instan ke WhatsApp Admin.</li>
                    </ul>
                  </div>

                  <a
                    href={payoutWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-3.5 rounded-2xl text-sm font-extrabold transition-all flex items-center justify-center gap-2 shadow-xl ${
                      affiliate.balance > 0
                        ? "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                        : "bg-slate-800 text-slate-500 pointer-events-none opacity-50"
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Cairkan Komisi via WhatsApp (Rp {affiliate.balance.toLocaleString("id-ID")})</span>
                  </a>
                </div>

                {/* Detail Rekening Penerima */}
                <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-purple-400" />
                      <span>Rekening Terdaftar</span>
                    </h3>
                    <button
                      onClick={() => {
                        setBankNameInput(affiliate.bankName || "");
                        setAccountNumberInput(affiliate.accountNumber || "");
                        setAccountHolderInput(affiliate.accountHolder || affiliate.fullName);
                        setIsEditBankModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors cursor-pointer"
                    >
                      Ubah Rekening
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Bank / E-Wallet:</span>
                      <span className="font-bold text-white text-sm block">
                        {affiliate.bankName || "Belum Didaftarkan"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] block">Nomor Rekening / No. E-Wallet:</span>
                      <span className="font-mono font-bold text-white text-sm block">
                        {affiliate.accountNumber || "-"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] block">Atas Nama Pemilik:</span>
                      <span className="font-semibold text-slate-200 block">
                        {affiliate.accountHolder || affiliate.fullName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB 5: SETTINGS & PROFIL                                    */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === "SETTINGS" && (
            <div className="space-y-6 animate-in fade-in max-w-2xl">
              <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-5">
                <div className="pb-3 border-b border-slate-800">
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-400" />
                    <span>Pengaturan Akun & Profil Mitra</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Perbarui nama lengkap, nomor WhatsApp, email, atau ganti password login Anda
                  </p>
                </div>

                <form onSubmit={handleSubmitProfile} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      value={profileNameInput}
                      onChange={(e) => setProfileNameInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nomor WhatsApp Aktif *</label>
                    <input
                      type="text"
                      required
                      value={profilePhoneInput}
                      onChange={(e) => setProfilePhoneInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Alamat Email *</label>
                    <input
                      type="email"
                      required
                      value={profileEmailInput}
                      onChange={(e) => setProfileEmailInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Password Baru (Kosongkan jika tidak ingin mengganti)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={profilePasswordInput}
                        onChange={(e) => setProfilePasswordInput(e.target.value)}
                        placeholder="Minimal 4 karakter"
                        className="w-full px-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingProfile}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>Simpan Perubahan Profil</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 3. MODALS (UBAH KODE REFERRAL, UBAH REKENING, EDIT PROFIL)     */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      {/* MODAL 1: UBAH KODE REFERRAL (MAX 1X) */}
      {isChangeCodeModalOpen && (
        <div className="fixed inset-0 z-60 p-4 bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Edit2 className="w-4 h-4" />
                <span>Ubah Kode Referral (Maks. 1x)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeCodeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 space-y-1">
              <span className="font-bold block">⚠️ Peringatan Penting:</span>
              <p className="text-[11px] leading-relaxed">
                Anda hanya memiliki <strong>1 kali kesempatan seumur hidup</strong> untuk mengubah kode referral. Setelah diubah, kode tidak dapat diganti lagi!
              </p>
            </div>

            <form onSubmit={handleSubmitNewCode} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Kode Referral Baru *</label>
                <input
                  type="text"
                  required
                  value={newCodeInput}
                  onChange={(e) => setNewCodeInput(e.target.value.toUpperCase())}
                  placeholder="Contoh: KOPISENJA / DISKONKU"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white font-mono font-bold uppercase outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  3 - 20 karakter alfanumerik (huruf & angka).
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangeCodeModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCode}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingCode && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Kode</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UBAH DATA REKENING */}
      {isEditBankModalOpen && (
        <div className="fixed inset-0 z-60 p-4 bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <CreditCard className="w-4 h-4" />
                <span>Pengaturan Rekening Pencairan</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditBankModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitBank} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Bank / E-Wallet *</label>
                <input
                  type="text"
                  required
                  value={bankNameInput}
                  onChange={(e) => setBankNameInput(e.target.value)}
                  placeholder="BCA / Mandiri / BRI / GoPay / Dana"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nomor Rekening / No. E-Wallet *</label>
                <input
                  type="text"
                  required
                  value={accountNumberInput}
                  onChange={(e) => setAccountNumberInput(e.target.value)}
                  placeholder="0881234567 / 1234567890"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Atas Nama Pemilik Rekening *</label>
                <input
                  type="text"
                  required
                  value={accountHolderInput}
                  onChange={(e) => setAccountHolderInput(e.target.value)}
                  placeholder="Sesuai nama di buku tabungan/akun"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditBankModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBank}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingBank && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Rekening</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: UBAH PROFIL & PASSWORD QUICK */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-60 p-4 bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <User className="w-4 h-4" />
                <span>Ubah Profil & Password</span>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">No. WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={profilePhoneInput}
                  onChange={(e) => setProfilePhoneInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={profileEmailInput}
                  onChange={(e) => setProfileEmailInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Password Baru (Kosongkan jika tidak diganti)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={profilePasswordInput}
                    onChange={(e) => setProfilePasswordInput(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full px-3.5 pr-8 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProfile}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
