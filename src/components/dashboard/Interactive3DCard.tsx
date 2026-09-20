"use client";

import React, { useState, useRef } from "react";
import {
  Sparkles,
  Star,
  Wifi,
} from "lucide-react";

interface Interactive3DCardProps {
  cardCode: string;
  outletName: string;
  scanUrl?: string;
  scanCount?: number;
}

export function Interactive3DCard({
  cardCode,
  outletName,
  scanCount = 0,
}: Interactive3DCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

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

  return (
    <div className="flex flex-col items-center select-none">
      {/* 3D Perspective Card Container */}
      <div
        className="w-full max-w-sm sm:max-w-md aspect-[1.586/1] cursor-pointer"
        style={{ perspective: "1000px" }}
      >
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative w-full h-full rounded-2xl p-4 sm:p-5 transition-transform duration-150 ease-out shadow-2xl border border-amber-500/30 overflow-hidden"
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
            transformStyle: "preserve-3d",
            background: "linear-gradient(135deg, #090d16 0%, #111827 50%, #030712 100%)",
            boxShadow:
              "0 20px 35px -10px rgba(0,0,0,0.8), 0 0 20px -5px rgba(245, 158, 11, 0.15)",
          }}
        >
          {/* Gold Trim Corner Accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-sky-500/10 via-transparent to-transparent pointer-events-none" />

          {/* Dynamic Glare / Specular Lighting */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-200"
            style={{
              background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,${glarePos.opacity}) 0%, transparent 60%)`,
            }}
          />

          {/* Card Inner Content */}
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

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Arahkan kursor atau gerakkan jari untuk melihat efek 3D & pantulan cahaya kartu fisik</span>
      </p>
    </div>
  );
}
