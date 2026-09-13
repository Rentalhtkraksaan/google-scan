const fs = require('fs');
const path = 'd:/laragon/www/google review new/src/lib/actions/auth.actions.ts';
let content = fs.readFileSync(path, 'utf8');

const oldCheck1 = `if (newPassword && (newPassword.length < 6 || newPassword.length > 15)) {
      return { success: false, message: "Password harus berukuran 6 sampai 15 karakter." };
    }`;
const newCheck1 = `if (newPassword) {
      if (newPassword.length < 8 || newPassword.length > 50) return { success: false, message: "Password minimal 8 karakter." };
      if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
        return { success: false, message: "Password harus ada huruf besar, kecil, angka, karakter khusus." };
      }
    }`;

const oldCheck2 = `if (raw.password.length < 6 || raw.password.length > 15) {
      return { success: false, message: "Password harus berukuran 6 sampai 15 karakter." };
    }`;
const newCheck2 = `if (raw.password.length < 8 || raw.password.length > 50) {
      return { success: false, message: "Password minimal 8 karakter." };
    }
    if (!/[A-Z]/.test(raw.password) || !/[a-z]/.test(raw.password) || !/[0-9]/.test(raw.password) || !/[^A-Za-z0-9]/.test(raw.password)) {
      return { success: false, message: "Password harus ada huruf besar, kecil, angka, karakter khusus." };
    }`;

const oldCheck3 = `if (newPassword.length < 6 || newPassword.length > 15) {
        return { success: false, message: "Password baru harus berukuran 6 sampai 15 karakter." };
      }`;
const newCheck3 = `if (newPassword.length < 8 || newPassword.length > 50) {
        return { success: false, message: "Password baru minimal 8 karakter." };
      }
      if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
        return { success: false, message: "Password harus ada huruf besar, kecil, angka, karakter khusus." };
      }`;

content = content.replace(oldCheck1, newCheck1);
content = content.replace(oldCheck1, newCheck1); // Run twice for 2 occurrences
content = content.replace(oldCheck2, newCheck2);
content = content.replace(oldCheck3, newCheck3);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed password checks');
