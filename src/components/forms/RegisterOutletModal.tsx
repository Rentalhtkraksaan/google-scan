"use client";

import { useState, useEffect } from "react";
import {
  X,
  Store,
  User,
  Phone,
  Mail,
  KeyRound,
  QrCode,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageCircle,
  Check,
} from "lucide-react";
import { registerOutletAndClaimCardAction } from "@/lib/actions/auth.actions";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";
import { GooglePlaceSearchInput } from "./GooglePlaceSearchInput";

interface RegisterOutletModalProps {
  prefilledCode?: string;
  blankCards?: { code: string }[];
  onClose: () => void;
  onSuccess?: () => void;
}

interface SuccessRegistrationData {
  outletName: string;
  fullName: string;
  whatsappNumber: string;
  email: string;
  password?: string;
  cardCode: string;
}

export function RegisterOutletModal({
  prefilledCode = "",
  blankCards = [],
  onClose,
  onSuccess,
}: RegisterOutletModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState(prefilledCode);
  const [outletName, setOutletName] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [successData, setSuccessData] = useState<SuccessRegistrationData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (prefilledCode) {
      setSelectedCode(prefilledCode);
    }
  }, [prefilledCode]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (successData) {
          onSuccess?.();
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, successData, onSuccess]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const codeToSubmit = prefilledCode || selectedCode;
      if (codeToSubmit) {
        formData.set("code", codeToSubmit);
      }
      formData.set("outletName", outletName);
      formData.set("googleReviewUrl", googleReviewUrl);

      const submittedFullName = String(formData.get("fullName") || "");
      const submittedWa = String(formData.get("whatsappNumber") || "");
      const submittedEmail = String(formData.get("email") || "");
      const submittedPassword = String(formData.get("password") || "");

      const result = await registerOutletAndClaimCardAction(formData);

      if (result.success) {
        setSuccessData({
          outletName: outletName || "Outlet Baru",
          fullName: submittedFullName,
          whatsappNumber: submittedWa,
          email: submittedEmail,
          password: submittedPassword,
          cardCode: codeToSubmit,
        });
        showSuccessAlert("Outlet Berhasil Didaftarkan!", "Silakan kirim detail akun portal ke WhatsApp pemilik toko.");
      } else {
        showErrorAlert("Gagal Mendaftarkan Outlet", result.message);
      }
    } catch (err) {
      console.error(err);
      showErrorAlert("Kesalahan Server", "Terjadi kesalahan pada sistem.");
    } finally {
      setLoading(false);
    }
  };

  const getWaDispatchUrl = () => {
    if (!successData?.whatsappNumber) return "#";
    let clean = successData.whatsappNumber.replace(/[^0-9]/g, "");
    if (clean.startsWith("08")) clean = "62" + clean.slice(1);
    
    const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "https://qr-inaja.vercel.app/login";
    const reviewUrl = typeof window !== "undefined" ? `${window.location.origin}/c/${successData.cardCode}` : `https://qr-inaja.vercel.app/c/${successData.cardCode}`;

    const text = 
`Halo Kak *${successData.fullName}* dari *${successData.outletName}*! 👋✨

Terima kasih telah bergabung dengan kami! Kartu Smart QR Google Review toko Anda telah *BERHASIL DIAKTIFKAN* dan siap digunakan.

Berikut detail akun Portal Mitra Anda untuk melihat analitik & kelola review:
🌐 *Link Login*: ${portalUrl}
📧 *Email*: ${successData.email}
🔑 *Password*: ${successData.password || "Admin123!"}

💳 *Kode Kartu*: ${successData.cardCode}
⭐ *Link Scan Review*: ${reviewUrl}

Simpan pesan ini untuk kemudahan akses di masa mendatang. Semoga review bintang 5 bisnis Anda semakin melesat! 🚀⭐

Salam sukses,
Tim Layanan Smart QR`;

    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  };

  const handleCopyMessage = async () => {
    if (!successData) return;
    const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "https://qr-inaja.vercel.app/login";
    const reviewUrl = typeof window !== "undefined" ? `${window.location.origin}/c/${successData.cardCode}` : `https://qr-inaja.vercel.app/c/${successData.cardCode}`;

    const text = 
`Halo Kak ${successData.fullName} dari ${successData.outletName}! 👋✨

Kartu Smart QR Google Review Anda telah BERHASIL DIAKTIFKAN.
Detail Akses Portal Mitra:
- Link Login: ${portalUrl}
- Email: ${successData.email}
- Password: ${successData.password || "Admin123!"}
- Kode Kartu: ${successData.cardCode}
- Link Review: ${reviewUrl}

Salam sukses,
Tim Layanan Smart QR`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Gagal menyalin pesan:", err);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Daftarkan Outlet & Hubungkan Kartu</h3>
              <p className="text-xs text-slate-400">Aktivasi kartu QR Google Review untuk mitra/toko klien</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successData ? (
          <div className="py-4 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Success Badge */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <h4 className="text-xl font-bold text-white tracking-tight">🎉 Outlet & Kartu Berhasil Diaktivasi!</h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Kartu <strong className="text-emerald-400 font-mono">{successData.cardCode}</strong> kini telah aktif dan terhubung ke toko <strong className="text-white">{successData.outletName}</strong>.
              </p>
            </div>

            {/* Credential Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Detail Akses Portal Mitra Klien
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Status: Siap Digunakan
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Nama Pemilik</span>
                  <span className="font-semibold text-slate-200">{successData.fullName}</span>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">No. WhatsApp</span>
                  <span className="font-mono text-emerald-300 font-semibold">{successData.whatsappNumber}</span>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Email Login Portal</span>
                  <span className="font-mono text-slate-200 truncate block">{successData.email}</span>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Password Sementara</span>
                  <span className="font-mono text-amber-400 font-bold">{successData.password || "Admin123!"}</span>
                </div>
              </div>
            </div>

            {/* Big WhatsApp CTA Button */}
            <a
              href={getWaDispatchUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-white/20" />
              <span>Kirim Detail Akses ke WhatsApp Klien (1-Click)</span>
            </a>

            {/* Secondary Actions */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Pesan Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>Salin Format Teks</span>
                  </>
                )}
              </button>

              <a
                href={`/c/${successData.cardCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-slate-400" />
                <span>Uji Scan Kartu</span>
              </a>
            </div>

            {/* Done Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onSuccess?.();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 transition-colors cursor-pointer"
              >
                Selesai & Ke Dashboard
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4 my-5">
          {/* Pilihan Kode Kartu */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Pilih / Kode Kartu QR <span className="text-rose-400">*</span></span>
              {prefilledCode && (
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  <Lock className="w-3 h-3" /> Terkunci Otomatis
                </span>
              )}
            </label>
            {prefilledCode ? (
              <div className="relative">
                <QrCode className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="code"
                  required
                  readOnly
                  value={prefilledCode}
                  className="w-full pl-9 pr-24 py-2.5 bg-slate-950/90 border border-emerald-500/40 rounded-xl text-sm text-emerald-300 font-mono font-bold cursor-not-allowed select-none focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Terkunci
                </span>
              </div>
            ) : blankCards.length > 0 ? (
              <div className="relative">
                <QrCode className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  name="code"
                  required
                  value={selectedCode}
                  onChange={(e) => setSelectedCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Pilih Kartu Kosong Dari Jatah Anda --</option>
                  {blankCards.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} (Status: Kosong / Siap Digunakan)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="relative">
                <QrCode className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="code"
                  required
                  value={selectedCode}
                  onChange={(e) => setSelectedCode(e.target.value)}
                  placeholder="Contoh: c-001"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 font-mono placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
            {prefilledCode && (
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <span>Kode kartu dikunci sesuai nomor kartu yang discan / dipilih dan tidak dapat diubah.</span>
              </p>
            )}
          </div>

          <div className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800/80 space-y-3">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
              1. Data Outlet & Toko
            </span>

            {/* Google Place Live Search & Auto-Fill */}
            <GooglePlaceSearchInput
              outletName={outletName}
              setOutletName={setOutletName}
              reviewUrl={googleReviewUrl}
              setReviewUrl={setGoogleReviewUrl}
            />
          </div>

          <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 space-y-3">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
              2. Akun Pemilik Toko (Untuk Portal Klien)
            </span>

            {/* Nama Pemilik & WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Lengkap Pemilik <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="fullName"
                    required
                    placeholder="Budi Santoso"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  No. WhatsApp Aktif <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="whatsappNumber"
                    required
                    placeholder="081355551234 atau 6281355551234"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Email & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Akun <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    name="email"
                    required
                    maxLength={30}
                    placeholder="pemilik@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password Akun <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    minLength={6}
                    maxLength={15}
                    defaultValue="Admin123!"
                    className="w-full pl-9 pr-10 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
                    title={showPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !selectedCode}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Aktivasi & Hubungkan Kartu</span>
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
