async function testShareUrl() {
  // Let's test a sample google maps redirect
  const testUrl = 'https://goo.gl/maps/search/Diva+Swalayan+Kraksaan';
  try {
    const res = await fetch(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'follow'
    });
    console.log('Redirected to:', res.url);
  } catch (e) {
    console.log('Error:', e.message);
  }
}

testShareUrl();
