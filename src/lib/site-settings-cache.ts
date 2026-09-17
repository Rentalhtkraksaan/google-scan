import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Cached fetch untuk siteSetting.
 * TTL 60 detik — konten landing page jarang berubah.
 * Tag "site-setting" bisa dipakai untuk on-demand revalidation
 * saat admin update settings.
 */
export const getCachedSiteSetting = unstable_cache(
  async () => {
    return prisma.siteSetting.findUnique({
      where: { id: "default" },
    });
  },
  ["site-setting"],
  {
    revalidate: 60, // cache 60 detik
    tags: ["site-setting"],
  }
);
