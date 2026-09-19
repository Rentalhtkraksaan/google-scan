import { auth } from "@root/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { PortalClientView } from "./PortalClientView";
import { AuthenticatedUser } from "@/types/models";
import { getCachedSiteSetting } from "@/lib/site-settings-cache";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portal Klien Outlet",
};

export default async function PortalPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Parallel fetch: ambil data user outlet dan site setting serentak (Promise.all)
  const [user, siteSetting] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        outlet: {
          include: {
            feedbacks: {
              orderBy: {
                createdAt: "desc",
              },
            },
            qrCards: {
              include: {
                assignedAdmin: {
                  select: {
                    fullName: true,
                    whatsappNumber: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        createdBy: {
          select: {
            fullName: true,
            whatsappNumber: true,
            email: true,
          },
        },
      },
    }),
    getCachedSiteSetting(),
  ]);

  if (!user) {
    redirect("/login");
  }

  // If user is Admin or Super Admin without outlet, redirect to their dashboard
  if (!user.outlet && user.role === "SUPER_ADMIN") {
    redirect("/super-admin");
  }
  if (!user.outlet && user.role === "ADMIN") {
    redirect("/admin");
  }

  const authUser: AuthenticatedUser = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    whatsappNumber: user.whatsappNumber,
  };

  // Prioritas Mitra Lapangan: Admin yang memegang salah satu kartu (assignedAdmin), jika tidak ada fallback ke pembuat akun (createdBy)
  const adminContact =
    user.outlet?.qrCards?.find((c) => c.assignedAdmin)?.assignedAdmin || user.createdBy;

  const formattedOutlet = user.outlet
    ? {
        id: user.outlet.id,
        name: user.outlet.name,
        googleReviewUrl: user.outlet.googleReviewUrl,
        qrCards: user.outlet.qrCards,
        qrCard: user.outlet.qrCards[0] || null,
        feedbacks: user.outlet.feedbacks || [],
      }
    : null;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
      <Navbar user={authUser} siteSetting={siteSetting as unknown as import("@/types/models").SiteSettingModel} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <PortalClientView
          user={{
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            whatsappNumber: user.whatsappNumber,
          }}
          outlet={formattedOutlet}
          adminContact={adminContact}
        />
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Smart QR Review Platform. Portal Mitra & Klien.
      </footer>
    </div>
  );
}
