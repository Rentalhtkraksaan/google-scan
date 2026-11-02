import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://qr-inaja.biz.id";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/reseller", "/affiliate/register", "/login"],
        disallow: [
          "/super-admin/",
          "/admin/",
          "/portal/",
          "/affiliate/",
          "/kasir/",
          "/api/",
          "/claim/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

