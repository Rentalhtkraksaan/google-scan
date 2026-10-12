"use client";

import { useEffect } from "react";
import { RotateCcw, Home, Sparkles } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error secara internal di console developer tanpa menampilkan rincian teknis ke user
    console.error("System error caught by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/15 to-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-2xl backdrop-blur-xl text-center space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Friendly Illustration / Icon */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-sky-500/20 border border-indigo-500/30 flex items-center justify-center text-4xl shadow-xl shadow-indigo-600/10">
          🔄
        </div>

        {/* Friendly Message */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Silakan Reload Device Anda
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
            Terjadi kendala pada sistem koneksi. Silakan muat ulang halaman atau reload device Anda untuk melanjutkan kembali.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              } else {
                reset();
              }
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4 animate-spin-reverse" />
            <span>Reload Sekarang</span>
          </button>

          <a
            href="/"
            className="w-full py-3 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Home className="w-3.5 h-3.5 text-slate-400" />
            <span>Kembali ke Halaman Utama</span>
          </a>
        </div>

        <div className="pt-2 border-t border-slate-900 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Smart QR Review System • Otomatis Pulih</span>
        </div>
      </div>
    </div>
  );
}
