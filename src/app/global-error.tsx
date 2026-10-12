"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global uncaught error:", error);
  }, [error]);

  return (
    <html lang="id">
      <body className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 m-0 font-sans select-none">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#0b101d] border border-slate-800 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-4xl shadow-lg">
            🔄
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Silakan Reload Device Anda
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
              Terjadi kendala pada sistem. Silakan muat ulang halaman atau reload device Anda untuk melanjutkan.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              } else {
                reset();
              }
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reload Sekarang</span>
          </button>
        </div>
      </body>
    </html>
  );
}
