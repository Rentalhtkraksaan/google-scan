"use client";

import Image from "next/image";

interface GoogleReviewCardPreviewProps {
  qrDataUrl: string;
  cardCode?: string;
  version?: string;
  outletName?: string;
  className?: string;
}

export function GoogleReviewCardPreview({
  qrDataUrl,
  cardCode,
  version = "V 1.1.2",
  outletName,
  className = "",
}: GoogleReviewCardPreviewProps) {
  void outletName;
  return (
    <div
      className={`relative w-full max-w-[270px] sm:max-w-[295px] aspect-[54/86] rounded-[22px] overflow-hidden select-none bg-white border border-slate-300 shadow-xl ${className}`}
      style={{
        boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Master Template Image (Edge to edge) */}
      <div className="absolute inset-0 w-full h-full">
        <Image
          src="/images/template-id-card-portrait.jpg"
          alt="Template Kartu Google Review"
          fill
          className="object-fill"
          priority
        />
      </div>

      {/* Version Tag (V 1.1.2) Placed at Top Left Corner */}
      {version && (
        <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
          <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-700 bg-white/95 px-2 py-0.5 rounded-full border border-slate-300/90 shadow-xs">
            {version}
          </span>
        </div>
      )}

      {/* Card Code (c-003) Placed at Top Right Corner */}
      {cardCode && (
        <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none">
          <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-700 bg-white/95 px-2 py-0.5 rounded-full border border-slate-300/90 shadow-xs">
            {cardCode}
          </span>
        </div>
      )}

      {/* QR Code Positioned in the Middle Box with proper margin & centering */}
      <div className="absolute top-[50.0%] left-[26.0%] w-[44%] aspect-square flex items-center justify-center z-10">
        {qrDataUrl ? (
          <div className="relative w-full h-full p-1 bg-white rounded-lg">
            <Image
              src={qrDataUrl}
              alt={`QR Code ${cardCode || ""}`}
              fill
              unoptimized
              className="object-contain"
            />
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 font-medium">Memuat QR...</div>
        )}
      </div>
    </div>
  );
}
