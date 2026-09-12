const fs = require('fs');
const path = require('path');

// We can convert jpeg to png or analyze pixel data
// Or let's test by sampling the coordinates
// In a 636 x 1024 image:
// The box is centered horizontally: around x = 135 to 500 (width ~ 365)
// Vertically: around y = 470 to 835 (height ~ 365)
console.log('Target template available at /images/google-card-template.jpg');
