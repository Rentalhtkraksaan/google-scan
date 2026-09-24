import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRecentRealtimeReviewEvents } from "@/lib/realtime-events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");
    const since = searchParams.get("since");

    if (!outletId) {
      return NextResponse.json({ success: false, message: "outletId diperlukan." }, { status: 400 });
    }

    const sinceMs = since ? parseInt(since, 10) : Date.now() - 10000;

    // 1. Fetch live total scans from qrCard (lightweight count)
    const cards = await prisma.qrCard.findMany({
      where: { outletId },
      select: { scanCount: true },
    });

    const totalScans = cards.reduce((sum, c) => sum + (c.scanCount || 0), 0);

    // 2. Fetch new scan/review events directly from in-memory RAM bus (0 DB queries & 0 DB storage!)
    const recentEvents = getRecentRealtimeReviewEvents(outletId, sinceMs);

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

