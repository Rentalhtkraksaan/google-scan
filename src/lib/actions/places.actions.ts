"use server";

import { formatGoogleReviewUrl, resolveAndFormatGoogleUrl } from "@/lib/google-url";

export interface PlaceSearchResult {
  name: string;
  address: string;
  placeId?: string;
  cid?: string;
  reviewUrl: string;
}

interface GooglePlaceApiItem {
  name: string;
  formatted_address?: string;
  vicinity?: string;
  place_id?: string;
}

/**
 * Server action to automatically resolve any pasted URL or query
 * and convert it to a direct 5-star Google review popup URL.
 */
export async function resolveReviewUrlAction(rawInput: string): Promise<{ success: boolean; url: string }> {
  if (!rawInput || !rawInput.trim()) {
    return { success: false, url: "" };
  }
  try {
    const formatted = await resolveAndFormatGoogleUrl(rawInput.trim());
    return { success: true, url: formatted };
  } catch {
    return { success: true, url: formatGoogleReviewUrl(rawInput) };
  }
}

/**
 * Search Google Places by business name and returns candidate places
 * with direct 5-star review URLs.
 */
export async function searchPlacesAction(query: string): Promise<{ success: boolean; data: PlaceSearchResult[] }> {
  if (!query || query.trim().length < 2) {
    return { success: true, data: [] };
  }

  const cleanQuery = query.trim();
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // 1. If Google API Key is provided in .env, use official Google Places Text Search
  if (apiKey) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          cleanQuery
        )}&key=${apiKey}&language=id`
      );
      const data = await res.json();

      if (data.status === "OK" && Array.isArray(data.results)) {
        const results: PlaceSearchResult[] = data.results.slice(0, 6).map((item: GooglePlaceApiItem) => ({
          name: item.name,
          address: item.formatted_address || item.vicinity || "",
          placeId: item.place_id,
          reviewUrl: item.place_id
            ? `https://search.google.com/local/writereview?placeid=${item.place_id}`
            : `https://www.google.com/maps/search/${encodeURIComponent(item.name)}`,
        }));
        return { success: true, data: results };
      }
    } catch (e) {
      console.error("Google Places API Error:", e);
    }
  }

  // 2. High-speed Fallback Search using Google Maps Search parser
  try {
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(cleanQuery)}?hl=id`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "id,en-US;q=0.9,en;q=0.8",
      },
      next: { revalidate: 60 },
    });

    const html = await response.text();
    const results: PlaceSearchResult[] = [];

    // Extract ChIJ matches directly
    const chijMatches = Array.from(html.matchAll(/(ChIJ[a-zA-Z0-9_-]{20,})/g));
    if (chijMatches.length > 0) {
      const uniquePlaceIds = new Set<string>();
      for (const m of chijMatches) {
        const placeId = m[1];
        if (!uniquePlaceIds.has(placeId)) {
          uniquePlaceIds.add(placeId);
          results.push({
            name: cleanQuery,
            address: "Lokasi Terverifikasi di Google Maps",
            placeId,
            reviewUrl: `https://search.google.com/local/writereview?placeid=${placeId}`,
          });
        }
        if (results.length >= 3) break;
      }
    }

    // Extract hex / cid matches if no ChIJ found
    if (results.length === 0) {
      const hexMatches = Array.from(html.matchAll(/!1s(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/g));
      if (hexMatches.length > 0) {
        const uniqueCids = new Set<string>();
        for (const m of hexMatches) {
          try {
            const hex = m[2];
            const cid = BigInt(hex).toString();
            if (!uniqueCids.has(cid)) {
              uniqueCids.add(cid);
              results.push({
                name: cleanQuery,
                address: "Lokasi terverifikasi Google Maps",
                cid,
                reviewUrl: `https://maps.google.com/?cid=${cid}`,
              });
            }
            if (results.length >= 3) break;
          } catch {
            // ignore
          }
        }
      }
    }

    // If still empty, return a synthesized direct Google search target
    if (results.length === 0) {
      results.push({
        name: cleanQuery,
        address: "Pencarian ulasan Google Maps langsung",
        reviewUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanQuery)}`,
      });
    }

    return { success: true, data: results };
  } catch (error) {
    console.error("Places search error:", error);
    return {
      success: true,
      data: [
        {
          name: cleanQuery,
          address: "Google Maps Bisnis",
          reviewUrl: `https://www.google.com/maps/search/${encodeURIComponent(cleanQuery)}`,
        },
      ],
    };
  }
}
