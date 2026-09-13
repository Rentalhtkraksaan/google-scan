import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toaster";

import { db } from "@/lib/db";

export async function generateMetadata(): Promise<Metadata> {
  let faviconUrl = "/favicon.ico";
  try {
    const setting = await db.siteSetting.findFirst();
    if (setting?.faviconUrl) {
      faviconUrl = setting.faviconUrl;
    }
  } catch (error) {
    console.error("Gagal memuat metadata favicon:", error);
  }

  return {
    title: {
      default: "Smart QR Review — Dynamic Google Review Platform",
      template: "%s | Smart QR Review",
    },
    description:
      "Platform SaaS Dynamic QR Code & Smart Review Card untuk akselerasi ulasan bintang 5 Google Maps bisnis Anda.",
    icons: {
      icon: faviconUrl,
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
