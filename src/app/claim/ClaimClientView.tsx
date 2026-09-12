"use client";

import { useRouter } from "next/navigation";
import { RegisterOutletModal } from "@/components/forms/RegisterOutletModal";

interface ClaimClientViewProps {
  cardCode: string;
  userRole: string;
}

export function ClaimClientView({ cardCode, userRole }: ClaimClientViewProps) {
  const router = useRouter();

  const handleFinish = () => {
    if (userRole === "SUPER_ADMIN") {
      router.push("/super-admin");
    } else {
      router.push("/admin");
    }
  };

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
