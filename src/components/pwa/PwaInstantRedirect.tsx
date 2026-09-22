"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function PwaInstantRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if user was previously logged in on this browser/PWA
    const isLoggedIn = localStorage.getItem("smartqr_logged_in") === "true";
    const isExplicitLandingPreview = window.location.search.includes("view=landing");

    if (isLoggedIn && !isExplicitLandingPreview) {
      // Determine target from stored role or fallback to /portal
      const role = localStorage.getItem("smartqr_user_role");
      const target =
        role === "SUPER_ADMIN" ? "/super-admin" : role === "ADMIN" ? "/admin" : "/portal";

      // Instant client-side redirect in 0ms (no server wait!)
      router.replace(target);
    }
  }, [router]);

  return null;
}
