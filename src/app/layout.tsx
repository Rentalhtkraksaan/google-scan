import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toaster";
import { getCachedSiteSetting } from "@/lib/site-settings-cache";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://qr-inaja.biz.id";

export async function generateMetadata(): Promise<Metadata> {
  let faviconUrl = "/favicon.ico";
  let title = "QR-INAJA | Smart QR Review & Kartu Akrilik Ulasan Bintang 5 Google Maps";
  let description =
    "Platform SaaS Dynamic QR Code & Kartu Akrilik Smart Review untuk meningkatkan rating dan ratusan ulasan bintang 5 Google Maps bisnis, cafe, resto, dan UMKM Anda secara instan.";

  try {
    const setting = await getCachedSiteSetting();
    if (setting?.faviconUrl) {
      faviconUrl = setting.faviconUrl;
    }
    if (setting?.seoTitle?.trim()) {
      title = setting.seoTitle.trim();
    }
    if (setting?.seoDescription?.trim()) {
      description = setting.seoDescription.trim();
    }
  } catch (error) {
    console.error("Gagal memuat metadata layout:", error);
  }

  return {
    metadataBase: new URL(DEFAULT_BASE_URL),
    title: {
      default: title,
      template: "%s | QR-INAJA Smart QR Review",
    },
    description,
    keywords: [
      "QRInAja",
      "QR-InAja",
      "qr-inaja.biz.id",
      "Kartu QR Google Review",
      "Standee Akrilik Google Maps",
      "Akrilik Google Review",
      "Cara Menaikkan Rating Google Bisnis",
      "Smart QR Review Indonesia",
      "Kartu Ulasan Bintang 5 Google",
      "Kartu NFC Google Review",
      "Papan QR Code Meja Kasir",
      "Filter Ulasan Google Maps",
      "Kemitraan Reseller Smart QR",
    ],
    alternates: {
      canonical: "/",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: faviconUrl,
    },
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "QR-INAJA",
    },
    openGraph: {
      title,
      description,
      url: DEFAULT_BASE_URL,
      siteName: "QR-INAJA — Smart QR Review Indonesia",
      locale: "id_ID",
      images: [
        {
          url: "/api/og",
          width: 800,
          height: 800,
          alt: "QR-INAJA Smart QR Review Logo",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/api/og"],
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${DEFAULT_BASE_URL}/#website`,
        url: DEFAULT_BASE_URL,
        name: "QR-INAJA | Smart QR Review Indonesia",
        alternateName: ["QRInAja", "Smart QR Review", "Kartu QR Google Review"],
        inLanguage: "id-ID",
      },
      {
        "@type": "Organization",
        "@id": `${DEFAULT_BASE_URL}/#organization`,
        name: "QR-INAJA Smart QR Review",
        url: DEFAULT_BASE_URL,
        logo: `${DEFAULT_BASE_URL}/api/og`,
      },
      {
        "@type": "Product",
        name: "Kartu Akrilik Smart QR Google Review (QR-INAJA)",
        description:
          "Kartu akrilik meja kasir dengan Dynamic QR Code, Smart Filter Rating Bintang 1-3 ke WhatsApp, E-Menu Digital, dan Notifikasi Dering Kasir Real-Time untuk mendongkrak ulasan bintang 5 Google Maps.",
        brand: {
          "@type": "Brand",
          name: "QR-INAJA",
        },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "IDR",
          lowPrice: "20000",
          highPrice: "49000",
          availability: "https://schema.org/InStock",
          url: `${DEFAULT_BASE_URL}/reseller`,
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          reviewCount: "320",
        },
      },
    ],
  };

  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-[#070b14] text-slate-100 min-h-screen" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ToastProvider>
          {children}
        </ToastProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
