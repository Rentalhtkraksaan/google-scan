/**
 * Converts Google Maps 64-bit Hex pair (!1s0x...:0x...) into official base64 Place ID (ChIJ...)
 * using Google's binary protobuf format specification.
 */
export function hexPairToPlaceId(hex1: string, hex2: string): string {
  try {
    const clean1 = hex1.startsWith("0x") ? hex1 : "0x" + hex1;
    const clean2 = hex2.startsWith("0x") ? hex2 : "0x" + hex2;
    const low = BigInt(clean1);
    const high = BigInt(clean2);

    const buf = Buffer.alloc(20);
    buf[0] = 0x0a;
    buf[1] = 0x12;
    buf[2] = 0x09;
    buf.writeBigUInt64LE(low, 3);
    buf[11] = 0x11;
    buf.writeBigUInt64LE(high, 12);

    return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return "";
  }
}

/**
 * Normalizes and ensures valid Google Maps / Google Review URLs.
 * If a Place ID (ChIJ...) or hex pair is detected, automatically converts it
 * directly into the official 5-star write review popup modal URL:
 * https://search.google.com/local/writereview?placeid=<PLACE_ID>
 */
export function formatGoogleReviewUrl(inputUrl: string): string {
  if (!inputUrl) return "";
  let url = inputUrl.trim();

  // 1. If it already has or contains a Place ID (ChIJ...)
  const chijMatch = url.match(/(ChIJ[a-zA-Z0-9_-]{20,})/);
  if (chijMatch && chijMatch[1]) {
    return `https://search.google.com/local/writereview?placeid=${chijMatch[1]}`;
  }

  // 2. If it contains Google hex pair identifier: !1s(0x...):(0x...)
  const hexMatch = url.match(/!1s(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/);
  if (hexMatch && hexMatch[1] && hexMatch[2]) {
    const pid = hexPairToPlaceId(hexMatch[1], hexMatch[2]);
    if (pid) {
      return `https://search.google.com/local/writereview?placeid=${pid}`;
    }
  }

  // 3. If it has explicit placeid / place_id query param
  const placeIdMatch = url.match(/[?&]place(?:_)?id=([a-zA-Z0-9_-]+)/i);
  if (placeIdMatch && placeIdMatch[1]) {
    return `https://search.google.com/local/writereview?placeid=${placeIdMatch[1]}`;
  }

  // 4. If it's already a write review link with placeid
  if (url.includes("search.google.com/local/writereview")) {
    return url;
  }

  // 5. Ensure protocol if it looks like a URL
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    if (url.includes("google.") || url.includes("maps.") || url.includes("g.page") || url.includes("goo.gl")) {
      url = "https://" + url;
    } else {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(url)}`;
    }
  }

  return url;
}

/**
 * Server-side asynchronous resolver that expands shortened URLs (e.g. maps.app.goo.gl),
 * follows redirects, and extracts official Google Place IDs automatically.
 */
export async function resolveAndFormatGoogleUrl(inputUrl: string): Promise<string> {
  if (!inputUrl) return "";
  const initial = formatGoogleReviewUrl(inputUrl);

  // If already converted to writereview?placeid=..., return directly
  if (initial.includes("search.google.com/local/writereview?placeid=ChIJ")) {
    return initial;
  }

  // If it's a web URL that might redirect (e.g., maps.app.goo.gl, goo.gl, etc.)
  if (initial.startsWith("http://") || initial.startsWith("https://")) {
    try {
      const response = await fetch(initial, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "id,en-US;q=0.9,en;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(4000),
      });

      const finalUrl = response.url;
      
      // Check for ChIJ in final redirected URL
      const chijInFinalUrl = finalUrl.match(/(ChIJ[a-zA-Z0-9_-]{20,})/);
      if (chijInFinalUrl && chijInFinalUrl[1]) {
        return `https://search.google.com/local/writereview?placeid=${chijInFinalUrl[1]}`;
      }

      // Check for hex pair !1s(0x...):(0x...) in final redirected URL
      const hexInFinalUrl = finalUrl.match(/!1s(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/);
      if (hexInFinalUrl && hexInFinalUrl[1] && hexInFinalUrl[2]) {
        const pid = hexPairToPlaceId(hexInFinalUrl[1], hexInFinalUrl[2]);
        if (pid) {
          return `https://search.google.com/local/writereview?placeid=${pid}`;
        }
      }

      const html = await response.text();
      const chijInHtml = html.match(/(ChIJ[a-zA-Z0-9_-]{20,})/);
      if (chijInHtml && chijInHtml[1]) {
        return `https://search.google.com/local/writereview?placeid=${chijInHtml[1]}`;
      }

      const hexInHtml = html.match(/!1s(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/);
      if (hexInHtml && hexInHtml[1] && hexInHtml[2]) {
        const pid = hexPairToPlaceId(hexInHtml[1], hexInHtml[2]);
        if (pid) {
          return `https://search.google.com/local/writereview?placeid=${pid}`;
        }
      }
    } catch {
      // Timeout or network error, fallback to initial format
    }
  }

  return initial;
}
