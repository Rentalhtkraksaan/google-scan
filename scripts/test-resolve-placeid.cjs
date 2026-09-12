async function resolveGooglePlaceId(input) {
  if (!input) return null;
  const str = input.trim();

  // 1. Direct ChIJ pattern
  const chijDirect = str.match(/(ChIJ[a-zA-Z0-9_-]{20,})/);
  if (chijDirect) return chijDirect[1];

  // 2. If it's a URL or search term, fetch the Google Maps page and extract ChIJ
  let targetUrl = str;
  if (!str.startsWith('http://') && !str.startsWith('https://')) {
    targetUrl = `https://www.google.com/maps/search/${encodeURIComponent(str)}?hl=id`;
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'id,en-US;q=0.9,en;q=0.8'
      },
      redirect: 'follow'
    });
    
    // Check final redirected URL
    const finalUrl = res.url;
    const chijInUrl = finalUrl.match(/(ChIJ[a-zA-Z0-9_-]{20,})/);
    if (chijInUrl) return chijInUrl[1];

    const html = await res.text();
    const chijInHtml = html.match(/(ChIJ[a-zA-Z0-9_-]{20,})/);
    if (chijInHtml) return chijInHtml[1];

    // Check for hex place identifier !1s0x...:0x...
    const hexMatch = html.match(/!1s(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/);
    if (hexMatch) {
      console.log('Hex match:', hexMatch[1], hexMatch[2]);
    }
  } catch (err) {
    console.error('Resolve error:', err);
  }
  return null;
}

async function test() {
  const queries = [
    'Diva Swalayan Kraksaan',
    'BINGXUE Kraksaan',
    'mr diy kraksaan',
    'Ikan Bakar Probolinggo'
  ];

  for (const q of queries) {
    const pid = await resolveGooglePlaceId(q);
    console.log(`Query "${q}" => Place ID:`, pid);
  }
}

test();
