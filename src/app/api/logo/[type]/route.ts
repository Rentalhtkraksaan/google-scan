import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400",
            "Content-Length": buffer.length.toString(),
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

      return new NextResponse(buffer, {
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
