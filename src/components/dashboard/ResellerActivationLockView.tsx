"use client";

import { useState } from "react";
import {
  Lock,
  Crown,
  Sparkles,
  QrCode,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  LogOut,
  Upload,
  MessageCircle,
  Loader2,
  FileText,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SiteSettingModel, AuthenticatedUser } from "@/types/models";
import { createResellerMidtransQrisAction, submitResellerPaymentProofAction } from "@/lib/actions/reseller.actions";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

interface ResellerActivationLockViewProps {
  user: AuthenticatedUser;
  siteSetting?: SiteSettingModel;
  superAdminContact?: {
    fullName: string;
    whatsappNumber: string | null;
  } | null;
}

export function ResellerActivationLockView({
  user,
  siteSetting,
  superAdminContact,
}: ResellerActivationLockViewProps) {
  const router = useRouter();
  const midtransActive = siteSetting?.midtransEnabled !== false;
  const [activeTab, setActiveTab] = useState<"QRIS" | "MANUAL">(
    siteSetting?.midtransEnabled === false ? "MANUAL" : "QRIS"
  );
  const [isProcessingMidtrans, setIsProcessingMidtrans] = useState(false);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [senderName, setSenderName] = useState(user.fullName || "");
  const [senderNotes, setSenderNotes] = useState("");
  const [proofImageBase64, setProofImageBase64] = useState<string | null>(null);

  const modulePrice = siteSetting?.resellerModulePrice || 150000;
  const moduleTitle = siteSetting?.resellerModuleTitle || "Starter Kit & Modul Resmi Kemitraan Smart QR";

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  // 1. Handler Beli via Midtrans QRIS
  const handlePayWithMidtrans = async () => {
    setIsProcessingMidtrans(true);
    try {
      const res = await createResellerMidtransQrisAction();
      if (!res.success || !res.token) {
        showErrorAlert("Gagal Memulai Pembayaran", res.message || "Silakan gunakan metode transfer manual.");
        setIsProcessingMidtrans(false);
        return;
      }

      // Pastikan Snap.js sudah termuat
      const clientKey = siteSetting?.midtransClientKey || "";
      const isProduction = siteSetting?.midtransIsProduction || false;
      const snapScriptUrl = isProduction
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js";

      if (!window.snap) {
        const script = document.createElement("script");
        script.src = snapScriptUrl;
        script.setAttribute("data-client-key", clientKey);
        script.onload = () => {
          openSnapModal(res.token!);
        };
        document.body.appendChild(script);
      } else {
        openSnapModal(res.token);
      }
    } catch (err) {
      console.error(err);
      showErrorAlert("Error", "Gagal menghubungi gateway pembayaran.");
      setIsProcessingMidtrans(false);
    }
  };

  const openSnapModal = (snapToken: string) => {
    if (!window.snap) {
      setIsProcessingMidtrans(false);
      return;
    }

    window.snap.pay(snapToken, {
      onSuccess: () => {
        setIsProcessingMidtrans(false);
        showSuccessAlert("Pembayaran Berhasil! 🎉", "Akun Admin Lapangan Anda telah aktif. Memuat ulang halaman...");
        setTimeout(() => {
          router.refresh();
        }, 1500);
      },
      onPending: () => {
        setIsProcessingMidtrans(false);
        showSuccessAlert("Menunggu Pembayaran", "Silakan selesaikan pembayaran QRIS Anda.");
      },
      onError: () => {
        setIsProcessingMidtrans(false);
        showErrorAlert("Pembayaran Gagal", "Transaksi gagal diproses.");
      },
      onClose: () => {
        setIsProcessingMidtrans(false);
      },
    });
  };

  // 2. Handler Upload Bukti Transfer Manual
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showErrorAlert("File Terlalu Besar", "Ukuran foto bukti transfer maksimal 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProofImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofImageBase64) {
      showErrorAlert("Peringatan", "Silakan unggah foto bukti transfer terlebih dahulu.");
      return;
    }

    setIsSubmittingManual(true);
    try {
      const res = await submitResellerPaymentProofAction(
        modulePrice,
        proofImageBase64,
        senderName.trim(),
        senderNotes.trim()
      );

      if (res.success) {
        showSuccessAlert("Bukti Terkirim! 📤", res.message);
        setProofImageBase64(null);
        setSenderNotes("");
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal mengirim bukti transfer.");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const adminWaUrl = superAdminContact?.whatsappNumber
    ? `https://wa.me/${superAdminContact.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
        `Halo Super Admin, saya ${user.fullName} (${user.email}) telah mendaftar sebagai Mitra Reseller dan ingin konfirmasi aktivasi akun Modul Reseller.`
      )}`
    : null;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Navbar */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Smart QR Partner Portal</h1>
            <p className="text-xs text-slate-400">Akun: {user.fullName} ({user.email})</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto my-8 space-y-6">
        {/* Banner Status Terkunci */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-indigo-950/80 border-2 border-amber-500/50 p-6 sm:p-8 shadow-2xl shadow-amber-500/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                <Lock className="w-3.5 h-3.5" />
                <span>AKUN MITRA RESELLER MENUNGGU AKTIVASI</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Aktifkan Akun & Dapatkan Modul Resmi
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                Selamat bergabung, <strong>{user.fullName}</strong>! Untuk membuka dashboard Admin Lapangan, mengakses kuota kartu, serta mendapatkan materi panduan & SOP penjualan lengkap, silakan lakukan aktivasi <strong>{moduleTitle}</strong>.
              </p>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 p-5 rounded-2xl shrink-0 text-center space-y-1 shadow-xl">
              <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">Biaya Aktivasi Lisensi</span>
              <div className="text-3xl font-black text-amber-400 font-mono">
                Rp {modulePrice.toLocaleString("id-ID")}
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold block">Sekali Bayar • Akses Seumur Hidup</span>
            </div>
          </div>
        </div>

        {/* 4 Keunggulan Modul Reseller */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Dashboard Admin Penuh</h4>
            <p className="text-[11px] text-slate-400">Daftarkan toko klien, kelola kartu QR, dan pantau review realtime.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Modul & E-Book SOP</h4>
            <p className="text-[11px] text-slate-400">Buku panduan PDF, script closing 2 menit ke pemilik kafe, & materi promosi.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Reward Diskon Outlet VIP</h4>
            <p className="text-[11px] text-slate-400">Setiap outlet binaan yang VIP memberi potongan Rp {(siteSetting?.resellerVipDiscountPerCard || 5000).toLocaleString("id-ID")} per kartu!</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Jatah Kuota Kartu Resmi</h4>
            <p className="text-[11px] text-slate-400">Alokasi kartu fisik NFC & akrilik meja langsung dari Super Admin.</p>
          </div>
        </div>

        {/* Pilihan Metode Pembayaran */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">Metode Pembayaran Aktivasi</h3>
              <p className="text-xs text-slate-400">
                {midtransActive
                  ? "Pilih pembayaran instan QRIS otomatis atau transfer bank manual"
                  : "Pembayaran via Transfer Bank Manual (BNI)"}
              </p>
            </div>

            {midtransActive ? (
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("QRIS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "QRIS"
                      ? "bg-amber-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  QRIS Midtrans (Instan)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("MANUAL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "MANUAL"
                      ? "bg-amber-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Transfer Manual
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-amber-400 font-bold">
                <span>Transfer Manual BNI Only</span>
              </div>
            )}
          </div>

          {/* TAB 1: QRIS MIDTRANS */}
          {midtransActive && activeTab === "QRIS" && (
            <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Zap className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Aktivasi Instan dengan QRIS</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Dukung pembayaran semua aplikasi: BCA Mobile, GoPay, OVO, Dana, ShopeePay, LinkAja, & Seluruh Bank.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={isProcessingMidtrans}
                  onClick={handlePayWithMidtrans}
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isProcessingMidtrans ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyiapkan QRIS...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-5 h-5" />
                      <span>Bayar Rp {modulePrice.toLocaleString("id-ID")} Sekarang (QRIS)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSFER MANUAL */}
          {activeTab === "MANUAL" && (
            <div className="space-y-6">
              {/* Rekening Box */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold block">Transfer ke Rekening Resmi:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-base font-black text-amber-300 font-mono">
                      {siteSetting?.resellerBankName || siteSetting?.membershipBankName || "BNI"} - {siteSetting?.resellerAccountNumber || siteSetting?.membershipAccountNumber || "1234567890"}
                    </span>
                  </div>
                  <span className="text-xs text-slate-300 block">a.n. {siteSetting?.resellerAccountName || siteSetting?.membershipAccountName || "Smart QR Review"}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-400 block">Nominal Transfer Tepat:</span>
                  <span className="text-xl font-bold text-white font-mono">Rp {modulePrice.toLocaleString("id-ID")}</span>
                </div>
              </div>

              {/* Form Upload Bukti */}
              <form onSubmit={handleSubmitManual} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Nama Pemilik Rekening Pengirim <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Nama di buku tabungan/rekening"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Catatan Transfer (Opsional)
                    </label>
                    <input
                      type="text"
                      value={senderNotes}
                      onChange={(e) => setSenderNotes(e.target.value)}
                      placeholder="Contoh: Transfer via m-BCA jam 14:00"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Unggah Foto Struk / Bukti Transfer <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={handleImageUpload}
                    className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                  />
                  {proofImageBase64 && (
                    <div className="mt-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800 inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proofImageBase64}
                        alt="Bukti Transfer"
                        className="max-h-36 rounded-lg object-contain"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingManual || !proofImageBase64}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isSubmittingManual ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mengirim Bukti...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Kirim Bukti Transfer ke Super Admin</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* WhatsApp Super Admin Support */}
        {adminWaUrl && (
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <span className="text-white font-semibold block">Butuh bantuan atau ingin aktivasi langsung?</span>
                <span className="text-slate-400">Hubungi Super Admin via WhatsApp resmi.</span>
              </div>
            </div>
            <a
              href={adminWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              <span>Chat WhatsApp Super Admin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 py-4">
        Smart QR Review Platform • Lisensi Kemitraan & Modul Reseller
      </footer>
    </div>
  );
}
