"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getActivityLogsAction,
  ActivityLogItem,
} from "@/lib/actions/activity.actions";
import {
  History,
  Search,
  RefreshCw,
  User,
  ShieldCheck,
  Shield,
  Store,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Activity,
  AlertCircle,
  Key,
  LogOut,
  PlusCircle,
  Edit3,
  Trash2,
  ToggleLeft,
  Link,
} from "lucide-react";

interface ActivityLogTableProps {
  title?: string;
  subtitle?: string;
  defaultCategory?: string;
  isOutletView?: boolean;
}

export default function ActivityLogTable({
  title = "Log Aktivitas",
  subtitle = "Audit trail & riwayat seluruh aktivitas operasional secara real-time.",
  defaultCategory = "ALL",
  isOutletView = false,
}: ActivityLogTableProps) {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const fetchLogs = (targetPage = page, targetSearch = search, targetCat = category) => {
    startTransition(async () => {
      setErrorMsg("");
      const res = await getActivityLogsAction({
        page: targetPage,
        limit: 15,
        search: targetSearch,
        actionCategory: targetCat,
      });

      if (res.success && res.data) {
        setLogs(res.data.logs);
        setTotal(res.data.total);
        setPage(res.data.page);
        setPages(res.data.totalPages);
      } else {
        setErrorMsg(res.message || "Gagal memuat riwayat aktivitas.");
      }
    });
  };

  useEffect(() => {
    fetchLogs(1, search, category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1, search, category);
  };

  const formatTimestamp = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).format(d) + " WIB";
  };

  const getRelativeTime = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return "Baru saja";
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays === 1) return "Kemarin";
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return `${Math.floor(diffDays / 7)} mgg lalu`;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            Super Admin
          </span>
        );
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Shield className="w-3 h-3 text-blue-400" />
            Admin Lapangan
          </span>
        );
      case "USER":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Store className="w-3 h-3 text-emerald-400" />
            Pemilik Outlet
          </span>
        );
    }
  };

  const getActionBadge = (action: string) => {
    if (action.startsWith("AUTH_LOGIN")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Key className="w-3 h-3" />
          Login
        </span>
      );
    }
    if (action.startsWith("AUTH_LOGOUT")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <LogOut className="w-3 h-3" />
          Logout
        </span>
      );
    }
    if (action.startsWith("CREATE_") || action.startsWith("REGISTER_") || action.startsWith("GENERATE_")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <PlusCircle className="w-3 h-3" />
          Tambah
        </span>
      );
    }
    if (action.startsWith("UPDATE_")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Edit3 className="w-3 h-3" />
          Edit
        </span>
      );
    }
    if (action.startsWith("DELETE_")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <Trash2 className="w-3 h-3" />
          Hapus
        </span>
      );
    }
    if (action.startsWith("TOGGLE_")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <ToggleLeft className="w-3 h-3" />
          Status
        </span>
      );
    }
    if (action.startsWith("ASSIGN_") || action.startsWith("UNLINK_")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Link className="w-3 h-3" />
          Relasi
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-700/50 text-slate-300 border border-slate-600/30">
        <Activity className="w-3 h-3" />
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header & Control Bar */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  {total} Catatan
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(page, search, category)}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-medium transition-all shadow-sm disabled:opacity-50"
              title="Refresh Riwayat"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin text-blue-400" : ""}`} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-5 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari user, outlet, tindakan, target..."
              className="w-full pl-9 pr-20 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  fetchLogs(1, "", category);
                }}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-200"
              >
                Hapus
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-sm"
            >
              Cari
            </button>
          </form>

          {!isOutletView && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs text-slate-400 flex items-center gap-1 pl-1">
                <Filter className="w-3.5 h-3.5" />
                Kategori:
              </span>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter Kategori Log Aktivitas"
                className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition-all"
              >
                <option value="ALL">Semua Aktivitas</option>
                <option value="AUTH">Login & Sesi</option>
                <option value="GENERATE_CARDS">Generate Kartu</option>
                <option value="ASSIGN">Hubungkan Kartu</option>
                <option value="TOGGLE_CARD">Status Kartu</option>
                <option value="REGISTER_OUTLET">Registrasi Outlet</option>
                <option value="UPDATE_OUTLET">Update Outlet</option>
                <option value="CREATE_ADMIN">Buat Admin</option>
                <option value="CREATE_SUPER_ADMIN">Buat Super Admin 2</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Activity Logs Table */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-500 mb-3">
              <History className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">Belum Ada Riwayat Aktivitas</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search || category !== "ALL"
                ? "Tidak ada log yang cocok dengan filter pencarian Anda."
                : "Aktivitas yang Anda atau pengguna lain lakukan akan tercatat di sini secara otomatis."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 sm:px-5">Pelaku & Peran</th>
                  <th className="py-3.5 px-4">Tindakan</th>
                  <th className="py-3.5 px-4">Detail Aktivitas</th>
                  <th className="py-3.5 px-4 sm:px-5 text-right">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Actor */}
                    <td className="py-3.5 px-4 sm:px-5 align-top">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/70 flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate max-w-[140px] sm:max-w-[180px]">
                            {log.userName}
                          </p>
                          <div className="mt-1">{getRoleBadge(log.userRole)}</div>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="space-y-1">
                        <div>{getActionBadge(log.action)}</div>
                        <p className="text-xs font-medium text-slate-200">
                          {log.title}
                        </p>
                      </div>
                    </td>

                    {/* Details */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="space-y-1">
                        <p className="text-xs text-slate-300 leading-relaxed break-words max-w-xl">
                          {log.description}
                        </p>
                        {log.targetName && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/40 text-[11px] text-slate-400">
                            <span className="text-slate-500">Target:</span>
                            <span className="text-slate-200 font-medium">{log.targetName}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 sm:px-5 align-top text-right">
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-slate-300">
                          {getRelativeTime(log.createdAt)}
                        </p>
                        <p className="text-[10px] text-slate-500 flex items-center justify-end gap-1 font-mono">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTimestamp(log.createdAt)}
                        </p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              Menampilkan halaman <strong className="text-white font-semibold">{page}</strong> dari{" "}
              <strong className="text-white font-semibold">{totalPages}</strong> ({total} total log)
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchLogs(page - 1, search, category)}
                disabled={page <= 1 || isPending}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>
              <button
                onClick={() => fetchLogs(page + 1, search, category)}
                disabled={page >= totalPages || isPending}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
