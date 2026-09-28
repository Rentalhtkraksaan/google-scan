import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

let memoryLogoCache: {
  data: Record<string, { buffer: Buffer; contentType: string } | null>;
  timestamp: number;
} = { data: {}, timestamp: 0 };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;

    if (type === "badge") {
      const fs = await import("fs");
      const path = await import("path");
      const badgePath = path.join(process.cwd(), "public", "badge.png");
      if (fs.existsSync(badgePath)) {
        const buffer = fs.readFileSync(badgePath);
        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Length": buffer.length.toString(),
          },
        });
      }
    }

    // Check memory cache (valid for 60s)
    const now = Date.now();
    if (now - memoryLogoCache.timestamp < 60000 && memoryLogoCache.data[type] !== undefined) {
      const cached = memoryLogoCache.data[type];
      if (cached) {
        return new NextResponse(new Uint8Array(cached.buffer), {
          status: 200,
          headers: {
            "Content-Type": cached.contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Length": cached.buffer.length.toString(),
          },
        });
      }
    }

    let selectField: "dashboardLogoUrl" | "landingPageLogoUrl" | "faviconUrl" = "dashboardLogoUrl";
    if (type === "landing") selectField = "landingPageLogoUrl";
    else if (type === "favicon") selectField = "faviconUrl";

    const setting = await prisma.siteSetting.findUnique({
      where: { id: "default" },
      select: {
        dashboardLogoUrl: true,
        landingPageLogoUrl: true,
        faviconUrl: true,
      },
    });

    const dataUrl = setting ? setting[selectField] : null;

    if (!dataUrl) {
      return NextResponse.redirect(new URL("/icon-192.png", req.url));
    }

    // If it's a standard URL (http/https), redirect directly
    if (dataUrl.startsWith("http://") || dataUrl.startsWith("https://") || dataUrl.startsWith("/")) {
      return NextResponse.redirect(new URL(dataUrl, req.url));
    }

    // If it's a base64 Data URL (data:image/png;base64,...)
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const contentType = matches[1];
      const buffer = Buffer.from(matches[2], "base64");

      memoryLogoCache.data[type] = { buffer, contentType };
      memoryLogoCache.timestamp = Date.now();

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": buffer.length.toString(),
        },
      });
    }

    return new NextResponse(null, { status: 404 });
  } catch (error) {
    console.error("Error serving site logo:", error);
    return new NextResponse(null, { status: 500 });
  }
}
