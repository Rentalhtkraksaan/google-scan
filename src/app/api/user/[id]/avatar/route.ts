import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { avatarUrl: true },
    });

    if (!user?.avatarUrl) {
      return new NextResponse(null, { status: 404 });
    }

    // If it's an external URL (http/https), redirect directly
    if (user.avatarUrl.startsWith("http://") || user.avatarUrl.startsWith("https://")) {
      return NextResponse.redirect(new URL(user.avatarUrl, req.url));
    }

    // Parse base64 Data URL (data:image/png;base64,...)
    const matches = user.avatarUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const contentType = matches[1];
      const buffer = Buffer.from(matches[2], "base64");

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          "Content-Length": buffer.length.toString(),
        },
      });
    }

    return new NextResponse(null, { status: 404 });
  } catch (error) {
    console.error("Error serving user avatar:", error);
    return new NextResponse(null, { status: 500 });
  }
}
