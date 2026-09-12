import Swal from "sweetalert2";

// Custom dark styled SweetAlert2 configuration
export const showSuccessAlert = (title: string, message?: string, timer = 1500) => {
  return Swal.fire({
    icon: "success",
    title: title,
    html: message
      ? `<div style="line-height: 1.6; font-size: 13px; color: #cbd5e1;">${message}</div>`
      : undefined,
    timer: timer,
    timerProgressBar: true,
    showConfirmButton: false,
    background: "#0f172a",
    color: "#f8fafc",
    iconColor: "#10b981",
    backdrop: `rgba(15, 23, 42, 0.75)`,
    customClass: {
      popup: "border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl",
      title: "text-lg font-bold text-slate-100",
      htmlContainer: "text-sm text-slate-300",
    },
  });
};

export const showErrorAlert = (title: string, message?: string) => {
  return Swal.fire({
    icon: "error",
    title: title,
    html: message
      ? `<div style="line-height: 1.6; font-size: 13px; color: #cbd5e1;">${message}</div>`
      : undefined,
    confirmButtonText: "Mengerti",
    confirmButtonColor: "#4f46e5",
    background: "#0f172a",
    color: "#f8fafc",
    iconColor: "#ef4444",
    backdrop: `rgba(15, 23, 42, 0.75)`,
    customClass: {
      popup: "border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl",
      title: "text-lg font-bold text-slate-100",
      htmlContainer: "text-sm text-slate-300",
      confirmButton: "px-6 py-2.5 rounded-xl font-semibold text-sm cursor-pointer shadow-lg",
    },
  });
};

export const showConfirmAlert = async (
  title: string,
  message: string,
  confirmButtonText = "Ya, Lanjutkan",
  confirmButtonColor = "#ef4444"
) => {
  return Swal.fire({
    icon: "warning",
    title: title,
    html: `<div style="line-height: 1.6; font-size: 13px; color: #cbd5e1;">${message}</div>`,
    showCancelButton: true,
    confirmButtonText: confirmButtonText,
    cancelButtonText: "Batal",
    confirmButtonColor: confirmButtonColor,
    cancelButtonColor: "#334155",
    background: "#0f172a",
    color: "#f8fafc",
    iconColor: "#f59e0b",
    backdrop: `rgba(15, 23, 42, 0.75)`,
    reverseButtons: true,
    customClass: {
      popup: "border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl",
      title: "text-lg font-bold text-slate-100",
      htmlContainer: "text-sm text-slate-300",
      confirmButton: "px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer shadow-lg",
      cancelButton: "px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer bg-slate-800 hover:bg-slate-700",
    },
  });
};

/**
 * Konfirmasi Aktifkan / Nonaktifkan Kartu QR
 */
export const showToggleCardConfirmAlert = async (
  code: string,
  outletName?: string | null,
  currentStatus = "ACTIVE"
): Promise<boolean> => {
  const isActivating = currentStatus !== "ACTIVE";
  const actionText = isActivating ? "mengaktifkan" : "menonaktifkan";
  const targetLabel = outletName
    ? `outlet <b>${outletName}</b> (Kartu: <code style="color: #93c5fd; background: rgba(59,130,246,0.15); padding: 2px 6px; border-radius: 4px;">${code}</code>)`
    : `kartu kosong <code style="color: #93c5fd; background: rgba(59,130,246,0.15); padding: 2px 6px; border-radius: 4px;">${code}</code>`;

  const result = await Swal.fire({
    icon: isActivating ? "question" : "warning",
    title: `Konfirmasi ${isActivating ? "Aktifkan" : "Nonaktifkan"} Kartu`,
    html: `
      <div style="text-align: center; line-height: 1.6; font-size: 13px; color: #cbd5e1; margin-top: 4px;">
        Apakah Anda yakin ingin ${actionText} ${targetLabel} ini?
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Lanjut",
    cancelButtonText: "Tidak",
    confirmButtonColor: isActivating ? "#10b981" : "#ef4444",
    cancelButtonColor: "#334155",
    background: "#0f172a",
    color: "#f8fafc",
    iconColor: isActivating ? "#10b981" : "#f59e0b",
    backdrop: `rgba(15, 23, 42, 0.8)`,
    reverseButtons: true,
    customClass: {
      popup: "border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl",
      title: "text-lg font-bold text-slate-100",
      htmlContainer: "text-sm text-slate-300",
      confirmButton: "px-6 py-2.5 rounded-xl font-semibold text-xs cursor-pointer shadow-lg",
      cancelButton: "px-6 py-2.5 rounded-xl font-semibold text-xs cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300",
    },
  });

  return !!result.isConfirmed;
};

/**
 * Validasi 2 Langkah Penghapusan Permanen (Two-Step Verification)
 * Langkah 1: Peringatan konsekuensi penghapusan permanen.
 * Langkah 2: Mengetik kata konfirmasi ("HAPUS") agar pengguna 100% sadar sebelum data terhapus.
 */
export const showTwoStepDeleteConfirmAlert = async (
  title: string,
  text: string,
  itemName: string,
  keyword = "HAPUS"
): Promise<boolean> => {
  // ─── LANGKAH 1: Peringatan & Konfirmasi Awal ───
  const step1 = await Swal.fire({
    icon: "warning",
    title: `⚠️ Langkah 1/2: ${title}`,
    html: `
      <div style="text-align: left; line-height: 1.5; font-size: 13px; color: #cbd5e1;">
        <p style="margin-bottom: 12px; font-weight: 500;">${text}</p>
        <div style="padding: 10px 12px; background: rgba(127, 29, 29, 0.35); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 10px; font-size: 11px; color: #fca5a5;">
          <strong style="color: #f87171;">PERINGATAN:</strong> Tindakan ini bersifat <b>permanen</b> dan data yang terhapus <b>tidak dapat dikembalikan</b> lagi.
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Lanjutkan ke Verifikasi ➔",
    cancelButtonText: "Batal",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#334155",
    background: "#0f172a",
    color: "#f8fafc",
    iconColor: "#ef4444",
    backdrop: `rgba(15, 23, 42, 0.85)`,
    reverseButtons: true,
    customClass: {
      popup: "border border-red-900/50 rounded-2xl shadow-2xl backdrop-blur-xl",
      title: "text-lg font-bold text-red-200",
      confirmButton: "px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer shadow-lg",
      cancelButton: "px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer bg-slate-800 hover:bg-slate-700",
    },
  });

  if (!step1.isConfirmed) return false;

  // ─── LANGKAH 2: Verifikasi Ketik Kata Konfirmasi (Explicit Awareness) ───
  const step2 = await Swal.fire({
    icon: "question",
    title: `🔒 Langkah 2/2: Verifikasi Sadar Diri`,
    html: `
      <div style="text-align: left; line-height: 1.5; font-size: 12px; color: #cbd5e1;">
        <p style="margin-bottom: 8px;">
          Untuk memastikan Anda benar-benar sadar ingin menghapus <b style="color: #f8fafc;">${itemName}</b> dan menghilangkannya secara permanen dari sistem:
        </p>
        <p style="margin-bottom: 12px; font-size: 12px;">
          Silakan ketik kata <span style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-weight: bold; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.3); letter-spacing: 1px;">${keyword}</span> di bawah ini:
        </p>
      </div>
    `,
    input: "text",
    inputPlaceholder: `Ketik "${keyword}" di sini...`,
    inputAttributes: {
      autocapitalize: "off",
      autocorrect: "off",
      autocomplete: "off",
      spellcheck: "false",
    },
    showCancelButton: true,
    confirmButtonText: "🗑️ Konfirmasi Hapus Permanen",
    cancelButtonText: "Batal",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#334155",
    background: "#0f172a",
    color: "#f8fafc",
    iconColor: "#f59e0b",
    backdrop: `rgba(15, 23, 42, 0.85)`,
    reverseButtons: true,
    customClass: {
      popup: "border border-red-900/50 rounded-2xl shadow-2xl backdrop-blur-xl",
      title: "text-base font-bold text-slate-100",
      input: "bg-slate-900 border border-slate-700 text-white rounded-xl focus:border-red-500 text-center font-mono tracking-widest font-bold uppercase",
      confirmButton: "px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer shadow-lg",
      cancelButton: "px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer bg-slate-800 hover:bg-slate-700",
    },
    preConfirm: (value) => {
      if (!value || value.trim().toUpperCase() !== keyword.toUpperCase()) {
        Swal.showValidationMessage(`Kata konfirmasi salah! Ketik "${keyword}" dengan benar untuk melanjutkan.`);
        return false;
      }
      return true;
    },
  });

  return !!step2.isConfirmed;
};

/**
 * Validasi 3 Langkah Penghapusan Permanen (Three-Step Verification)
 * Dirancang agar pengguna 100% sadar dan tidak salah pencet sebelum data masukan/keluhan dihapus permanen.
 * Langkah 1: Peringatan awal ulasan akan dihapus.
 * Langkah 2: Peringatan resiko kritis kehilangan data permanen.
 * Langkah 3: Mengetik kata konfirmasi ("HAPUS") secara manual.
 */
export const showThreeStepDeleteConfirmAlert = async (
  title: string,
  text: string,
  itemDescription: string,
  keyword = "HAPUS"
): Promise<boolean> => {
  // ─── LANGKAH 1/3: Konfirmasi Awal ───
  const step1 = await Swal.fire({
    icon: "warning",
    title: `⚠️ Langkah 1/3: ${title}`,
    html: `
      <div style="text-align: left; line-height: 1.5; font-size: 13px; color: #cbd5e1;">
        <p style="margin-bottom: 12px; font-weight: 500;">${text}</p>
        <div style="padding: 10px 12px; background: rgba(51, 65, 85, 0.5); border: 1px solid rgba(100, 116, 139, 0.4); border-radius: 10px; font-size: 12px; color: #e2e8f0;">
          Target: <b>${itemDescription}</b>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Lanjut ke Langkah 2 ➔",
    cancelButtonText: "Batal",
    confirmButtonColor: "#e11d48",
    cancelButtonColor: "#334155",
    background: "#0f172a",
    color: "#f8fafc",
    iconColor: "#fbbf24",
    backdrop: `rgba(15, 23, 42, 0.8)`,
    reverseButtons: true,
    customClass: {
      popup: "border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl",
      title: "text-base font-bold text-slate-100",
      confirmButton: "px-5 py-2.5 rounded-xl font-semibold text-xs cursor-pointer shadow-lg",
      cancelButton: "px-5 py-2.5 rounded-xl font-semibold text-xs cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300",
    },
  });

  if (!step1.isConfirmed) return false;

  // ─── LANGKAH 2/3: Peringatan Resiko Kritis ───
  const step2 = await Swal.fire({
    icon: "error",
    title: `🛑 Langkah 2/3: Peringatan Resiko Kritis`,
    html: `
      <div style="text-align: left; line-height: 1.6; font-size: 13px; color: #cbd5e1;">
        <p style="margin-bottom: 12px;">
          Apakah Anda <b>benar-benar sadar</b> ingin menghapus data ini?
        </p>
        <div style="padding: 12px; background: rgba(127, 29, 29, 0.4); border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 10px; font-size: 11px; color: #fca5a5; line-height: 1.5;">
          <strong style="color: #f87171; display: block; margin-bottom: 4px;">⚠️ PERINGATAN MUTLAK:</strong>
          • Pesan ulasan/keluhan akan dihapus <b>secara permanen dari database</b>.<br/>
          • Data yang sudah terhapus <b>TIDAK DAPAT DIKEMBALIKAN LAGI</b>.<br/>
          • Riwayat tidak dapat dipulihkan oleh admin manapun.
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Saya Sadar Resikonya, Lanjut Verifikasi ➔",
    cancelButtonText: "Batal, Jangan Hapus",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#334155",
    background: "#0f172a",
    color: "#f8fafc",
    iconColor: "#ef4444",
    backdrop: `rgba(15, 23, 42, 0.85)`,
    reverseButtons: true,
    customClass: {
      popup: "border border-rose-900/60 rounded-2xl shadow-2xl backdrop-blur-xl",
      title: "text-base font-bold text-rose-300",
      confirmButton: "px-5 py-2.5 rounded-xl font-semibold text-xs cursor-pointer shadow-lg",
      cancelButton: "px-5 py-2.5 rounded-xl font-semibold text-xs cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300",
    },
  });

  if (!step2.isConfirmed) return false;

  // ─── LANGKAH 3/3: Verifikasi Ketik Kata Kunci ───
  const step3 = await Swal.fire({
    icon: "question",
    title: `🚨 Langkah 3/3: Ketik "${keyword}" untuk Hapus`,
    html: `
      <div style="text-align: center; line-height: 1.5; font-size: 13px; color: #cbd5e1; margin-bottom: 8px;">
        Untuk menyelesaikan penghapusan, silakan ketik kata <b style="color: #f87171; font-family: monospace; font-size: 14px; background: rgba(239,68,68,0.2); padding: 2px 8px; border-radius: 4px;">${keyword}</b> pada kolom di bawah:
      </div>
    `,
    input: "text",
    inputPlaceholder: `Ketik "${keyword}" di sini...`,
    inputAttributes: {
      autocapitalize: "off",
      autocorrect: "off",
      autocomplete: "off",
      spellcheck: "false",
    },
    showCancelButton: true,
    confirmButtonText: "🔥 HAPUS SEKARANG",
    cancelButtonText: "Batal",
    confirmButtonColor: "#991b1b",
    cancelButtonColor: "#334155",
    background: "#0f172a",
    color: "#f8fafc",
    iconColor: "#f87171",
    backdrop: `rgba(15, 23, 42, 0.9)`,
    reverseButtons: true,
    customClass: {
      popup: "border border-rose-700/80 rounded-2xl shadow-2xl backdrop-blur-xl",
      title: "text-base font-bold text-slate-100",
      input: "bg-slate-900 border border-rose-500/50 text-white rounded-xl focus:border-rose-500 text-center font-mono tracking-widest font-bold uppercase",
      confirmButton: "px-6 py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-lg bg-rose-600 hover:bg-rose-700",
      cancelButton: "px-5 py-2.5 rounded-xl font-semibold text-xs cursor-pointer bg-slate-800 hover:bg-slate-700",
    },
    preConfirm: (value) => {
      if (!value || value.trim().toUpperCase() !== keyword.toUpperCase()) {
        Swal.showValidationMessage(`Kata konfirmasi salah! Ketik "${keyword}" dengan huruf kapital.`);
        return false;
      }
      return true;
    },
  });

  return !!step3.isConfirmed;
};

/**
 * Alert Sambutan Hangat Saat Pengguna Berhasil Masuk ke Dashboard
 */
export const showWelcomeAlert = (fullName: string, roleName: string) => {
  return Swal.fire({
    icon: "success",
    title: `Selamat Datang, ${fullName}! 🎉`,
    html: `
      <div style="text-align: center; line-height: 1.6; font-size: 13px; color: #cbd5e1; margin-top: 6px;">
        <div style="display: inline-block; padding: 4px 14px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.35); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #a5b4fc; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
          ${roleName}
        </div>
        <p style="margin: 0; font-size: 13px; color: #e2e8f0; font-weight: 500;">
          Selamat datang kembali <strong>${fullName}</strong>! Semoga harimu menyenangkan, sehat selalu, dan seluruh aktivitasmu hari ini berjalan lancar & sukses selalu! ✨
        </p>
      </div>
    `,
    timer: 3200,
    timerProgressBar: true,
    showConfirmButton: false,
    background: "#0f172a",
    color: "#f8fafc",
    iconColor: "#38bdf8",
    backdrop: `rgba(15, 23, 42, 0.8)`,
    customClass: {
      popup: "border border-indigo-500/40 rounded-2xl shadow-2xl backdrop-blur-xl",
      title: "text-lg font-extrabold text-white tracking-tight",
    },
  });
};

export default Swal;

