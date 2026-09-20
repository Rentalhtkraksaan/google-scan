"use client";

import React, { useState, useRef, useCallback } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  Sparkles,
  Download,
  Star,
  Wifi,
  ExternalLink,
  Store,
  Layers,
} from "lucide-react";
import { showSuccessAlert } from "@/lib/swal";

interface Interactive3DCardProps {
  cardCode: string;
  outletName: string;
  scanUrl: string;
  scanCount?: number;
}

export function Interactive3DCard({
  cardCode,
  outletName,
  scanUrl,
  scanCount = 0,
}: Interactive3DCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });
  const [isDownloading, setIsDownloading] = useState(false);

  // Mouse & Touch 3D Tilt calculation
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = -((y - centerY) / centerY) * 16;
    const rotY = ((x - centerX) / centerX) * 16;

    setRotateX(rotX);
    setRotateY(rotY);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.25,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  };

  // Generate HD Social Media Mockup PNG (1080 x 1080)
  const handleDownloadMockup = useCallback(async () => {
    setIsDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Background gradient (Rich Dark Theme)
      const bgGrad = ctx.createRadialGradient(540, 540, 100, 540, 540, 750);
      bgGrad.addColorStop(0, "#0f172a");
      bgGrad.addColorStop(0.6, "#090d16");
      bgGrad.addColorStop(1, "#030712");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1080);

      // Ambient glows
      const glow1 = ctx.createRadialGradient(250, 300, 10, 250, 300, 450);
      glow1.addColorStop(0, "rgba(99, 102, 241, 0.2)");
      glow1.addColorStop(1, "transparent");
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, 1080, 1080);

      const glow2 = ctx.createRadialGradient(850, 750, 10, 850, 750, 450);
      glow2.addColorStop(0, "rgba(16, 185, 129, 0.2)");
      glow2.addColorStop(1, "transparent");
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, 1080, 1080);

      // Header Tagline
      ctx.textAlign = "center";
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 26px Inter, sans-serif";
      ctx.letterSpacing = "3px";
      ctx.fillText("SMART GOOGLE REVIEW CARD", 540, 140);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 48px Inter, sans-serif";
      ctx.fillText(outletName, 540, 210);

      // 2. Draw Physical Card Body (Rounded Box: 760 x 480)
      const cardX = 160;
      const cardY = 300;
      const cardW = 760;
      const cardH = 480;
      const cardRadius = 36;

      // Shadow
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.shadowBlur = 60;
      ctx.shadowOffsetY = 30;

      // Card Background Gradient (Matte Luxury Black with Emerald Sheen)
      const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
      cardGrad.addColorStop(0, "#1e293b");
      cardGrad.addColorStop(0.5, "#0f172a");
      cardGrad.addColorStop(1, "#090d16");

      ctx.fillStyle = cardGrad;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
      ctx.fill();
      ctx.restore();

      // Card Border Stroke
      ctx.save();
      ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
      ctx.stroke();
      ctx.restore();

      // Card Branding
      ctx.textAlign = "left";
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 22px Inter, sans-serif";
      ctx.fillText("GOOGLE REVIEW NFC & QR", cardX + 50, cardY + 70);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 34px Inter, sans-serif";
      ctx.fillText(outletName, cardX + 50, cardY + 120);

      ctx.fillStyle = "#fbbf24";
      ctx.font = "24px Inter, sans-serif";
      ctx.fillText("⭐⭐⭐⭐⭐  Ulasan Bintang 5", cardX + 50, cardY + 165);

      // Card Chip / Contactless Indicator
      ctx.fillStyle = "#64748b";
      ctx.font = "18px monospace";
      ctx.fillText(`KODE KARTU: ${cardCode.toUpperCase()}`, cardX + 50, cardY + 410);

      ctx.fillStyle = "#10b981";
      ctx.font = "bold 16px Inter, sans-serif";
      ctx.fillText("TAP NFC / SCAN QR DISINI", cardX + 50, cardY + 435);

      // Draw QR Code
      const qrDataUrl = await QRCode.toDataURL(scanUrl, {
        width: 280,
        margin: 1,
        color: {
          dark: "#090d16",
          light: "#ffffff",
        },
      });

      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise((resolve) => {
        qrImg.onload = resolve;
      });

      // QR White Container
      const qrBoxX = cardX + cardW - 320;
      const qrBoxY = cardY + 85;
      const qrBoxSize = 270;

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
      ctx.fill();

      ctx.drawImage(qrImg, qrBoxX + 15, qrBoxY + 15, qrBoxSize - 30, qrBoxSize - 30);

      // Footer Banner
      ctx.textAlign = "center";
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 20px Inter, sans-serif";
      ctx.fillText("DEKATKAN HP ANDA ATAU BUKA KAMERA UNTUK MEMBERIKAN ULASAN", 540, 870);

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 22px monospace";
      ctx.fillText(scanUrl, 540, 915);

      // Download Trigger
      const downloadUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `mockup-kartu-${cardCode}-${outletName.toLowerCase().replace(/\s+/g, "-")}.png`;
      a.click();

      showSuccessAlert(
        "Mockup Kartu Terunduh!",
        "Gambar kartu fisik resolusi tinggi siap diposting di WhatsApp Status atau Instagram Story Anda! 🎉",
        2500
      );
    } catch (err) {
      console.error("Gagal membuat mockup:", err);
    } finally {
      setIsDownloading(false);
    }
  }, [cardCode, outletName, scanUrl]);

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* 3D Interactive Card Container */}
      <div
        className="w-full max-w-sm sm:max-w-md py-4"
        style={{ perspective: "1000px" }}
      >
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative w-full aspect-[1.586/1] rounded-3xl p-6 sm:p-7 shadow-2xl transition-transform duration-150 ease-out cursor-grab active:cursor-grabbing overflow-hidden border border-slate-700/80 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/70"
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Dynamic Glare Reflection */}
          <div
            className="absolute inset-0 pointer-events-none rounded-3xl transition-opacity duration-150"
            style={{
              background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, ${glarePos.opacity}), transparent 60%)`,
            }}
          />

          {/* Ambient Lighting Accents */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Content Layer */}
          <div className="relative z-10 h-full flex flex-col justify-between">
            {/* Top Row: Brand & Wireless Icon */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/30">
                  <Star className="w-4 h-4 fill-slate-950" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                    Google Review Card
                  </span>
                  <span className="text-xs font-black text-white tracking-tight">
                    Smart NFC & QR
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-slate-400">
                <Wifi className="w-5 h-5 rotate-90 text-sky-400" />
              </div>
            </div>

            {/* Middle Row: Outlet Name & Rating Visual */}
            <div className="my-auto py-2">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight line-clamp-1">
                {outletName}
              </h3>
              <div className="flex items-center gap-1 text-amber-400 text-xs mt-1 font-bold">
                <span>⭐⭐⭐⭐⭐</span>
                <span className="text-[11px] text-slate-300 font-medium ml-1">
                  (5.0 Bintang)
                </span>
              </div>
            </div>

            {/* Bottom Row: Card Code & Scan Counter */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-bold">
                  Kode Fisik Kartu
                </span>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {cardCode}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-bold">
                  Total Scan
                </span>
                <span className="text-xs font-bold text-sky-400">
                  {scanCount} kali
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Arahkan kursor atau gerakkan jari untuk melihat efek 3D & pantulan cahaya kartu fisik</span>
      </p>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 mt-4 w-full max-w-sm sm:max-w-md">
        <button
          type="button"
          onClick={handleDownloadMockup}
          disabled={isDownloading}
          className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/25 cursor-pointer disabled:opacity-50 active:scale-95"
          title="Unduh gambar kartu beresolusi tinggi untuk posting status WhatsApp atau Instagram"
        >
          <Download className="w-4 h-4" />
          <span>{isDownloading ? "Memproses Mockup..." : "Unduh Mockup Story HD"}</span>
        </button>

        <a
          href={scanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
          title="Buka Halaman Ulasan Pintar"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Uji Scan</span>
        </a>
      </div>
    </div>
  );
}
