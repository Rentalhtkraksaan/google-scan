async function testRaluna() {
  const url = 'https://maps.app.goo.gl/91mjVTaicP9ahfvv8';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    redirect: 'follow'
  });
  console.log('Final URL:', res.url);
  const html = await res.text();
  const chij = html.match(/ChIJ[a-zA-Z0-9_-]{20,}/g);
  console.log('ChIJ in HTML:', chij ? Array.from(new Set(chij)) : null);
}

testRaluna();
