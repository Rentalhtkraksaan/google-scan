const fs = require('fs');
const path = require('path');

const imgPath = path.join(__dirname, '../public/images/google-card-template.jpg');
if (fs.existsSync(imgPath)) {
  const stat = fs.statSync(imgPath);
  console.log('Template image found! Size:', stat.size, 'bytes');
  
  // Read header to get JPEG dimensions
  const buffer = fs.readFileSync(imgPath);
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
        console.log(`Image Dimensions: ${width}x${height}`);
        break;
      }
      offset += length;
    }
  }
} else {
  console.log('Template image not found');
}
