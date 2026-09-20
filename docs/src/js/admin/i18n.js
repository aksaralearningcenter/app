// ============ BAHASA (Indonesia / Inggris) ============
// Panel admin dibangun dari potongan HTML string di modul halaman (bukan
// template), jadi menerjemahkan berarti menerjemahkan TEKS YANG SUDAH
// DIGAMBAR — bukan mengejar ratusan lokasi string di 8 berkas halaman.
//
// Cara kerjanya:
//   1. KAMUS memetakan teks Indonesia apa adanya → teks Inggris.
//   2. terjemahkanAkar() menelusuri DOM setelah halaman digambar dan menukar
//      teks yang cocok persis. Teks yang tidak ada di kamus dibiarkan apa
//      adanya (jatuh ke Indonesia), jadi kamus bisa ditambah bertahap.
//
// Yang SENGAJA tidak diterjemahkan:
//   • isi di dalam [data-no-i18n]  → data milik pengguna (nama murid, isi soal)
//   • <textarea>                   → nilai yang diketik pengguna
//   • <option> TANPA atribut value → karena nilai tersembunyinya = teksnya,
//     menerjemahkannya akan mengirim "Active" ke server, bukan "Aktif".
//   • atribut value/data-*         → dipakai logika, bukan tampilan

export const BAHASA = [
  { kode: 'id', label: 'Indonesia' },
  { kode: 'en', label: 'English' }
];

const KAMUS = {
  // ---------- Navigasi & kerangka ----------
  // Catatan: teks yang ejaannya sama di dua bahasa (Status, Email, Total, Draft,
  // Admin, Username, FAQ, Normal) sengaja TIDAK didaftarkan — tanpa entri pun
  // hasilnya sudah benar, dan kamus tetap ramping.
  'Utama': 'Main',
  'Akademik': 'Academic',
  'Keuangan': 'Finance',
  'Konten Landing': 'Landing Content',
  'Sistem': 'System',
  'Cari menu…': 'Search menu…',
  'Tidak ada menu yang cocok.': 'No matching menu.',
  'Tidak ada menu yang cocok': 'No matching menu',
  'Aksara Learning Center · Panel Admin': 'Aksara Learning Center · Admin Panel',
  'Aksara Learning Center — Admin': 'Aksara Learning Center — Admin',
  'Sistem Internal': 'Internal System',
  'Buka Situs': 'Open Website',
  'Ganti Password': 'Change Password',
  'Keluar': 'Sign out',
  'Sesi': 'Session',
  'Terang / Gelap': 'Light / Dark',
  'Ganti tema terang atau gelap': 'Switch light or dark theme',
  'Pilihan bahasa': 'Language',
  'Username atau Email': 'Username or Email',
  'Password': 'Password',
  'Masuk': 'Sign in',
  'Lupa password?': 'Forgot your password?',
  'Learning Center — Sistem Internal': 'Learning Center — Internal System',
  'Sistem Manajemen': 'Management System',
  'Belum dikonfigurasi.': 'Not configured yet.',
  'Coba Lagi': 'Try Again',
  'Muat Ulang': 'Reload',
  'Simpan': 'Save',
  'Simpan Pengaturan': 'Save Settings',
  'Batal': 'Cancel',
  'Tutup': 'Close',
  'Hapus': 'Delete',
  'Edit': 'Edit',
  'Tambah': 'Add',
  'Aksi': 'Action',
  'Urutan': 'Order',
  'Nama': 'Name',
  'Judul': 'Title',
  'Deskripsi': 'Description',
  'Keterangan': 'Notes',
  'Catatan': 'Notes',
  'Tanggal': 'Date',
  'Waktu': 'Time',
  'Jumlah': 'Amount',
  'Nilai': 'Score',
  'Alamat': 'Address',
  'Telepon': 'Phone',
  'Link': 'Link',
  'Ikon': 'Icon',
  'Logo': 'Logo',
  'Cover': 'Cover',
  'Foto': 'Photo',
  'Ukuran': 'Size',
  'Tipe': 'Type',
  'Jenis': 'Type',
  'Grup': 'Group',
  'Tab': 'Tab',
  'Seksi': 'Section',
  'Label': 'Label',
  'Teks': 'Text',
  'Isi': 'Content',
  'Pertanyaan': 'Question',
  'Jawaban': 'Answer',
  'Ringkasan': 'Summary',
  'Bintang': 'Rating',
  'User': 'User',
  'Peran': 'Role',

  // ---------- Status & badge ----------
  'Aktif': 'Active',
  'Nonaktif': 'Inactive',
  'Hadir': 'Present',
  'Sakit': 'Sick',
  'Izin': 'Excused',
  'Cuti': 'Leave',
  'Alpha': 'Absent',
  'Lulus': 'Passed',
  'Setoran': 'Deposit',
  'Penarikan': 'Withdrawal',
  'Publikasi': 'Published',
  'Baru': 'New',
  'Selesai': 'Done',
  'Ditolak': 'Rejected',
  'Menunggu': 'Pending',
  'Jadi Murid': 'Enrolled',
  'Calon Murid': 'Applicant',
  'Lebar': 'Wide',
  'Gratis': 'Free',
  'Ya': 'Yes',
  'Tidak': 'No',
  'Guru': 'Teacher',
  'Orang Tua': 'Parent',

  // ---------- Beranda / statistik ----------
  'Total Murid': 'Total Students',
  'Murid Aktif': 'Active Students',
  'Total Saldo': 'Total Balance',
  'Kelas': 'Classes',
  'Transaksi Terbaru': 'Recent Transactions',
  'Aksi Cepat': 'Quick Actions',
  'Murid': 'Students',
  'Absensi': 'Attendance',
  'Progres': 'Progress',
  'Transaksi': 'Transactions',
  'Tabungan': 'Savings',
  'Statistik': 'Statistics',
  'Laporan': 'Reports',
  'Pengaturan Situs': 'Site Settings',
  'Pemeliharaan Data': 'Data Maintenance',
  'Pendaftar': 'Registrants',
  'Log': 'Log',
  'Log Aktivitas': 'Activity Log',
  'Riwayat Login': 'Login History',
  'Chatbot': 'Chatbot',
  'Chatbot Aksara': 'Aksara Chatbot',
  'Progres Belajar': 'Learning Progress',
  'Data Murid': 'Students',
  'Harga & Paket': 'Pricing & Packages',
  'Berita': 'News',
  'Buku': 'Books',
  'Galeri Kegiatan': 'Activity Gallery',
  'Mitra & Logo': 'Partners & Logos',
  'Testimoni': 'Testimonials',
  'Kurikulum': 'Curriculum',
  'Kartu Info Beranda': 'Home Info Cards',
  'Pengaturan WhatsApp': 'WhatsApp Settings',
  'Asesmen': 'Assessments',
  'Soal': 'Questions',
  'Total Asesmen': 'Total Assessments',
  'Status Aktif': 'Active',
  'Soal Tersimpan': 'Stored Questions',
  'Menit Waktu Ujian': 'Exam Minutes',
  'Total Bobot': 'Total Weight',
  'Nilai Lulus': 'Passing Score',
  'Jenis Soal': 'Question Type',
  'Bobot Nilai': 'Weight',
  'Kunci Jawaban': 'Correct Answer',
  'Pilihan Ganda': 'Multiple Choice',
  'Isian Singkat': 'Short Answer',
  'Esai': 'Essay',
  'Acak Urutan Soal': 'Shuffle Question Order',
  'Acak Opsi Jawaban': 'Shuffle Answer Options',
  'Deskripsi / Instruksi': 'Description / Instructions',
  'Daftar Asesmen': 'Assessment List',
  'Kembali ke daftar': 'Back to list',
  'Jawaban diterima:': 'Accepted answers:',
  'Asesmen tidak ditemukan.': 'Assessment not found.',
  'Belum ada asesmen. Klik': 'No assessments yet. Click',
  'untuk memulai.': 'to get started.',

  // ---------- Formulir (label dengan tanda bintang) ----------
  'Nama *': 'Name *',
  'Nama Lengkap *': 'Full Name *',
  'Nama Kelas *': 'Class Name *',
  'Nama Mitra *': 'Partner Name *',
  'Nama Mitra': 'Partner Name',
  'Program': 'Programs',
  'Urutan Foto': 'Photo Order',
  'Urutan Logo Mitra': 'Partner Logo Order',
  'Urutan Testimoni': 'Testimonial Order',
  'Urutan FAQ': 'FAQ Order',
  'Kunci Jawaban *': 'Correct Answer *',
  'Untuk asesmen:': 'For assessment:',
  'Tiap asesmen punya': 'Each assessment has',
  ', nilai kelulusan, dan bank soalnya sendiri. Buka tombol': ', its own passing score, and question bank. Use the',
  'untuk menambah / mengedit / menghapus soal dan mengatur urutannya.': 'button to add / edit / delete questions and arrange their order.',
  'Durasi 1–600 menit. Status': 'Duration 1–600 minutes. Status',
  'Isi beberapa varian ejaan bila perlu — jawaban dianggap benar jika sama dengan salah satunya.': 'Add spelling variants if needed — the answer counts as correct when it matches one of them.',
  'Soal esai tidak memakai kunci otomatis: jawaban siswa dikumpulkan untuk dinilai manual oleh pengajar.': 'Essay questions have no automatic key: student answers are collected for manual grading by the teacher.',
  'dipakai untuk semua tombol “Konsultasi WhatsApp”. Kunci API chatbot diatur di menu': 'is used for every “WhatsApp Consultation” button. The chatbot API key is configured in the',
  '⚠️ Kunci API belum diisi — chatbot tidak muncul di landing': '⚠️ API key is not set — the chatbot will not appear on the landing page',
  'Kunci API belum diisi — chatbot tidak muncul di landing': 'API key is not set — the chatbot will not appear on the landing page',
  'Nama Program *': 'Program Name *',
  'Judul *': 'Title *',
  'Judul Asesmen *': 'Assessment Title *',
  'Judul / Keterangan Foto *': 'Title / Photo Caption *',
  'Pertanyaan *': 'Question *',
  'Status *': 'Status *',
  'Jenis *': 'Type *',
  'Mata Pelajaran *': 'Subject *',
  'Murid *': 'Student *',
  'Isi Testimoni *': 'Testimonial Content *',
  'Email Google *': 'Google Email *',
  'Password Lama *': 'Current Password *',
  'Password Baru *': 'New Password *',
  'Ulangi Password Baru *': 'Repeat New Password *',
  'Staf Pengajar': 'Teaching Staff',
  'Jadwal': 'Schedule',
  'Kapasitas': 'Capacity',
  'Biaya/Bulan': 'Fee/Month',
  'Tanggal Lahir': 'Date of Birth',
  'Email Orang Tua': 'Parent Email',
  'No. HP': 'Phone Number',
  'No HP': 'Phone Number',
  'Mapel': 'Subject',
  'Topik': 'Topic',
  'Guru Pengampu': 'Teacher',
  'Mata Pelajaran': 'Subject',
  'Email Notif': 'Email Notification',
  'URL Gambar': 'Image URL',
  'URL Logo': 'Logo URL',
  'Kelas Ikon Font Awesome': 'Font Awesome Icon Class',
  'Ikon / Meta': 'Icon / Meta',
  'Label / Jenjang': 'Label / Level',
  'Grup Tampilan': 'Display Group',
  'Poin Keunggulan': 'Key Points',
  'Durasi': 'Duration',
  'Mode Kelas': 'Class Mode',
  'Alur Materi': 'Learning Flow',
  'Alur Belajar': 'Learning Flow',
  'Capaian': 'Achievements',
  'Kartu': 'Card',
  'Tipe Tabel': 'Table Type',
  'Isi Berita': 'News Content',
  'Ukuran di Mosaik': 'Mosaic Size',
  'Keterangan / Peran': 'Description / Role',
  'Jenjang yang Dilayani': 'Levels Served',
  'Nomor WhatsApp': 'WhatsApp Number',
  'Chatbot Aktif': 'Chatbot Active',
  'Chatbot Dinonaktifkan': 'Chatbot Disabled',
  'Kunci API': 'API Key',
  'Status Chatbot': 'Chatbot Status',
  'Maks / Sesi 10 Menit': 'Max / Session 10 Minutes',
  'Kunci API Gemini': 'Gemini API Key',
  'Nama, sapaan, catatan, dan chip saran pertanyaan diatur di': 'Name, greeting, note, and suggested-question chips are configured in',
  'Token Fonnte': 'Fonnte Token',
  'Nomor Test': 'Test Number',
  'Test Kirim': 'Send Test',
  'Reset password untuk': 'Reset password for',
  'Ubah peran': 'Change role',
  'Aktifkan kembali': 'Reactivate',
  'Nonaktifkan': 'Deactivate',
  'Ikon: ': 'Icon: ',
  'Token: ': 'Token: ',
  'Lembar ': 'Sheet ',
  'Memakai ikon ': 'Using icon ',
  'Mengunggah ': 'Uploading ',

  // ---------- Tombol aksi ----------
  '➕ Tambah': '➕ Add',
  '➕ Baru': '➕ New',
  '➕ Murid': '➕ Student',
  '➕ Kelas': '➕ Class',
  '➕ Transaksi': '➕ Transaction',
  '➕ Tambah Kelas': '➕ Add Class',
  '➕ Tambah Murid': '➕ Add Student',
  '➕ Catat Absensi': '➕ Record Attendance',
  '➕ Tambah Progres': '➕ Add Progress',
  '➕ Tambah User': '➕ Add User',
  '➕ Tambah Baris': '➕ Add Row',
  '➕ Tulis Berita': '➕ Write News',
  '➕ Tambah Buku': '➕ Add Book',
  '➕ Tambah Foto': '➕ Add Photo',
  '➕ Tambah Mitra': '➕ Add Partner',
  '➕ Tambah Testimoni': '➕ Add Testimonial',
  '➕ Tambah FAQ': '➕ Add FAQ',
  '➕ Tambah Program': '➕ Add Program',
  '➕ Tambah Kurikulum': '➕ Add Curriculum',
  '➕ Tambah Kartu': '➕ Add Card',
  '➕ Buat Asesmen': '➕ Create Assessment',
  '➕ Tambah Soal': '➕ Add Question',
  '💾 Simpan': '💾 Save',
  '✏️ Edit': '✏️ Edit',
  '🗑️ Hapus Kunci': '🗑️ Delete Key',
  '🔑 Simpan Kunci': '🔑 Save Key',
  '🔄 Muat Ulang': '🔄 Reload',
  '🔄 Refresh': '🔄 Refresh',
  '✅ Proses': '✅ Process',
  '✅ Jadikan Murid': '✅ Enroll Student',
  '📧 Kirim Email ke Orang Tua': '📧 Email Parent',
  '💬 Kirim WhatsApp ke Orang Tua': '💬 WhatsApp Parent',
  '👁️ Lihat Progres': '👁️ View Progress',
  '📄 Generate': '📄 Generate',
  '📄 Pilih Murid': '📄 Select Student',
  '📄 Pilih Kelas': '📄 Select Class',
  '📥 Export CSV': '📥 Export CSV',
  '🧪 Test Sekarang': '🧪 Test Now',
  '⏹️ Hentikan': '⏹️ Stop',
  '🔔 Notifikasi Email': '🔔 Email Notifications',
  '📧 Aktifkan notifikasi email': '📧 Enable email notifications',
  '✅ Aktifkan notifikasi WhatsApp': '✅ Enable WhatsApp notifications',
  '🛠️ Pemeliharaan Data': '🛠️ Data Maintenance',
  '🌱 Seed Data': '🌱 Seed Data',
  '☠️ Reset Total': '☠️ Full Reset',
  '☠️ Reset Total Data': '☠️ Full Data Reset',

  // ---------- Judul halaman & kartu ----------
  '📊 Dashboard': '📊 Dashboard',
  '📈 Progres Murid': '📈 Student Progress',
  '👥 Users': '👥 Users',
  '📥 Pendaftar': '📥 Registrants',
  '📰 Berita': '📰 News',
  '📚 Buku': '📚 Books',
  '📷 Galeri Kegiatan': '📷 Activity Gallery',
  '⭐ Testimoni': '⭐ Testimonials',
  '❓ FAQ': '❓ FAQ',
  '🎓 Program': '🎓 Programs',
  '📘 Kurikulum': '📘 Curriculum',
  '🗂️ Kartu Info Beranda': '🗂️ Home Info Cards',
  '⚙️ Pengaturan Situs': '⚙️ Site Settings',
  '🤖 Chatbot Aksara': '🤖 Aksara Chatbot',
  '📝 Laporan Absensi': '📝 Attendance Report',
  '💰 Laporan Tabungan': '💰 Savings Report',
  '👤 Laporan Per Murid': '👤 Per-Student Report',
  '🏫 Laporan Per Kelas': '🏫 Per-Class Report',
  '⏰ Laporan Otomatis Bulanan': '⏰ Automatic Monthly Report',
  '👨‍🎓 Data Murid': '👨‍🎓 Students',
  '📊 Statistik': '📊 Statistics',
  '💰 Setoran vs Penarikan per Bulan': '💰 Deposits vs Withdrawals per Month',
  '📝 Absensi per Kelas': '📝 Attendance per Class',
  '📜 Log Aktivitas': '📜 Activity Log',
  '🕘 Riwayat Login': '🕘 Login History',
  '🧾 Transaksi Terbaru': '🧾 Recent Transactions',
  '⚡ Aksi Cepat': '⚡ Quick Actions',
  '📖 Urutan Halaman Flipbook': '📖 Flipbook Page Order',
  '🖼️ Urutan Foto': '🖼️ Photo Order',
  '🤝 Urutan Logo Mitra': '🤝 Partner Logo Order',
  '⭐ Urutan Testimoni': '⭐ Testimonial Order',
  '❓ Urutan FAQ': '❓ FAQ Order',
  'Urutan Program': 'Program Order',
  'Urutan Kurikulum': 'Curriculum Order',
  'Urutan Kartu': 'Card Order',

  // ---------- Keterangan halaman ----------
  'Pilih murid untuk melihat riwayat progres belajarnya.': 'Select a student to view their learning progress history.',
  'Pemantauan data anak Anda: tabungan, kehadiran, dan progres belajar.': 'Monitoring your child: savings, attendance, and learning progress.',
  'Belum ada data anak tertaut ke akun ini. Hubungi admin.': 'No child is linked to this account yet. Please contact the admin.',
  'Menampilkan 200 transaksi terbaru. Export CSV untuk data lengkap.': 'Showing the latest 200 transactions. Export CSV for the full data.',
  'Laporan lengkap satu murid: data, tabungan, absensi, progres.': 'Complete report for one student: profile, savings, attendance, progress.',
  'Pertanyaan umum tampil sebagai accordion di Beranda landing.': 'Common questions appear as an accordion on the landing page.',
  'Semua teks dan kontak ini langsung tampil di landing page.': 'All of this text and contact info appears directly on the landing page.',
  'Isi data contoh atau kosongkan data. Sheet': 'Seed sample data or clear data. The',
  'sheet yang masih kosong': 'sheets that are still empty',
  'tidak diubah': 'left untouched',
  '— aman dijalankan ulang.': '— safe to run again.',
  'Tidak bisa dibatalkan': 'Cannot be undone',
  '— pertimbangkan export CSV dulu.': '— consider exporting CSV first.',
  'Murid, Kelas, Absensi, Progres, Tabungan, Transaksi.': 'Students, Classes, Attendance, Progress, Savings, Transactions.',
  'Mengosongkan': 'Clears',
  'Mengisi': 'Seeds',
  'soal': 'questions',
  'semua': 'all',
  'kecuali akun Admin yang sedang dipakai': 'except the Admin account in use',
  'Menjalankan seed… halaman ini mungkin sibuk beberapa detik.': 'Running seed… the page may be busy for a few seconds.',
  'Tampil sebagai cover di katalog buku (tipe katalog) atau di halaman booklet (tipe flipbook).': 'Shown as the cover in the book catalog (catalog type) or on the booklet page (flipbook type).',
  'Tampil sebagai thumbnail kartu berita di Beranda & halaman Berita (sebaiknya rasio 16:9).': 'Shown as the news card thumbnail on the Home & News page (16:9 ratio recommended).',
  'Teks kecil di atas judul Beranda.': 'Small text above the Home title.',
  'Bagian yang dicetak miring berwarna (setelah “Dari Dasar”).': 'The italic colored part (after “Dari Dasar”).',
  'Kosongkan jika tidak ingin mengganti.': 'Leave empty if you do not want to change it.',
  'Kunci disimpan ke Script Properties dan tidak bisa dilihat kembali — cukup diperbarui bila berganti kunci.': 'The key is stored on the server and cannot be viewed again — just update it when the key changes.',
  'Chatbot tidak muncul di landing': 'The chatbot does not appear on the landing page',
  'dan': 'and',
  'membantu materi belajar. Jawaban selalu berbasis data landing yang dikelola admin. Kunci API disimpan di': 'helps with learning material. Answers always come from admin-managed landing data. The API key is stored in',
  '— tidak pernah dikirim ke browser pengunjung.': '— never sent to a visitor’s browser.',
  'Script Properties server': 'the server',
  '→ grup “Chatbot”. Aktif/nonaktif juga dari sana.': '→ the “Chatbot” group. Enabling/disabling is also done there.',
  'Kunci API tersimpan di server.': 'API key saved on the server.',
  'Kunci dihapus.': 'Key deleted.',
  'Tuliskan kunci API-nya dulu ya.': 'Enter the API key first.',
  'Gagal menyimpan kunci.': 'Failed to save the key.',
  'Hapus kunci API chatbot? Chatbot berhenti melayani sampai kunci diisi kembali.': 'Delete the chatbot API key? The chatbot stops working until a key is provided again.',
  'Token kosong — tetap simpan (hanya ubah status aktif)?': 'Token is empty — save anyway (only change the active status)?',
  'Tampil sebagai': 'Shown as',
  'diunggah langsung': 'uploaded directly',
  'menampilkan jenis berkas yang dipakai tombol “Unduh / Baca” di katalog.': 'shows the file type used by the “Download / Read” button in the catalog.',
  'dari modal Tambah/Edit Buku. Kolom': 'from the Add/Edit Book modal. The',
  'Cover bisa': 'The cover can be',
  'kelas ikon Font Awesome': 'Font Awesome icon class',
  'Urutan diatur lewat drag / tombol ↑ ↓ pada daftar': 'Order is set by dragging or the ↑ ↓ buttons in the list',
  'Urutan foto diatur lewat drag / tombol ↑ ↓ pada daftar': 'Photo order is set by dragging or the ↑ ↓ buttons in the',
  'Ikon dipakai bila URL logo kosong. Urutan diatur lewat drag / tombol ↑ ↓ pada daftar': 'The icon is used when the logo URL is empty. Order is set by dragging or the ↑ ↓ buttons in the',
  'Urutan juga bisa diubah lewat kartu drag / tombol ↑ ↓ di daftar.': 'Order can also be changed via drag cards / ↑ ↓ buttons in the list.',
  'Urutan dalam seksi': 'Order within the section',
  'Mengatur tiga bagian di Beranda landing:': 'Manages three sections on the landing Home page:',
  'Kartu program tampil di halaman': 'Program cards appear on the page',
  'Kelola isi tabel harga di landing page. Tipe': 'Manages the pricing table on the landing page. Type',
  'membuat foto memakai 2 kolom pada mosaik.': 'makes the photo span 2 columns in the mosaic.',
  'landing. Tab:': 'landing. Tabs:',

  // ---------- Asesmen: impor massal & hasil ----------
  '📥 Impor Soal': '📥 Import Questions',
  '📥 Impor Soal Massal': '📥 Bulk Import Questions',
  '⬆️ Ekspor CSV': '⬆️ Export CSV',
  '📊 Hasil': '📊 Results',
  '🔗 Salin Tautan Ujian': '🔗 Copy Exam Link',
  '⬇️ Template': '⬇️ Template',
  '💾 Impor Soal': '💾 Import Questions',
  '⏳ Mengimpor…': '⏳ Importing…',
  '👁️ Detail': '👁️ Detail',
  'Unggah Berkas (.csv / .xlsx)': 'Upload File (.csv / .xlsx)',
  '1. Unggah Berkas (.csv / .xlsx)': '1. Upload File (.csv / .xlsx)',
  '2. Atau Tempel dari Excel': '2. Or Paste from Excel',
  'Menempel hasil salinan Excel otomatis terbaca — pemisah antar kolom (Tab) dikenali.': 'Pasted Excel cells are parsed automatically — column separators (Tab) are recognized.',
  '⚠️ Sebagian Baris Dilewati': '⚠️ Some Rows Were Skipped',
  'Jawaban Siswa': 'Student Answer',
  'Kunci': 'Answer Key',
  'Hasil': 'Result',
  'Kosong': 'Blank',
  'Total Pengerjaan': 'Total Attempts',
  'Sudah Mengumpulkan': 'Submitted',
  'Rata-rata Skor': 'Average Score',
  'Skor Tertinggi': 'Highest Score',
  'Perlu Dinilai': 'Needs Grading',
  'Benar / Salah / Kosong': 'Correct / Wrong / Blank',
  'Tautan ujian disalin. Kirim ke siswa lewat WhatsApp/kelas.': 'Exam link copied. Send it to students via WhatsApp/class group.',
  'Mengerti': 'Got it',
  'Bagikan tautan ini ke siswa. Hanya berfungsi bila status asesmen Aktif.': 'Share this link with students. It only works when the assessment status is Active.',
  'Aktifkan status asesmen lebih dulu supaya siswa bisa membukanya.': 'Activate the assessment first so students can open it.',
  'Isi total bobot yang diperoleh dari ': 'Enter the total weight earned from ',
  ' soal esai. Skor akhir dihitung ulang otomatis.': ' essay questions. The final score is recalculated automatically.',
  'Asesmen ini tidak punya soal esai — skor sudah final.': 'This assessment has no essay questions — the score is final.',
  'Skor dihitung otomatis dari jawaban pilihan ganda &amp; isian. Soal esai menunggu penilaian Anda — buka Detail untuk menilai.': 'The score is calculated automatically from multiple-choice &amp; short answers. Essay questions await your grading — open Detail to grade them.',
  'Tidak ada jawaban tercatat.': 'No answers recorded.',
  'Belum ada siswa yang mengerjakan. Bagikan tautan ujian dari halaman soal.': 'No student has taken this yet. Share the exam link from the questions page.',

  // ---------- Pesan (toast) ----------
  'Tersimpan': 'Saved',
  'Terhapus': 'Deleted',
  'Tersimpan.': 'Saved.',
  'Terhapus.': 'Deleted.',
  'Berhasil!': 'Success!',
  'Gagal.': 'Failed.',
  'Gagal menyimpan.': 'Failed to save.',
  'Gagal menyimpan urutan.': 'Failed to save the order.',
  'Gagal mengunggah.': 'Upload failed.',
  'Gagal menyiapkan unggahan.': 'Failed to prepare the upload.',
  'Gagal membuat laporan.': 'Failed to generate the report.',
  'Berkas gagal dibaca.': 'The file could not be read.',
  'Urutan tersimpan.': 'Order saved.',
  'Kelas ditambahkan.': 'Class added.',
  'Kelas diperbarui.': 'Class updated.',
  'Kelas tidak ditemukan.': 'Class not found.',
  'Murid ditambahkan.': 'Student added.',
  'Absensi dicatat.': 'Attendance recorded.',
  'Progres disimpan.': 'Progress saved.',
  'Transaksi berhasil.': 'Transaction completed.',
  'Pengaturan disimpan.': 'Settings saved.',
  'Seed selesai.': 'Seed finished.',
  'Selesai.': 'Done.',
  'Soal tersimpan.': 'Question saved.',
  'Soal dihapus.': 'Question deleted.',
  'Asesmen dihapus.': 'Assessment deleted.',
  'Password berhasil direset!': 'Password reset successfully!',
  'Pilih murid dulu.': 'Select a student first.',
  'Pilih murid & isi mapel.': 'Select a student and fill in the subject.',
  'Isi email penerima dulu.': 'Enter the recipient email first.',
  'Isi nomor test dulu.': 'Enter the test number first.',
  'Semua kolom wajib diisi.': 'All fields are required.',
  'Email wajib diisi.': 'Email is required.',
  'Judul wajib diisi.': 'Title is required.',
  'Judul asesmen wajib diisi.': 'Assessment title is required.',
  'Judul kartu wajib diisi.': 'Card title is required.',
  'Judul kurikulum wajib diisi.': 'Curriculum title is required.',
  'Judul/keterangan foto wajib diisi.': 'Title/photo caption is required.',
  'Nama kelas wajib diisi.': 'Class name is required.',
  'Nama mitra wajib diisi.': 'Partner name is required.',
  'Nama program wajib diisi.': 'Program name is required.',
  'Nama wajib diisi (min. 3 huruf).': 'Name is required (min. 3 characters).',
  'Nama dan isi testimoni wajib diisi.': 'Name and testimonial content are required.',
  'Pertanyaan wajib diisi.': 'Question is required.',
  'Durasi harus 1 sampai 600 menit.': 'Duration must be between 1 and 600 minutes.',
  'Nilai kelulusan harus 0 sampai 100.': 'Passing score must be between 0 and 100.',
  'Isi minimal 2 opsi jawaban (satu per baris).': 'Enter at least 2 answer options (one per line).',
  'Isi minimal satu jawaban benar.': 'Enter at least one correct answer.',
  'Password baru minimal 6 karakter.': 'New password must be at least 6 characters.',
  'Ulangi password tidak sama.': 'The repeated password does not match.',
  'Jumlah minimal Rp 1.': 'Minimum amount is Rp 1.',
  'Hanya berkas gambar yang bisa diunggah.': 'Only image files can be uploaded.',
  'Hanya berkas PDF, Word, Excel, atau PowerPoint yang bisa diunggah.': 'Only PDF, Word, Excel, or PowerPoint files can be uploaded.',
  'Popup diblokir! Izinkan popup untuk membuka laporan.': 'Popup blocked! Allow popups to open the report.',
  'Asesmen tidak dikenal. Buka ulang dari daftar asesmen.': 'Unknown assessment. Reopen it from the assessment list.',
  'Data asesmen tidak ditemukan. Muat ulang halaman.': 'Assessment data not found. Reload the page.',
  'Soal tidak ditemukan. Muat ulang halaman.': 'Question not found. Reload the page.',
  'Hentikan laporan otomatis bulanan?': 'Stop the automatic monthly report?',
  'Hapus FAQ ini?': 'Delete this FAQ?',
  'Hapus baris harga ini?': 'Delete this pricing row?',
  'Hapus berita ini?': 'Delete this news item?',
  'Hapus buku ini?': 'Delete this book?',
  'Hapus foto galeri ini?': 'Delete this gallery photo?',
  'Hapus kartu ini?': 'Delete this card?',
  'Hapus kurikulum ini?': 'Delete this curriculum item?',
  'Hapus mitra ini?': 'Delete this partner?',
  'Hapus program ini?': 'Delete this program?',
  'Hapus soal ini?': 'Delete this question?',
  'Hapus testimoni ini?': 'Delete this testimonial?',
  'Tolak pendaftaran ini?': 'Reject this registration?',
  'Belum ada transaksi.': 'No transactions yet.',
  'Belum ada catatan.': 'No records yet.',
  'Belum ada data.': 'No data yet.',
  'Belum ada berita.': 'No news yet.',
  'Belum ada buku.': 'No books yet.',
  'Belum ada foto galeri.': 'No gallery photos yet.',
  'Belum ada mitra.': 'No partners yet.',
  'Belum ada testimoni.': 'No testimonials yet.',
  'Belum ada FAQ.': 'No FAQ yet.',
  'Belum ada program.': 'No programs yet.',
  'Belum ada kurikulum.': 'No curriculum yet.',
  'Belum ada kartu.': 'No cards yet.',
  'Belum ada kelas.': 'No classes yet.',
  'Belum ada progres.': 'No progress yet.',
  'Belum ada aktivitas.': 'No activity yet.',
  'Belum ada riwayat login.': 'No login history yet.',
  'Belum ada soal. Klik': 'No questions yet. Click',
  '⏳ Memuat...': '⏳ Loading...',
  'Diperbarui': 'Updated',
  'Terakhir diubah': 'Last updated',
  'Baris': 'Rows',
  'Baris Data': 'Data Rows',
  'Sheet': 'Sheet',
  'Metode': 'Method',
  'Detail': 'Detail',
  'Target': 'Target',
  'Kontak': 'Contact',
  'Rekening': 'Account',
  'ID Rekening': 'Account ID',
  'Saldo': 'Balance',
  'Login Hari Ini': 'Logins Today',
  'User Aktif 7 Hari': 'Active Users (7 days)',
  'selesai ✔': 'done ✔',
  '— email kredensial dikirim otomatis.': '— credential email is sent automatically.',
  'Pengaturan Tampilan': 'Appearance Settings',
  'Tema': 'Theme',
  'Terang': 'Light',
  'Gelap': 'Dark',
  'Bahasa': 'Language'
};

// Pola untuk teks yang mengandung angka/data (tidak bisa jadi kunci kamus).
// Urutan penting: yang paling spesifik lebih dulu.
const POLA = [
  // "Kelas (5)" → "Classes (5)"
  { uji: /^(.+?) \((\d+)\)$/, ganti: (m) => terjemahkan(m[1]) + ' (' + m[2] + ')' },
  // "Kelas (3) — 30 dari 30" gaya daftar dengan em dash
  { uji: /^(.+?) · (.+)$/, ganti: (m) => terjemahkan(m[1]) + ' · ' + terjemahkan(m[2]) },
  // "Hapus kelas X?" → "Delete class X?"
  { uji: /^Hapus kelas (.+)\?$/, ganti: (m) => 'Delete class ' + m[1] + '?' },
  { uji: /^Hapus murid (.+)\?$/, ganti: (m) => 'Delete student ' + m[1] + '?' },
  { uji: /^Hapus user (.+)\?$/, ganti: (m) => 'Delete user ' + m[1] + '?' },
  { uji: /^Hapus asesmen (.+)\?/, ganti: (m) => 'Delete assessment ' + m[1] + '?' },
  // "Kelas 5A — 3 murid" gaya ringkasan
  { uji: /^(.+?) — (.+)$/, ganti: (m) => terjemahkan(m[1]) + ' — ' + terjemahkan(m[2]) }
  // Catatan: sengaja TIDAK ada pola generik "Tambah X"/"Edit X", karena kata
  // benda Indonesia sering beda bentuk jamaknya di Inggris (Murid → Students)
  // dan hasilnya jadi rancu. Kombinasi yang umum sudah jadi kunci kamus
  // tersendiri, mis. '➕ Tambah Murid'.
];

const AWALAN_EMOJI = /^([\p{Extended_Pictographic}\uFE0F\u200D]+\s*)/u;
let aktif = 'id';

export function bahasaAktif() { return aktif; }

export function aturBahasa(kode) {
  aktif = kode === 'en' ? 'en' : 'id';
  document.documentElement.setAttribute('lang', aktif);
  try { localStorage.setItem('aksara_bahasa', aktif); } catch (_e) { /* localStorage diblokir */ }
  return aktif;
}

// Terjemahkan satu teks. Teks tak dikenal dikembalikan apa adanya (jatuh ke
// bahasa Indonesia), jadi kamus boleh tidak lengkap tanpa merusak tampilan.
export function terjemahkan(teks) {
  if (aktif !== 'en') return teks;
  const asli = String(teks == null ? '' : teks);
  const kunci = asli.trim();
  if (!kunci) return asli;

  const langsung = KAMUS[kunci];
  if (langsung) return asli.replace(kunci, langsung);

  // "🚪 Keluar" → periksa "Keluar" lalu pasang kembali ikonnya.
  const m = kunci.match(AWALAN_EMOJI);
  if (m) {
    const isi = kunci.slice(m[1].length);
    const hasil = KAMUS[isi] || cocokkanPola(isi);
    if (hasil) return asli.replace(kunci, m[1] + hasil);
  }

  const pola = cocokkanPola(kunci);
  if (pola) {
    // Hanya tukar bagian teksnya, spasi di kiri/kanan dipertahankan.
    const mulai = asli.indexOf(kunci);
    if (mulai === -1) return asli;   // pengaman: jangan sampai memotong teks
    return asli.slice(0, mulai) + pola + asli.slice(mulai + kunci.length);
  }
  return asli;
}

function cocokkanPola(kunci) {
  for (const p of POLA) {
    const m = kunci.match(p.uji);
    if (m) {
      const hasil = p.ganti(m);
      if (hasil && hasil !== kunci) return hasil;
    }
  }
  return '';
}

// Node yang isinya milik pengguna atau dipakai logika → jangan disentuh.
function lewati(node) {
  let el = node.parentElement;
  while (el) {
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'CODE') return true;
    if (el.hasAttribute && el.hasAttribute('data-no-i18n')) return true;
    // <option> tanpa value: nilai tersembunyinya = teksnya sendiri, jadi
    // menerjemahkan akan mengubah data yang dikirim ke server.
    if (tag === 'OPTION' && !el.hasAttribute('value')) return true;
    el = el.parentElement;
  }
  return false;
}

const ATRIBUT = ['placeholder', 'title', 'aria-label', 'alt'];

// Telusuri akar lalu tukar teks yang cocok dengan kamus. Dipanggil setiap kali
// isi halaman berubah (lihat main.js) dan saat bahasa diganti.
export function terjemahkanAkar(akar) {
  if (!akar) return;
  if (typeof document.createTreeWalker !== 'function') return;

  const jalan = document.createTreeWalker(akar, NodeFilter.SHOW_TEXT, null);
  const simpul = [];
  while (jalan.nextNode()) simpul.push(jalan.currentNode);
  simpul.forEach(function (n) {
    if (lewati(n)) return;
    const baru = terjemahkan(n.data);
    if (baru !== n.data) n.data = baru;   // hanya tulis bila berubah → aman dari lupa
  });

  const elemen = akar.querySelectorAll ? akar.querySelectorAll('[placeholder],[title],[aria-label],[alt]') : [];
  Array.prototype.forEach.call(elemen, function (el) {
    if (lewati(el)) return;
    ATRIBUT.forEach(function (a) {
      const nilai = el.getAttribute(a);
      if (!nilai) return;
      const baru = terjemahkan(nilai);
      if (baru !== nilai) el.setAttribute(a, baru);
    });
  });
}

export { KAMUS };
