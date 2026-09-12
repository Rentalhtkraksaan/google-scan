function hexPairToPlaceId(hex1, hex2) {
  const low = BigInt(hex1.startsWith('0x') ? hex1 : '0x' + hex1);
  const high = BigInt(hex2.startsWith('0x') ? hex2 : '0x' + hex2);
  
  const buf = Buffer.alloc(20);
  buf[0] = 0x0a;
  buf[1] = 0x12;
  buf[2] = 0x09;
  buf.writeBigUInt64LE(low, 3);
  buf[11] = 0x11;
  buf.writeBigUInt64LE(high, 12);
  
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const ralunaPlaceId = hexPairToPlaceId('0x2dd703bf6a3c9a75', '0xcec67ca8b11336d7');
console.log('RALUNA PLACE ID:', ralunaPlaceId);
console.log('RALUNA REVIEW URL:', `https://search.google.com/local/writereview?placeid=${ralunaPlaceId}`);
