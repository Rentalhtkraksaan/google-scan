import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Khusus Super Admin." },
        { status: 403 }
      );
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown_ip";
    const rateCheck = checkRateLimit(`superadmin_realtime_${ip}`, 120, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: "Terlalu banyak permintaan polling realtime." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");
    const parsedSince = since ? parseInt(since, 10) : NaN;
    const sinceDate = !isNaN(parsedSince) && parsedSince > 0 ? new Date(parsedSince) : new Date(Date.now() - 15000);

    const [
      pendingOrdersCount,
      pendingVipPaymentsCount,
      pendingResellerPaymentsCount,
      recentActivities,
    ] = await Promise.all([
      prisma.resellerOrder.count({
        where: { orderStatus: "PENDING" },
      }),
      prisma.membershipPayment.count({
        where: { status: "PENDING" },
      }),
      prisma.resellerModulePayment.count({
        where: { status: "PENDING" },
      }),
      prisma.activityLog.findMany({
        where: {
          createdAt: { gt: sinceDate },
          action: {
            in: ["CREATE", "UPDATE_STATUS", "REQUEST_CARDS", "VIP_RENEWAL_MIDTRANS"],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      success: true,
      serverTime: Date.now(),
      pendingOrdersCount,
      pendingVipPaymentsCount,
      pendingResellerPaymentsCount,
      recentActivities,
    });
  } catch (error) {
    console.error("Error in super admin realtime route:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data realtime Super Admin." },
      { status: 500 }
    );
  }
}
