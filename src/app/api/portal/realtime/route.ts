import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");
    const since = searchParams.get("since");

    if (!outletId) {
      return NextResponse.json({ success: false, message: "outletId diperlukan." }, { status: 400 });
    }

    // 1 & 2. Fetch live total scans and new events concurrently (Promise.all)
    const sinceDate = since ? new Date(parseInt(since, 10)) : new Date(Date.now() - 10000);

    const [cards, recentEvents] = await Promise.all([
      prisma.qrCard.findMany({
        where: { outletId },
        select: { scanCount: true },
      }),
      prisma.activityLog.findMany({
        where: {
          outletId,
          action: { in: ["FIVE_STAR_REVIEW", "FOUR_STAR_REVIEW", "SCAN_CARD"] },
          createdAt: { gt: sinceDate },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          action: true,
          title: true,
          description: true,
          targetId: true,
          createdAt: true,
        },
      }),
    ]);

    const totalScans = cards.reduce((sum, c) => sum + (c.scanCount || 0), 0);

    return NextResponse.json({
      success: true,
      totalScans,
      serverTime: Date.now(),
      events: recentEvents,
    });
  } catch (error) {
    console.error("Error fetching portal realtime data:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data realtime." },
      { status: 500 }
    );
  }
}
