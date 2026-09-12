"use client";

import { useState, useEffect, useRef } from "react";
import { Store, Search, MapPin, CheckCircle2, Loader2, Sparkles, ExternalLink, ClipboardCheck, Map } from "lucide-react";
import { searchPlacesAction, resolveReviewUrlAction, PlaceSearchResult } from "@/lib/actions/places.actions";
import { formatGoogleReviewUrl } from "@/lib/google-url";

interface GooglePlaceSearchInputProps {
  outletName: string;
  setOutletName: (name: string) => void;
  reviewUrl: string;
  setReviewUrl: (url: string) => void;
}

export function GooglePlaceSearchInput({
  outletName,
  setOutletName,
  reviewUrl,
  setReviewUrl,
}: GooglePlaceSearchInputProps) {
  const [query, setQuery] = useState(outletName);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isReviewConverted, setIsReviewConverted] = useState(
    reviewUrl.includes("maps") || reviewUrl.includes("g.page") || reviewUrl.includes("writereview") || reviewUrl.includes("placeid")
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external name changes
  useEffect(() => {
    setQuery(outletName);
  }, [outletName]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search for place names
  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchPlacesAction(query);
        if (res.success && res.data.length > 0) {
          setSuggestions(res.data);
          setShowDropdown(true);
        } else {
          setSuggestions([]);
          setShowDropdown(false);
        }
      } catch (err) {
        console.error("Place search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectPlace = (place: PlaceSearchResult) => {
    setOutletName(place.name);
    setQuery(place.name);
    setSelectedAddress(place.address || "");
    const converted = formatGoogleReviewUrl(place.reviewUrl);
    setReviewUrl(converted);
    setIsReviewConverted(true);
    setShowDropdown(false);
  };

  const handleManualSearchClick = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await searchPlacesAction(query);
      if (res.success && res.data.length > 0) {
        setSuggestions(res.data);
        setShowDropdown(true);
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Real-time URL handler for manual paste / input with auto-resolution
  const handleReviewUrlChange = async (rawUrl: string) => {
    const formatted = formatGoogleReviewUrl(rawUrl);
    setReviewUrl(formatted);
    setIsReviewConverted(
      formatted.includes("maps") || formatted.includes("g.page") || formatted.includes("writereview") || formatted.includes("placeid")
    );

    // Auto-extract store name if outlet name is currently empty
    if (!outletName || !outletName.trim()) {
      const placeNameMatch = rawUrl.match(/\/place\/([^/@?]+)/);
      if (placeNameMatch && placeNameMatch[1]) {
        const decodedName = decodeURIComponent(placeNameMatch[1].replace(/\+/g, " "));
        setOutletName(decodedName);
        setQuery(decodedName);
      }
    }

    // If it's a shortened URL or generic link that needs background expansion
    if (rawUrl && (rawUrl.includes("goo.gl") || rawUrl.includes("maps.app") || rawUrl.includes("g.page"))) {
      setIsResolvingUrl(true);
      try {
        const res = await resolveReviewUrlAction(rawUrl);
        if (res.success && res.url) {
          setReviewUrl(res.url);
          setIsReviewConverted(true);
        }
      } catch (e) {
        console.error("Resolve review url error:", e);
      } finally {
        setIsResolvingUrl(false);
      }
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        await handleReviewUrlChange(text);
      }
    } catch {
      // fallback
    }
  };

  // Build map embed query
  const mapSearchQuery = selectedAddress ? `${outletName || query} ${selectedAddress}` : outletName || query;
  const mapEmbedUrl = mapSearchQuery && mapSearchQuery.trim().length > 2
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapSearchQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
    : null;

  return (
    <div className="space-y-3.5" ref={containerRef}>
      {/* 1. Outlet Name Input with Live Search */}
      <div className="relative">
        <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
          <span>Nama Outlet / Bisnis <span className="text-rose-400">*</span></span>
          <span className="text-[11px] text-indigo-400 font-normal flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Cari Langsung di Google Maps
          </span>
        </label>
        <div className="relative">
          <Store className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            required
            name="outletName"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOutletName(e.target.value);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
            placeholder="Ketik nama toko (Contoh: Diva Swalayan / BINGXUE Kraksaan)"
            className="w-full pl-9 pr-20 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={handleManualSearchClick}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
          >
            {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
            <span>Cari</span>
          </button>
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden max-h-60 overflow-y-auto">
            <div className="p-2 border-b border-slate-800 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Hasil Pencarian Google Maps:</span>
              <span className="text-emerald-400 text-[10px]">Klik untuk pilih & lihat peta</span>
            </div>
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPlace(item)}
                className="w-full text-left p-3 hover:bg-indigo-950/40 border-b border-slate-800/50 last:border-0 transition-colors flex items-start gap-2.5 group cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-0.5 group-hover:bg-indigo-500/20">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {item.address}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Google Review URL Input */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Link Resmi Google Review <span className="text-rose-400">*</span>
          </label>
          <div className="flex items-center gap-2">
            {isResolvingUrl ? (
              <span className="text-[11px] text-indigo-400 font-medium flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Otomatis mengonversi link...
              </span>
            ) : isReviewConverted ? (
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Pop-up Bintang 5 Otomatis Aktif
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-normal">
                Paste Link Google Maps
              </span>
            )}
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            required
            name="googleReviewUrl"
            value={reviewUrl}
            onChange={(e) => handleReviewUrlChange(e.target.value)}
            placeholder="Paste link Google Maps / link share / Place ID toko di sini"
            className={`w-full pl-3 pr-24 py-2.5 bg-slate-950 border rounded-xl text-xs sm:text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none transition-colors ${
              isReviewConverted
                ? "border-emerald-500/60 bg-emerald-950/10 focus:border-emerald-500 text-emerald-300"
                : "border-slate-800 focus:border-indigo-500"
            }`}
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              title="Paste link dari clipboard"
            >
              <ClipboardCheck className="w-3 h-3" />
              <span>Paste</span>
            </button>

            {reviewUrl && (
              <a
                href={reviewUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs transition-colors flex items-center justify-center cursor-pointer"
                title="Buka & Uji Link di Tab Baru"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <p className="flex items-center gap-1 text-emerald-400 font-medium">
            <span>⚡</span>
            <span>
              {isReviewConverted
                ? "Sistem otomatis mengubah ke pop-up nilai bintang 5 langsung (seperti Diva Swalayan)."
                : "Paste link Google Maps apa saja, sistem langsung mengonversinya secara otomatis."}
            </span>
          </p>
          <a
            href="https://developers.google.com/maps/documentation/places/web-service/place-id"
            target="_blank"
            rel="noreferrer"
            className="text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1 underline"
            title="Cari Place ID resmi toko di Google Place ID Finder"
          >
            <span>🔍 Google Place ID Finder</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* 3. Peta Mini (Mini-Map) & Validasi Lokasi Toko */}
      {mapEmbedUrl && (
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Map className="w-3.5 h-3.5 text-emerald-400" />
              Validasi Lokasi Peta Toko (Google Maps):
            </span>
            <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Terverifikasi di Maps
            </span>
          </div>

          {/* Iframe Peta Mini */}
          <div className="relative w-full h-36 rounded-lg overflow-hidden border border-slate-800 shadow-inner bg-slate-900">
            <iframe
              src={mapEmbedUrl}
              className="w-full h-full border-0"
              loading="lazy"
              allowFullScreen={false}
              referrerPolicy="no-referrer-when-downgrade"
              title="Mini Map Preview"
            />
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-0.5">
            <span className="truncate max-w-[80%]">
              📍 <strong className="text-slate-200">{outletName || query}</strong>
              {selectedAddress ? ` - ${selectedAddress}` : ""}
            </span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapSearchQuery)}`}
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:underline shrink-0 text-[10px]"
            >
              Buka Maps Penuh ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
