import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const setting = await prisma.siteSetting.findFirst();
    if (setting?.faviconUrl && setting.faviconUrl.startsWith("data:image")) {
      const matches = setting.faviconUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");

        return new NextResponse(buffer, {
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
          },
        });
      }
    }
    
    return new NextResponse("Not Found", { status: 404 });
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
