import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toaster";
import { getCachedSiteSetting } from "@/lib/site-settings-cache";

export async function generateMetadata(): Promise<Metadata> {
  let faviconUrl = "/favicon.ico";
  let title = "Smart QR Review — Akselerasi Ulasan Bintang 5 Google Bisnis";
  let description =
    "Platform SaaS Dynamic QR Code & Smart Review Card untuk akselerasi ulasan bintang 5 Google Maps bisnis Anda.";

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
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://qr-inaja.vercel.app"),
    title: {
      default: title,
      template: "%s | Smart QR Review",
    },
    description: description,
    icons: {
      icon: faviconUrl,
    },
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Smart QR",
    },
    openGraph: {
      title: title,
      description: description,
      images: [
        {
          url: "/api/og",
          width: 800,
          height: 800,
          alt: "Smart QR Review Logo",
        },
      ],
      type: "website",
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-[#070b14] text-slate-100 min-h-screen" suppressHydrationWarning>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
