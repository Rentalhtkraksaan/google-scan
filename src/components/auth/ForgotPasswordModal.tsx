"use client";

import { useState, useEffect, useMemo } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  X,
  Mail,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";
import {
  getLoginRedirectPath,
  requestPasswordResetOtpAction,
  verifyOtpAndResetPasswordAction,
} from "@/lib/actions/auth.actions";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  initialEmail?: string;
  onClose: () => void;
}

export function ForgotPasswordModal({
  isOpen,
  initialEmail = "",
  onClose,
}: ForgotPasswordModalProps) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  // Step state: 1 = Input Email, 2 = Input OTP & Password Baru
  const [step, setStep] = useState<1 | 2>(1);

  // Form states
  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading & cooldown states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setEmail(initialEmail || "");
      setStep(1);
      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen, initialEmail]);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // ─── Password Strength Checklist (5 Rules) ──────────────────────────────────
  const passwordRules = useMemo(() => {
    const hasMinLen = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    const allValid = hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial;
    return { hasMinLen, hasUpper, hasLower, hasNumber, hasSpecial, allValid };
  }, [newPassword]);

  if (!isOpen) return null;

  // ─── Step 1: Request OTP Action ─────────────────────────────────────────────
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      await showErrorAlert("Email Wajib Diisi", "Silakan masukkan alamat email akun Anda.");
      return;
    }

    if (!cleanEmail.endsWith("@gmail.com")) {
      await showErrorAlert(
        "Format Email Tidak Sesuai",
        "Akun wajib menggunakan alamat Google (@gmail.com)."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await requestPasswordResetOtpAction(cleanEmail);

      if (!res.success) {
        setIsSubmitting(false);
        await showErrorAlert("Gagal Mengirim OTP", res.message);
        return;
      }

      showSuccessAlert(
        "OTP Terkirim!",
        `Kode verifikasi telah dikirim ke ${cleanEmail}. Periksa folder Kotak Masuk atau Spam.`
      );
      setStep(2);
      setResendCooldown(60); // 60s cooldown
    } catch (err: unknown) {
      console.error("handleRequestOtp error:", err);
      await showErrorAlert("Terjadi Kesalahan", "Gagal menghubungi server untuk mengirim OTP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Step 2: Verify OTP & Reset Password ────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanOtp = otpCode.trim();
    if (cleanOtp.length !== 6) {
      await showErrorAlert("Kode OTP Kurang", "Masukkan 6-digit kode angka verifikasi yang dikirim ke email.");
      return;
    }

    if (!passwordRules.allValid) {
      await showErrorAlert("Password Kurang Aman", "Pastikan kata sandi baru telah memenuhi ke-5 syarat keamanan.");
      return;
    }

    if (newPassword !== confirmPassword) {
      await showErrorAlert("Konfirmasi Password Salah", "Kata sandi baru dan konfirmasi kata sandi tidak sama.");
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await verifyOtpAndResetPasswordAction({
        email: cleanEmail,
        otpCode: cleanOtp,
        newPassword,
        confirmPassword,
      });

      if (!res.success) {
        setIsSubmitting(false);
        await showErrorAlert("Verifikasi Gagal", res.message);
        return;
      }

      // Berhasil reset kata sandi! Coba langsung login ke dashboard
      showSuccessAlert(
        "Kata Sandi Berhasil Direset!",
        "Kata sandi telah diperbarui. Menghubungkan ke sesi Anda..."
      );

      try {
        const loginRes = await signIn("credentials", {
          loginType: "password",
          email: cleanEmail,
          password: newPassword,
          redirect: false,
        });

        if (!loginRes?.error) {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("just_logged_in", "true");
          }
          let targetUrl = callbackUrl;
          if (!targetUrl) {
            targetUrl = await getLoginRedirectPath(cleanEmail);
          }
          setTimeout(() => {
            window.location.href = targetUrl!;
          }, 400);
          return;
        }
      } catch (loginErr) {
        console.warn("Auto-login error after reset:", loginErr);
      }

      // Jika auto-login tidak langsung jalan, tutup modal dan biarkan login normal
      setIsSubmitting(false);
      onClose();
    } catch (err: unknown) {
      console.error("handleResetPassword error:", err);
      setIsSubmitting(false);
      await showErrorAlert("Terjadi Kesalahan", "Gagal memperbarui kata sandi.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/85 backdrop-blur-md flex items-center justify-center animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-sky-500/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white tracking-tight">
                {step === 1 ? "Lupa Kata Sandi" : "Verifikasi OTP & Sandi Baru"}
              </h3>
              <p className="text-xs text-slate-400">
                {step === 1 ? "Kirim kode verifikasi OTP ke Gmail" : "Masukkan kode OTP & tentukan sandi baru"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── STEP 1: INPUT EMAIL ─── */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4 my-4" suppressHydrationWarning>
            <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/20 rounded-2xl text-xs text-indigo-200 leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                Masukkan alamat email Google terdaftar (<strong className="text-white">@gmail.com</strong>). Sistem akan mengirimkan 6 digit kode OTP verifikasi resmi ke kotak masuk Anda.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Alamat Email Terdaftar <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  maxLength={50}
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                  placeholder="contoh: outletanda@gmail.com"
                  suppressHydrationWarning
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Gunakan akun Google yang sama saat aktivasi kartu.
              </p>
            </div>

            {/* Actions Step 1 */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !email.includes("@")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengirim OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Kirim Kode OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ─── STEP 2: INPUT OTP & NEW PASSWORD ─── */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4 my-4" suppressHydrationWarning>
            {/* Target Email Badge & Change Button */}
            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl">
              <div className="flex items-center gap-2 overflow-hidden">
                <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-xs text-slate-300 truncate font-mono">{email}</span>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold shrink-0 cursor-pointer flex items-center gap-1 hover:underline ml-2"
              >
                <ArrowLeft className="w-3 h-3" /> Ganti
              </button>
            </div>

            {/* 1. Input Kode OTP */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Kode Verifikasi OTP (6 Digit) <span className="text-rose-400">*</span>
                </label>
                {resendCooldown > 0 ? (
                  <span className="text-[11px] text-slate-500 font-mono">
                    Kirim ulang ({resendCooldown}s)
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRequestOtp()}
                    disabled={isSubmitting}
                    className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Kirim Ulang OTP
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full text-center py-2.5 bg-slate-950 border border-indigo-500/50 rounded-xl text-xl font-mono font-bold tracking-[8px] text-sky-400 placeholder:text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Cek pesan masuk dari <strong>Smart QR Review Official</strong> (berlaku 10 menit).
              </p>
            </div>

            {/* 2. Input Password Baru */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kata Sandi Baru <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Buat sandi baru yang kuat"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Live Checklist 5 Syarat Keamanan Sandi */}
              <div className="mt-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-400 mb-1">
                  Syarat Keamanan Kata Sandi Baru:
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div
                    className={`flex items-center gap-1.5 transition-colors ${
                      passwordRules.hasMinLen ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {passwordRules.hasMinLen ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block shrink-0" />
                    )}
                    <span>Min. 8 Huruf</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 transition-colors ${
                      passwordRules.hasUpper ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {passwordRules.hasUpper ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block shrink-0" />
                    )}
                    <span>Huruf Besar (A-Z)</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 transition-colors ${
                      passwordRules.hasLower ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {passwordRules.hasLower ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block shrink-0" />
                    )}
                    <span>Huruf Kecil (a-z)</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 transition-colors ${
                      passwordRules.hasNumber ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {passwordRules.hasNumber ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block shrink-0" />
                    )}
                    <span>Angka (0-9)</span>
                  </div>

                  <div
                    className={`col-span-2 flex items-center gap-1.5 transition-colors ${
                      passwordRules.hasSpecial ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {passwordRules.hasSpecial ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block shrink-0" />
                    )}
                    <span>Kode Unik / Karakter Khusus (!@#$%^&*)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Input Konfirmasi Password Baru */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Konfirmasi Kata Sandi Baru <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang sandi baru"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p
                  className={`text-[11px] mt-1 flex items-center gap-1 ${
                    confirmPassword === newPassword ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {confirmPassword === newPassword ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> Konfirmasi kata sandi cocok
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" /> Konfirmasi kata sandi belum sama
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Actions Step 2 */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Kembali
              </button>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  otpCode.length !== 6 ||
                  !passwordRules.allValid ||
                  newPassword !== confirmPassword
                }
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Sandi...</span>
                  </>
                ) : (
                  <>
                    <span>Simpan & Masuk</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
