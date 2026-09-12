async function testLookup(query) {
  // Test Nominatim or Photon or Google Places Autocomplete API
  // 1. Let's test Google Maps API endpoint if key is in env or test public API
  console.log('ENV API KEY:', process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  // 2. Test Google Search endpoint with local pack
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' google maps')}&hl=id`;
  try {
    const res = await fetch(googleSearchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'id,en-US;q=0.9,en;q=0.8'
      }
    });
    const html = await res.text();
    const chij = html.match(/ChIJ[a-zA-Z0-9_-]{20,}/g);
    console.log('Google search ChIJ matches for', query, ':', chij ? Array.from(new Set(chij)) : null);

    // Also look for data-cid or data-fid or data-pid
    const dataPid = html.match(/data-pid="([^"]+)"/g);
    console.log('data-pid:', dataPid);
  } catch (e) {
    console.error(e);
  }
}

async function run() {
  await testLookup('BINGXUE Kraksaan');
  await testLookup('Diva Swalayan Kraksaan');
  await testLookup('mr diy kraksaan');
  await testLookup('Ikan Bakar Pantura Kraksaan');
  await testLookup('Mie Gacoan Probolinggo');
}

run();
