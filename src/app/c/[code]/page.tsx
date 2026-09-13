import { prisma } from "@/lib/prisma";
import { formatGoogleReviewUrl } from "@/lib/google-url";
import { redirect } from "next/navigation";
import { SmartReviewClient } from "./SmartReviewClient";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const cleanCode = code?.trim().toLowerCase();

  const card = await prisma.qrCard.findUnique({
    where: { code: cleanCode },
    include: { outlet: true },
  });

  return {
    title: card?.outlet?.name
      ? `Beri Ulasan - ${card.outlet.name}`
      : "Smart QR Review",
  };
}

export default async function SmartReviewPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const cleanCode = code?.trim().toLowerCase();

  if (!cleanCode) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 text-white">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Kode QR Tidak Valid</h1>
          <p className="text-sm text-slate-400 mb-6">Parameter kode kartu tidak ditemukan.</p>
          <Link href="/" className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium text-sm transition-colors">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  // 1. Ambil data kartu beserta relasi outlet & pemilik
  const card = await prisma.qrCard.findUnique({
    where: { code: cleanCode },
    include: {
      outlet: {
        include: {
          owner: true,
        },
      },
    },
  });

  // Ambil site setting untuk fallback global
  const siteSetting = await prisma.siteSetting.findUnique({
    where: { id: "default" },
  });
  const masterFallback =
    siteSetting?.globalFallbackUrl ||
    card?.fallbackUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  // 2. Kartu tidak ditemukan
  if (!card) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 text-white">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Kartu Tidak Ditemukan</h1>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Kode kartu <code className="text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded font-mono font-semibold">{cleanCode}</code> belum terdaftar dalam sistem.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  // 3. Kartu kosong (belum terhubung ke outlet) -> redirect ke claim
  if (!card.outletId || !card.outlet) {
    redirect(`/claim?code=${encodeURIComponent(card.code)}`);
  }

  const isCardInactive = card.status === "INACTIVE";
  const isOwnerDisabled = card.outlet.owner?.isActive === false;

  // 4. Status INACTIVE atau Akun Pemilik Dimatikan -> Redirect ke fallback URL
  if (isCardInactive || isOwnerDisabled) {
    await prisma.qrCard.update({
      where: { code: cleanCode },
      data: {
        scanCount: {
          increment: 1,
        },
      },
    });

    const targetFallback =
      card.fallbackUrl && card.fallbackUrl !== "http://localhost:3000"
        ? card.fallbackUrl
        : masterFallback;

    redirect(targetFallback);
  }

  // 5. Update Scan Count & Rekam Activity Log
  await prisma.qrCard.update({
    where: { code: cleanCode },
    data: {
      scanCount: {
        increment: 1,
      },
    },
  });

  // Log activity removed to save database storage per user request

  const formattedGoogleUrl = formatGoogleReviewUrl(card.outlet.googleReviewUrl);

  return (
    <SmartReviewClient
      cardCode={card.code}
      outlet={{
        id: card.outlet.id,
        name: card.outlet.name,
        googleReviewUrl: formattedGoogleUrl,
        whatsappNumber: card.outlet.owner?.whatsappNumber || null,
      }}
    />
  );
}
