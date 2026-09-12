const fs = require('fs');
const path = require('path');

function getDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  // PNG
  if (buffer.readUInt32BE(0) === 0x89504E47) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height, type: 'PNG' };
  }
  // JPEG
  let offset = 0;
  if (buffer.readUInt16BE(0) === 0xFFD8) {
    offset += 2;
    while (offset < buffer.length) {
      const marker = buffer.readUInt16BE(offset);
      offset += 2;
      const length = buffer.readUInt16BE(offset);
      if (marker >= 0xFFC0 && marker <= 0xFFC3) {
        const height = buffer.readUInt16BE(offset + 3);
        const width = buffer.readUInt16BE(offset + 5);
        return { width, height, type: 'JPEG' };
      }
      offset += length;
    }
  }
  return null;
}

const ref = path.join(__dirname, '../public/images/google-card-reference.png');
const blank = path.join(__dirname, '../public/images/google-card-blank.jpg');

console.log('Reference:', getDimensions(ref));
console.log('Blank:', getDimensions(blank));
