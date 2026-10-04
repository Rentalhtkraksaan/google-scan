"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

// Data Awal Bawaan Sistem (Seeding Otomatis saat DB kosong)
const DEFAULT_GUIDE_SEEDS = [
  // 1. MODUL SUPER ADMIN
  {
    category: "SUPER_ADMIN",
    orderNumber: 1,
    title: "1. Tingkatan Hak Akses: Super Admin 1 vs Super Admin 2",
    tag: "Keamanan Sistem",
    tagColor: "emerald",
    summary: "Memahami wewenang Master Founder (SA 1) dan operasional sistem (SA 2).",
    iconName: "ShieldCheck",
    contentHtml: `<p>Sistem Smart QR Review membedakan peran Super Admin menjadi dua tingkatan hierarki untuk menjamin keamanan database dan stabilitas operasional:</p>
<div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
  <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
    <div class="flex items-center gap-1.5 font-bold text-amber-300">
      <span>👑 Super Admin 1 (Master / Founder)</span>
    </div>
    <ul class="list-disc list-inside space-y-1 text-slate-300 text-[11.5px]">
      <li><strong>Otoritas Tertinggi:</strong> Pemegang akun utama sistem.</li>
      <li><strong>Izin Tambah, Edit & Hapus Panduan:</strong> Dapat menambah, mengedit, dan menghapus seluruh isi buku panduan sistem.</li>
      <li><strong>Izin Hapus Data Permanen:</strong> Satu-satunya role yang memiliki tombol hapus untuk Kartu QR, Outlet, Admin Lapangan, dan Invoice.</li>
      <li><strong>Delegasi Hak Akses:</strong> Dapat memberikan/mencabut izin edit landing page, manajemen template cetak, dan analitik untuk SA 2.</li>
    </ul>
  </div>
  <div class="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-2">
    <div class="flex items-center gap-1.5 font-bold text-indigo-300">
      <span>💼 Super Admin 2 (Operasional Harian)</span>
    </div>
    <ul class="list-disc list-inside space-y-1 text-slate-300 text-[11.5px]">
      <li><strong>Manajemen Operasional:</strong> Input kartu baru, alokasi kartu ke admin lapangan, dan registrasi outlet.</li>
      <li><strong>Izin Edit Buku Panduan:</strong> Bebas mengedit dan memperbarui materi buku panduan di admin, outlet, maupun FAQ.</li>
      <li><strong>Proteksi Tanpa Tombol Hapus:</strong> Tombol hapus disembunyikan total untuk mencegah kecelakaan kehilangan data penting.</li>
      <li><strong>Akses Fitur Terbatas:</strong> Fitur sensitif (seperti ganti landing page atau template cetak) memerlukan izin dari SA 1.</li>
    </ul>
  </div>
</div>`,
  },
  {
    category: "SUPER_ADMIN",
    orderNumber: 2,
    title: "2. Manajemen Kartu QR NFC & Alokasi Jatah Mitra",
    tag: "Inventori Kartu",
    tagColor: "indigo",
    summary: "Cara input kartu baru (Satuan / Massal), alokasi ke admin, dan scanning kartu.",
    iconName: "QrCode",
    contentHtml: `<p>Semua kartu fisik NFC yang dicetak wajib didaftarkan ke sistem terlebih dahulu sebelum dapat digunakan oleh admin lapangan atau dipasang di outlet mitra:</p>
<div class="space-y-2.5">
  <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
    <strong class="text-white block mb-1">A. Input Kartu Baru (Satuan & Massal / Batch):</strong>
    <p class="text-[11.5px] text-slate-400 mb-2">
      Klik tombol <strong>"Input Kartu Baru"</strong> di kanan atas dashboard. Anda dapat memasukkan 1 kode kartu atau menggunakan fitur Batch Input untuk mengenerate ratusan kode kartu acak/berurutan secara otomatis.
    </p>
    <div class="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300">
      Kolam Pusat (Unassigned) ➜ Ditugaskan ke Admin Lapangan ➜ Terhubung ke Outlet Mitra
    </div>
  </div>
  <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
    <strong class="text-white block mb-1">B. Alokasi Kartu ke Admin Lapangan:</strong>
    <p class="text-[11.5px] text-slate-400">
      Pilih kartu di tabel kartu, klik menu <em>"Tugaskan Admin"</em>, lalu pilih Admin Lapangan yang akan membawa fisik kartu tersebut. Kartu akan langsung masuk ke kuota kosong milik admin tersebut.
    </p>
  </div>
</div>`,
  },
  {
    category: "SUPER_ADMIN",
    orderNumber: 3,
    title: "3. Cetak Invoice Penjualan Resmi (JPG Resolusi Tinggi)",
    tag: "Penjualan & Keuangan",
    tagColor: "teal",
    summary: "Panduan menerbitkan invoice, edit rekening & logo, status Lunas/DP, dan simpan DB.",
    iconName: "Receipt",
    contentHtml: `<p>Super Admin 1 & 2 dapat mencetak lembar invoice resmi beresolusi tinggi (Retina 2x, 300 DPI) yang langsung tersimpan di galeri/download perangkat:</p>
<ul class="list-disc list-inside space-y-1.5 text-slate-300 text-[11.5px]">
  <li><strong>Buka Form Invoice:</strong> Klik menu <em>"Cetak Invoice"</em> di sidebar atau tombol hijau di header dashboard.</li>
  <li><strong>Rincian Pesanan & Status Bayar:</strong> Tambah item barang atau gunakan preset cepat. Pilih status <strong>LUNAS</strong> atau <strong>DP (Uang Muka)</strong>.</li>
  <li><strong>Pengaturan Rekening Fleksibel:</strong> Nama bank, nomor rekening, dan nama pemilik (a/n) dapat diedit bebas untuk setiap invoice.</li>
  <li><strong>Unduh JPG & Kirim WhatsApp:</strong> Klik <em>"Unduh JPG"</em> untuk menyimpan file gambar atau klik <em>"Kirim WhatsApp"</em> untuk membagikan ringkasan transaksi.</li>
</ul>`,
  },
  {
    category: "SUPER_ADMIN",
    orderNumber: 4,
    title: "4. Pengaturan Website Landing Page, Logo & SEO",
    tag: "Branding & Web",
    tagColor: "purple",
    summary: "Kustomisasi tampilan depan website, nomor kontak CS, logo navbar, dan favicon.",
    iconName: "Globe",
    contentHtml: `<p>Super Admin dapat mengubah teks dan identitas brand di halaman publik (Landing Page):</p>
<ul class="list-disc list-inside space-y-1.5 text-slate-300 text-[11.5px]">
  <li><strong>WhatsApp CS Admin:</strong> Nomor WhatsApp utama untuk menerima pesanan dan konsultasi dari calon klien.</li>
  <li><strong>Headline & Subheadline Hero:</strong> Teks promosi utama penarik minat pengunjung website.</li>
  <li><strong>Logo Landing Page & Favicon:</strong> Upload logo gambar PNG transparan persegi agar tampil jernih di navbar atas dan ikon tab browser.</li>
  <li><strong>SEO Meta Tag:</strong> Atur judul Google Search dan meta deskripsi agar website mudah ditemukan di pencarian Google.</li>
</ul>`,
  },

  // 2. MODUL ADMIN LAPANGAN (MITRA)
  {
    category: "ADMIN",
    orderNumber: 1,
    title: "1. Alur Kerja & Tanggung Jawab Admin Lapangan",
    tag: "Distribusi Lapangan",
    tagColor: "emerald",
    summary: "Peran utama mitra lapangan dari terima kartu hingga aktivasi di outlet klien.",
    iconName: "Briefcase",
    contentHtml: `<p>Sebagai Admin Lapangan (Mitra Distribusi), tugas utama Anda adalah mendampingi pemilik usaha kuliner, cafe, hotel, dan toko untuk melipatgandakan ulasan bintang 5 Google Maps mereka:</p>
<div class="space-y-2 text-[11.5px] pt-1">
  <div class="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
    <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono">LANGKAH 1</span>
    <span>Terima jatah kartu NFC fisik kosong dari Super Admin Pusat.</span>
  </div>
  <div class="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
    <span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold font-mono">LANGKAH 2</span>
    <span>Kunjungi calon klien, lakukan demo tap HP di meja mereka.</span>
  </div>
  <div class="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
    <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold font-mono">LANGKAH 3</span>
    <span>Daftarkan outlet baru melalui dashboard Admin Lapangan.</span>
  </div>
  <div class="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
    <span class="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold font-mono">LANGKAH 4</span>
    <span>Kirim detail akun login portal ke WhatsApp pemilik outlet dengan 1 klik.</span>
  </div>
</div>`,
  },
  {
    category: "ADMIN",
    orderNumber: 2,
    title: "2. Pendaftaran Outlet Baru (1-Click WhatsApp Onboarding)",
    tag: "Registrasi Outlet",
    tagColor: "teal",
    summary: "Cara mendaftarkan outlet dan mengirimkan kredensial login otomatis via WhatsApp.",
    iconName: "UserCheck",
    contentHtml: `<p>Pendaftaran outlet mitra kini sangat cepat dan otomatis:</p>
<ol class="list-decimal list-inside space-y-1.5 text-[11.5px] text-slate-300 pl-1">
  <li>Klik tombol hijau <strong>"+ Daftarkan Outlet Baru"</strong> di dashboard Anda.</li>
  <li>Pilih salah satu <strong>Kode Kartu Kosong</strong> dari kuota kartu yang Anda pegang.</li>
  <li>Isi nama outlet, nama pemilik, nomor WhatsApp aktif pemilik, dan password awal.</li>
  <li>Masukkan link resmi <strong>Google Review</strong> toko (bisa diambil dari Google Maps pemilik toko).</li>
  <li>Klik <strong>"Simpan & Aktifkan Outlet"</strong>.</li>
  <li>Klik tombol <span class="text-emerald-400 font-bold">"📲 Kirim Detail Akses ke WhatsApp Klien"</span> untuk mengirim rincian akun otomatis ke nomor pelanggan.</li>
</ol>`,
  },
  {
    category: "ADMIN",
    orderNumber: 3,
    title: "3. Cara Mengajukan Tambahan Jatah Kuota Kartu",
    tag: "Stok Kartu",
    tagColor: "emerald",
    summary: "Prosedur pemesanan kartu fisik & standee grosir melalui Keranjang Reseller.",
    iconName: "ShoppingCart",
    contentHtml: `<p>Jika kuota kartu kosong Anda habis atau ingin menambah stok lapangan:</p>
<div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11.5px] space-y-2">
  <div class="flex items-center gap-1.5 font-bold text-emerald-300">
    <span>🛒 Menu "Keranjang Reseller / Beli Kartu"</span>
  </div>
  <p>
    Klik tombol keranjang di dashboard Anda untuk memilih paket kartu atau standee dengan harga grosir resmi. Data akun Anda otomatis terhubung sehingga pesanan langsung diproses dan dikirim oleh Super Admin.
  </p>
</div>`,
  },
  {
    category: "ADMIN",
    orderNumber: 4,
    title: "4. Tips Edukasi & Penempatan Standee di Outlet",
    tag: "Tips Lapangan",
    tagColor: "purple",
    summary: "Posisi ideal kartu standee agar menghasilkan ratusan review ulasan setiap minggu.",
    iconName: "Lightbulb",
    contentHtml: `<ul class="list-disc list-inside space-y-1.5 text-slate-300 text-[11.5px]">
  <li><strong>Meja Kasir:</strong> Tempatkan standee akrilik A5 tepat di depan kasir saat pelanggan menunggu struk atau kembalian.</li>
  <li><strong>Tengah Meja Makan:</strong> Untuk restoran/cafe, pasang standee mini di tengah meja bersama nomor meja.</li>
  <li><strong>Instruksi Singkat Staf Kasir:</strong> Edukasi kasir agar berkata: <em>"Kak, boleh minta tolong tap kartu di sini sebentar ya untuk bintang ulasannya, terima kasih banyak!"</em>.</li>
  <li><strong>Edukasi Hak Cipta Desain:</strong> Berikan pemahaman kepada pemilik outlet bahwa seluruh desain fisik standee akrilik dan kartu Smart QR dilindungi oleh <strong>Hak Cipta (HAKI)</strong>. Dilarang keras mencetak sendiri.</li>
</ul>`,
  },

  // 3. MODUL OUTLET MITRA
  {
    category: "OUTLET",
    orderNumber: 1,
    title: "1. Cara Kerja Kartu NFC & Standee Akrilik di Meja",
    tag: "Teknologi Tap",
    tagColor: "indigo",
    summary: "Kemudahan pengunjung memberikan ulasan hanya dengan menempelkan HP.",
    iconName: "Smartphone",
    contentHtml: `<p>Kartu Smart QR Review menggabungkan dua teknologi canggih tanpa perlu menginstal aplikasi apa pun:</p>
<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
  <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
    <div class="flex items-center gap-1.5 text-indigo-400 font-bold">
      <span>📱 Teknologi Tap NFC</span>
    </div>
    <p class="text-[11px] text-slate-400">
      Pengunjung cukup menempelkan bagian belakang HP (iPhone / Android) ke logo kartu. Layar HP akan langsung memunculkan pop-up formulir ulasan dalam hitungan detik.
    </p>
  </div>
  <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
    <div class="flex items-center gap-1.5 text-emerald-400 font-bold">
      <span>📷 Scan Kode QR Kamera</span>
    </div>
    <p class="text-[11px] text-slate-400">
      Untuk HP yang belum memiliki fitur NFC, pengunjung cukup membuka kamera bawaan HP dan mengarahkan ke kode QR yang tercetak di standee akrilik.
    </p>
  </div>
</div>`,
  },
  {
    category: "OUTLET",
    orderNumber: 2,
    title: "2. Sistem Filter Ulasan Cerdas (Bintang 5 vs Bintang 1-3)",
    tag: "Perlindungan Rating",
    tagColor: "amber",
    summary: "Bagaimana sistem melindungi reputasi toko Anda dari ulasan negatif publik.",
    iconName: "Star",
    contentHtml: `<p>Sistem kami dirancang khusus agar rating toko Anda di Google Maps selalu terjaga tinggi:</p>
<div class="space-y-2.5">
  <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
    <div class="flex items-center gap-2 text-emerald-300 font-bold">
      <span>⭐ Jika Pengunjung Memilih Bintang 4 atau 5 (Puas / Senang)</span>
    </div>
    <p class="text-[11.5px] text-slate-300">
      Muncul animasi perayaan confetti dan pop-up ramah: <em>"Tunggu sebentar ya... Anda sedang dialihkan ke Google Review..."</em>. Pengunjung otomatis dibawa langsung ke kolom ulasan resmi Google Maps toko Anda untuk menaruh bintang 5 secara publik.
    </p>
  </div>
  <div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1.5">
    <div class="flex items-center gap-2 text-rose-300 font-bold">
      <span>⚠️ Jika Pengunjung Memilih Bintang 1, 2, atau 3 (Kritik / Kurang Puas)</span>
    </div>
    <p class="text-[11.5px] text-slate-300">
      Pengunjung <strong>TIDAK AKAN dialihkan ke Google Review</strong> sehingga reputasi Google toko Anda aman dari bintang 1 publik! Sebagai gantinya, muncul form privat santun: pengunjung mengisi nama dan isi kritik, lalu pesan akan <strong>langsung terkirim privat ke WhatsApp Pemilik Toko</strong>.
    </p>
  </div>
</div>`,
  },
  {
    category: "OUTLET",
    orderNumber: 3,
    title: "3. Menambah Kartu Fisik untuk Meja Baru",
    tag: "Pengembangan Usaha",
    tagColor: "sky",
    summary: "Langkah mudah memesan tambahan standee akrilik jika usaha Anda bertambah meja.",
    iconName: "CreditCard",
    contentHtml: `<p>Jika outlet Anda menambah cabang atau meja makan baru:</p>
<div class="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-[11.5px] space-y-2">
  <p>
    Cukup klik tombol <strong>"Minta Tambah Kartu QR"</strong> di portal ini. WhatsApp otomatis terbuka menghubungi Admin Pendamping resmi Anda untuk pengiriman standee tambahan yang langsung siap pakai tanpa setting ulang.
  </p>
</div>`,
  },
  {
    category: "OUTLET",
    orderNumber: 4,
    title: "4. Peringatan Hak Cipta & Larangan Menggandakan Desain Fisik",
    tag: "Hak Cipta (HAKI)",
    tagColor: "rose",
    summary: "Ketentuan hukum perlindungan Hak Kekayaan Intelektual dan larangan keras menduplikasi desain.",
    iconName: "ShieldAlert",
    contentHtml: `<div class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
  <div class="flex items-center gap-2 text-rose-300 font-bold text-xs sm:text-sm">
    <span>🛡️ Dilarang Keras Menggandakan / Meniru Desain Fisik</span>
  </div>
  <p class="text-[11.5px] text-slate-300">
    Seluruh bentuk desain fisik standee akrilik, tata letak visual kartu NFC, tipografi, logo, kombinasi warna, dan elemen visual <strong>Smart QR Review</strong> merupakan karya cipta yang <strong>dilindungi oleh Undang-Undang Hak Cipta & Hak Kekayaan Intelektual (HAKI)</strong>. Dilarang mencetak mandiri atau memperbanyak desain tanpa izin tertulis.
  </p>
</div>`,
  },
  {
    category: "OUTLET",
    orderNumber: 5,
    title: "5. Panduan Lengkap Fitur Member VIP & Eksklusif",
    tag: "Fitur VIP",
    tagColor: "amber",
    summary: "Panduan lengkap Suara AI Sebut Toko, Efek Kasir, Multi-Kasir, Medsos, & E-Menu Digital.",
    iconName: "Sparkles",
    contentHtml: `<div class="space-y-3 text-[11.5px]">
  <p><strong>Member VIP</strong> adalah paket keanggotaan eksklusif yang membuka seluruh kecanggihan teknologi ulasan interaktif untuk toko Anda:</p>
  <div class="space-y-2">
    <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
      <strong className="text-indigo-300">🎙️ Suara AI Sebut Toko:</strong> HP pelanggan otomatis berbicara ramah menyebut nama usaha Anda saat memberi bintang 5.
    </div>
    <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
      <strong className="text-amber-300">🔔 4 Efek Suara Kasir:</strong> Pilihan nada dering kasir cuan (Cha-Ching, Lonceng, Kristal, Fanfare).
    </div>
    <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
      <strong className="text-teal-300">📢 Mode Speaker Bluetooth:</strong> Hubungkan HP kasir ke sound system toko/kafe untuk mengumumkan ulasan bintang 5 live.
    </div>
    <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
      <strong className="text-emerald-300">📲 Multi-Kasir QR Pairing:</strong> Hubungkan banyak HP staf kasir/barista tanpa perlu membagikan password akun toko.
    </div>
    <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
      <strong className="text-pink-300">📸 Medsos & E-Menu Digital Multi-Foto:</strong> Tampilkan link Instagram, TikTok, dan Galeri Foto Lembar Menu makanan/minuman interaktif.
    </div>
  </div>
</div>`,
  },

  // 4. DATA FAQ & TROUBLESHOOTING
  {
    category: "FAQ",
    orderNumber: 1,
    title: "Bagaimana jika HP Pengunjung tidak merespons saat ditempelkan NFC?",
    tag: "Hardware & NFC",
    tagColor: "amber",
    summary: "Penyebab umum dan panduan cepat bagi pengunjung saat tap NFC.",
    iconName: "HelpCircle",
    contentHtml: `<ul class="list-disc list-inside space-y-1 text-[11.5px] text-slate-300">
  <li><strong>NFC Belum Aktif (Android):</strong> Pastikan fitur NFC sudah diaktifkan di panel pull-down menu atas HP. Pada iPhone X ke atas, NFC selalu aktif otomatis.</li>
  <li><strong>Letak Sensor NFC:</strong> Pada iPhone di ujung atas belakang kamera; pada Android umumnya di tengah bodi belakang.</li>
  <li><strong>Casing Logam/Tebal:</strong> Casing logam tebal dapat menghalangi sinyal radio NFC.</li>
  <li><strong>Solusi Alternatif:</strong> Pengunjung selalu bisa membuka kamera HP untuk scan <strong>Kode QR</strong> di standee.</li>
</ul>`,
  },
  {
    category: "FAQ",
    orderNumber: 2,
    title: "Bagaimana cara mengubah Link Google Review jika toko ganti nama / URL?",
    tag: "Pengaturan URL",
    tagColor: "indigo",
    summary: "Prosedur memperbarui link tujuan ulasan kartu yang sudah beredar.",
    iconName: "HelpCircle",
    contentHtml: `<p class="text-[11.5px] text-slate-300">
  Kartu Smart QR Review bersifat <strong>Cloud-Dynamic</strong>! Anda tidak perlu mencetak kartu baru jika link Google Maps toko berubah. Cukup hubungi Admin untuk mengubah link Google Review di dashboard, dan seluruh kartu fisik di meja akan otomatis terhubung ke link baru seketika.
</p>`,
  },
  {
    category: "FAQ",
    orderNumber: 3,
    title: "Apakah data pelanggan yang memberi kritik aman?",
    tag: "Privasi & Database",
    tagColor: "emerald",
    summary: "Kebijakan nol penyimpanan database untuk masukan kritik pengunjung.",
    iconName: "HelpCircle",
    contentHtml: `<p class="text-[11.5px] text-slate-300">
  Sangat aman! Kritik dan masukan pengunjung pada rating bintang 1-3 <strong>tidak disimpan di database server</strong>. Pesan langsung diformat ke chat WhatsApp pribadi pengelola outlet untuk menjamin kerahasiaan evaluasi internal.
</p>`,
  },
  {
    category: "FAQ",
    orderNumber: 4,
    title: "Apakah outlet boleh mencetak sendiri standee akrilik atau menduplikasi desain kartu?",
    tag: "Hak Cipta (HAKI)",
    tagColor: "rose",
    summary: "Ketentuan resmi mengenai larangan keras mencetak mandiri atau meniru desain produk.",
    iconName: "ShieldAlert",
    contentHtml: `<p class="text-[11.5px] text-rose-400 font-bold mb-1">
  🚫 DILARANG KERAS (TIDAK DIPERBOLEHKAN).
</p>
<p class="text-[11.5px] text-slate-300">
  Seluruh desain fisik kartu dan standee akrilik Smart QR Review merupakan <strong>Kekayaan Intelektual resmi yang dilindungi oleh Undang-Undang Hak Cipta</strong>. Penambahan unit wajib dipesan resmi melalui tombol <em>"Minta Tambah Kartu QR"</em> di portal atau melalui Admin Lapangan pendamping Anda.
</p>`,
  },
];

/**
 * Memuat seluruh artikel buku panduan dari database.
 * Jika tabel masih kosong, otomatis seed data awal default.
 */
export async function getGuideArticlesAction(category?: string) {
  try {
    let count = await prisma.guideArticle.count();

    if (count === 0) {
      // Otomatis seed data default
      for (const item of DEFAULT_GUIDE_SEEDS) {
        await prisma.guideArticle.create({
          data: {
            category: item.category,
            orderNumber: item.orderNumber,
            title: item.title,
            tag: item.tag,
            tagColor: item.tagColor,
            summary: item.summary,
            contentHtml: item.contentHtml,
            iconName: item.iconName,
            isPublished: true,
          },
        });
      }
    }

    const articles = await prisma.guideArticle.findMany({
      where: category ? { category, isPublished: true } : { isPublished: true },
      orderBy: [{ category: "asc" }, { orderNumber: "asc" }, { createdAt: "asc" }],
    });

    return { success: true, data: articles };
  } catch (error) {
    console.error("getGuideArticlesAction error:", error);
    return { success: false, message: "Gagal memuat artikel panduan.", data: [] };
  }
}

/**
 * Tambah Artikel Panduan Baru (Super Admin 1 & Super Admin 2)
 */
export async function createGuideArticleAction(data: {
  category: string;
  title: string;
  tag?: string;
  tagColor?: string;
  summary: string;
  contentHtml: string;
  iconName?: string;
  orderNumber?: number;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Hanya Super Admin yang memiliki hak akses untuk menambah modul buku panduan." };
    }

    if (!data.title?.trim() || !data.contentHtml?.trim()) {
      return { success: false, message: "Judul dan isi konten panduan wajib diisi." };
    }

    const created = await prisma.guideArticle.create({
      data: {
        category: (data.category || "OUTLET").trim().toUpperCase(),
        title: data.title.trim(),
        tag: data.tag?.trim() || "Panduan",
        tagColor: data.tagColor?.trim() || "indigo",
        summary: data.summary?.trim() || "",
        contentHtml: data.contentHtml.trim(),
        iconName: data.iconName?.trim() || "BookOpen",
        orderNumber: Number(data.orderNumber) || 0,
        isPublished: true,
        createdById: session.user.id,
      },
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");
    revalidatePath("/portal");

    return { success: true, message: "Bab panduan berhasil ditambahkan ke buku panduan.", data: created };
  } catch (error) {
    console.error("createGuideArticleAction error:", error);
    return { success: false, message: "Terjadi kesalahan saat menambahkan bab panduan." };
  }
}

/**
 * Edit / Update Artikel Panduan (Super Admin 1 & Super Admin 2)
 */
export async function updateGuideArticleAction(
  id: string,
  data: {
    category?: string;
    title?: string;
    tag?: string;
    tagColor?: string;
    summary?: string;
    contentHtml?: string;
    iconName?: string;
    orderNumber?: number;
    isPublished?: boolean;
  }
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Hanya Super Admin yang memiliki hak akses untuk mengedit modul buku panduan." };
    }

    const existing = await prisma.guideArticle.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, message: "Artikel panduan tidak ditemukan dalam sistem." };
    }

    const updated = await prisma.guideArticle.update({
      where: { id },
      data: {
        ...(data.category ? { category: data.category.trim().toUpperCase() } : {}),
        ...(data.title ? { title: data.title.trim() } : {}),
        ...(data.tag ? { tag: data.tag.trim() } : {}),
        ...(data.tagColor ? { tagColor: data.tagColor.trim() } : {}),
        ...(data.summary !== undefined ? { summary: data.summary.trim() } : {}),
        ...(data.contentHtml ? { contentHtml: data.contentHtml.trim() } : {}),
        ...(data.iconName ? { iconName: data.iconName.trim() } : {}),
        ...(data.orderNumber !== undefined ? { orderNumber: Number(data.orderNumber) || 0 } : {}),
        ...(data.isPublished !== undefined ? { isPublished: Boolean(data.isPublished) } : {}),
        updatedById: session.user.id,
      },
    });

    revalidatePath("/super-admin");
    revalidatePath("/admin");
    revalidatePath("/portal");

    return { success: true, message: "Bab panduan berhasil diperbarui.", data: updated };
  } catch (error) {
    console.error("updateGuideArticleAction error:", error);
    return { success: false, message: "Terjadi kesalahan saat memperbarui bab panduan." };
  }
}

/**
 * Hapus Artikel Panduan (KHUSUS Super Admin 1 Master)
 */
export async function deleteGuideArticleAction(id: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== "SUPER_ADMIN") {
      return { success: false, message: "Hanya Super Admin yang memiliki hak akses ke modul panduan." };
    }

    // Super Admin 2 Dilarang Menghapus
    if (!session.user.isSuperAdminMaster) {
      return {
        success: false,
        message: "Akses Ditolak: Hanya Super Admin 1 (Master / Founder) yang berwenang menghapus bab panduan secara permanen.",
      };
    }

    await prisma.guideArticle.delete({ where: { id } });

    revalidatePath("/super-admin");
    revalidatePath("/admin");
    revalidatePath("/portal");

    return { success: true, message: "Bab panduan berhasil dihapus dari sistem." };
  } catch (error) {
    console.error("deleteGuideArticleAction error:", error);
    return { success: false, message: "Terjadi kesalahan saat menghapus bab panduan." };
  }
}

/**
 * Reset Seluruh Panduan ke Default Bawaan (Khusus Super Admin 1)
 */
export async function resetDefaultGuidesAction(): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== "SUPER_ADMIN" || !session.user.isSuperAdminMaster) {
      return { success: false, message: "Hanya Super Admin 1 Master yang berwenang mereset buku panduan." };
    }

    await prisma.guideArticle.deleteMany({});

    for (const item of DEFAULT_GUIDE_SEEDS) {
      await prisma.guideArticle.create({
        data: {
          category: item.category,
          orderNumber: item.orderNumber,
          title: item.title,
          tag: item.tag,
          tagColor: item.tagColor,
          summary: item.summary,
          contentHtml: item.contentHtml,
          iconName: item.iconName,
          isPublished: true,
          createdById: session.user.id,
        },
      });
    }

    revalidatePath("/super-admin");
    revalidatePath("/admin");
    revalidatePath("/portal");

    return { success: true, message: "Seluruh buku panduan berhasil direset ke modul standar bawaan sistem." };
  } catch (error) {
    console.error("resetDefaultGuidesAction error:", error);
    return { success: false, message: "Gagal mereset buku panduan." };
  }
}
