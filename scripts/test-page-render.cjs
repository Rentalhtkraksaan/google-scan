const http = require('http');

http.get('http://localhost:3000/super-admin', (res) => {
  console.log('Status code:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Includes Pengaturan Landing Page:', data.includes('Pengaturan Landing Page') || data.includes('Landing Page'));
    console.log('Includes Tambah Super Admin 2:', data.includes('Tambah Super Admin 2'));
    console.log('Includes Kelola Super Admin:', data.includes('Kelola Super Admin'));
  });
}).on('error', console.error);
