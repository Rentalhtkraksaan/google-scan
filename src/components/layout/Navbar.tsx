"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { QrCode, LogOut, ShieldCheck, UserCheck, Store, ExternalLink, Loader2 } from "lucide-react";
import { logLogoutAction } from "@/lib/actions/auth.actions";

import { SiteSettingModel } from "@/types/models";

interface NavbarProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  siteSetting?: SiteSettingModel | null;
}

export function Navbar({ user, siteSetting }: NavbarProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logLogoutAction();
    } catch (e) {
      console.error("Error logging logout activity:", e);
    } finally {
      await signOut({ callbackUrl: "/login" });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            Super Admin
          </span>
        );
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <UserCheck className="w-3.5 h-3.5" />
            Admin Lapangan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <Store className="w-3.5 h-3.5" />
            Pemilik Outlet
          </span>
        );
    }
  };

  const getDashboardLink = (role: string) => {
    if (role === "SUPER_ADMIN") return "/super-admin";
    if (role === "ADMIN") return "/admin";
    return "/portal";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            {siteSetting?.dashboardLogoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={siteSetting.dashboardLogoUrl}
                alt="Logo"
                className="w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow-md shrink-0 group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                Smart QR <span className="text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 font-medium">Review</span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {siteSetting?.appVersion || "V 1.1.2"}
                </span>
              </span>
              <span className="text-[11px] text-slate-400">Google Review Accelerator</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              href={getDashboardLink(user.role)}
              className="px-3 py-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              Dashboard
            </Link>
            {user.role === "SUPER_ADMIN" && (
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
              >
                Mode Admin Lapangan
              </Link>
            )}
            <Link
              href="/"
              target="_blank"
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors flex items-center gap-1 text-xs"
            >
              Landing Page <ExternalLink className="w-3 h-3 opacity-60" />
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-200">{user.fullName}</span>
              {getRoleBadge(user.role)}
            </div>
            <span className="text-xs text-slate-400">{user.email}</span>
          </div>

          <button
            suppressHydrationWarning
            disabled={isLoggingOut}
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-all cursor-pointer disabled:opacity-60"
            title="Keluar dari akun"
          >
            {isLoggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{isLoggingOut ? "Keluar..." : "Logout"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

