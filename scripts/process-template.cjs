const fs = require('fs');
const path = require('path');

const uploadDir = 'C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\a6d0e94e-7b07-495e-afcc-9ecc3d55fbb4\\.user_uploaded';
const files = fs.readdirSync(uploadDir).map(f => {
  const full = path.join(uploadDir, f);
  return {
    file: f,
    path: full,
    mtime: fs.statSync(full).mtimeMs,
    size: fs.statSync(full).size
  };
}).sort((a, b) => b.mtime - a.mtime);

console.log('User uploaded files:', files);

// Copy the latest uploaded file directly
if (files.length > 0) {
  const latest = files[0];
  const destJpg = path.join(__dirname, '../public/images/google-card-template.jpg');
  fs.copyFileSync(latest.path, destJpg);
  console.log(`Copied ${latest.file} -> ${destJpg}`);
}
