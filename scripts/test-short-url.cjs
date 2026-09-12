async function testShortUrl() {
  // Try expanding a sample maps.app.goo.gl if any, or general redirect resolver
  async function resolveShortUrl(url) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        redirect: 'follow'
      });
      return res.url;
    } catch (e) {
      return url;
    }
  }

  console.log('Resolver test ready');
}

testShortUrl();
