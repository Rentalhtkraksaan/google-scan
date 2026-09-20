"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RegisterOutletModal } from "@/components/forms/RegisterOutletModal";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ClaimClientViewProps {
  cardCode: string;
  userRole: string;
}

export function ClaimClientView({ cardCode, userRole }: ClaimClientViewProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  const targetPath = userRole === "SUPER_ADMIN" ? "/super-admin" : "/admin";

  // Eager prefetch so back navigation is instant (0ms delay)
  useEffect(() => {
    router.prefetch(targetPath);
  }, [router, targetPath]);

  const handleFinish = () => {
    setIsOpen(false);
    setIsNavigating(true);
    router.replace(targetPath);
  };

  if (!isOpen || isNavigating) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-xl animate-in fade-in">
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-sm font-semibold text-white">Mengalihkan kembali ke dashboard...</p>
          <p className="text-xs text-slate-400">Mohon tunggu sebentar, sistem sedang memuat dashboard Anda.</p>
          <Link
            href={targetPath}
            prefetch={true}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Klik di sini jika tidak otomatis beralih</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <RegisterOutletModal
        prefilledCode={cardCode}
        onClose={handleFinish}
        onSuccess={handleFinish}
      />
    </div>
  );
}
