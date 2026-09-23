import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { id: "default" },
      select: { landingPageLogoUrl: true, faviconUrl: true, dashboardLogoUrl: true },
    });

    const candidateUrl = setting?.landingPageLogoUrl || setting?.faviconUrl || setting?.dashboardLogoUrl;

    if (candidateUrl) {
      if (candidateUrl.startsWith("http://") || candidateUrl.startsWith("https://") || candidateUrl.startsWith("/")) {
        return NextResponse.redirect(new URL(candidateUrl, req.url));
      }

      const matches = candidateUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400",
            "Content-Length": buffer.length.toString(),
          },
        });
      }
    }

    // Default High-Contrast SVG Icon for Notifications & PWA
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#020617"/>
        </linearGradient>
        <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24"/>
          <stop offset="100%" stop-color="#d97706"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill="url(#bg)"/>
      <circle cx="256" cy="256" r="190" fill="none" stroke="url(#gold)" stroke-width="8" stroke-dasharray="16 12" opacity="0.6"/>
      <!-- Star Icon -->
      <path d="M256 110l45 91 100 15-72 70 17 100-90-47-90 47 17-100-72-70 100-15z" fill="url(#gold)"/>
      <!-- Bell Dot -->
      <circle cx="380" cy="130" r="32" fill="#ef4444" stroke="#ffffff" stroke-width="8"/>
    </svg>`;

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Error generating og image:", error);
    return new NextResponse(null, { status: 500 });
  }
}
