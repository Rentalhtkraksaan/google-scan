import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRecentRealtimeReviewEvents, getCachedOutletScanCount, setOutletScanCount } from "@/lib/realtime-events";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown_ip";
    const rateCheck = checkRateLimit(`portal_realtime_${ip}`, 300, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: "Terlalu banyak permintaan polling realtime." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");
    const since = searchParams.get("since");

    if (!outletId || typeof outletId !== "string" || outletId.length > 50) {
      return NextResponse.json({ success: false, message: "Parameter outletId tidak valid." }, { status: 400 });
    }

    const parsedSince = since ? parseInt(since, 10) : NaN;
    const sinceMs = !isNaN(parsedSince) && parsedSince > 0 ? parsedSince : Date.now() - 10000;
    const now = Date.now();

    // 1. Fetch live total scans from RAM memory cache or fast DB aggregate
    let totalScans = getCachedOutletScanCount(outletId);

    if (totalScans === null) {
      const scanAggregate = await prisma.qrCard.aggregate({
        where: { outletId },
        _sum: { scanCount: true },
      });
      totalScans = scanAggregate._sum.scanCount || 0;
      setOutletScanCount(outletId, totalScans);
    }

    // 2. Fetch new scan/review events directly from in-memory RAM bus (0 DB queries & 0 DB latency!)
    const recentEvents = getRecentRealtimeReviewEvents(outletId, sinceMs);

    return NextResponse.json({
      success: true,
      totalScans,
      serverTime: now,
      events: recentEvents,
      newEvents: recentEvents,
    });
  } catch (error) {
    console.error("Error fetching portal realtime data:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data realtime." },
      { status: 500 }
    );
  }
}

