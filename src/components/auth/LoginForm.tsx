"use client";

import { useState, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  Mail,
  KeyRound,
  ArrowRight,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
  HelpCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";
import { getLoginRedirectPath } from "@/lib/actions/auth.actions";
import { ForgotPasswordModal } from "./ForgotPasswordModal";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Generate dynamic 5-character captcha code
  const generateCaptcha = useCallback(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setCaptchaInput("");
  }, []);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    // 1. Validasi Captcha
    if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      showErrorAlert(
        "Kode Captcha Salah",
        "Kode verifikasi keamanan yang Anda ketik tidak sesuai. Silakan coba lagi."
      );
      generateCaptcha();
      return;
    }

    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    // Validasi panjang karakter sesuai ketentuan keamanan
    if (cleanEmail.length > 30) {
      showErrorAlert("Email Terlalu Panjang", "Alamat email maksimal 30 karakter.");
      return;
    }

    if (password.length > 50) {
      showErrorAlert("Password Terlalu Panjang", "Password maksimal 50 karakter.");
      return;
    }

    try {
      const res = await signIn("credentials", {
        loginType: "password",
        email: cleanEmail,
        password,
        redirect: false,
      });

      if (res?.error) {
        setLoading(false);
        await showErrorAlert("Login Gagal", "Email atau password yang Anda masukkan salah.");
        generateCaptcha();
        return;
      }

      // Mark login for welcome greeting
      if (typeof window !== "undefined") {
        sessionStorage.setItem("just_logged_in", "true");
      }

      // Fast determination of redirect target
      let targetUrl = callbackUrl;
      if (!targetUrl) {
        targetUrl = await getLoginRedirectPath(cleanEmail);
      }

      // Show sleek centered SweetAlert
      showSuccessAlert("Login Berhasil!", "Mengalihkan ke dashboard...", 800);

      // Instant fast navigation
      setTimeout(() => {
        window.location.href = targetUrl!;
      }, 300);
    } catch (err) {
      console.error("Login error:", err);
      setLoading(false);
      await showErrorAlert("Terjadi Kesalahan", "Gagal menghubungi server. Silakan coba lagi.");
      generateCaptcha();
    }
  };

  return (
    <>
      <div
        className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-2xl rounded-2xl shadow-2xl p-8 card-glow"
        suppressHydrationWarning
      >
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Akses Portal Terpadu
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Masuk ke Akun Anda</h2>
          <p className="text-xs text-slate-400 mt-1">
            Super Admin, Admin Lapangan & Pemilik Outlet
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
          {/* Alamat Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Alamat Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                maxLength={30}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                suppressHydrationWarning
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Password & Link Lupa Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                suppressHydrationWarning
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:underline transition-all cursor-pointer inline-flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Lupa Password?</span>
              </button>
            </div>

            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                maxLength={50}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                suppressHydrationWarning
                className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                suppressHydrationWarning
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
                title={showPassword ? "Sembunyikan password" : "Lihat password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Visual Captcha Security Box di Halaman Login Depan */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Kode Keamanan (Captcha)</span>
              </label>
              <span className="text-[11px] text-slate-500">Ketik kode di bawah</span>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Captcha Badge */}
              <div
                className="flex-1 flex items-center justify-center py-2 px-3 rounded-lg bg-slate-900 border border-indigo-500/30 select-none relative overflow-hidden tracking-[0.35em] font-mono font-black text-lg text-indigo-300 shadow-inner"
                style={{
                  backgroundImage: "radial-gradient(#6366f1 1px, transparent 1px)",
                  backgroundSize: "7px 7px",
                }}
                title="Kode Keamanan"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent pointer-events-none" />
                <span className="relative drop-shadow-[0_2px_6px_rgba(99,102,241,0.5)] italic">
                  {captchaCode}
                </span>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={generateCaptcha}
                suppressHydrationWarning
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                title="Ganti / Acak Kode Captcha"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <input
              type="text"
              required
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
              placeholder="Masukkan 5 karakter kode"
              maxLength={6}
              suppressHydrationWarning
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono tracking-widest text-slate-100 placeholder:text-slate-500 uppercase focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Tombol Submit Login */}
          <button
            type="submit"
            disabled={loading}
            suppressHydrationWarning
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 mt-3 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Masuk ke Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Modal Lupa Password (3 Field Verifikasi -> Langsung Masuk) */}
      {isForgotPasswordOpen && (
        <ForgotPasswordModal
          isOpen={isForgotPasswordOpen}
          initialEmail={email}
          onClose={() => setIsForgotPasswordOpen(false)}
        />
      )}
    </>
  );
}
