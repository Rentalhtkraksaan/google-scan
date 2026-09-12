function decodePlaceId(placeId) {
  // Replace base64url characters
  let base64 = placeId.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  
  const buf = Buffer.from(base64, 'base64');
  console.log('Hex buffer:', buf.toString('hex'));
  console.log('Bytes length:', buf.length);
  
  // Extract the two 64-bit integers
  // Standard format is: 08 01 12 10 [8 bytes low] [8 bytes high] or similar
  const hex1 = buf.subarray(buf.length - 16, buf.length - 8);
  const hex2 = buf.subarray(buf.length - 8);
  
  console.log('Low hex:', '0x' + hex1.readBigUInt64LE(0).toString(16));
  console.log('High hex:', '0x' + hex2.readBigUInt64LE(0).toString(16));
}

decodePlaceId('ChIJcZlCR2cB1y0RocRq1VPhzQI');
