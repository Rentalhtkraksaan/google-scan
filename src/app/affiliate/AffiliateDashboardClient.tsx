"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
  Sparkles,
  DollarSign,
  TrendingUp,
  CreditCard,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Package,
  LogOut,
  QrCode,
  Users,
  Building2,
  MessageCircle,
  Phone,
  ShieldCheck,
  Clock,
  ArrowRight,
} from "lucide-react";
import { showSuccessAlert } from "@/lib/swal";

interface AffiliateDashboardClientProps {
  affiliate: {
    id: string;
    fullName: string;
    phone: string;
    email: string;
    referralCode: string;
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
  affiliate,
  orders,
  siteSetting,
}: AffiliateDashboardClientProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const superAdminWa = siteSetting?.whatsappNumber || "6281234567890";
  const cleanAdminWa = superAdminWa.startsWith("08") ? "62" + superAdminWa.slice(1) : superAdminWa;
  const payoutRequestText = encodeURIComponent(
    `Halo Super Admin Smart QR, saya mitra affiliate *${affiliate.fullName}* (Kode: *${affiliate.referralCode}*).\n\nSaya ingin konfirmasi pencairan saldo komisi saya sebesar *Rp ${affiliate.balance.toLocaleString("id-ID")}* ke rekening *${affiliate.bankName || "BCA"} ${affiliate.accountNumber || "-"} a.n ${affiliate.accountHolder || affiliate.fullName}*.\n\nTerima kasih banyak!`
  );
  const payoutWaUrl = `https://wa.me/${cleanAdminWa}?text=${payoutRequestText}`;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-white">Smart QR</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  AFFILIATE PORTAL
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Halo, <strong className="text-slate-200">{affiliate.fullName}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
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
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Bagikan Link & Dapatkan <span className="text-emerald-400">Rp {affiliate.commissionPerPcs.toLocaleString("id-ID")}</span> / Kartu
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Setiap audiens atau pembeli yang checkout menggunakan link atau kode referral Anda akan mendapatkan <strong>subsidi potongan ongkir Rp {(siteSetting?.affiliateShippingDiscount ?? 10000).toLocaleString("id-ID")}</strong> dan komisi otomatis masuk ke saldo Anda!
              </p>
            </div>

            {/* Kode & Share Box */}
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3 shrink-0 md:w-80 shadow-xl">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Kode Referral Unik Anda:
                </span>
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
              <span className="text-xs font-bold uppercase tracking-wider">Tarif Komisi per Unit</span>
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-purple-300 font-mono">
              Rp {affiliate.commissionPerPcs.toLocaleString("id-ID")} <span className="text-xs text-slate-400 font-normal">/ pcs</span>
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              Tier: {affiliate.followersCount.toLocaleString("id-ID")} Followers
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
                <span>Riwayat Pesanan dari Kode Referral Anda ({orders.length})</span>
              </div>
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
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                      <th className="pb-2.5 font-bold">No. Pesanan</th>
                      <th className="pb-2.5 font-bold">Pembeli</th>
                      <th className="pb-2.5 font-bold text-center">Jumlah</th>
                      <th className="pb-2.5 font-bold text-right">Komisi Anda</th>
                      <th className="pb-2.5 font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {orders.map((ord) => (
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Info Rekening & Hubungi Admin */}
          <div className="space-y-6">
            <div className="p-5 sm:p-6 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2 pb-3 border-b border-slate-800">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Rekening Pencairan Dana</span>
              </h3>

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
                Ingin mengubah rekening pencairan? Silakan hubungi <strong>Super Admin</strong> via WhatsApp.
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

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Smart QR Review Platform. Portal Kemitraan Affiliate.
      </footer>
    </div>
  );
}
