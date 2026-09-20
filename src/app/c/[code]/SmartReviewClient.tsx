"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Star,
  Store,
  Sparkles,
  MessageSquareHeart,
  ExternalLink,
  RotateCcw,
  ShieldCheck,
  Loader2,
  PartyPopper,
} from "lucide-react";

interface SmartReviewClientProps {
  cardCode: string;
  outlet: {
    id: string;
    name: string;
    googleReviewUrl: string;
    whatsappNumber?: string | null;
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
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [targetUrl, setTargetUrl] = useState<string>("");
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

  const handleSelectRating = (rating: number) => {
    setSelectedRating(rating);
    setIsRedirecting(true);

    if (rating >= 4) {
      // 4-5 Stars -> Selebrasi Confetti & Suara Chime -> Auto Redirect ke Google Review
      playCelebrationChime();
      triggerConfetti();

      const reviewUrl = outlet.googleReviewUrl || "#";
      setTargetUrl(reviewUrl);
      setTimeout(() => {
        if (outlet.googleReviewUrl) {
          window.location.href = outlet.googleReviewUrl;
        }
      }, 550);
    } else {
      // 1-3 Stars -> Langsung Auto Redirect ke WhatsApp Pengelola
      let cleanTargetPhone = (outlet.whatsappNumber || "").replace(/[^0-9]/g, "");
      if (cleanTargetPhone.startsWith("0")) {
        cleanTargetPhone = "62" + cleanTargetPhone.slice(1);
      }

      const starsText = "⭐".repeat(rating);
      const waText =
        `Halo Pengelola *${outlet.name}*,\n\n` +
        `Saya pengunjung outlet Anda (Kode Meja/Kartu: *${cardCode}*).\n` +
        `Saya memberikan penilaian ${starsText} (${rating}/5) dan ingin menyampaikan masukan langsung terkait layanan:\n\n` +
        `[Tulis keluhan / masukan Anda di sini...]`;

      const waUrl = cleanTargetPhone
        ? `https://api.whatsapp.com/send?phone=${cleanTargetPhone}&text=${encodeURIComponent(waText)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;

      setTargetUrl(waUrl);
      setTimeout(() => {
        window.location.href = waUrl;
      }, 350);
    }
  };

  const handleResetRating = () => {
    setSelectedRating(null);
    setHoverRating(null);
    setIsRedirecting(false);
    setTargetUrl("");
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

          {/* FLOW 1: 4 - 5 STARS (LANGSUNG REDIRECT KE GOOGLE REVIEW) */}
          {selectedRating && selectedRating >= 4 && (
            <div className="space-y-4 text-center animate-in fade-in slide-in-from-bottom-3 duration-300 pt-2 border-t border-slate-800/80">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs sm:text-sm leading-relaxed">
                <div className="flex items-center justify-center gap-1.5 font-bold text-amber-300 text-sm sm:text-base mb-1">
                  <PartyPopper className="w-5 h-5 text-amber-400 animate-bounce" /> Terima Kasih Banyak!
                </div>
                {RATING_INFO[selectedRating].desc}
              </div>

              {isRedirecting && (
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-300 py-1">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  Membuka formulir ulasan Google Review resmi...
                </div>
              )}

              <a
                href={targetUrl || outlet.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Buka Google Review Sekarang</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={handleResetRating}
                className="text-[11px] text-slate-500 hover:text-slate-300 underline font-medium cursor-pointer"
              >
                Ganti Penilaian
              </button>
            </div>
          )}

          {/* FLOW 2: 1 - 3 STARS (LANGSUNG REDIRECT KE WHATSAPP PENGELOLA) */}
          {selectedRating && selectedRating <= 3 && (
            <div className="space-y-4 text-center animate-in fade-in slide-in-from-bottom-3 duration-300 pt-2 border-t border-slate-800/80">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs sm:text-sm leading-relaxed">
                <div className="flex items-center justify-center gap-1.5 font-bold text-emerald-300 text-sm sm:text-base mb-1">
                  <MessageSquareHeart className="w-4 h-4 text-emerald-400" /> Kami Siap Mendengar
                </div>
                {RATING_INFO[selectedRating].desc}
              </div>

              {isRedirecting && (
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-300 py-1">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  Menghubungkan langsung ke WhatsApp Pengelola...
                </div>
              )}

              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <MessageSquareHeart className="w-5 h-5" />
                <span>Buka Chat WhatsApp Pengelola Sekarang</span>
              </a>

              <div>
                <button
                  type="button"
                  onClick={handleResetRating}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Ubah Penilaian Bintang</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="text-center mt-6">
          <p className="text-[10px] text-slate-600 font-medium tracking-wide">
            Powered by <span className="text-slate-400 font-semibold">Smart QR Review Experience</span>
          </p>
        </div>
      </main>
    </div>
  );
}
