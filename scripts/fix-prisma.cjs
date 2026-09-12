const { execSync } = require('child_process');

console.log('Running prisma generate...');
try {
  const out = execSync('npx prisma generate', { encoding: 'utf8' });
  console.log('Success:', out);
} catch (err) {
  console.log('Error details:', err.message, err.stdout, err.stderr);
}
