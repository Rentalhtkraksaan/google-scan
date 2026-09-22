"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Star,
  Store,
  Sparkles,
  ExternalLink,
  RotateCcw,
  ShieldCheck,
  Loader2,
  PartyPopper,
  MessageCircle,
  CheckCircle2,
  User,
} from "lucide-react";

interface SmartReviewClientProps {
  cardCode: string;
  outlet: {
    id: string;
    name: string;
    googleReviewUrl: string;
    whatsappNumber?: string | null;
    ownerName?: string | null;
  };
}

const RATING_INFO: Record<
  number,
  { label: string; emoji: string; color: string; desc: string }
> = {
  1: {
    label: "Sangat Kecewa",
    emoji: "😞",
    color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
    desc: "Kami mohon maaf sebesar-besarnya. Anda akan langsung terhubung ke WhatsApp pengelola untuk menyampaikan keluhan.",
  },
  2: {
    label: "Kurang Puas",
    emoji: "🙁",
    color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    desc: "Kami mohon maaf atas ketidaknyamanan Anda. Masukan Anda akan langsung diteruskan ke WhatsApp pengelola.",
  },
  3: {
    label: "Cukup / Biasa Saja",
    emoji: "😐",
    color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    desc: "Bantu kami berbenah. Anda akan langsung terhubung ke WhatsApp pengelola outlet.",
  },
  4: {
    label: "Puas & Menyenangkan",
    emoji: "😊",
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    desc: "Terima kasih banyak! Apresiasi Anda sungguh berarti bagi kemajuan outlet kami.",
  },
  5: {
    label: "Sangat Puas & Luar Biasa!",
    emoji: "🤩",
    color: "text-amber-300 border-amber-400/40 bg-amber-400/10",
    desc: "Luar biasa! Terima kasih atas dukungan bintang 5 Anda untuk kemajuan outlet kami!",
  },
};

// Web Audio API Synthesizer Chime
function playCelebrationChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.07);
      osc.stop(ctx.currentTime + idx * 0.07 + 0.45);
    });
  } catch {
    // Ignore audio context limitations
  }
}

export function SmartReviewClient({ cardCode, outlet }: SmartReviewClientProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  // 4-5 Stars Pop-up Redirect Modal State
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1-3 Stars Feedback Form State
  const [customerName, setCustomerName] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeRating = hoverRating || selectedRating || 0;

  // Particle Confetti Burst
  const triggerConfetti = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#f59e0b", "#10b981", "#6366f1", "#ec4899", "#fbbf24", "#38bdf8"];
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      rotSpeed: number;
      alpha: number;
    }[] = [];

    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.45;

    for (let i = 0; i < 75; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 4;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        alpha: 1,
      });
    }

    let animationFrameId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.vx *= 0.98;
        p.rotation += p.rotSpeed;
        p.alpha -= 0.015;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });

      if (alive) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();
  }, []);

  // Countdown timer for 4-5 stars modal auto redirect
  useEffect(() => {
    if (!showRedirectModal) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }

    setCountdown(3);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          if (outlet.googleReviewUrl) {
            window.location.href = outlet.googleReviewUrl;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [showRedirectModal, outlet.googleReviewUrl]);

  const handleSelectRating = (rating: number) => {
    setSelectedRating(rating);

    if (rating >= 4) {
      // 4-5 Stars -> Rayakan dengan Confetti & Audio Chime, lalu Tampilkan Pop-Up Redirect
      playCelebrationChime();
      triggerConfetti();
      setShowRedirectModal(true);
      setSubmittedSuccess(false);
    } else {
      // 1-3 Stars -> Buka Form Kritik & Saran (tidak auto-redirect langsung, agar pengunjung bisa isi form)
      setShowRedirectModal(false);
      setSubmittedSuccess(false);
    }
  };

  const handleProceedGoogleReview = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (outlet.googleReviewUrl) {
      window.location.href = outlet.googleReviewUrl;
    }
  };

  const handleCancelRedirect = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setShowRedirectModal(false);
    setSelectedRating(null);
    setHoverRating(null);
  };

  const handleResetRating = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setSelectedRating(null);
    setHoverRating(null);
    setShowRedirectModal(false);
    setSubmittedSuccess(false);
  };

  // Submit Feedback 1-3 Stars -> Langsung Bawa Pesan ke WhatsApp Pengelola (Tanpa Simpan DB)
  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim() || !selectedRating) return;

    setIsSubmitting(true);
    try {
      // 1. Bersihkan nomor WhatsApp pengelola
      let cleanTargetPhone = (outlet.whatsappNumber || "").replace(/[^0-9]/g, "");
      if (cleanTargetPhone.startsWith("0")) {
        cleanTargetPhone = "62" + cleanTargetPhone.slice(1);
      }

      // 2. Format pesan WhatsApp sesuai format yang ditentukan:
      // halo (nama owner) pemilik dari outlet (nama outlet)
      // saya (nama yg di isi di form) pengunjung outlet anda dari meja (kode kartu)
      // saya memberikan bintang (bintang yg di isi di form)
      // dan ingin menyampaikan masukan langsung terkait: (isi pesan di form itu)
      const ownerSalutation = outlet.ownerName
        ? `halo ${outlet.ownerName} pemilik dari outlet ${outlet.name}`
        : `halo pemilik dari outlet ${outlet.name}`;
      const visitorName = customerName.trim();

      const waText =
`${ownerSalutation}
saya ${visitorName} pengunjung outlet anda dari meja ${cardCode}
saya memberikan bintang ${selectedRating} ${"⭐".repeat(selectedRating)}
dan ingin menyampaikan masukan langsung terkait:
${feedbackMessage.trim()}`;

      const waUrl = cleanTargetPhone
        ? `https://api.whatsapp.com/send?phone=${cleanTargetPhone}&text=${encodeURIComponent(waText)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;

      setSubmittedSuccess(true);

      // 3. Arahkan langsung ke WhatsApp dengan pesan otomatis terisi (instan tanpa database)
      setTimeout(() => {
        window.location.href = waUrl;
      }, 400);
    } catch (err) {
      console.error("Gagal membuka WhatsApp:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-amber-500/30">
      {/* Canvas Confetti Layer */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-50 w-full h-full"
      />

      {/* Dynamic Background Glow Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-b from-indigo-600/15 via-purple-600/10 to-transparent blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

      {/* POP-UP MODAL: PENGALIHAN KE GOOGLE REVIEW UNTUK BINTANG 4 & 5 */}
      {showRedirectModal && selectedRating && selectedRating >= 4 && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm sm:max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-amber-500/20 text-center overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Background Ambient Glow */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

            {/* Icon Header */}
            <div className="relative z-10 mb-4">
              <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-400/20 border border-amber-400/30 text-amber-400 shadow-lg shadow-amber-500/10 mb-3">
                <PartyPopper className="w-10 h-10 animate-bounce" />
              </div>
              <div className="flex items-center justify-center gap-1 text-amber-400 text-lg mb-1">
                {"⭐".repeat(selectedRating)}
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {selectedRating === 5 ? "Luar Biasa! Terima Kasih! 🤩" : "Terima Kasih Banyak! 😊"}
              </h3>
            </div>

            {/* Reassuring Explanation - "biar pelanggan ga terkecoh" */}
            <div className="relative z-10 bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-5 text-left">
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                Tunggu sebentar ya... Anda sedang dialihkan ke formulir ulasan resmi <strong className="text-amber-300">Google Review {outlet.name}</strong> untuk membagikan bintang 5 Anda kepada pelanggan lain.
              </p>

              {/* Countdown & Progress bar */}
              <div className="mt-3.5 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-mono">
                  <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    Membuka otomatis...
                  </span>
                  <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                    {countdown} detik
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${Math.max(0, Math.min(100, ((4 - countdown) / 3) * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="relative z-10 space-y-2.5">
              <button
                type="button"
                onClick={handleProceedGoogleReview}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>Buka Google Review Sekarang</span>
                <ExternalLink className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleCancelRedirect}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer py-1"
              >
                Ganti Penilaian Bintang
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="w-full max-w-md relative z-10 my-auto">
        {/* OUTLET BRANDING */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl shadow-black/40 mb-3 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 to-indigo-500/30 rounded-2xl blur-sm opacity-70 group-hover:opacity-100 transition-opacity" />
            <Store className="w-8 h-8 text-amber-400 relative z-10" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white px-2">
            {outlet.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Ulasan Resmi Pengunjung
          </p>
        </div>

        {/* MAIN INTERACTIVE CARD */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/60 relative overflow-hidden transition-all duration-300">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-base sm:text-lg font-bold text-white mb-1">
              Bagaimana Pengalaman Anda?
            </h2>
            <p className="text-xs text-slate-400">
              Sentuh bintang untuk memberikan penilaian atas layanan kami
            </p>
          </div>

          {/* 5 STARS SELECTION */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 sm:gap-3 py-3">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = activeRating >= star;
                const isGold = (activeRating >= 4 && isFilled) || (star >= 4 && isFilled);

                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => !selectedRating && setHoverRating(star)}
                    onMouseLeave={() => !selectedRating && setHoverRating(null)}
                    onClick={() => handleSelectRating(star)}
                    className="p-1 sm:p-1.5 focus:outline-none transition-all duration-200 hover:scale-125 active:scale-95 cursor-pointer touch-manipulation"
                    aria-label={`Beri ${star} Bintang`}
                  >
                    <Star
                      className={`w-10 h-10 sm:w-11 sm:h-11 transition-all duration-200 drop-shadow-md ${
                        isFilled
                          ? isGold
                            ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                            : "fill-yellow-400 text-yellow-400"
                          : "fill-slate-800 text-slate-700 hover:text-slate-500"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Dynamic Emoji & Label Indicator */}
            <div className="h-12 flex flex-col items-center justify-center text-center">
              {activeRating > 0 ? (
                <div className="animate-in fade-in zoom-in-90 duration-150">
                  <div className="flex items-center justify-center gap-2 text-sm sm:text-base font-bold">
                    <span className="text-xl">{RATING_INFO[activeRating].emoji}</span>
                    <span className={RATING_INFO[activeRating].color.split(" ")[0]}>
                      {RATING_INFO[activeRating].label}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Nilai: {activeRating} dari 5 Bintang
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Ketuk salah satu bintang di atas
                </p>
              )}
            </div>
          </div>

          {/* FLOW 1: 4 - 5 STARS (TAMPILKAN TOMBOL MANUAL JIKA MODAL DITUTUP) */}
          {selectedRating && selectedRating >= 4 && !showRedirectModal && (
            <div className="space-y-4 text-center animate-in fade-in slide-in-from-bottom-3 duration-300 pt-2 border-t border-slate-800/80">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs sm:text-sm leading-relaxed">
                <div className="flex items-center justify-center gap-1.5 font-bold text-amber-300 text-sm sm:text-base mb-1">
                  <PartyPopper className="w-5 h-5 text-amber-400 animate-bounce" /> Terima Kasih Banyak!
                </div>
                {RATING_INFO[selectedRating].desc}
              </div>

              <button
                type="button"
                onClick={() => setShowRedirectModal(true)}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>Buka Google Review Sekarang</span>
                <ExternalLink className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleResetRating}
                className="text-[11px] text-slate-500 hover:text-slate-300 underline font-medium cursor-pointer"
              >
                Ganti Penilaian Bintang
              </button>
            </div>
          )}

          {/* FLOW 2: 1 - 3 STARS -> FORM KRITIK & SARAN KE WHATSAPP PENGELOLA */}
          {selectedRating && selectedRating <= 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300 pt-3 border-t border-slate-800/80 text-left">
              {/* Apology Banner */}
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-rose-300 text-sm mb-1">
                  <span className="text-xl">{RATING_INFO[selectedRating].emoji}</span>
                  <span>Kami Siap Mendengar Masukan Anda</span>
                </div>
                <p className="text-slate-300 text-xs">
                  Kepuasan Anda adalah prioritas kami. Sampaikan kritik, kendala, atau saran perbaikan di bawah ini agar langsung kami tindaklanjuti via WhatsApp Pengelola.
                </p>
              </div>

              {submittedSuccess ? (
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2.5 animate-in zoom-in-95">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
                  <h4 className="font-bold text-white text-base">Membuka Chat WhatsApp...</h4>
                  <p className="text-xs text-slate-300">
                    Pesan masukan Anda sedang diteruskan langsung ke WhatsApp Pengelola {outlet.name}.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleResetRating}
                      className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Beri Penilaian Lain
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitFeedback} className="space-y-3.5">
                  {/* Nama Pengunjung */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nama Anda <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Contoh: Budi"
                        maxLength={100}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Pesan Masukan / Keluhan (Wajib) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Kritik, Kendala, atau Masukan Terkait Layanan <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Tuliskan kendala atau masukan yang ingin Anda sampaikan..."
                      className="w-full p-3 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Submit Button to WA */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !feedbackMessage.trim() || !customerName.trim()}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyiapkan WhatsApp...</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4 fill-white/20" />
                        <span>Kirim Masukan ke WhatsApp Pengelola 📲</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={handleResetRating}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Ubah Penilaian Bintang</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-[10px] text-slate-500 font-medium tracking-wide">
            Powered by <span className="text-slate-300 font-semibold">Smart QR Review Experience</span>
          </p>
          <p className="text-[9.5px] text-slate-600">
            © Smart QR Review • Hak Cipta Dilindungi (HAKI). Dilarang menggandakan atau meniru desain ini.
          </p>
        </div>
      </main>
    </div>
  );
}
