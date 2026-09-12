import { Suspense } from "react";
import Link from "next/link";
import { QrCode, ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Login Portal",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-between relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-600/15 via-sky-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 blur-3xl pointer-events-none -z-10" />

      {/* Top bar */}
      <header className="p-6 max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link
          href="/"
          className="group inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700/60 hover:border-indigo-500/50 shadow-lg shadow-black/40 hover:shadow-indigo-500/10 backdrop-blur-md transition-all duration-300 hover:scale-[1.02]"
        >
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/25 border border-indigo-500/20 group-hover:border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          </div>
          <span className="text-xs font-semibold tracking-wide">Kembali ke Beranda</span>
        </Link>
        <Link
          href="/"
          className="group flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 transition-all backdrop-blur-md"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <QrCode className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Smart QR Review
          </span>
        </Link>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Suspense
          fallback={
            <div className="w-full max-w-md h-96 bg-slate-900/60 rounded-2xl animate-pulse border border-slate-800" />
          }
        >
          <LoginForm />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-500" suppressHydrationWarning>
        &copy; 2026 Smart QR Review Platform. Seluruh hak cipta dilindungi.
      </footer>
    </div>
  );
}
