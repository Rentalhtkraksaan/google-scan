import { getCachedSiteSetting } from "@/lib/site-settings-cache";
import { ResellerPageClient } from "./ResellerPageClient";
import { prisma } from "@/lib/prisma";
import { after } from "next/server";
import { headers } from "next/headers";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const siteSetting = await getCachedSiteSetting();
  const baseTitle = siteSetting?.seoTitle?.trim() || "Smart QR Review";

  return {
    title: `Pendaftaran Kemitraan Reseller & Grosir Kartu — ${baseTitle}`,
    description:
      "Program kemitraan reseller kartu Smart QR Google Review dengan harga grosir spesial, akses dashboard mandiri, dan komisi reward.",
  };
}

export default async function ResellerPage() {
  const siteSetting = await getCachedSiteSetting();

  // Catat kunjungan halaman Landing Page Reseller ke total Kunjungan Website & Analitik Harian
  after(async () => {
    try {
      const headerList = await headers();
      const userAgent = (headerList.get("user-agent") || "").toLowerCase();
      if (/bot|crawl|spider|slurp|curl|wget|python|scanner|headless|postman/i.test(userAgent)) {
        return;
      }
    } catch {
      // Abaikan jika headers tidak dapat diakses
    }

    try {
      await prisma.siteSetting.update({
        where: { id: "default" },
        data: { visitorCount: { increment: 1 } },
      });
    } catch (e) {
      console.error("Gagal increment visitor count (reseller):", e);
    }

    try {
      const dateOpts = {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      } as const;
      const parts = new Intl.DateTimeFormat("en-CA", dateOpts).formatToParts(new Date());
      const year = parts.find((p) => p.type === "year")?.value;
      const month = parts.find((p) => p.type === "month")?.value;
      const day = parts.find((p) => p.type === "day")?.value;
      const today = `${year}-${month}-${day}`;

      await prisma.dailyVisitor.upsert({
        where: { date: today },
        update: { visits: { increment: 1 } },
        create: { date: today, visits: 1 },
      });
    } catch (e) {
      console.error("Gagal mencatat kunjungan harian (reseller):", e);
    }
  });

  return <ResellerPageClient siteSetting={siteSetting || undefined} />;
}
