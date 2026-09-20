"use client";

import { useState } from "react";
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Store,
  QrCode,
  Zap,
  MessageCircle,
  Sparkles,
  Flame,
  ArrowUpDown,
  Crown,
  CheckCircle2,
} from "lucide-react";
import { AdminWithRelations } from "@/types/models";

interface FieldAdminLeaderboardProps {
  admins: AdminWithRelations[];
  onAdminSelect?: (adminId: string) => void;
}

type SortMetric = "SCORE" | "OUTLETS" | "SCANS" | "EFFICIENCY";

export function FieldAdminLeaderboard({ admins, onAdminSelect }: FieldAdminLeaderboardProps) {
  const [sortBy, setSortBy] = useState<SortMetric>("SCORE");

  // Calculate statistics for each admin
  const rankedAdmins = admins.map((admin) => {
    const totalAssigned = admin.assignedCards.length;
    const claimedCards = admin.assignedCards.filter((c) => !!c.outletId).length;
    const blankCards = totalAssigned - claimedCards;
    const totalScans = admin.assignedCards.reduce((acc, c) => acc + (c.scanCount || 0), 0);
    const totalOutlets = admin.createdUsers?.filter((u) => !!u.outlet).length || 0;
    const efficiency = totalAssigned > 0 ? Math.round((claimedCards / totalAssigned) * 100) : 0;
    
    // Performance score: Outlets (150 pts), Scans (15 pts), Efficiency multiplier
    const score = (totalOutlets * 150) + (totalScans * 15) + (efficiency * 5);

    return {
      admin,
      totalAssigned,
      claimedCards,
      blankCards,
      totalScans,
      totalOutlets,
      efficiency,
      score,
    };
  });

  // Sort based on selected metric
  rankedAdmins.sort((a, b) => {
    if (sortBy === "SCORE") return b.score - a.score;
    if (sortBy === "OUTLETS") return b.totalOutlets - a.totalOutlets;
    if (sortBy === "SCANS") return b.totalScans - a.totalScans;
    if (sortBy === "EFFICIENCY") return b.efficiency - a.efficiency;
    return 0;
  });

  const getWaCheerUrl = (waNumber: string | null, name: string, rank: number, outlets: number) => {
    if (!waNumber) return "#";
    let clean = waNumber.replace(/[^0-9]/g, "");
    if (clean.startsWith("08")) clean = "62" + clean.slice(1);

    const msg = `Halo ${name}! 🏆
Selamat, Anda saat ini menempati Peringkat #${rank} di Leaderboard Admin Lapangan Smart QR dengan ${outlets} outlet aktif teraktivasi!
Pertahankan performa luar biasa ini dan terus tingkatkan pencapaian Anda! 🚀⭐`;

    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  };

  const top3 = rankedAdmins.slice(0, 3);
  const remaining = rankedAdmins.slice(3);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-slate-900/80 border border-amber-500/20 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs uppercase tracking-wider">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                Gamifikasi & Kinerja Lapangan
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {admins.length} Mitra Terdaftar
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>🏆 Leaderboard Admin Lapangan</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Pantau peringkat dan efisiensi konversi kartu setiap admin lapangan secara real-time. Berikan apresiasi langsung via WhatsApp!
            </p>
          </div>

          {/* Sort Metric Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 self-start md:self-auto shrink-0">
            <button
              onClick={() => setSortBy("SCORE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                sortBy === "SCORE"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              👑 Skor Total
            </button>
            <button
              onClick={() => setSortBy("OUTLETS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                sortBy === "OUTLETS"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🏪 Outlet
            </button>
            <button
              onClick={() => setSortBy("SCANS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                sortBy === "SCANS"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ⭐ Scans
            </button>
            <button
              onClick={() => setSortBy("EFFICIENCY")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                sortBy === "EFFICIENCY"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ⚡ Efisiensi
            </button>
          </div>
        </div>
      </div>

      {rankedAdmins.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
          <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">Belum Ada Admin Terdaftar</h3>
          <p className="text-xs text-slate-400 mt-1">Daftarkan admin lapangan terlebih dahulu untuk memulai kompetisi.</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((item, idx) => {
              const rank = idx + 1;
              const isGold = rank === 1;
              const isSilver = rank === 2;
              const isBronze = rank === 3;

              return (
                <div
                  key={item.admin.id}
                  className={`relative overflow-hidden rounded-3xl border transition-all p-5 backdrop-blur-xl ${
                    isGold
                      ? "bg-gradient-to-b from-amber-500/15 via-slate-900/90 to-slate-950 border-amber-500/40 shadow-xl shadow-amber-500/10 md:-translate-y-2"
                      : isSilver
                      ? "bg-gradient-to-b from-slate-400/10 via-slate-900/90 to-slate-950 border-slate-600/40 shadow-lg md:translate-y-0"
                      : "bg-gradient-to-b from-amber-800/10 via-slate-900/90 to-slate-950 border-amber-700/30 shadow-lg md:translate-y-2"
                  }`}
                >
                  {/* Top Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                        isGold
                          ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/40"
                          : isSilver
                          ? "bg-slate-300 text-slate-950 shadow-md"
                          : "bg-amber-700 text-white shadow-md"
                      }`}
                    >
                      {isGold && <Crown className="w-3.5 h-3.5 fill-slate-950" />}
                      {isSilver && <Medal className="w-3.5 h-3.5" />}
                      {isBronze && <Award className="w-3.5 h-3.5" />}
                      <span>Juara #{rank}</span>
                    </div>

                    <span className="font-mono text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      {item.score.toLocaleString()} Pts
                    </span>
                  </div>

                  {/* Admin Info */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-white truncate flex items-center gap-1.5">
                      <span>{item.admin.fullName}</span>
                      {isGold && <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />}
                    </h3>
                    <p className="text-xs text-slate-400 truncate font-mono mt-0.5">{item.admin.email}</p>
                  </div>

                  {/* 3 Metric Pills */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Outlet</span>
                      <span className="text-sm font-extrabold text-white">{item.totalOutlets}</span>
                    </div>
                    <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Scans</span>
                      <span className="text-sm font-extrabold text-emerald-400">{item.totalScans}</span>
                    </div>
                    <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Efisiensi</span>
                      <span className="text-sm font-extrabold text-sky-400">{item.efficiency}%</span>
                    </div>
                  </div>

                  {/* Efficiency Progress Bar */}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Kartu Terpakai</span>
                      <span className="font-mono font-semibold text-slate-200">
                        {item.claimedCards} / {item.totalAssigned}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isGold
                            ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                            : isSilver
                            ? "bg-gradient-to-r from-slate-400 to-slate-200"
                            : "bg-gradient-to-r from-amber-700 to-amber-500"
                        }`}
                        style={{ width: `${Math.min(item.efficiency, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* WhatsApp Cheer CTA */}
                  {item.admin.whatsappNumber && (
                    <a
                      href={getWaCheerUrl(item.admin.whatsappNumber, item.admin.fullName, rank, item.totalOutlets)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 text-xs font-semibold border border-slate-800 hover:border-emerald-500/30 transition-all cursor-pointer"
                      title="Kirim Pesan Apresiasi WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Kirim Apresiasi WhatsApp</span>
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {/* Full Leaderboard Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Klasemen Lengkap Seluruh Mitra</h3>
              </div>
              <span className="text-xs text-slate-400">Diurutkan berdasarkan: <strong className="text-amber-300 uppercase">{sortBy}</strong></span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 text-center w-14">Rank</th>
                    <th className="py-3 px-4">Nama Mitra Lapangan</th>
                    <th className="py-3 px-4 text-center">Outlet Binaan</th>
                    <th className="py-3 px-4 text-center">Kartu Terpakai</th>
                    <th className="py-3 px-4 text-center">Total Scan Ulasan</th>
                    <th className="py-3 px-4 text-center">Efisiensi Kuota</th>
                    <th className="py-3 px-4 text-center">Skor Poin</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rankedAdmins.map((item, idx) => {
                    const rank = idx + 1;
                    const isTop1 = rank === 1;
                    const isTop3 = rank <= 3;

                    return (
                      <tr
                        key={item.admin.id}
                        className={`transition-colors hover:bg-slate-800/40 ${
                          isTop1 ? "bg-amber-500/5 font-medium" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          <div
                            className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center font-black text-xs ${
                              rank === 1
                                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30"
                                : rank === 2
                                ? "bg-slate-300 text-slate-950 shadow-md"
                                : rank === 3
                                ? "bg-amber-700 text-white shadow-md"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {rank}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div>
                              <div className="font-bold text-slate-100 flex items-center gap-1.5">
                                <span>{item.admin.fullName}</span>
                                {item.efficiency >= 80 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    ⚡ PRO
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                {item.admin.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold text-white text-sm bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                            {item.totalOutlets}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono text-slate-300">
                            <strong className="text-white">{item.claimedCards}</strong> / {item.totalAssigned}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-bold text-emerald-400">
                            {item.totalScans.toLocaleString()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <div className="w-16 bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                              <div
                                className={`h-full rounded-full ${
                                  item.efficiency >= 70
                                    ? "bg-emerald-400"
                                    : item.efficiency >= 40
                                    ? "bg-amber-400"
                                    : "bg-slate-500"
                                }`}
                                style={{ width: `${Math.min(item.efficiency, 100)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-bold text-slate-300">
                              {item.efficiency}%
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-black text-amber-400">
                            {item.score.toLocaleString()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {item.admin.whatsappNumber ? (
                            <a
                              href={getWaCheerUrl(item.admin.whatsappNumber, item.admin.fullName, rank, item.totalOutlets)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors font-medium text-[11px]"
                              title="Chat WhatsApp Mitra"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>Chat</span>
                            </a>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
