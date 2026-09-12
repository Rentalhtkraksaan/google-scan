async function testSuggest(query) {
  // Test 1: Google Maps suggest endpoint
  const url1 = `https://www.google.com/complete/search?client=maps&q=${encodeURIComponent(query)}&hl=id`;
  try {
    const res1 = await fetch(url1);
    const text1 = await res1.text();
    console.log('Suggest client=maps:', text1.slice(0, 300));
  } catch (e) {
    console.error('url1 error', e);
  }

  // Test 2: Google Maps RPC suggest
  const url2 = `https://www.google.com/maps/preview/place?q=${encodeURIComponent(query)}&hl=id`;
  try {
    const res2 = await fetch(url2, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log('Preview place status:', res2.status, res2.url);
  } catch (e) {
    console.error('url2 error', e);
  }
}

testSuggest('Diva Swalayan Kraksaan');
