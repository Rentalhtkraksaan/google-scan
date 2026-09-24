"use client";

import { useState, useRef } from "react";
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
} from "lucide-react";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";
import { submitPaymentProofAction } from "@/lib/actions/membership.actions";

interface UpgradeMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  outlet: {
    id: string;
    name: string;
    isMember?: boolean;
  };
  siteSetting?: {
    membershipPrice?: number;
    membershipBankName?: string;
    membershipAccountNumber?: string;
    membershipAccountName?: string;
    membershipNotes?: string | null;
    whatsappNumber?: string;
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
  const [senderName, setSenderName] = useState("");
  const [senderNotes, setSenderNotes] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const price = siteSetting?.membershipPrice || 45000;
  const bankName = siteSetting?.membershipBankName || "BCA";
  const accountNumber = siteSetting?.membershipAccountNumber || "0885172288";
  const accountName = siteSetting?.membershipAccountName || "Smart QR Review";
  const notes = siteSetting?.membershipNotes || "Harap transfer tepat sesuai nominal dan lampirkan bukti foto transfer.";
  const adminWa = siteSetting?.whatsappNumber || "6281234567890";

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

  const handleSubmit = async (e: React.FormEvent) => {
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

        // Siapkan link WhatsApp konfirmasi cepat
        const cleanWa = adminWa.replace(/\D/g, "");
        const formattedWa = cleanWa.startsWith("0") ? "62" + cleanWa.slice(1) : cleanWa;
        const waMsg = encodeURIComponent(
          `Halo Super Admin, saya pemilik dari outlet "${outlet.name}".\n\nSaya baru saja mengunggah bukti transfer sebesar Rp ${price.toLocaleString("id-ID")} untuk aktivasi Member Premium.\n\nMohon diverifikasi ya. Terima kasih!`
        );
        const waUrl = `https://wa.me/${formattedWa}?text=${waMsg}`;

        onClose();
        if (onSuccess) onSuccess();

        // Tanya apakah mau konfirmasi via WhatsApp
        setTimeout(() => {
          if (confirm("Ingin langsung mengabari Super Admin via WhatsApp agar verifikasi lebih cepat?")) {
            window.open(waUrl, "_blank");
          }
        }, 800);
      } else {
        showErrorAlert("Gagal Mengirim", res.message || "Terjadi kesalahan.");
      }
    } catch (err) {
      showErrorAlert("Error", "Gagal menghubungi server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-2xl sm:rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden my-auto">
        {/* Glow Header */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-900 border-b border-amber-500/20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold mb-3">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>AKSES MEMBER PREMIUM</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white">
            Tingkatkan ke Member Premium
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Buka fitur suara AI sebut nama toko, pilihan efek suara kasir, dan multi-pairing HP staf.
          </p>

          {/* Fitur yang Didapat */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] sm:text-xs">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Suara AI Sebut Nama Toko</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
              <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Pilihan Suara (Cha-ching!)</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
              <BellRing className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Multi-Kasir Pairing QR</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
              <Crown className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Dering & Getar HP Layar Mati</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5">
          {/* Card Info Rekening */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700/80 shadow-inner">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Total Biaya Aktivasi
                </span>
                <span className="text-2xl font-black text-amber-400">
                  Rp {price.toLocaleString("id-ID")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(price.toString(), "amount")}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1 transition-all"
              >
                {copiedAmount ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAmount ? "Tersalin!" : "Salin Nominal"}</span>
              </button>
            </div>

            <div className="pt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Bank Tujuan:</span>
                <span className="font-bold text-white uppercase px-2 py-0.5 rounded bg-slate-700">
                  {bankName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Nomor Rekening:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white text-sm tracking-wider">
                    {accountNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(accountNumber, "bank")}
                    className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Salin Nomor Rekening"
                  >
                    {copiedBank ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Atas Nama (a/n):</span>
                <span className="font-semibold text-slate-200">{accountName}</span>
              </div>
            </div>

            {notes && (
              <p className="mt-3 text-[11px] text-amber-300/80 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                💡 {notes}
              </p>
            )}
          </div>

          {/* Upload Bukti Struk */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              Unggah Foto / Tangkapan Layar Bukti Transfer <span className="text-rose-400">*</span>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {proofImage ? (
              <div className="relative rounded-xl overflow-hidden border border-emerald-500/50 bg-slate-950 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proofImage}
                  alt="Bukti Transfer"
                  className="max-h-48 w-full object-contain rounded-lg mx-auto"
                />
                <button
                  type="button"
                  onClick={() => {
                    setProofImage(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-3 right-3 px-2 py-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded-md text-[10px] font-bold shadow transition-colors"
                >
                  Ganti Foto
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 px-4 border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-800/40 hover:bg-slate-800/80 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-700/60 group-hover:bg-amber-500/20 flex items-center justify-center text-slate-300 group-hover:text-amber-400 transition-colors">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-200 block group-hover:text-amber-300 transition-colors">
                    Klik untuk Memilih Foto Bukti Struk
                  </span>
                  <span className="text-[10.5px] text-slate-400">
                    JPG, PNG, atau Screenshot M-Banking (Maks 8MB)
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* Form Pengirim (Opsional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Nama Pengirim di Rekening (Opsional)
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={senderNotes}
                onChange={(e) => setSenderNotes(e.target.value)}
                placeholder="Contoh: Transfer via BCA Mobile jam 14:00"
                className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Submit Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !proofImage}
              className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Mengirimkan Bukti..." : "Kirim Bukti Pembayaran 📤"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
