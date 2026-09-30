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
} from "lucide-react";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "@/lib/swal";
import {
  updateAffiliateReferralCodeSelfAction,
  updateAffiliateBankInfoSelfAction,
  updateAffiliateProfileSelfAction,
} from "@/lib/actions/affiliate.actions";

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
  };
}

export function AffiliateDashboardClient({
  affiliate: initialAffiliate,
  orders,
  siteSetting,
}: AffiliateDashboardClientProps) {
  const [affiliate, setAffiliate] = useState(initialAffiliate);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  // Modal 3: Ubah Profil & Password (Nama, WA, Email, Password)
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
  const paidOrdersCount = orders.filter((o) => o.paymentStatus === "PAID").length;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    showSuccessAlert("Link Disalin! 🔗", "Link referral affiliate berhasil disalin ke clipboard.");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(affiliate.referralCode);
    setCopiedCode(true);
    showSuccessAlert("Kode Disalin! 📋", `Kode referral "${affiliate.referralCode}" berhasil disalin.`);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleLogout = async () => {
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

  const isCodeChangeLocked = (affiliate.referralCodeChangeCount || 0) >= 1;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {siteSetting?.landingPageLogoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={siteSetting.landingPageLogoUrl}
                alt="Logo"
                className="w-10 h-10 object-contain drop-shadow-md shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/25 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-white">Smart QR</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  AFFILIATE PORTAL
                </span>
              </div>
              <span className="text-[11px] text-slate-400 truncate block">
                Halo, <strong className="text-slate-200">{affiliate.fullName}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Tombol Edit Profil & Password */}
            <button
              type="button"
              onClick={() => {
                setProfileNameInput(affiliate.fullName);
                setProfilePhoneInput(affiliate.phone);
                setProfileEmailInput(affiliate.email);
                setProfilePasswordInput("");
                setIsProfileModalOpen(true);
              }}
              className="px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Pengaturan Akun & Password"
            >
              <User className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Ubah Profil & Password</span>
              <span className="sm:hidden">Profil</span>
            </button>

            {/* Tombol Logout */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Logout dari Akun"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6 w-full">
        {/* Banner Referral Share */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-slate-950 border border-purple-500/30 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Program Komisi Resmi Mitra Affiliate</span>
                     <h1 className="text-2xl sm:text-3xl font-black text-white">
                Bagikan Link & Dapatkan{" "}
                <span className="text-emerald-400">
                  {affiliate.commissionPerPcs <= 100
                    ? `${affiliate.commissionPerPcs}% Komisi`
                    : `Rp ${affiliate.commissionPerPcs.toLocaleString("id-ID")}`}
                </span>{" "}
                {affiliate.commissionPerPcs <= 100 ? "dari Subtotal Kartu" : "/ Kartu"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Setiap pembeli yang checkout menggunakan link atau kode referral Anda akan mendapatkan <strong>subsidi potongan ongkir Rp {(siteSetting?.affiliateShippingDiscount ?? 10000).toLocaleString("id-ID")}</strong> dan komisi dihitung murni dari total belanja kartu (tidak dipotong ongkir) langsung masuk ke saldo Anda!
              </p>
            </div>

            {/* Kode & Share Box */}
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3 shrink-0 md:w-80 shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Kode Referral Unik Anda:
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
                      <span>Ubah Kode (1x)</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-purple-500/40">
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
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/30 shadow-lg space-y-2">
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
                <span>Cairkan ke WhatsApp Admin</span>
              </a>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-2">
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

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-sky-400">
              <span className="text-xs font-bold uppercase tracking-wider">Kartu Terjual</span>
              <Package className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-sky-300 font-mono">
              {totalCardsSold} <span className="text-sm font-semibold text-slate-400">pcs ({paidOrdersCount} order)</span>
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              Dari pembeli via kode referral Anda
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-purple-400">
              <span className="text-xs font-bold uppercase tracking-wider">Tarif Komisi</span>
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-purple-300 font-mono">
              {affiliate.commissionPerPcs <= 100 ? (
                <>
                  {affiliate.commissionPerPcs}% <span className="text-xs text-slate-400 font-normal">dari total kartu</span>
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

        {/* Riwayat Penjualan & Info Rekening */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tabel Riwayat Pesanan Referral */}
          <div className="lg:col-span-2 p-5 sm:p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-extrabold text-sm text-white">
                <Package className="w-4 h-4 text-purple-400" />
                <span>Riwayat Pesanan Referral ({orders.length})</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Komisi transparan per transaksi
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Users className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-300">Belum Ada Transaksi Referral</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Bagikan link referral Anda ke teman, grup WhatsApp, atau bio media sosial untuk mulai mendapatkan komisi setiap ada pemesanan.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                        <th className="pb-2.5 font-bold">No. Pesanan</th>
                        <th className="pb-2.5 font-bold">Pembeli</th>
                        <th className="pb-2.5 font-bold text-center">Jumlah</th>
                        <th className="pb-2.5 font-bold text-right">Subtotal Produk</th>
                        <th className="pb-2.5 font-bold text-center">Tarif</th>
                        <th className="pb-2.5 font-bold text-right">Komisi Anda</th>
                        <th className="pb-2.5 font-bold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {orders.map((ord) => {
                        const productSubtotal = ord.subtotal || Math.max(0, ord.totalAmount - (ord.shippingFee || 0));
                        const rateDisplay = affiliate.commissionPerPcs <= 100
                          ? `${affiliate.commissionPerPcs}%`
                          : `Rp ${affiliate.commissionPerPcs.toLocaleString("id-ID")}/pcs`;

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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-[11px] text-slate-400 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Transparansi Penuh:</strong> Komisi Anda dihitung murni dari total subtotal produk kartu yang dibeli oleh pelanggan dan tidak dipotong/dikenakan dari biaya ongkos kirim.
                  </span>
                </div>
              </div>
            )}
          </div>        </div>

          {/* Info Rekening & Hubungi Admin */}
          <div className="space-y-6">
            <div className="p-5 sm:p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Rekening Pencairan Dana</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setBankNameInput(affiliate.bankName || "");
                    setAccountNumberInput(affiliate.accountNumber || "");
                    setAccountHolderInput(affiliate.accountHolder || affiliate.fullName);
                    setIsEditBankModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Ubah Rekening</span>
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Bank / E-Wallet:</span>
                  <span className="text-white font-bold text-sm block">
                    {affiliate.bankName || "Belum Didaftarkan"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Nomor Rekening / No. E-Wallet:</span>
                  <span className="text-white font-mono font-bold text-sm block">
                    {affiliate.accountNumber || "-"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Atas Nama Rekening:</span>
                  <span className="text-white font-bold block">
                    {affiliate.accountHolder || affiliate.fullName}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-[11px] text-slate-400 leading-relaxed">
                Dana pencairan komisi akan ditransfer Super Admin langsung ke rekening di atas.
              </div>
            </div>

            <div className="p-5 sm:p-6 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl space-y-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Bantuan & Dukungan</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Jika ada kendala pelacakan komisi, pesanan pembeli, atau pencairan saldo, hubungi admin resmi kami.
              </p>
              <a
                href={payoutWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Hubungi Super Admin via WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL 1: UBAH KODE REFERRAL (MAKSIMAL 1X) */}
      {isChangeCodeModalOpen && (
        <div className="fixed inset-0 z-50 p-4 bg-black/85 backdrop-blur-md flex items-center justify-center animate-in fade-in">
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
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Peringatan Penting:</span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-amber-200">
                Kode referral hanya dapat diubah <strong>1 kali saja</strong> seumur hidup. Pastikan kode yang Anda pilih sudah sesuai sebelum menyimpan.
              </p>
            </div>

            <form onSubmit={handleSubmitNewCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kode Referral Baru (3 - 20 Karakter Huruf & Angka) *
                </label>
                <input
                  type="text"
                  required
                  value={newCodeInput}
                  onChange={(e) => setNewCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  placeholder="Misal: NDUT888 atau ARSINDUT"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono font-bold text-purple-300 tracking-wider focus:outline-none focus:border-purple-500 uppercase"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Link referral Anda akan berubah menjadi: <strong className="text-slate-300">{origin}?ref={newCodeInput.trim() || "KODE"}</strong>
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangeCodeModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCode}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingCode && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Kode Baru</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UBAH DATA REKENING */}
      {isEditBankModalOpen && (
        <div className="fixed inset-0 z-50 p-4 bg-black/85 backdrop-blur-md flex items-center justify-center animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <CreditCard className="w-4 h-4" />
                <span>Ubah Data Rekening Pencairan</span>
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
                  placeholder="Misal: BCA / BRI / Mandiri / GoPay / Dana"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nomor Rekening / No. E-Wallet *</label>
                <input
                  type="text"
                  required
                  value={accountNumberInput}
                  onChange={(e) => setAccountNumberInput(e.target.value)}
                  placeholder="1234567890"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Atas Nama Pemilik Rekening *</label>
                <input
                  type="text"
                  required
                  value={accountHolderInput}
                  onChange={(e) => setAccountHolderInput(e.target.value)}
                  placeholder="Nama sesuai buku tabungan / akun e-wallet"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditBankModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBank}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingBank && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Rekening</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: UBAH PROFIL & PASSWORD (NAMA, WA, EMAIL, PASSWORD) */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 p-4 bg-black/85 backdrop-blur-md flex items-center justify-center animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <User className="w-4 h-4" />
                <span>Pengaturan Profil & Password Akun</span>
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
                  placeholder="Nama Lengkap Anda"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nomor WhatsApp Aktif *</label>
                <input
                  type="text"
                  required
                  value={profilePhoneInput}
                  onChange={(e) => setProfilePhoneInput(e.target.value)}
                  placeholder="08123456789"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Akun Login *</label>
                <input
                  type="email"
                  required
                  value={profileEmailInput}
                  onChange={(e) => setProfileEmailInput(e.target.value)}
                  placeholder="email@anda.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Password Baru (Kosongkan jika tidak ingin ganti)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={profilePasswordInput}
                    onChange={(e) => setProfilePasswordInput(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full px-3 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProfile}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Smart QR Review Platform. Portal Kemitraan Affiliate.
      </footer>
    </div>
  );
}
