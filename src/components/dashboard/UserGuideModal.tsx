"use client";

import { useState, useMemo } from "react";
import {
  X,
  BookOpen,
  Search,
  ShieldCheck,
  Briefcase,
  Store,
  HelpCircle,
  QrCode,
  CreditCard,
  Receipt,
  Star,
  MessageCircle,
  Smartphone,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  AlertTriangle,
  Lightbulb,
  FileText,
  UserCheck,
  Clock,
  Printer,
  Globe,
} from "lucide-react";

export type GuideRole = "SUPER_ADMIN" | "ADMIN" | "OUTLET" | "FAQ";

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: GuideRole;
}

interface GuideSection {
  id: string;
  title: string;
  icon: any;
  tag: string;
  tagColor: string;
  summary: string;
  content: React.ReactNode;
}

export function UserGuideModal({
  isOpen,
  onClose,
  initialRole = "SUPER_ADMIN",
}: UserGuideModalProps) {
  const [activeTab, setActiveTab] = useState<GuideRole>(initialRole);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "sa-1": true,
    "admin-1": true,
    "outlet-1": true,
    "faq-1": true,
  });

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    activeSections.forEach((s) => (all[s.id] = true));
    setExpandedSections(all);
  };

  const collapseAll = () => {
    setExpandedSections({});
  };

  // 1. DATA MODUL SUPER ADMIN
  const superAdminSections: GuideSection[] = [
    {
      id: "sa-1",
      title: "1. Tingkatan Hak Akses: Super Admin 1 vs Super Admin 2",
      icon: ShieldCheck,
      tag: "Keamanan Sistem",
      tagColor: "emerald",
      summary: "Memahami wewenang Master Founder (SA 1) dan operasional sistem (SA 2).",
      content: (
        <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
          <p>
            Sistem Smart QR Review membedakan peran Super Admin menjadi dua tingkatan hierarki untuk menjamin keamanan database dan stabilitas operasional:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <Sparkles className="w-4 h-4" />
                <span>Super Admin 1 (Master / Founder)</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11.5px]">
                <li><strong>Otoritas Tertinggi:</strong> Pemegang akun utama sistem.</li>
                <li><strong>Izin Hapus Data Permanen:</strong> Satu-satunya role yang memiliki tombol hapus untuk Kartu QR, Outlet, Admin Lapangan, dan Invoice.</li>
                <li><strong>Delegasi Hak Akses:</strong> Dapat memberikan/mencabut izin edit landing page, manajemen template cetak, dan analitik untuk SA 2.</li>
                <li><strong>Backup & Pulihkan Database:</strong> Akses menu pencadangan data otomatis.</li>
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                <Briefcase className="w-4 h-4" />
                <span>Super Admin 2 (Operasional Harian)</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11.5px]">
                <li><strong>Manajemen Operasional:</strong> Input kartu baru, alokasi kartu ke admin lapangan, dan registrasi outlet.</li>
                <li><strong>Cetak & Kelola Invoice:</strong> Bebas membuat, mengedit, dan mengunduh invoice penjualan JPG resolusi tinggi.</li>
                <li><strong>Proteksi Tanpa Tombol Hapus:</strong> Tombol hapus disembunyikan total untuk mencegah kecelakaan kehilangan data penting.</li>
                <li><strong>Akses Fitur Terbatas:</strong> Fitur sensitif (seperti ganti landing page atau template cetak) memerlukan izin dari SA 1.</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "sa-2",
      title: "2. Manajemen Kartu QR NFC & Alokasi Jatah Mitra",
      icon: QrCode,
      tag: "Inventori Kartu",
      tagColor: "indigo",
      summary: "Cara input kartu baru (Satuan / Massal), alokasi ke admin, dan scanning kartu.",
      content: (
        <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
          <p>
            Semua kartu fisik NFC yang dicetak wajib didaftarkan ke sistem terlebih dahulu sebelum dapat digunakan oleh admin lapangan atau dipasang di outlet mitra:
          </p>
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <strong className="text-white block mb-1">A. Input Kartu Baru (Satuan & Massal / Batch):</strong>
              <p className="text-[11.5px] text-slate-400 mb-2">
                Klik tombol <strong>"Input Kartu Baru"</strong> di kanan atas dashboard. Anda dapat memasukkan 1 kode kartu atau menggunakan fitur Batch Input untuk mengenerate ratusan kode kartu acak/berurutan secara otomatis.
              </p>
              <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300">
                Kolam Pusat (Unassigned) ➜ Ditugaskan ke Admin Lapangan ➜ Terhubung ke Outlet Mitra
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <strong className="text-white block mb-1">B. Alokasi Kartu ke Admin Lapangan:</strong>
              <p className="text-[11.5px] text-slate-400">
                Pilih kartu di tabel kartu, klik menu <em>"Tugaskan Admin"</em>, lalu pilih Admin Lapangan yang akan membawa fisik kartu tersebut. Kartu akan langsung masuk ke kuota kosong milik admin tersebut.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <strong className="text-white block mb-1">C. Scanner Kamera & Pulihkan Kartu:</strong>
              <p className="text-[11.5px] text-slate-400">
                Gunakan tombol <strong>"Scan / Pulihkan Kartu"</strong> untuk membuka kamera laptop/HP. Sangat berguna untuk mengecek status kartu fisik atau mengembalikan kartu bekas ke kolam kartu kosong siap pakai.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "sa-3",
      title: "3. Cetak Invoice Penjualan Resmi (JPG Resolusi Tinggi)",
      icon: Receipt,
      tag: "Penjualan & Keuangan",
      tagColor: "teal",
      summary: "Panduan menerbitkan invoice, edit rekening & logo, status Lunas/DP, dan simpan DB.",
      content: (
        <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
          <p>
            Super Admin 1 & 2 dapat mencetak lembar invoice resmi beresolusi tinggi (Retina 2x, 300 DPI) yang langsung tersimpan di galeri/download perangkat:
          </p>
          <div className="space-y-2 text-[11.5px]">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-300 flex items-center justify-center shrink-0 font-bold">1</span>
              <div>
                <strong>Buka Form Invoice:</strong> Klik menu <em>"Cetak Invoice"</em> di sidebar atau tombol hijau di header dashboard.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-300 flex items-center justify-center shrink-0 font-bold">2</span>
              <div>
                <strong>Pilih Outlet / Ketik Pemesan:</strong> Bisa pilih langsung dari daftar outlet mitra atau ketik nama pemesan dan nomor WhatsApp secara manual.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-300 flex items-center justify-center shrink-0 font-bold">3</span>
              <div>
                <strong>Rincian Pesanan & Status Bayar:</strong> Tambah item barang atau gunakan preset cepat (Standee Akrilik A5, A6, Kartu PVC). Pilih status <strong>LUNAS</strong> atau <strong>DP (Uang Muka)</strong>. Sistem otomatis menghitung sisa pelunasan.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-300 flex items-center justify-center shrink-0 font-bold">4</span>
              <div>
                <strong>Pengaturan Rekening Fleksibel:</strong> Nama bank (BCA, Mandiri, BRI, QRIS, dll), nomor rekening, dan nama pemilik (a/n) dapat diedit bebas untuk setiap invoice.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-300 flex items-center justify-center shrink-0 font-bold">5</span>
              <div>
                <strong>Logo Invoice:</strong> Otomatis menggunakan Logo Landing Page website. Tersedia tombol upload jika ingin memakai logo khusus pesanan tersebut.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-300 flex items-center justify-center shrink-0 font-bold">6</span>
              <div>
                <strong>Unduh JPG & Kirim WhatsApp:</strong> Klik <em>"Unduh JPG"</em> untuk menyimpan file gambar atau klik <em>"Kirim WhatsApp"</em> untuk membagikan ringkasan transaksi ke nomor pelanggan secara otomatis. Seluruh invoice tersimpan di database tab <strong>"Riwayat DB"</strong>.
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "sa-4",
      title: "4. Pengaturan Website Landing Page, Logo & SEO",
      icon: Globe,
      tag: "Branding & Web",
      tagColor: "purple",
      summary: "Kustomisasi tampilan depan website, nomor kontak CS, logo navbar, dan favicon.",
      content: (
        <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
          <p>
            Super Admin dapat mengubah teks dan identitas brand di halaman publik (Landing Page):
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-[11.5px]">
            <li><strong>WhatsApp CS Admin:</strong> Nomor WhatsApp utama untuk menerima pesanan dan konsultasi dari calon klien di landing page.</li>
            <li><strong>Headline & Subheadline Hero:</strong> Teks promosi utama penarik minat pengunjung website.</li>
            <li><strong>Logo Landing Page & Favicon:</strong> Upload logo gambar PNG transparan persegi agar tampil jernih di navbar atas dan ikon tab browser.</li>
            <li><strong>SEO Meta Tag:</strong> Atur judul Google Search dan meta deskripsi agar website mudah ditemukan di pencarian Google.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sa-5",
      title: "5. Live Ticker Realtime & Leaderboard Admin Lapangan",
      icon: Clock,
      tag: "Monitoring & KPI",
      tagColor: "sky",
      summary: "Memantau arus scan ulasan live dan apresiasi performa admin lapangan terbaik.",
      content: (
        <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
          <p>
            Sistem dilengkapi fitur pemantauan aktivitas langsung tanpa perlu reload halaman:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <strong className="text-emerald-400 block font-bold">🟢 Live Activity Ticker</strong>
              <p className="text-[11px] text-slate-400">
                Menampilkan running text real-time aktivitas sistem seperti: ada ulasan kartu baru, registrasi outlet baru oleh mitra lapangan, dan alokasi kartu. Auto-polling setiap 15 detik.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <strong className="text-amber-400 block font-bold">🏆 Leaderboard Gamifikasi</strong>
              <p className="text-[11px] text-slate-400">
                Peringkat podium (🥇 Emas, 🥈 Perak, 🥉 Perunggu) bagi Admin Lapangan dengan total pendaftaran outlet dan jumlah ulasan terbanyak. Dilengkapi tombol chat WhatsApp 1-klik untuk memberi ucapan apresiasi.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // 2. DATA MODUL ADMIN LAPANGAN
  const adminSections: GuideSection[] = [
    {
      id: "admin-1",
      title: "1. Alur Kerja & Tanggung Jawab Admin Lapangan",
      icon: Briefcase,
      tag: "Distribusi Lapangan",
      tagColor: "emerald",
      summary: "Peran utama mitra lapangan dari terima kartu hingga aktivasi di outlet klien.",
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Sebagai Admin Lapangan (Mitra Distribusi), tugas utama Anda adalah mendampingi pemilik usaha kuliner, cafe, hotel, dan toko untuk melipatgandakan ulasan bintang 5 Google Maps mereka:
          </p>
          <div className="space-y-2 text-[11.5px]">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono">LANGKAH 1</span>
              <span>Terima jatah kartu NFC fisik kosong dari Super Admin Pusat.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold font-mono">LANGKAH 2</span>
              <span>Kunjungi calon klien, lakukan demo tap HP di meja mereka.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold font-mono">LANGKAH 3</span>
              <span>Daftarkan outlet baru melalui dashboard Admin Lapangan.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold font-mono">LANGKAH 4</span>
              <span>Kirim detail akun login portal ke WhatsApp pemilik outlet dengan 1 klik.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "admin-2",
      title: "2. Pendaftaran Outlet Baru (1-Click WhatsApp Onboarding)",
      icon: UserCheck,
      tag: "Registrasi Outlet",
      tagColor: "teal",
      summary: "Cara mendaftarkan outlet dan mengirimkan kredensial login otomatis via WhatsApp.",
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Pendaftaran outlet mitra kini sangat cepat dan otomatis:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-[11.5px] text-slate-300 pl-1">
            <li>Klik tombol hijau <strong>"+ Daftarkan Outlet Baru"</strong> di dashboard Anda.</li>
            <li>Pilih salah satu <strong>Kode Kartu Kosong</strong> dari kuota kartu yang Anda pegang.</li>
            <li>Isi nama outlet, nama pemilik, nomor WhatsApp aktif pemilik, dan buat password sementara.</li>
            <li>Masukkan link resmi <strong>Google Review</strong> toko (bisa diambil dari menu "Minta Ulasan" di Google Maps pemilik toko).</li>
            <li>Klik <strong>"Simpan & Aktifkan Outlet"</strong>.</li>
            <li>
              <strong>Pemberitahuan Otomatis ke WhatsApp:</strong> Sesaat setelah tersimpan, akan muncul tombol <span className="text-emerald-400 font-bold">"📲 Kirim Detail Akses ke WhatsApp Klien"</span>. Sekali klik, WhatsApp otomatis terbuka dengan pesan sambutan ramah berisi link login portal mitra, email, kode kartu, dan link scan ulasan!
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: "admin-3",
      title: "3. Cara Mengajukan Tambahan Jatah Kuota Kartu",
      icon: Layers,
      tag: "Stok Kartu",
      tagColor: "amber",
      summary: "Prosedur meminta tambahan kartu fisik ke Super Admin saat kuota habis.",
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Jika kuota kartu kosong Anda habis atau menipis:
          </p>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11.5px] space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Layers className="w-4 h-4" />
              <span>Tombol "Minta Tambah Jatah Kartu"</span>
            </div>
            <p>
              Klik tombol tersebut di bagian atas dashboard Anda. Sistem akan membuka chat WhatsApp yang langsung ditujukan ke Super Admin dengan format permohonan resmi berisi nama admin Anda dan jumlah kuota yang dibutuhkan.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "admin-4",
      title: "4. Tips Edukasi & Penempatan Standee di Outlet",
      icon: Lightbulb,
      tag: "Tips Lapangan",
      tagColor: "purple",
      summary: "Posisi ideal kartu standee agar menghasilkan ratusan review ulasan setiap minggu.",
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-[11.5px]">
            <li><strong>Meja Kasir:</strong> Tempatkan standee akrilik A5 tepat di depan kasir saat pelanggan menunggu struk atau kembalian.</li>
            <li><strong>Tengah Meja Makan:</strong> Untuk restoran/cafe, pasang standee mini di tengah meja bersama nomor meja. Pelanggan yang menunggu makanan sangat suka mencoba tap NFC.</li>
            <li><strong>Instruksi Singkat Staf Kasir:</strong> Edukasi kasir agar berkata: <em>"Kak, boleh minta tolong tap kartu di sini sebentar ya untuk bintang ulasannya, terima kasih banyak!"</em>.</li>
          </ul>
        </div>
      ),
    },
  ];

  // 3. DATA MODUL OUTLET
  const outletSections: GuideSection[] = [
    {
      id: "outlet-1",
      title: "1. Cara Kerja Kartu NFC & Standee Akrilik di Meja",
      icon: Smartphone,
      tag: "Teknologi Tap",
      tagColor: "indigo",
      summary: "Kemudahan pengunjung memberikan ulasan hanya dengan menempelkan HP.",
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Kartu Smart QR Review menggabungkan dua teknologi canggih tanpa perlu menginstal aplikasi apa pun:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                <Smartphone className="w-4 h-4" />
                <span>Teknologi Tap NFC</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pengunjung cukup menempelkan bagian belakang HP (iPhone / Android) ke logo kartu. Layar HP akan langsung memunculkan pop-up formulir ulasan dalam hitungan detik.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <QrCode className="w-4 h-4" />
                <span>Scan Kode QR Kamera</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Untuk HP yang belum memiliki fitur NFC, pengunjung cukup membuka kamera bawaan HP dan mengarahkan ke kode QR yang tercetak di standee akrilik.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "outlet-2",
      title: "2. Sistem Filter Ulasan Cerdas (Bintang 5 vs Bintang 1-3)",
      icon: Star,
      tag: "Perlindungan Rating",
      tagColor: "amber",
      summary: "Bagaimana sistem melindungi reputasi toko Anda dari ulasan negatif publik.",
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Sistem kami dirancang khusus agar rating toko Anda di Google Maps selalu terjaga tinggi:
          </p>
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <Star className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                <span>Jika Pengunjung Memilih Bintang 4 atau 5 (Puas / Senang)</span>
              </div>
              <p className="text-[11.5px] text-slate-300">
                Muncul animasi perayaan confetti dan pop-up ramah: <em>"Tunggu sebentar ya... Anda sedang dialihkan ke Google Review..."</em>. Pengunjung otomatis dibawa langsung ke kolom ulasan resmi Google Maps toko Anda untuk menaruh bintang 5 secara publik.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1.5">
              <div className="flex items-center gap-2 text-rose-300 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Jika Pengunjung Memilih Bintang 1, 2, atau 3 (Kritik / Kurang Puas)</span>
              </div>
              <p className="text-[11.5px] text-slate-300">
                Pengunjung <strong>TIDAK AKAN dialihkan ke Google Review</strong> sehingga reputasi Google toko Anda aman dari bintang 1 publik! Sebagai gantinya, muncul form privat santun: pengunjung cukup mengisi nama dan isi kritik, lalu pesan akan <strong>langsung terkirim privat ke WhatsApp Pemilik Toko</strong>.
              </p>
              <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[10.5px] text-slate-400">
                🔒 <strong>Privasi Terjaga:</strong> Kritik pengunjung tidak disimpan ke database server demi menghemat memori penyimpanan dan menjaga kerahasiaan evaluasi internal Anda.
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "outlet-3",
      title: "3. Widget Ulasan Melayang untuk Website Toko",
      icon: Globe,
      tag: "Pemasaran Online",
      tagColor: "teal",
      summary: "Cara menyematkan badge rating Google 5.0 di website toko Anda sendiri.",
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Jika outlet Anda memiliki website toko, brosur online, atau landing page, Anda dapat memasang badge ulasan melayang:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-[11.5px] text-slate-300 pl-1">
            <li>Di portal ini, klik tombol <strong>"Widget Web"</strong> di bawah kartu 3D.</li>
            <li>Pilih desain favorit Anda: <em>Floating Pill</em>, <em>Luxury Glass Card</em>, atau <em>Gold Ribbon Banner</em>.</li>
            <li>Salin kode HTML yang disediakan lalu tempelkan ke website Anda (WordPress, Blog, HTML, dll).</li>
          </ol>
        </div>
      ),
    },
    {
      id: "outlet-4",
      title: "4. Menambah Kartu Fisik untuk Meja Baru",
      icon: CreditCard,
      tag: "Pengembangan Usaha",
      tagColor: "sky",
      summary: "Langkah mudah memesan tambahan standee akrilik jika usaha Anda bertambah meja.",
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Jika outlet Anda menambah cabang atau meja makan baru:
          </p>
          <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-[11.5px] space-y-2">
            <p>
              Cukup klik tombol <strong>"Minta Tambah Kartu"</strong> di portal ini. WhatsApp otomatis terbuka menghubungi Admin Pendamping resmi Anda untuk pengiriman standee tambahan yang langsung siap pakai tanpa setting ulang.
            </p>
          </div>
        </div>
      ),
    },
  ];

  // 4. DATA FAQ & TROUBLESHOOTING
  const faqSections: GuideSection[] = [
    {
      id: "faq-1",
      title: "Bagaimana jika HP Pengunjung tidak merespons saat ditempelkan NFC?",
      icon: HelpCircle,
      tag: "Hardware & NFC",
      tagColor: "amber",
      summary: "Penyebab umum dan panduan cepat bagi pengunjung saat tap NFC.",
      content: (
        <div className="space-y-2 text-xs text-slate-300 text-[11.5px]">
          <p>Lakukan pengecekan berikut:</p>
          <ul className="list-disc list-inside space-y-1 pl-1 text-slate-400">
            <li><strong>NFC Belum Aktif (Khusus Android):</strong> Pastikan fitur "NFC" sudah diaktifkan di panel pengaturan cepat (pull-down menu atas). Pada iPhone (tipe iPhone X ke atas), fitur NFC otomatis selalu menyala.</li>
            <li><strong>Letak Sensor NFC Berbeda:</strong>
              <ul className="list-circle list-inside pl-4 text-slate-400">
                <li>iPhone: Sensor berada di ujung atas belakang kamera.</li>
                <li>Samsung / Xiaomi / Oppo: Umumnya di tengah punggung bodi HP.</li>
              </ul>
            </li>
            <li><strong>Casing HP Terlalu Tebal:</strong> Casing berbahan logam tebal atau dompet kartu tebal dapat menghalangi sinyal gelombang radio NFC.</li>
            <li><strong>Solusi Cadangan:</strong> Pengunjung selalu bisa menggunakan kamera HP untuk scan <strong>Kode QR</strong> yang ada di standee.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "faq-2",
      title: "Bagaimana cara mengubah Link Google Review jika toko ganti nama / URL?",
      icon: HelpCircle,
      tag: "Pengaturan URL",
      tagColor: "indigo",
      summary: "Prosedur memperbarui link tujuan ulasan kartu yang sudah beredar.",
      content: (
        <div className="space-y-2 text-xs text-slate-300 text-[11.5px]">
          <p>
            Keunggulan utama Smart QR Review adalah kartu Anda bersifat <strong>Cloud-Dynamic</strong>! Anda tidak perlu mencetak kartu baru jika link Google toko berubah:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1 text-slate-400">
            <li>Hubungi Admin Lapangan atau Super Admin.</li>
            <li>Admin dapat mengedit URL Google Review langsung melalui dashboard.</li>
            <li>Semua kartu fisik di meja akan otomatis terhubung ke link baru saat itu juga!</li>
          </ul>
        </div>
      ),
    },
    {
      id: "faq-3",
      title: "Apakah data pelanggan yang memberi kritik aman?",
      icon: HelpCircle,
      tag: "Privasi & Database",
      tagColor: "emerald",
      summary: "Kebijakan nol penyimpanan database untuk masukan kritik pengunjung.",
      content: (
        <div className="space-y-2 text-xs text-slate-300 text-[11.5px]">
          <p>
            Sangat aman! Kritik dan masukan pengunjung pada bintang 1-3 <strong>tidak disimpan di database server</strong>. Pesan tersebut langsung dikompilasi ke format teks chat WhatsApp dan dikirim langsung ke nomor pengelola outlet. Hal ini menjamin privasi internal outlet dan menghemat kapasitas database.
          </p>
        </div>
      ),
    },
    {
      id: "faq-4",
      title: "Bagaimana cara menyimpan invoice JPG di HP?",
      icon: HelpCircle,
      tag: "Download Invoice",
      tagColor: "teal",
      summary: "Cara mengunduh lembar invoice berkualitas tinggi langsung dari smartphone.",
      content: (
        <div className="space-y-2 text-xs text-slate-300 text-[11.5px]">
          <p>
            Saat tombol <strong>"Unduh JPG"</strong> diklik, sistem menggunakan teknologi render Canvas beresolusi tinggi (Retina 2x). Browser HP Anda akan otomatis mengunduh file gambar tersebut dan menyimpannya di folder <em>Downloads</em> atau aplikasi <em>Galeri Foto</em> Anda.
          </p>
        </div>
      ),
    },
  ];

  // Current active list based on tab
  const activeSections = useMemo(() => {
    switch (activeTab) {
      case "SUPER_ADMIN":
        return superAdminSections;
      case "ADMIN":
        return adminSections;
      case "OUTLET":
        return outletSections;
      case "FAQ":
        return faqSections;
      default:
        return superAdminSections;
    }
  }, [activeTab]);

  // Filtered by Search Query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return activeSections;
    const q = searchQuery.toLowerCase();
    return activeSections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.tag.toLowerCase().includes(q)
    );
  }, [activeSections, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Buku Modul & Panduan Sistem
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  RESMI
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Panduan interaktif & alur kerja lengkap untuk Super Admin, Admin Lapangan, dan Outlet Mitra.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup Panduan"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Role Tab Navigation Bar */}
        <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("SUPER_ADMIN");
                setSearchQuery("");
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "SUPER_ADMIN"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/40"
                  : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Modul Super Admin</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("ADMIN");
                setSearchQuery("");
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "ADMIN"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 border border-emerald-400/40"
                  : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
              }`}
            >
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <span>Modul Admin Lapangan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("OUTLET");
                setSearchQuery("");
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "OUTLET"
                  ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/25 border border-sky-400/40"
                  : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
              }`}
            >
              <Store className="w-4 h-4 text-sky-400" />
              <span>Modul Outlet Mitra</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("FAQ");
                setSearchQuery("");
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "FAQ"
                  ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/25 border border-amber-400/40"
                  : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
              }`}
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>FAQ & Solusi</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="text-[11px] font-semibold text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-950 border border-slate-800 cursor-pointer"
            >
              Buka Semua
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="text-[11px] font-semibold text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-950 border border-slate-800 cursor-pointer"
            >
              Tutup Semua
            </button>
          </div>
        </div>

        {/* Quick Search Bar & Intro Banner */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-950/40 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari topik modul... (misal: invoice, alokasi, bintang 1, nfc, hak akses)"
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 shrink-0">
            <span>Ditemukan:</span>
            <strong className="text-white">{filteredSections.length}</strong>
            <span>topik materi</span>
          </div>
        </div>

        {/* Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 scrollbar-thin">
          {filteredSections.length === 0 ? (
            <div className="py-16 text-center p-6 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
              <Search className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">Topik Tidak Ditemukan</h4>
              <p className="text-xs text-slate-500">
                Tidak ada topik yang cocok dengan kata kunci "{searchQuery}". Coba kata kunci lain atau pilih tab modul berbeda.
              </p>
            </div>
          ) : (
            filteredSections.map((sec) => {
              const isExpanded = !!expandedSections[sec.id];
              const IconComponent = sec.icon;

              return (
                <div
                  key={sec.id}
                  className="rounded-2xl bg-slate-950/50 border border-slate-800/90 overflow-hidden transition-all hover:border-slate-700"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(sec.id)}
                    className="w-full p-4 sm:p-4.5 flex items-center justify-between gap-3 text-left hover:bg-slate-900/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                            {sec.title}
                          </h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-900 text-slate-300 border border-slate-800">
                            {sec.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {sec.summary}
                        </p>
                      </div>
                    </div>

                    <div className="p-1 rounded-lg text-slate-400 bg-slate-900 shrink-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 sm:p-5 pt-0 border-t border-slate-800/80 bg-slate-900/20">
                      <div className="pt-3.5">{sec.content}</div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Smart QR Review Official System Handbook • All Roles Connected</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            Mengerti & Tutup Modul
          </button>
        </div>
      </div>
    </div>
  );
}
