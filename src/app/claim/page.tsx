import { auth } from "@root/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { QrCode, AlertCircle, ArrowRight, CheckCircle2, Home, ShieldAlert, ArrowLeft } from "lucide-react";
import { ClaimClientView } from "./ClaimClientView";
import { Navbar } from "@/components/layout/Navbar";
import { AuthenticatedUser } from "@/types/models";

export const dynamic = "force-dynamic";

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const code = params.code?.trim().toLowerCase() || "";
  const session = await auth();

  // If no code provided
  if (!code) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Kode Kartu Tidak Ditemukan</h2>
          <p className="text-xs text-slate-400 mb-6">
            Silakan scan kembali QR code fisik pada kartu atau pilih dari daftar inventaris kartu di dashboard.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Kembali ke Beranda Utama</span>
          </Link>
        </div>
      </div>
    );
  }

  // Fetch card from database
  const card = await prisma.qrCard.findUnique({
    where: { code },
    include: {
      outlet: {
        include: {
          owner: true,
        },
      },
      assignedAdmin: true,
    },
  });

  // If card doesn't exist
  if (!card) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Kartu Belum Terdaftar</h2>
          <p className="text-xs text-slate-400 mb-6">
            Kode kartu <code className="text-rose-300 font-bold">{code}</code> belum pernah dibuat dalam sistem.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Kembali ke Beranda Utama</span>
          </Link>
        </div>
      </div>
    );
  }

  // If card is already claimed/active -> Langsung alihkan ke form ulasan bintang 5 (tanpa menampilkan info outlet/pemilik/scan)
  if (card.outlet) {
    redirect(`/c/${encodeURIComponent(card.code)}`);
  }

  // If card is blank and user is not logged in as Admin/Super Admin
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center card-glow">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-7 h-7" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Kartu Kosong Siap Pakai</h2>
          <p className="text-xs text-slate-400 mb-5">
            Kode Kartu: <span className="font-mono text-indigo-400 font-bold">{card.code}</span>
          </p>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-left mb-6 text-xs text-slate-300 leading-relaxed space-y-2">
            <p>
              Kartu QR ini berstatus <strong>KOSONG AKTIF</strong> dan belum dikaitkan ke outlet manapun.
            </p>
            <p className="text-slate-400">
              Jika Anda adalah <strong>Mitra Lapangan / Super Admin</strong>, silakan login untuk mendaftarkan nama toko dan link Google Review ke kartu ini.
            </p>
          </div>

          <div className="space-y-2.5">
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/claim?code=${card.code}`)}`}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/25"
            >
              <span>Login Admin & Hubungkan Outlet</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Kembali ke Beranda Utama</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If user is logged in as ADMIN, strictly enforce quota allocation
  if (session.user.role === "ADMIN" && card.assignedAdminId !== session.user.id) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center card-glow shadow-2xl animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Bukan Jatah Kartu Anda</h2>
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-6 text-left">
            <p className="text-sm font-medium text-amber-200 leading-relaxed">
              Kamu tidak diberi jatah kartu nomor <span className="font-mono font-bold text-amber-300">{card.code}</span> oleh Super Admin. Harap hubungi Super Admin.
            </p>
          </div>
          <div className="space-y-2.5">
            <Link
              href="/admin"
              prefetch={true}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-lg shadow-black/40"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Dashboard Admin Lapangan</span>
            </Link>
            <Link
              href="/"
              prefetch={true}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 text-slate-400 hover:text-slate-200 text-xs transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Kembali ke Beranda Utama</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const authUser: AuthenticatedUser = {
    id: session.user.id,
    fullName: session.user.fullName || "User",
    email: session.user.email || "",
    role: session.user.role || "ADMIN",
  };

  // If user is logged in as ADMIN or SUPER_ADMIN -> Direct registration interface
  return (
    <div className="min-h-screen bg-[#070b14]">
      <Navbar user={authUser} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Aktivasi Kartu QR Lapangan</h1>
            <p className="text-xs text-slate-400">
              Menghubungkan kartu <span className="font-mono text-indigo-400 font-bold">{card.code}</span> ke data outlet baru
            </p>
          </div>
          <Link
            href={session.user.role === "SUPER_ADMIN" ? "/super-admin" : "/admin"}
            prefetch={true}
            className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Kembali ke Dashboard
          </Link>
        </div>

        <ClaimClientView
          cardCode={card.code}
          userRole={session.user.role}
        />
      </main>
    </div>
  );
}
