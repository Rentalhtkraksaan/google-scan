"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function PwaInstantRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Hanya redirect otomatis jika dibuka dalam mode Standalone PWA (Aplikasi Terinstall di HP/Desktop)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (!isStandalone) return;

    // Jangan redirect jika ada query referral, order, atau preview landing
    const search = window.location.search;
    if (search.includes("ref=") || search.includes("buy=") || search.includes("order=") || search.includes("view=landing")) {
      return;
    }

    // Check if user was previously logged in on this PWA
    const isLoggedIn = localStorage.getItem("smartqr_logged_in") === "true";

    if (isLoggedIn) {
      const role = localStorage.getItem("smartqr_user_role");
      const target =
        role === "SUPER_ADMIN" ? "/super-admin" : role === "ADMIN" ? "/admin" : role === "AFFILIATE" ? "/affiliate" : "/portal";

      router.replace(target);
    }
  }, [router]);

  return null;
}
