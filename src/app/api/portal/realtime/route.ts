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

    // 1. Fetch live total scans across all cards for this outlet
    const cards = await prisma.qrCard.findMany({
      where: { outletId },
      select: { scanCount: true },
    });
    const totalScans = cards.reduce((sum, c) => sum + (c.scanCount || 0), 0);

    // 2. Fetch new events since timestamp (or last 10 seconds if since not passed)
    const sinceDate = since ? new Date(parseInt(since, 10)) : new Date(Date.now() - 10000);

    const recentEvents = await prisma.activityLog.findMany({
      where: {
        outletId,
        action: { in: ["FIVE_STAR_REVIEW", "SCAN_CARD"] },
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
    });

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
