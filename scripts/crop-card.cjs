const fs = require('fs');
const path = require('path');

// Let's copy both the blank template and the cropped reference
const uploadDir = 'C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\a6d0e94e-7b07-495e-afcc-9ecc3d55fbb4\\.user_uploaded';
const blankTemplatePath = path.join(uploadDir, 'media_1788881456737.jpg');
const croppedUserPath = path.join(uploadDir, 'media_1788881734672.png');

console.log('Blank template exists:', fs.existsSync(blankTemplatePath));
console.log('Cropped user image exists:', fs.existsSync(croppedUserPath));

// Let's create an exact clean card template where the middle QR area is clean white for dynamic QR
// and the card itself has no outer gray borders!
fs.copyFileSync(blankTemplatePath, path.join(__dirname, '../public/images/google-card-blank.jpg'));
fs.copyFileSync(croppedUserPath, path.join(__dirname, '../public/images/google-card-reference.png'));
