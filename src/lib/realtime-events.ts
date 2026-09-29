/**
 * In-memory realtime review & scan event bus.
 * Zero database writes, zero storage cost, automatic expiration in RAM.
 */

export interface RealtimeReviewEvent {
  id: string;
  outletId: string;
  action: "FIVE_STAR_REVIEW" | "FOUR_STAR_REVIEW" | "SCAN_CARD";
  title: string;
  description: string;
  targetId?: string | null;
  createdAt: number;
}

// Global in-memory event store preserved across requests in Node process
declare global {
  // eslint-disable-next-line no-var
  var __smartqr_realtime_events: RealtimeReviewEvent[] | undefined;
  // eslint-disable-next-line no-var
  var __smartqr_scan_counters: Map<string, { count: number; updatedAt: number }> | undefined;
}

const getEventStore = (): RealtimeReviewEvent[] => {
  if (!global.__smartqr_realtime_events) {
    global.__smartqr_realtime_events = [];
  }
  return global.__smartqr_realtime_events;
};

const getScanCounterStore = (): Map<string, { count: number; updatedAt: number }> => {
  if (!global.__smartqr_scan_counters) {
    global.__smartqr_scan_counters = new Map();
  }
  return global.__smartqr_scan_counters;
};

export function setOutletScanCount(outletId: string, count: number) {
  const store = getScanCounterStore();
  store.set(outletId, { count, updatedAt: Date.now() });
}

export function incrementOutletScanCount(outletId: string, incrementBy: number = 1): number | null {
  const store = getScanCounterStore();
  const existing = store.get(outletId);
  if (existing) {
    existing.count += incrementBy;
    existing.updatedAt = Date.now();
    return existing.count;
  }
  return null;
}

export function getCachedOutletScanCount(outletId: string): number | null {
  const store = getScanCounterStore();
  const existing = store.get(outletId);
  if (existing && Date.now() - existing.updatedAt < 30000) {
    return existing.count;
  }
  return null;
}

/**
 * Broadcast an incoming scan or review event to memory.
 * Kept in RAM for up to 60 seconds (max 100 items), then automatically garbage collected.
 * 0 database writes.
 */
export function broadcastRealtimeReviewEvent(event: {
  outletId: string;
  action: "FIVE_STAR_REVIEW" | "FOUR_STAR_REVIEW" | "SCAN_CARD";
  title: string;
  description: string;
  targetId?: string | null;
}) {
  const store = getEventStore();
  const newEvent: RealtimeReviewEvent = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    outletId: event.outletId,
    action: event.action,
    title: event.title,
    description: event.description,
    targetId: event.targetId || null,
    createdAt: Date.now(),
  };

  store.push(newEvent);

  // Instant in-memory increment if it is a scan event
  if (event.action === "SCAN_CARD") {
    incrementOutletScanCount(event.outletId, 1);
  }

  // Keep store lightweight: retain only events from the last 60 seconds and max 100 entries
  const cutoff = Date.now() - 60000;
  global.__smartqr_realtime_events = store.filter((e) => e.createdAt > cutoff).slice(-100);
}

/**
 * Retrieve recent events for an outlet from memory since a given timestamp.
 * 0 database queries.
 */
export function getRecentRealtimeReviewEvents(
  outletId: string,
  sinceMs?: number
): RealtimeReviewEvent[] {
  const store = getEventStore();
  const effectiveSince = sinceMs && !isNaN(sinceMs) ? sinceMs : Date.now() - 10000;
  return store.filter((e) => e.outletId === outletId && e.createdAt > effectiveSince);
}
