"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  Copy,
  Check,
  Store,
  Phone,
  Clock,
  Sparkles,
  ArrowLeft,
  BookmarkCheck,
  CheckCircle2,
  Trash2,
  History,
  QrCode,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";

interface SavedTarget {
  id: string;
  outletName: string;
  whatsappNumber: string;
  savedAt: string;
}

export default function TemplateChatPage() {
  // Input States
  const [outletName, setOutletName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [savedTarget, setSavedTarget] = useState<{ outletName: string; whatsappNumber: string } | null>(null);
  const [historyList, setHistoryList] = useState<SavedTarget[]>([]);

  // Time-based greeting state
  const [detectedGreeting, setDetectedGreeting] = useState<"pagi" | "siang" | "sore" | "malam">("pagi");
  const [customGreeting, setCustomGreeting] = useState<"pagi" | "siang" | "sore" | "malam" | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  // Copy status indicators
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1. Deteksi Jam Device Lokal Secara Real-Time
  useEffect(() => {
    const updateGreeting = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const formattedTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      setCurrentTimeStr(formattedTime);

      if (hour >= 4 && hour < 11) {
        setDetectedGreeting("pagi");
      } else if (hour >= 11 && hour < 15) {
        setDetectedGreeting("siang");
      } else if (hour >= 15 && hour < 18) {
        setDetectedGreeting("sore");
      } else {
        setDetectedGreeting("malam");
      }
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  // 2. Load LocalStorage Data
  useEffect(() => {
    try {
      const storedActive = localStorage.getItem("templatechat_active_target");
      if (storedActive) {
        const parsed = JSON.parse(storedActive);
        setSavedTarget(parsed);
        setOutletName(parsed.outletName || "");
        setWhatsappNumber(parsed.whatsappNumber || "");
      }

      const storedHistory = localStorage.getItem("templatechat_history");
      if (storedHistory) {
        setHistoryList(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.warn("Error reading localStorage:", e);
    }
  }, []);

  // Active greeting (manual override or auto detected)
  const activeGreeting = customGreeting || detectedGreeting;

  // Format Nomor WhatsApp ke Standar Internasional (628xxx)
  const cleanWaNumber = useMemo(() => {
    const targetWa = savedTarget?.whatsappNumber || whatsappNumber;
    let clean = targetWa.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.slice(1);
    } else if (clean.startsWith("8")) {
      clean = "62" + clean;
    }
    return clean;
  }, [savedTarget, whatsappNumber]);

  const activeOutletName = savedTarget?.outletName || outletName || "[Nama Outlet]";

  // ─── Teks Template Sesuai Permintaan User ──────────────────────────────────
  const templates = useMemo(() => {
    return [
      {
        id: "template_1",
        label: "Template 1 (Sapaan Pembuka)",
        badge: `Waktu Device: ${activeGreeting.toUpperCase()}`,
        badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        text: `halo,selamat ${activeGreeting} kak`,
        desc: "Sapaan ramah pembuka obrolan menyesuaikan jam perangkat Anda saat ini.",
      },
      {
        id: "template_2",
        label: "Template 2 (Tanya Penggunaan Review Card)",
        badge: "Follow Up Outlet",
        badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/20",
        text: `mau tanya apakah outlet "${activeOutletName}" sudah memakai google review card ya kak?`,
        desc: "Menanyakan langsung apakah outlet target sudah menggunakan kartu ulasan Google.",
      },
      {
        id: "template_3_sudah",
        label: "Template 3 (Jika Prospek Menjawab SUDAH)",
        badge: "Respon: Sudah Pakai",
        badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        text: "baik kak jika butuh lagi bisa berkabar ya kak",
        desc: "Jawaban sopan untuk menjaga relasi jika prospek sudah memiliki kartu.",
      },
      {
        id: "template_3_belum",
        label: "Template 3 (Jika Prospek Menjawab BELUM)",
        badge: "Respon: Belum Pakai (Edukasi & Closing)",
        badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        text: "kebetulan kita lgi buat google review card ini bertujuan membantu bisnis owner mendapat bintang 5 secara simple tap/scan buka rating pilih bintng kirim slesai",
        desc: "Penjelasan manfaat utama kartu ulasan Google untuk meningkatkan rating bintang 5.",
      },
      {
        id: "template_combo",
        label: "Template Gabungan (Sapaan + Pertanyaan Langsung)",
        badge: "Kirim Cepat 1x Klik",
        badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        text: `halo,selamat ${activeGreeting} kak\n\nmau tanya apakah outlet "${activeOutletName}" sudah memakai google review card ya kak?`,
        desc: "Menggabungkan sapaan jam dan pertanyaan nama outlet dalam 1 pesan WhatsApp.",
      },
    ];
  }, [activeGreeting, activeOutletName]);

  // Handle Simpan Data Target
  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = outletName.trim();
    const cleanWa = whatsappNumber.trim();

    if (!cleanName) {
      showErrorAlert("Nama Outlet Kosong", "Silakan masukkan nama outlet terlebih dahulu.");
      return;
    }

    if (!cleanWa) {
      showErrorAlert("Nomor WA Kosong", "Silakan masukkan nomor WhatsApp outlet terlebih dahulu.");
      return;
    }

    const newTarget = {
      outletName: cleanName,
      whatsappNumber: cleanWa,
    };

    setSavedTarget(newTarget);
    localStorage.setItem("templatechat_active_target", JSON.stringify(newTarget));

    // Update History List (maks 8 target)
    const newHistoryItem: SavedTarget = {
      id: Date.now().toString(),
      outletName: cleanName,
      whatsappNumber: cleanWa,
      savedAt: new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updatedHistory = [
      newHistoryItem,
      ...historyList.filter((item) => item.whatsappNumber !== cleanWa && item.outletName !== cleanName),
    ].slice(0, 8);

    setHistoryList(updatedHistory);
    localStorage.setItem("templatechat_history", JSON.stringify(updatedHistory));

    showSuccessAlert("Data Tersimpan!", `Template chat otomatis disesuaikan untuk "${cleanName}".`);
  };

  // Pilih dari History
  const handleSelectHistory = (item: SavedTarget) => {
    setOutletName(item.outletName);
    setWhatsappNumber(item.whatsappNumber);
    setSavedTarget({
      outletName: item.outletName,
      whatsappNumber: item.whatsappNumber,
    });
    localStorage.setItem(
      "templatechat_active_target",
      JSON.stringify({ outletName: item.outletName, whatsappNumber: item.whatsappNumber })
    );
    showSuccessAlert("Target Diaktifkan", `Outlet "${item.outletName}" siap dihubungi.`);
  };

  // Hapus dari History
  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = historyList.filter((item) => item.id !== id);
    setHistoryList(updated);
    localStorage.setItem("templatechat_history", JSON.stringify(updated));
  };

  // Salin Pesan ke Clipboard
  const handleCopy = (text: string, key: string) => {
    if (!savedTarget && (!outletName || !whatsappNumber)) {
      showErrorAlert("Simpan Data Terlebih Dahulu", "Masukkan nama outlet dan nomor WA lalu klik Simpan.");
      return;
    }

    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
    showSuccessAlert("Teks Disalin!", "Pesan siap di-paste di WhatsApp.", 800);
  };

  // Buka Langsung ke WhatsApp
  const handleOpenWhatsApp = (text: string) => {
    if (!cleanWaNumber || cleanWaNumber.length < 8) {
      showErrorAlert("Nomor WA Tidak Valid", "Harap masukkan nomor WhatsApp tujuan yang valid terlebih dahulu.");
      return;
    }

    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/${cleanWaNumber}?text=${encoded}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 relative overflow-x-hidden pb-20">
      {/* Background Glowing Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-emerald-600/15 via-sky-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-600/10 blur-3xl pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Template Chat WhatsApp</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Smart Sales
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">
                  Generator pesan prospek otomatis & sapaan real-time sesuai jam device
                </p>
              </div>
            </div>
          </div>

          {/* Jam Device Live Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/70 border border-slate-700/60 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Waktu Device:</span>
            <strong className="text-white font-mono">{currentTimeStr || "--:--"}</strong>
            <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold">
              {detectedGreeting}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ─── KOLOM KIRI: INPUT TARGET & HISTORY (4/12) ─── */}
          <div className="lg:col-span-5 space-y-5">
            {/* Form Input Target */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-white">Data Outlet Target</h2>
                </div>
                {savedTarget && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Aktif Digunakan
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveTarget} className="space-y-4">
                {/* 1. Nama Outlet */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nama Outlet / Bisnis <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={outletName}
                      onChange={(e) => setOutletName(e.target.value)}
                      placeholder="Contoh: Kopi Kenangan / Salon Cantik"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Otomatis disisipkan ke Template 2 untuk menanyakan outlet.
                  </p>
                </div>

                {/* 2. Nomor WhatsApp */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nomor WhatsApp Tujuan <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="Contoh: 08123456789 atau 628123456789"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                    />
                  </div>
                  {cleanWaNumber && (
                    <p className="text-[10px] text-emerald-400 mt-1 font-mono">
                      Format WA: +{cleanWaNumber}
                    </p>
                  )}
                </div>

                {/* Tombol Simpan */}
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>Simpan & Terapkan ke Template</span>
                </button>
              </form>

              {/* Status Ringkasan Aktif */}
              {savedTarget && (
                <div className="mt-4 p-3 bg-slate-950/90 border border-emerald-500/30 rounded-xl">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 mb-1">
                    🎯 Target Tersimpan:
                  </p>
                  <div className="text-xs text-slate-200">
                    <div className="font-semibold text-white">{savedTarget.outletName}</div>
                    <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                      WA: {savedTarget.whatsappNumber}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Selector Sapaan Waktu (Bisa Manual Ganti) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Pilihan Sapaan Waktu
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400">
                  Otomatis jam {currentTimeStr || "--:--"}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {(["pagi", "siang", "sore", "malam"] as const).map((period) => {
                  const isCurrent = activeGreeting === period;
                  const isAuto = detectedGreeting === period;
                  return (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setCustomGreeting(period === detectedGreeting ? null : period)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer text-center relative ${
                        isCurrent
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25 border border-emerald-400/40"
                          : "bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800"
                      }`}
                    >
                      <span>{period}</span>
                      {isAuto && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                * Secara default mengikuti jam di device Anda saat ini ({detectedGreeting}). Klik tombol di atas jika ingin mengganti secara manual.
              </p>
            </div>

            {/* Riwayat Target Terakhir (History) */}
            {historyList.length > 0 && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-sky-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Riwayat Target Disimpan
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-500">{historyList.length} outlet</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {historyList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectHistory(item)}
                      className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800/80 hover:border-emerald-500/40 cursor-pointer transition-all"
                    >
                      <div className="overflow-hidden">
                        <p className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 truncate">
                          {item.outletName}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {item.whatsappNumber} &bull; {item.savedAt}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteHistory(item.id, e)}
                        className="p-1 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Hapus riwayat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── KOLOM KANAN: TEMPLATE CHAT CARDS (7/12) ─── */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>Daftar Template Pesan Siap Kirim</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Klik <strong>Kirim ke WA</strong> untuk langsung membuka obrolan atau <strong>Salin</strong> teks.
                </p>
              </div>

              {cleanWaNumber && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Tujuan:</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    +{cleanWaNumber}
                  </span>
                </div>
              )}
            </div>

            {/* List Templates */}
            <div className="space-y-4">
              {templates.map((tpl, index) => {
                const isCopied = copiedKey === tpl.id;
                const isCombo = tpl.id === "template_combo";

                return (
                  <div
                    key={tpl.id}
                    className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                      isCombo
                        ? "bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 border-indigo-500/40 shadow-xl shadow-indigo-950/20"
                        : "bg-slate-900/80 border-slate-800/90 hover:border-slate-700 shadow-lg"
                    }`}
                  >
                    {/* Top Card: Label & Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] flex items-center justify-center border border-slate-700">
                          {index + 1}
                        </span>
                        <h3 className="text-xs font-bold text-white">{tpl.label}</h3>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tpl.badgeColor}`}
                      >
                        {tpl.badge}
                      </span>
                    </div>

                    {/* Chat Bubble Simulation */}
                    <div className="relative mb-3.5">
                      <div className="p-3.5 sm:p-4 rounded-2xl rounded-tl-sm bg-[#0b141a] border border-[#1f2c34] text-slate-100 text-sm font-sans leading-relaxed whitespace-pre-wrap select-all shadow-inner">
                        {tpl.text}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-slate-400 mb-3.5">{tpl.desc}</p>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/80">
                      {/* Tombol Salin */}
                      <button
                        type="button"
                        onClick={() => handleCopy(tpl.text, tpl.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/60 transition-colors cursor-pointer active:scale-95"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Teks</span>
                          </>
                        )}
                      </button>

                      {/* Tombol Kirim WhatsApp Langsung */}
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp(tpl.text)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim ke WhatsApp</span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
