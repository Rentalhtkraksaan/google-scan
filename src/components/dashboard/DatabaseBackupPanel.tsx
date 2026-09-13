"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Database,
  Download,
  Trash2,
  Clock,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  Calendar,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  FileCode,
  DownloadCloud,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "@/lib/swal";

interface BackupItem {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  formattedSize: string;
  isAutoMidnight: boolean;
}

interface BackupStatus {
  totalBackups: number;
  lastBackupDate: string | null;
  lastBackupFilename: string | null;
  nextScheduledDate: string;
  backupsDirectory: string;
}

export default function DatabaseBackupPanel() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const [autoBrowserDownload, setAutoBrowserDownload] = useState(true);
  const [timeUntilMidnight, setTimeUntilMidnight] = useState<string>("");

  // Fetch status and list of backups
  const fetchBackups = useCallback(async (isMidnightCheck = false) => {
    try {
      setIsLoading(true);
      const url = isMidnightCheck
        ? "/api/super-admin/backup?check=midnight"
        : "/api/super-admin/backup";
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setBackups(data.backups || []);
        setStatus(data.status || null);

        // If a new midnight backup was just executed and auto-download is on
        if (data.checkResult?.executed && data.checkResult?.filename && autoBrowserDownload) {
          triggerBrowserDownload(data.checkResult.filename);
          showSuccessAlert(
            "Auto Backup Terjadwal Jam 00:00 Berhasil!",
            `Database telah dicadangkan secara otomatis: ${data.checkResult.filename}`
          );
        }
      } else {
        console.error("Fetch backup error:", data.message);
      }
    } catch (err) {
      console.error("Gagal memuat status backup:", err);
    } finally {
      setIsLoading(false);
    }
  }, [autoBrowserDownload]);

  // Initial fetch and auto-midnight check
  useEffect(() => {
    fetchBackups(true);

    // Calculate time until 00:00 midnight
    const updateCountdown = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      const diffMs = nextMidnight.getTime() - now.getTime();

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeUntilMidnight(
        `${String(hours).padStart(2, "0")}j ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}d`
      );

      // Trigger automatic backup when midnight strikes (diffMs within 5 seconds)
      if (hours === 0 && minutes === 0 && seconds === 1) {
        fetchBackups(true);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [fetchBackups]);

  // Helper to trigger robust browser file download via Blob + ObjectURL
  const triggerBrowserDownload = async (filename: string) => {
    try {
      const downloadUrl = `/api/super-admin/backup?download=${encodeURIComponent(filename)}`;
      const res = await fetch(downloadUrl);
      if (!res.ok) {
        throw new Error("Gagal mengunduh file backup dari server.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 2000);
    } catch (err) {
      console.error("Blob download error, falling back to direct navigation:", err);
      window.location.href = `/api/super-admin/backup?download=${encodeURIComponent(filename)}`;
    }
  };

  // Trigger manual instant backup
  const handleCreateManualBackup = async () => {
    try {
      setIsBackingUp(true);
      const res = await fetch("/api/super-admin/backup", {
        method: "POST",
      });
      const data = await res.json();

      if (data.success && data.backup) {
        setBackups(data.backups || []);
        setStatus(data.status || null);

        // Auto download the newly generated SQL file to browser
        triggerBrowserDownload(data.backup.filename);

        showSuccessAlert(
          "Backup Database Berhasil Dibuat!",
          `File ${data.backup.filename} (${data.backup.formattedSize}) telah dibuat dan otomatis diunduh ke komputer Anda.`,
          2500
        );
      } else {
        showErrorAlert("Gagal Backup", data.message || "Terjadi kesalahan saat memproses backup.");
      }
    } catch (err) {
      console.error(err);
      showErrorAlert("Gagal Backup", "Tidak dapat terhubung ke server database.");
    } finally {
      setIsBackingUp(false);
    }
  };

  // Delete backup file with confirmation
  const handleDeleteBackup = async (filename: string) => {
    const isConfirmed = await showConfirmAlert(
      "Hapus File Backup?",
      `File "${filename}" akan dihapus permanen dari penyimpanan server. Tindakan ini tidak dapat dibatalkan.`
    );

    if (!isConfirmed) return;

    try {
      setDeletingFilename(filename);
      const res = await fetch(`/api/super-admin/backup?filename=${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        setBackups(data.backups || []);
        setStatus(data.status || null);
        showSuccessAlert("Terhapus", `File backup ${filename} berhasil dihapus.`);
      } else {
        showErrorAlert("Gagal Menghapus", data.message || "File tidak dapat dihapus.");
      }
    } catch (err) {
      console.error(err);
      showErrorAlert("Error", "Gagal memproses penghapusan file.");
    } finally {
      setDeletingFilename(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-purple-950/70 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sistem Proteksi & Cadangan Database</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Database className="w-6 h-6 text-indigo-400" />
              Database Backup & Auto-Schedule (Jam 00:00)
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              Cadangkan seluruh tabel database MySQL (`users`, `outlets`, `qr_cards`, `customer_feedbacks`, `site_settings`, dll) dalam format standar SQL dump yang siap di-restore kapan saja di Laragon / phpMyAdmin.
            </p>
          </div>

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => fetchBackups(false)}
              disabled={isLoading || isBackingUp}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-xs sm:text-sm border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              title="Refresh Daftar"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleCreateManualBackup}
              disabled={isBackingUp}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              {isBackingUp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sedang Membuat SQL Dump...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4" />
                  <span>⚡ Backup & Download Sekarang (.SQL)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Auto Backup Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Auto Schedule Status */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-400" />
              Auto-Backup Terjadwal
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              Aktif Setiap 00:00
            </span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            Pukul 00:00 <span className="text-xs text-slate-400 font-normal">(Tengah Malam)</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
            <span>Hitung mundur ke 00:00:</span>
            <span className="font-mono text-emerald-400 font-semibold">{timeUntilMidnight || "Menghitung..."}</span>
          </div>
        </div>

        {/* Card 2: Last Backup Info */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-400" />
              Backup Terakhir
            </span>
            <span className="text-xs text-slate-500">
              {status?.totalBackups || 0} file tersimpan
            </span>
          </div>
          <div className="text-lg font-bold text-slate-200 truncate">
            {status?.lastBackupDate
              ? new Date(status.lastBackupDate).toLocaleDateString("id-ID", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Belum ada backup"}
          </div>
          <div className="mt-2 text-xs text-slate-400 truncate">
            {status?.lastBackupFilename || "Klik tombol backup untuk membuat cadangan pertama"}
          </div>
        </div>

        {/* Card 3: Auto Browser Download Setting */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-purple-400" />
              Auto-Download Browser
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoBrowserDownload}
                onChange={(e) => setAutoBrowserDownload(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          <div className="text-sm font-semibold text-white">
            {autoBrowserDownload ? "Otomatis Unduh ke PC" : "Hanya Simpan di Server"}
          </div>
          <div className="mt-1.5 text-xs text-slate-400">
            {autoBrowserDownload
              ? "File .sql langsung otomatis diunduh saat backup malam selesai dibuat."
              : "File tersimpan di folder /backups/ server tanpa auto-download browser."}
          </div>
        </div>
      </div>

      {/* Backup History Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-indigo-400" />
              Riwayat File Cadangan Database (.SQL)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Disimpan di direktori server <code className="text-indigo-300 bg-slate-800/80 px-1.5 py-0.5 rounded">backups/</code> (rotasi otomatis 30 hari)
            </p>
          </div>

          <div className="text-xs text-slate-400">
            Total Arsip: <span className="font-semibold text-white">{backups.length} file</span>
          </div>
        </div>

        {isLoading && backups.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
            <p className="text-sm">Memeriksa arsip database...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-3 bg-slate-800/30 rounded-xl border border-dashed border-slate-700/60">
            <Database className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm font-medium text-slate-300">Belum Ada File Backup Database</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Klik tombol <strong>&quot;⚡ Backup & Download Sekarang&quot;</strong> di atas untuk membuat file backup database MySQL pertama Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px] tracking-wider bg-slate-800/40">
                  <th className="py-3 px-4 rounded-l-lg">Nama File SQL</th>
                  <th className="py-3 px-4">Waktu Pembuatan</th>
                  <th className="py-3 px-4">Ukuran File</th>
                  <th className="py-3 px-4">Tipe Backup</th>
                  <th className="py-3 px-4 text-right rounded-r-lg">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {backups.map((item) => (
                  <tr key={item.filename} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono text-slate-200 font-medium flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="truncate max-w-[260px] sm:max-w-xs md:max-w-md">{item.filename}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-400 whitespace-nowrap">
                      {item.formattedSize}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.isAutoMidnight ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Clock className="w-3 h-3" />
                          Auto 00:00 Malam
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <ShieldCheck className="w-3 h-3" />
                          Manual Super Admin
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => triggerBrowserDownload(item.filename)}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold border border-indigo-500/30 transition flex items-center gap-1.5 cursor-pointer"
                          title="Download File SQL"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh .SQL</span>
                        </button>

                        <button
                          onClick={() => handleDeleteBackup(item.filename)}
                          disabled={deletingFilename === item.filename}
                          className="p-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg border border-rose-500/20 transition cursor-pointer disabled:opacity-50"
                          title="Hapus File Backup"
                        >
                          {deletingFilename === item.filename ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Restore Instructions Box */}
        <div className="mt-6 p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-300 space-y-2">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Panduan Restore Database di Laragon / phpMyAdmin:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1 leading-relaxed">
            <li>Download file backup <code>.sql</code> yang diinginkan dari tabel di atas.</li>
            <li>Buka <strong>Laragon</strong> → klik <strong>Database</strong> (HeidiSQL) atau buka <code>http://localhost/phpmyadmin</code>.</li>
            <li>Pilih database <strong>saas_qr_review</strong> → klik tab <strong>Import</strong> / File → Load SQL file.</li>
            <li>Jalankan file SQL tersebut, database akan langsung kembali ke titik waktu backup tersebut secara utuh.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
