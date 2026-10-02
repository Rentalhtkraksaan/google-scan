"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RetailOrderModal } from "./RetailOrderModal";
import { PublicResellerRegistrationModal } from "./PublicResellerRegistrationModal";
import { TrackOrderModal } from "./TrackOrderModal";
import { recordAffiliateClickAction } from "@/lib/actions/affiliate.actions";
import { SiteSettingModel } from "@/types/models";

interface LandingAutoOrderHandlerProps {
  siteSetting?: SiteSettingModel;
}

function AutoOrderListener({ siteSetting }: LandingAutoOrderHandlerProps) {
  const searchParams = useSearchParams();
  const [isRetailModalOpen, setIsRetailModalOpen] = useState(false);
  const [isResellerModalOpen, setIsResellerModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackingInitialQuery, setTrackingInitialQuery] = useState("");
  const [activeReferralCode, setActiveReferralCode] = useState("");

  useEffect(() => {
    if (!searchParams) return;

    const ref = (searchParams.get("ref") || "").trim().toUpperCase();
    const buy = (searchParams.get("buy") || "").trim().toLowerCase();
    const order = (searchParams.get("order") || "").trim().toLowerCase();
    const type = (searchParams.get("type") || "").trim().toLowerCase();
    const track = (searchParams.get("track") || "").trim();

    if (ref) {
      setActiveReferralCode(ref);
      try {
        localStorage.setItem("smartqr_referral_code", ref);
        document.cookie = `smartqr_ref=${encodeURIComponent(ref)}; path=/; max-age=2592000; SameSite=Lax`;
        
        // Track affiliate click if not yet tracked in this browser session
        const clickKey = `tracked_click_${ref}`;
        if (typeof window !== "undefined" && !sessionStorage.getItem(clickKey)) {
          sessionStorage.setItem(clickKey, "1");
          recordAffiliateClickAction(ref).catch(() => {});
        }
      } catch (e) {
        // ignore localStorage / sessionStorage error
      }
    } else {
      try {
        const storedRef = localStorage.getItem("smartqr_referral_code");
        if (storedRef) setActiveReferralCode(storedRef);
      } catch (e) {}
    }

    if (track) {
      setTrackingInitialQuery(track);
      setIsTrackModalOpen(true);
      return;
    }

    // 1. Reseller link (?buy=reseller atau ?type=reseller atau ?order=reseller)
    if (buy === "reseller" || order === "reseller" || type === "reseller") {
      setIsResellerModalOpen(true);
      return;
    }

    // 2. Retail/Pcs affiliate link (jika ada ?ref=... atau ?buy=retail atau ?order=retail)
    if (ref || buy === "retail" || order === "retail") {
      setIsRetailModalOpen(true);
      return;
    }
  }, [searchParams]);

  const handleOpenTrackingFromSuccess = (orderNumber?: string) => {
    if (orderNumber) setTrackingInitialQuery(orderNumber);
    setIsTrackModalOpen(true);
  };

  return (
    <>
      <RetailOrderModal
        isOpen={isRetailModalOpen}
        onClose={() => setIsRetailModalOpen(false)}
        siteSetting={siteSetting}
        defaultReferralCode={activeReferralCode}
        onOpenTracking={handleOpenTrackingFromSuccess}
      />

      <PublicResellerRegistrationModal
        isOpen={isResellerModalOpen}
        onClose={() => setIsResellerModalOpen(false)}
        siteSetting={siteSetting}
        defaultReferralCode={activeReferralCode}
        onOpenTracking={handleOpenTrackingFromSuccess}
      />

      <TrackOrderModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        initialQuery={trackingInitialQuery}
      />
    </>
  );
}

export function LandingAutoOrderHandler({ siteSetting }: LandingAutoOrderHandlerProps) {
  return (
    <Suspense fallback={null}>
      <AutoOrderListener siteSetting={siteSetting} />
    </Suspense>
  );
}
