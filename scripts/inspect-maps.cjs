async function inspectGoogle(query) {
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  console.log('Final URL:', res.url);
  console.log('HTML Length:', html.length);
  
  // Find all ChIJ in html
  const matches = html.match(/ChIJ[a-zA-Z0-9_-]{20,}/g);
  console.log('ChIJ matches:', matches);

  // Find 0x hex
  const hex = html.match(/0x[0-9a-fA-F]+:0x[0-9a-fA-F]+/g);
  console.log('Hex matches (sample 5):', hex ? hex.slice(0, 5) : null);
}

inspectGoogle('Diva Swalayan Kraksaan');
