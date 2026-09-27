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
  MessageCircle,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
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
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState(prefilledCode);
  const [outletName, setOutletName] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");

  // Step 2 Form States
  const [fullName, setFullName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Admin123!");
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

  const getEffectiveCode = () => prefilledCode || selectedCode;

  // Handler Lanjut ke Step 2
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    const code = getEffectiveCode();
    if (!code || !code.trim()) {
      showErrorAlert("Peringatan", "Silakan pilih atau masukkan kode kartu QR.");
      return;
    }
    if (!outletName || outletName.trim().length < 2) {
      showErrorAlert("Peringatan", "Nama outlet minimal 2 karakter.");
      return;
    }
    if (!googleReviewUrl || googleReviewUrl.trim().length < 5) {
      showErrorAlert("Peringatan", "Link Google Review wajib diisi.");
      return;
    }
    setCurrentStep(2);
  };

  // Helper format WhatsApp URL
  const getWaDispatchUrlForData = (data: SuccessRegistrationData) => {
    if (!data?.whatsappNumber) return "#";
    let clean = data.whatsappNumber.replace(/[^0-9]/g, "");
    if (clean.startsWith("08")) clean = "62" + clean.slice(1);
    if (clean.startsWith("8")) clean = "62" + clean;

    const portalUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/login`
        : "https://qr-inaja.vercel.app/login";

    const text = `Halo Kak *${data.fullName}* dari *${data.outletName}*! 👋✨

Terima kasih telah bergabung dengan kami! Kartu Smart QR Google Review toko Anda telah *BERHASIL DIAKTIFKAN* dan siap digunakan.

Berikut detail akun Portal Mitra Anda untuk melihat analitik & kelola review:
🌐 *Link Login*: ${portalUrl}

📧 *Email*: ${data.email}

🔑 *Password*: ${data.password || "Admin123!"}

Simpan pesan ini untuk kemudahan akses di masa mendatang. Semoga review bintang 5 bisnis Anda semakin melesat! 🚀⭐

Salam sukses,
Tim Layanan Smart QR`;

    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  };

  // Handler Submit Pendaftaran
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = getEffectiveCode();

    if (!fullName || fullName.trim().length < 2) {
      showErrorAlert("Peringatan", "Nama lengkap pemilik minimal 2 karakter.");
      return;
    }
    if (!whatsappNumber || whatsappNumber.trim().length < 8) {
      showErrorAlert("Peringatan", "Nomor WhatsApp aktif minimal 8 digit.");
      return;
    }
    if (!email || !email.includes("@")) {
      showErrorAlert("Peringatan", "Format email pemilik tidak valid.");
      return;
    }
    if (!password || password.length < 6) {
      showErrorAlert("Peringatan", "Password akun portal minimal 6 karakter.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("code", code.trim());
      formData.set("outletName", outletName.trim());
      formData.set("googleReviewUrl", googleReviewUrl.trim());
      formData.set("fullName", fullName.trim());
      formData.set("whatsappNumber", whatsappNumber.trim());
      formData.set("email", email.trim().toLowerCase());
      formData.set("password", password.trim());

      const result = await registerOutletAndClaimCardAction(formData);

      if (result.success) {
        const regData: SuccessRegistrationData = {
          outletName: outletName.trim(),
          fullName: fullName.trim(),
          whatsappNumber: whatsappNumber.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          cardCode: code.trim(),
        };

        setSuccessData(regData);
        showSuccessAlert(
          "Outlet Berhasil Didaftarkan! 🎉",
          "Kartu aktif dan pesan WhatsApp disiapkan otomatis."
        );

        // Otomatis direct ke WhatsApp pemilik
        const waUrl = getWaDispatchUrlForData(regData);
        if (waUrl && waUrl !== "#") {
          window.open(waUrl, "_blank");
        }
      } else {
        showErrorAlert("Gagal Mendaftarkan Outlet", result.message);
      }
    } catch (err) {
      console.error("Submit register outlet error:", err);
      showErrorAlert("Kesalahan Server", "Terjadi gangguan teknis saat mendaftarkan outlet.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = async () => {
    if (!successData) return;
    const portalUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/login`
        : "https://qr-inaja.vercel.app/login";

    const text = `Halo Kak *${successData.fullName}* dari *${successData.outletName}*! 👋✨

Terima kasih telah bergabung dengan kami! Kartu Smart QR Google Review toko Anda telah *BERHASIL DIAKTIFKAN* dan siap digunakan.

Berikut detail akun Portal Mitra Anda untuk melihat analitik & kelola review:
🌐 *Link Login*: ${portalUrl}

📧 *Email*: ${successData.email}

🔑 *Password*: ${successData.password || "Admin123!"}

Simpan pesan ini untuk kemudahan akses di masa mendatang. Semoga review bintang 5 bisnis Anda semakin melesat! 🚀⭐

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
          if (successData) onSuccess?.();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Daftarkan Outlet & Kartu QR</h3>
              <p className="text-xs text-slate-400">Aktivasi kartu Smart QR & buat akun portal toko mitra</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (successData) onSuccess?.();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar (Hanya tampil jika belum sukses) */}
        {!successData && (
          <div className="pt-4 pb-2">
            <div className="flex items-center justify-between gap-2 mb-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
                  currentStep === 1
                    ? "text-emerald-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                    currentStep === 1
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
                  }`}
                >
                  1
                </span>
                <span>1. Data Kartu & Toko</span>
              </button>

              <div className="flex-1 h-0.5 bg-slate-800 relative mx-2">
                <div
                  className={`h-full bg-emerald-500 transition-all duration-300 ${
                    currentStep === 2 ? "w-full" : "w-0"
                  }`}
                />
              </div>

              <button
                type="button"
                disabled={currentStep < 2}
                className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                  currentStep === 2
                    ? "text-emerald-400"
                    : "text-slate-500 cursor-not-allowed"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                    currentStep === 2
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "bg-slate-800 text-slate-500 border border-slate-700"
                  }`}
                >
                  2
                </span>
                <span>2. Akun Pemilik</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 1: SUCCESS STATE (DIRECT WHATSAPP) */}
        {successData ? (
          <div className="py-4 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Success Badge */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <h4 className="text-xl font-black text-white tracking-tight">🎉 Kartu Berhasil Diaktifkan!</h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Kartu <strong className="text-emerald-400 font-mono">{successData.cardCode}</strong> kini telah aktif dan terhubung ke toko <strong className="text-white">{successData.outletName}</strong>.
              </p>
            </div>

            {/* Detail Akses Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Detail Akses Akun Portal Pemilik
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Status: Siap Digunakan
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/70">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Nama Pemilik</span>
                  <span className="font-semibold text-slate-200">{successData.fullName}</span>
                </div>
                <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/70">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">No. WhatsApp</span>
                  <span className="font-mono text-emerald-300 font-semibold">{successData.whatsappNumber}</span>
                </div>
                <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/70">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Email Login Portal</span>
                  <span className="font-mono text-slate-200 truncate block">{successData.email}</span>
                </div>
                <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/70">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Password Portal</span>
                  <span className="font-mono text-amber-400 font-bold">{successData.password || "Admin123!"}</span>
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Button */}
            <a
              href={getWaDispatchUrlForData(successData)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-white/20" />
              <span>Buka Chat WhatsApp Pemilik Toko (1-Click)</span>
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
                    <span className="text-emerald-400 font-bold">Format Pesan Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>Salin Format Pesan</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onSuccess?.();
                  onClose();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 transition-colors cursor-pointer"
              >
                Selesai & Ke Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* FORM 2-LANGKAH */
          <div className="my-4">
            {/* STEP 1: DATA KARTU & OUTLET */}
            {currentStep === 1 && (
              <form onSubmit={handleNextStep} className="space-y-4 animate-in fade-in duration-200">
                {/* 1. Kode Kartu */}
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
                        required
                        value={selectedCode}
                        onChange={(e) => setSelectedCode(e.target.value)}
                        placeholder="Contoh: c-001"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 font-mono placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                  {prefilledCode && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Kode kartu dikunci sesuai nomor kartu yang discan / dipilih.
                    </p>
                  )}
                </div>

                {/* 2. Data Toko & Google Place Search */}
                <div className="p-3.5 bg-slate-950/50 rounded-2xl border border-slate-800/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-300">
                      Nama Outlet & Link Ulasan Google Maps
                    </span>
                  </div>

                  <GooglePlaceSearchInput
                    outletName={outletName}
                    setOutletName={setOutletName}
                    reviewUrl={googleReviewUrl}
                    setReviewUrl={setGoogleReviewUrl}
                  />
                </div>

                {/* Tombol Aksi Step 1 */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={!getEffectiveCode() || !outletName.trim() || !googleReviewUrl.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <span>Lanjut ke Data Pemilik</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: DATA PEMILIK TOKO & AKUN PORTAL */}
            {currentStep === 2 && (
              <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-200">
                {/* Ringkasan Step 1 */}
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Store className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">{outletName}</span>
                      <span className="text-[10px] text-emerald-300 font-mono block">Kartu: {getEffectiveCode()}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-[11px] text-emerald-400 hover:underline font-semibold shrink-0 cursor-pointer"
                  >
                    Ubah
                  </button>
                </div>

                <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/80 space-y-3">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-300 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Akun Pemilik Toko (Untuk Login Portal Mitra)</span>
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
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Erfaniatul"
                          className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
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
                          required
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          placeholder="081355551234 atau 6281355551234"
                          className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email & Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Email Login Portal <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          maxLength={30}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="cafejongkok@gmail.com"
                          className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
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
                          required
                          minLength={6}
                          maxLength={20}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password_123"
                          className="w-full pl-9 pr-10 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
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

                {/* Tombol Aksi Step 2 */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !fullName.trim() || !email.trim() || !whatsappNumber.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-600/30 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mendaftarkan Outlet...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Daftarkan & Aktifkan Outlet 🚀</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
