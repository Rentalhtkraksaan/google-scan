async function testPujasera() {
  const url = 'https://maps.app.goo.gl/r4V3va4hEcY4mPn79';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    redirect: 'follow'
  });
  console.log('Redirected to:', res.url);

  // Convert hex to Place ID
  const hexMatch = res.url.match(/!1s(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/);
  if (hexMatch) {
    const clean1 = hexMatch[1];
    const clean2 = hexMatch[2];
    const low = BigInt(clean1);
    const high = BigInt(clean2);

    const buf = Buffer.alloc(20);
    buf[0] = 0x0a;
    buf[1] = 0x12;
    buf[2] = 0x09;
    buf.writeBigUInt64LE(low, 3);
    buf[11] = 0x11;
    buf.writeBigUInt64LE(high, 12);

    const placeId = buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    console.log('PUJASERA PLACE ID:', placeId);
    console.log('DIRECT REVIEW URL:', `https://search.google.com/local/writereview?placeid=${placeId}`);
  }
}

testPujasera();
