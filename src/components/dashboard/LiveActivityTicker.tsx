"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity,
  Zap,
  Store,
  QrCode,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { getLiveTickerEventsAction, LiveTickerItem } from "@/lib/actions/activity.actions";

interface LiveActivityTickerProps {
  initialItems?: LiveTickerItem[];
  refreshIntervalMs?: number;
}

export function LiveActivityTicker({
  initialItems = [],
  refreshIntervalMs = 15000,
}: LiveActivityTickerProps) {
  const [items, setItems] = useState<LiveTickerItem[]>(initialItems);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await getLiveTickerEventsAction();
      if (res.success && res.data && res.data.length > 0) {
        setItems(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch live ticker:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch if items empty
  useEffect(() => {
    if (items.length === 0) {
      fetchEvents();
    }
  }, [fetchEvents, items.length]);

  // Periodic polling
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchEvents();
    }, refreshIntervalMs);

    return () => clearInterval(pollInterval);
  }, [fetchEvents, refreshIntervalMs]);

  // Cycling slideshow of items
  useEffect(() => {
    if (items.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [items.length, isPaused]);

  const handleNext = () => {
    if (items.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }
  };

  const handlePrev = () => {
    if (items.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    }
  };

  if (items.length === 0) {
    return null;
  }

  const currentItem = items[currentIndex] || items[0];

  const getEventIcon = (type: LiveTickerItem["type"]) => {
    switch (type) {
      case "SCAN":
        return <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />;
      case "REGISTER":
        return <Store className="w-3.5 h-3.5 text-emerald-400" />;
      case "CARD":
        return <QrCode className="w-3.5 h-3.5 text-indigo-400" />;
      case "AUTH":
        return <UserCheck className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative overflow-hidden bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-950/90 border border-slate-800 hover:border-emerald-500/30 rounded-2xl p-2.5 sm:px-4 sm:py-2.5 shadow-lg backdrop-blur-xl transition-all duration-300"
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        {/* Left: Live indicator badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          </div>
          <span className="font-extrabold tracking-wider uppercase text-[10px] text-emerald-400 font-mono hidden xs:inline">
            LIVE REALTIME
          </span>
          <span className="text-slate-600 hidden sm:inline">&bull;</span>
        </div>

        {/* Center: Sliding current activity message */}
        <div className="flex-1 min-w-0 overflow-hidden flex items-center gap-2">
          <div className="p-1 rounded-lg bg-slate-800/80 border border-slate-700/60 shrink-0">
            {getEventIcon(currentItem.type)}
          </div>

          <div className="min-w-0 truncate flex items-baseline gap-2">
            <span className="font-bold text-white text-xs truncate">
              {currentItem.title}
            </span>
            <span className="text-slate-400 text-[11px] truncate hidden md:inline">
              {currentItem.description}
            </span>
          </div>

          <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md shrink-0 ml-auto sm:ml-0 font-medium">
            {currentItem.timeAgo}
          </span>
        </div>

        {/* Right: Controls & counter */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono text-slate-500 hidden lg:inline">
            {currentIndex + 1}/{items.length}
          </span>

          <button
            onClick={handlePrev}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Aktivitas Sebelumnya"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleNext}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Aktivitas Berikutnya"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={fetchEvents}
            disabled={isRefreshing}
            className="p-1 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            title="Segarkan Aktivitas Realtime"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
