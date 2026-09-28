import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRecentRealtimeReviewEvents } from "@/lib/realtime-events";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const outletScanCache = new Map<string, { totalScans: number; timestamp: number }>();

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown_ip";
    const rateCheck = checkRateLimit(`portal_realtime_${ip}`, 120, 60 * 1000);
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

    // 1. Fetch live total scans from memory cache (15s TTL) or database
    const now = Date.now();
    const cached = outletScanCache.get(outletId);
    let totalScans = 0;

    if (cached && now - cached.timestamp < 15000) {
      totalScans = cached.totalScans;
    } else {
      const scanAggregate = await prisma.qrCard.aggregate({
        where: { outletId },
        _sum: { scanCount: true },
      });
      totalScans = scanAggregate._sum.scanCount || 0;
      outletScanCache.set(outletId, { totalScans, timestamp: now });
    }

    // 2. Fetch new scan/review events directly from in-memory RAM bus (0 DB queries & 0 DB storage!)
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

