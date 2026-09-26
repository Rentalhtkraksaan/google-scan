"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  Copy,
  Upload,
  Clock,
  ShieldCheck,
  Send,
  MessageCircle,
  AlertCircle,
  CreditCard,
  Volume2,
  BellRing,
  Crown,
  QrCode,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "@/lib/swal";
import {
  submitPaymentProofAction,
  createMidtransVipTransactionAction,
  checkMidtransTransactionStatusAction,
} from "@/lib/actions/membership.actions";

interface UpgradeMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  outlet: {
    id: string;
    name: string;
    isMember?: boolean;
    customVipPrice?: number | null;
  };
  siteSetting?: {
    membershipPrice?: number;
    membershipBankName?: string;
    membershipAccountNumber?: string;
    membershipAccountName?: string;
    membershipNotes?: string | null;
    whatsappNumber?: string;
    midtransClientKey?: string | null;
    midtransIsProduction?: boolean;
  };
  onSuccess?: () => void;
}

export function UpgradeMemberModal({
  isOpen,
  onClose,
  outlet,
  siteSetting,
  onSuccess,
}: UpgradeMemberModalProps) {
  const [activeTab, setActiveTab] = useState<"QRIS" | "MANUAL">("QRIS");
  const [isProcessingQris, setIsProcessingQris] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderNotes, setSenderNotes] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Tentukan harga: customVipPrice jika ada (harga khusus), jika tidak gunakan harga master
  const isCustomPrice = !!(outlet.customVipPrice && outlet.customVipPrice > 0);
  const price = isCustomPrice ? (outlet.customVipPrice as number) : (siteSetting?.membershipPrice || 45000);
  const masterPrice = siteSetting?.membershipPrice || 45000;

  const bankName = siteSetting?.membershipBankName || "BCA";
  const accountNumber = siteSetting?.membershipAccountNumber || "0885172288";
  const accountName = siteSetting?.membershipAccountName || "Smart QR Review";
  const notes = siteSetting?.membershipNotes || "Harap transfer tepat sesuai nominal dan lampirkan bukti foto transfer.";
  const adminWa = siteSetting?.whatsappNumber || "6281234567890";

  // Preload Midtrans Snap Script saat modal dibuka
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const isProduction = siteSetting?.midtransIsProduction ?? false;
      const snapScriptUrl = isProduction
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js";

      const clientKey = siteSetting?.midtransClientKey || "";
      const scriptId = "midtrans-snap-script";

      let existingScript = document.getElementById(scriptId) as HTMLScriptElement;
      if (!existingScript) {
        existingScript = document.createElement("script");
        existingScript.id = scriptId;
        existingScript.src = snapScriptUrl;
        if (clientKey) {
          existingScript.setAttribute("data-client-key", clientKey);
        }
        document.body.appendChild(existingScript);
      }
    }
  }, [isOpen, siteSetting?.midtransClientKey, siteSetting?.midtransIsProduction]);

  if (!isOpen) return null;

  // 1. Eksekusi Pembayaran Otomatis Midtrans QRIS
  const handlePayMidtransQris = async () => {
    setIsProcessingQris(true);
    try {
      const res = await createMidtransVipTransactionAction(outlet.id);

      if (!res.success || !res.snapToken) {
        showErrorAlert("Pemberitahuan", res.message || "Gagal membuat sesi pembayaran QRIS.");
        setIsProcessingQris(false);
        return;
      }

      // Pastikan Snap JS tersedia di window
      const snapObj = (window as unknown as { snap?: { pay: (token: string, options: Record<string, unknown>) => void } }).snap;

      if (!snapObj) {
        // Fallback jika popup script diblokir browser: Buka link redirect Midtrans
        if (res.redirectUrl) {
          window.open(res.redirectUrl, "_blank");
          showSuccessAlert("Halaman Pembayaran Dibuka", "Silakan selesaikan pembayaran QRIS pada tab yang terbuka.");
        } else {
          showErrorAlert("Error", "Gagal memuat modul Midtrans Snap. Silakan muat ulang halaman.");
        }
        setIsProcessingQris(false);
        return;
      }

      // Buka Snap Popup Resmi Midtrans
      snapObj.pay(res.snapToken, {
        onSuccess: async function (result: Record<string, unknown>) {
          console.log("[Midtrans Success]:", result);
          setIsProcessingQris(true);
          // Verifikasi ke server
          if (res.orderId) {
            await checkMidtransTransactionStatusAction(res.orderId);
          }
          setIsProcessingQris(false);
          showSuccessAlert(
            "Pembayaran Berhasil! 🎉",
            "Selamat! Masa aktif Member VIP toko Anda telah otomatis diperpanjang seketika. Seluruh fitur eksklusif telah aktif!"
          );
          onClose();
          if (onSuccess) onSuccess();
        },
        onPending: async function (result: Record<string, unknown>) {
          console.log("[Midtrans Pending]:", result);
          setIsProcessingQris(false);
          showSuccessAlert(
            "Menunggu Pembayaran",
            "Silakan selesaikan scan QRIS di aplikasi mobile banking / e-wallet Anda. Sistem akan aktif otomatis begitu dana diterima!"
          );
        },
        onError: function (result: Record<string, unknown>) {
          console.error("[Midtrans Error]:", result);
          setIsProcessingQris(false);
          showErrorAlert("Pembayaran Gagal", "Transaksi dibatalkan atau terjadi gangguan. Silakan coba lagi.");
        },
        onClose: async function () {
          setIsProcessingQris(false);
          // Cek apakah sebenarnya sudah sukses dibayar saat modal ditutup
          if (res.orderId) {
            const check = await checkMidtransTransactionStatusAction(res.orderId);
            if (check.isPaid) {
              showSuccessAlert("Pembayaran Berhasil! 🎉", "Member VIP Anda telah aktif seketika!");
              onClose();
              if (onSuccess) onSuccess();
            }
          }
        },
      });
    } catch (err) {
      console.error("handlePayMidtransQris error:", err);
      showErrorAlert("Error", "Terjadi kesalahan saat memproses QRIS.");
      setIsProcessingQris(false);
    }
  };

  const handleCopy = (text: string, type: "bank" | "amount") => {
    navigator.clipboard.writeText(text);
    if (type === "bank") {
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showErrorAlert("File Terlalu Besar", "Ukuran foto maksimal 8 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setProofImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proofImage) {
      showErrorAlert("Bukti Transfer Diperlukan", "Harap unggah foto bukti transfer terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitPaymentProofAction(
        outlet.id,
        price,
        proofImage,
        senderName.trim() || undefined,
        senderNotes.trim() || undefined
      );

      if (res.success) {
        showSuccessAlert(
          "Bukti Transfer Terkirim! 🎉",
          "Terima kasih! Bukti transfer Anda berhasil diunggah. Super Admin akan segera memverifikasi dan mengaktifkan Member Premium Anda."
        );

        const cleanWa = adminWa.replace(/\D/g, "");
        const formattedWa = cleanWa.startsWith("0") ? "62" + cleanWa.slice(1) : cleanWa;
        const waMsg = encodeURIComponent(
          `Halo Super Admin, saya pemilik dari outlet "${outlet.name}".\n\nSaya baru saja mengunggah bukti transfer sebesar Rp ${price.toLocaleString("id-ID")} untuk aktivasi Member Premium.\n\nMohon diverifikasi ya. Terima kasih!`
        );
        const waUrl = `https://wa.me/${formattedWa}?text=${waMsg}`;

        onClose();
        if (onSuccess) onSuccess();

        setTimeout(() => {
          if (confirm("Ingin langsung mengabari Super Admin via WhatsApp agar verifikasi lebih cepat?")) {
            window.open(waUrl, "_blank");
          }
        }, 800);
      } else {
        showErrorAlert("Gagal Mengirim", res.message || "Terjadi kesalahan.");
      }
    } catch {
      showErrorAlert("Error", "Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/20 via-slate-800 to-amber-950/20 border-b border-amber-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-black text-white tracking-tight">
                  Aktivasi / Perpanjang Member VIP
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-amber-500 text-slate-950 uppercase">
                  PRO
                </span>
              </div>
              <p className="text-xs text-amber-200/90 truncate max-w-xs">{outlet.name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Card Pricing Tag */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-950/90 to-amber-900/10 border border-amber-500/30 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {isCustomPrice ? "Harga Khusus Toko Anda" : "Biaya Langganan VIP"}
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-amber-300">
                  Rp {price.toLocaleString("id-ID")}
                </span>
                <span className="text-xs text-slate-400">/ bulan</span>
              </div>
              {isCustomPrice && (
                <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                  ★ Diskon khusus dari Super Admin (Harga normal Rp {masterPrice.toLocaleString("id-ID")})
                </span>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider">
                Aktif Instan
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("QRIS")}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "QRIS"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QRIS Instan (Otomatis)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("MANUAL")}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "MANUAL"
                  ? "bg-slate-800 text-amber-300 border border-slate-700 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Transfer Bank Manual</span>
            </button>
          </div>

          {/* TAB 1: METODE QRIS OTOMATIS MIDTRANS */}
          {activeTab === "QRIS" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Pembayaran QRIS Real-Time</h4>
                    <p className="text-[11px] text-slate-400">
                      Bisa scan pakai m-BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana, ShopeePay
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Tidak perlu upload bukti foto transfer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Tidak perlu menunggu persetujuan admin</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Fitur VIP dan dering lonceng langsung aktif seketika!</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePayMidtransQris}
                  disabled={isProcessingQris}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
                >
                  {isProcessingQris ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Menyiapkan QRIS Midtrans...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>Bayar Rp {price.toLocaleString("id-ID")} dengan QRIS</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: METODE MANUAL TRANSFER BANK */}
          {activeTab === "MANUAL" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <span className="text-xs font-semibold text-slate-300 block">Rekening Tujuan Transfer:</span>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <span className="text-[11px] text-slate-400 block">{bankName} a.n. {accountName}</span>
                    <strong className="text-sm font-mono text-white tracking-wider">{accountNumber}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(accountNumber, "bank")}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedBank ? "Tersalin" : "Salin"}</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 italic">{notes}</p>
              </div>

              {/* Form Upload Bukti */}
              <form onSubmit={handleSubmitManual} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Nama Pengirim / Pemilik Rekening:
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Contoh: Danang (BCA)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Foto Bukti Transfer:
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-xl bg-slate-950/60 flex flex-col items-center justify-center cursor-pointer transition-colors"
                  >
                    {proofImage ? (
                      <div className="flex flex-col items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={proofImage}
                          alt="Preview Bukti"
                          className="max-h-28 rounded-lg object-contain border border-slate-800"
                        />
                        <span className="text-[11px] text-amber-300 font-semibold">Klik untuk ganti foto</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-xs text-slate-300 font-medium">Upload Screenshot Bukti Transfer</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Format JPG / PNG (Maks 8MB)</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim Bukti...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Bukti Transfer Manual</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
