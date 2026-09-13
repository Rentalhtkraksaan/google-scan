import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "weekly";
    const yearStr = searchParams.get("year");
    const monthStr = searchParams.get("month"); // 1-12

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    const year = yearStr ? parseInt(yearStr) : currentYear;
    const month = monthStr ? parseInt(monthStr) : currentMonth;

    if (type === "weekly") {
      // 7 Hari Terakhir
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 6); // 7 days inclusive

      const startStr = startDate.toISOString().split("T")[0];
      const endStr = endDate.toISOString().split("T")[0];

      const records = await prisma.dailyVisitor.findMany({
        where: {
          date: {
            gte: startStr,
            lte: endStr,
          }
        },
        orderBy: { date: "asc" }
      });

      // Format data
      const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      const chartData = [];
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        
        const record = records.find(r => r.date === dateStr);
        chartData.push({
          label: `${days[d.getDay()]} ${d.getDate()}`,
          visits: record ? record.visits : 0,
        });
      }

      return NextResponse.json(chartData);
    } 
    
    else if (type === "monthly") {
      // Data untuk 1 bulan penuh, dibagi per minggu
      const paddedMonth = String(month).padStart(2, "0");
      const prefix = `${year}-${paddedMonth}-`;

      const records = await prisma.dailyVisitor.findMany({
        where: {
          date: { startsWith: prefix }
        }
      });

      const weeks = [
        { label: "Minggu 1", visits: 0 },
        { label: "Minggu 2", visits: 0 },
        { label: "Minggu 3", visits: 0 },
        { label: "Minggu 4", visits: 0 },
        { label: "Minggu 5", visits: 0 },
      ];

      records.forEach(r => {
        const day = parseInt(r.date.split("-")[2]);
        if (day <= 7) weeks[0].visits += r.visits;
        else if (day <= 14) weeks[1].visits += r.visits;
        else if (day <= 21) weeks[2].visits += r.visits;
        else if (day <= 28) weeks[3].visits += r.visits;
        else weeks[4].visits += r.visits;
      });

      return NextResponse.json(weeks);
    }

    else if (type === "yearly") {
      // Data untuk 1 tahun penuh, dibagi per bulan
      const prefix = `${year}-`;

      const records = await prisma.dailyVisitor.findMany({
        where: {
          date: { startsWith: prefix }
        }
      });

      const months = [
        { label: "Jan", visits: 0 }, { label: "Feb", visits: 0 }, { label: "Mar", visits: 0 },
        { label: "Apr", visits: 0 }, { label: "Mei", visits: 0 }, { label: "Jun", visits: 0 },
        { label: "Jul", visits: 0 }, { label: "Agu", visits: 0 }, { label: "Sep", visits: 0 },
        { label: "Okt", visits: 0 }, { label: "Nov", visits: 0 }, { label: "Des", visits: 0 },
      ];

      records.forEach(r => {
        const m = parseInt(r.date.split("-")[1]); // 1-12
        months[m - 1].visits += r.visits;
      });

      return NextResponse.json(months);
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error("Analytics API Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
