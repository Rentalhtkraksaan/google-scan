import { getCachedSiteSetting } from "@/lib/site-settings-cache";
import { ResellerPageClient } from "./ResellerPageClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const siteSetting = await getCachedSiteSetting();
  const baseTitle = siteSetting?.seoTitle?.trim() || "Smart QR Review";

  return {
    title: `Pendaftaran Kemitraan Reseller & Grosir Kartu — ${baseTitle}`,
    description: "Program kemitraan reseller kartu Smart QR Google Review dengan harga grosir spesial, akses dashboard mandiri, dan komisi reward.",
  };
}

export default async function ResellerPage() {
  const siteSetting = await getCachedSiteSetting();

  return <ResellerPageClient siteSetting={siteSetting || undefined} />;
}
