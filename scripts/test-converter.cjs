function convertFtidToPlaceId(hex1, hex2) {
  // Google Place ID protobuf format:
  // tag 1 (0x0a), length (18 or 20)
  // 0x0a, 0x10, then 8 bytes little-endian hex1, then 8 bytes little-endian hex2
  const low = BigInt(hex1.startsWith('0x') ? hex1 : '0x' + hex1);
  const high = BigInt(hex2.startsWith('0x') ? hex2 : '0x' + hex2);
  
  const bytes = new Uint8Array(18);
  bytes[0] = 0x0a;
  bytes[1] = 0x10;
  
  let tempLow = low;
  for (let i = 2; i < 10; i++) {
    bytes[i] = Number(tempLow & 0xffn);
    tempLow >>= 8n;
  }
  
  let tempHigh = high;
  for (let i = 10; i < 18; i++) {
    bytes[i] = Number(tempHigh & 0xffn);
    tempHigh >>= 8n;
  }
  
  const base64 = Buffer.from(bytes).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  return 'ChIJ' + base64.slice(3); // or standard ChIJ mapping
}

// Let's test with known place: Diva Swalayan Kraksaan
// Let's test hex from Diva or Raluna
console.log('Raluna place ID candidate:', convertFtidToPlaceId('0x2dd703bf6a3c9a75', '0xcec67ca8b11336d7'));
