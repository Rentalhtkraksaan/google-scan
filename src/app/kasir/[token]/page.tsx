import { prisma } from "@/lib/prisma";
import { isOutletMemberActive } from "@/lib/membership-utils";
import { CashierDisplayClient } from "./CashierDisplayClient";
import { AlertCircle, Store, Lock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface CashierPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: CashierPageProps) {
  const { token } = await params;
  const outlet = await prisma.outlet.findUnique({
    where: { staffPairingToken: token },
    select: { name: true },
  });

  return {
    title: outlet?.name ? `Layar Kasir - ${outlet.name}` : "Layar Monitor Kasir",
  };
}

export default async function CashierPage({ params }: CashierPageProps) {
  const { token } = await params;

  if (!token) {
    return <InvalidTokenScreen message="Kode pairing kasir tidak valid." />;
  }

  const outlet = await prisma.outlet.findUnique({
    where: { staffPairingToken: token },
    select: {
      id: true,
      name: true,
      soundEffect: true,
      isMember: true,
      membershipStartedAt: true,
      membershipExpiresAt: true,
    },
  });

  if (!outlet) {
    return (
      <InvalidTokenScreen message="Kode pairing kasir ini tidak ditemukan atau telah direset oleh pemilik toko." />
    );
  }

  const isMemberActive = isOutletMemberActive(outlet);

  if (!isMemberActive) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-2xl font-bold">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Masa Aktif VIP Berakhir</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Fitur Monitor Multi-Kasir untuk outlet <strong>&quot;{outlet.name}&quot;</strong> sedang tidak aktif karena masa berlaku member telah berakhir.
          </p>
          <p className="text-[11px] text-slate-400">
            Silakan hubungi pemilik toko untuk memperpanjang langganan Member VIP.
          </p>
        </div>
      </div>
    );
  }

  return (
    <CashierDisplayClient
      outlet={{
        id: outlet.id,
        name: outlet.name,
        soundEffect: outlet.soundEffect || "BELL_DOUBLE",
      }}
    />
  );
}

function InvalidTokenScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Perangkat Kasir Tidak Terhubung</h2>
        <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
          💡 Hubungi pemilik outlet untuk scan ulang <strong>QR Code Pairing Kasir</strong> terbaru dari portal dashboard mereka.
        </div>
      </div>
    </div>
  );
}
