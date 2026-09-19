// ============ HALAMAN UJIAN SISWA ============
// Satu halaman, tiga tahap: info (isi nama) → mengerjakan (timer mundur) →
// hasil (skor otomatis). Siswa tidak perlu akun; pengajar cukup membagikan
// tautan /ujian/?id=<ID-ASESMEN> (alamat bersih tanpa .html).
//
// Hal penting:
//   • Waktu resmi dihitung SERVER. Timer di sini hanya tampilan — kalau jam
//     perangkat siswa salah atau tab ditutup, server tetap tahu kapan ujian
//     dimulai dan menandai pengumpulan yang lewat batas.
//   • Kunci jawaban & pembahasan tidak pernah dikirim ke halaman ini.
//   • Jawaban disimpan berkala ke localStorage agar refresh/HP mati tidak
//     menghapus pekerjaan siswa.
const DEFAULT_API = 'https://backend-aksara.vercel.app/api';

const API_URL = (function () {
  try {
    const p = new URLSearchParams(window.location.search).get('api');
    if (p) return p.replace(/\/+$/, '');
  } catch (e) { /* abaikan */ }
  return DEFAULT_API;
})();

const el = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let asesmenId = '';
let attempt = null;      // { attempt_id, judul, soal[], mulai, durasi_menit }
let jawaban = {};        // { question_id: teks jawaban }
let timer = null;
let dikumpulProktor = false;      // hasil dikumpulkan paksa karena proktor
const stateAkun = { idAnak: '' }; // dipakai bila orang tua memilih anaknya

function pesan(teks, jenis) {
  const kotak = el('pesan');
  if (!kotak) return;
  if (!teks) { kotak.hidden = true; return; }
  kotak.textContent = teks;
  kotak.className = 'pesan ' + (jenis === 'err' ? 'err' : 'ok');
  kotak.hidden = false;
  clearTimeout(kotak._t);
  kotak._t = setTimeout(() => { kotak.hidden = true; }, jenis === 'err' ? 7000 : 4000);
}

// Kegagalan fetch tidak memberi tahu apa pun di layar siswa, padahal penyebab
// tersering adalah tautan yang menunjuk backend yang salah (mis. tautan yang
// disalin saat pengajar menguji di server lokal, lalu dibuka dari HP). Pesannya
// karena itu menyebut alamat backend yang sedang dipakai.
function alamatLokal(u) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(\/|$)/i.test(u);
}

function pesanKoneksi() {
  if (alamatLokal(API_URL) && !alamatLokal(window.location.origin || '')) {
    return 'Tautan ini menunjuk ke server lokal (' + API_URL + ') yang hanya jalan di komputer pengajar, jadi tidak bisa dibuka dari perangkat Anda. Minta pengajar mengirim ulang tautan dari panel admin di situs utama, atau minta pengajar mengaktifkan status asesmen di sana.';
  }
  return 'Tidak bisa menghubungi server Aksara. Periksa koneksi internet Anda lalu muat ulang halaman.';
}

const tunggu = (ms) => new Promise(r => setTimeout(r, ms));

async function panggil(path, opsi, bolehUlang) {
  // Hanya permintaan GET yang diulang otomatis: POST "mulai" dan "kirim" tidak
  // idempoten, mengulanginya bisa membuat pengerjaan/penilaian ganda.
  const ulangSah = bolehUlang === undefined ? !(opsi && opsi.method) : !!bolehUlang;
  let res;
  for (let percobaan = 0; ; percobaan++) {
    try {
      res = await fetch(API_URL + path, opsi);
      break;
    } catch (e) {
      // Permintaan pertama setelah deploy/cold-start bisa gagal di lapisan
      // jaringan/CDN (respons tanpa header CORS) — browser melaporkannya sama
      // seperti server mati. Sekali coba ulang menyelamatkan kasus itu.
      if (ulangSah && percobaan === 0) { await tunggu(1200); continue; }
      const err = new Error(pesanKoneksi());
      err.jaringan = true;
      throw err;
    }
  }
  const teks = await res.text();
  let data;
  try { data = teks ? JSON.parse(teks) : {}; } catch (e) { throw new Error('Respon server tidak dikenal.'); }
  if (!res.ok || data.success === false) throw new Error(data.message || ('Server error (HTTP ' + res.status + ').'));
  return data;
}

const post = (path, isi) => panggil(path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(isi || {})
});

// ==================== PROKTOR (pengawasan ujian) ====================
// Mendeteksi ketika siswa berpindah tab / keluar jendela (Alt-Tab, buka tab
// baru, pindah ke aplikasi lain, atau menekan Esc keluar layar penuh). Browser
// tidak bisa MENCEGAH perpindahan tab, jadi aturannya keras:
//   • begitu halaman kehilangan fokus → layar dikunci (overlay .kunci);
//   • absen ≥ PROKTOR_TOLERANSI_MS dalam sekali "pergi" → langsung dikumpulkan
//     paksa (batas 3 detik biar sinyal kuat);
//   • sampai PROKTOR_MAKS_ABSEN kali pelanggaran → dikumpulkan paksa.
// Tiap pelanggaran dilaporkan ke server (kolom pindah_tab) dan terlihat pengajar.
const PROKTOR_TOLERANSI_MS = 3000;
const PROKTOR_MAKS_ABSEN = 5;
const proktor = { aktif: false, absen: 0, keluarSejak: 0, timer: null, kunci: null };

function pasangProktor() {
  proktor.aktif = true;
  proktor.absen = 0;
  proktor.keluarSejak = 0;
  mintaFullscreen();
  document.addEventListener('visibilitychange', function () {
    if (proktor.aktif && document.hidden) keluarDariUjian();
    else if (proktor.aktif) kembaliKeUjian();
  });
  window.addEventListener('blur', function () { if (proktor.aktif) keluarDariUjian(); });
  document.addEventListener('contextmenu', function (e) { if (proktor.aktif) e.preventDefault(); });
  document.addEventListener('copy', function (e) { if (proktor.aktif) e.preventDefault(); });
  document.addEventListener('cut', function (e) { if (proktor.aktif) e.preventDefault(); });
  document.addEventListener('paste', function (e) {
    if (!proktor.aktif) return;
    e.preventDefault();
    pesan('Menyalin/menempel tidak diizinkan selama ujian.', 'err');
  });
  document.addEventListener('keydown', function (e) {
    if (!proktor.aktif) return;
    if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v'].indexOf((e.key || '').toLowerCase()) !== -1) e.preventDefault();
  });
  document.addEventListener('fullscreenchange', function () {
    // Esc = login ulang interactive-dialog? Esc keluar fullscreen = meninggalkan
    // ruang ujian → absen (keluarDariUjian). Kembalinya ditangani kembaliKeUjian.
    if (proktor.aktif && !document.fullscreenElement) keluarDariUjian();
  });
}

function mintaFullscreen() {
  const r = document.documentElement;
  if (!r || typeof r.requestFullscreen !== 'function') return;
  try { r.requestFullscreen().then(function () { }).catch(function () { }); } catch (e) { /* diblokir browser */ }
}

function keluarDariUjian() {
  if (!proktor.aktif || proktor.keluarSejak) return;
  proktor.keluarSejak = Date.now();
  tampilkanKunci();
  proktor.timer = setTimeout(kumpulPaksaProktor, PROKTOR_TOLERANSI_MS);
}

function kembaliKeUjian() {
  if (!proktor.aktif || !proktor.keluarSejak) return;
  clearTimeout(proktor.timer);
  proktor.keluarSejak = 0;
  sembunyikanKunci(false);
  proktor.absen++;
  kirimProktor();
  if (proktor.absen >= PROKTOR_MAKS_ABSEN) { kumpulPaksaProktor(); return; }
  pesan('⚠️ Halaman ujian ditinggalkan (' + proktor.absen + '×). Bila sampai ' + PROKTOR_MAKS_ABSEN + '×, jawaban dikumpulkan otomatis.', 'err');
}

async function kirimProktor() {
  if (!attempt || !attempt.attempt_id || !proktor.absen) return;
  try {
    await post('/public/asesmen/attempts/' + encodeURIComponent(attempt.attempt_id) + '/proktor', { pindah_tab: proktor.absen });
  } catch (e) { /* jaringan putus → nilai terakhir tetap terkirim saat kirim jawaban */ }
}

function kumpulPaksaProktor() {
  if (!proktor.aktif) return;
  proktor.aktif = false;
  clearTimeout(proktor.timer);
  dikumpulProktor = true;
  kirimProktor();
  sembunyikanKunci(true);
  pesan('⛔ Jawaban dikumpulkan karena halaman ujian ditinggalkan.', 'err');
  kumpulkan(true);
}

function tampilkanKunci() {
  if (!proktor.kunci) {
    const ov = document.createElement('div');
    ov.className = 'kunci';
    ov.innerHTML =
      '<div class="kunci-kotak">' +
        '<p class="kunci-ikon">🔒</p>' +
        '<h2>Halaman ujian dikunci</h2>' +
        '<p class="kunci-info">Anda berpindah tab / keluar dari jendela ujian. Kembalilah untuk melanjutkan.</p>' +
        '<p class="kunci-warn">Bila tidak kembali dalam beberapa detik, jawaban Anda akan dikumpulkan otomatis.</p>' +
      '</div>';
    document.body.appendChild(ov);
    proktor.kunci = ov;
  }
  requestAnimationFrame(function () { if (proktor.kunci) proktor.kunci.classList.add('show'); });
}

function sembunyikanKunci(lepas) {
  if (!proktor.kunci) return;
  if (lepas) { proktor.kunci.remove(); proktor.kunci = null; }
  else proktor.kunci.classList.remove('show');
}

// ---------- Simpanan sementara di perangkat ----------
// Kunci per attempt_id supaya membuka dua ujian berbeda tidak saling menimpa.
const KUNCI_SIMPAN = () => 'aksara_ujian_' + (attempt && attempt.attempt_id);

function simpanSementara() {
  if (!attempt) return;
  try {
    localStorage.setItem(KUNCI_SIMPAN(), JSON.stringify({
      asesmen_id: asesmenId, attempt_id: attempt.attempt_id, judul: attempt.judul,
      soal: attempt.soal, mulai: attempt.mulai, durasi_menit: attempt.durasi_menit,
      nama: attempt.nama, jawaban: jawaban
    }));
  } catch (e) { /* localStorage penuh/diblokir — ujian tetap jalan */ }
}

function hapusSimpanan() {
  try { if (attempt) localStorage.removeItem(KUNCI_SIMPAN()); } catch (e) { /* abaikan */ }
}

function bacaSimpanan(attemptId) {
  try {
    const mentah = localStorage.getItem('aksara_ujian_' + attemptId);
    return mentah ? JSON.parse(mentah) : null;
  } catch (e) { return null; }
}

// ---------- TAHAP 1: INFO ----------
async function muatInfo() {
  if (!asesmenId) {
    el('isi').innerHTML = '<div class="kartu"><h2>⚠️ Tautan tidak lengkap</h2><p>Alamat halaman ini tidak memuat ID asesmen. Minta tautan ujian yang benar kepada pengajar Anda.</p></div>';
    return;
  }
  try {
    const info = await panggil('/public/asesmen/' + encodeURIComponent(asesmenId));
    document.title = info.judul + ' — Ujian';
    el('isi').innerHTML =
      '<div class="kartu">' +
        '<h1>' + esc(info.judul) + '</h1>' +
        (info.deskripsi ? '<p class="deskripsi">' + esc(info.deskripsi) + '</p>' : '') +
        '<div class="info-baris">' +
          '<div><span>Jumlah soal</span><b>' + info.jumlah_soal + '</b></div>' +
          '<div><span>Waktu</span><b>' + info.durasi_menit + ' menit</b></div>' +
        '</div>' +
        '<p class="catatan">Waktu mulai berjalan begitu Anda menekan tombol di bawah, dan tidak bisa dijeda. Saat waktu habis, jawaban otomatis terkumpul. Ujian berjalan dalam mode layar penuh — berpindah tab/jendela mengunci halaman dan bisa membuat jawaban dikumpulkan.</p>' +
        '<div id="info-akun"></div>' +
        '<label class="label" for="nama">Nama lengkap</label>' +
        '<input id="nama" class="isian" placeholder="Tulis nama Anda" autocomplete="name" maxlength="80">' +
        '<button class="tombol utama besar" id="btn-mulai">▶️ Mulai Mengerjakan</button>' +
      '</div>';
    el('btn-mulai').addEventListener('click', mulai);
    const inputNama = el('nama');
    inputNama.addEventListener('keydown', (e) => { if (e.key === 'Enter') mulai(); });
    pasangInfoAkun();
    inputNama.focus();
  } catch (ex) {
    // Kegagalan jaringan ≠ asesmen bermasalah, jadi catatan "pastikan Aktif"
    // hanya muncul saat masalahnya memang dari sisi server/status.
    el('isi').innerHTML = '<div class="kartu"><h2>😕 Asesmen tidak bisa dibuka</h2><p>' + esc(ex.message) + '</p>' +
      (ex.jaringan ? '' : '<p class="catatan">Bila ujian baru saja dibuka pengajar, minta dipastikan statusnya sudah <b>Aktif</b>.</p>') +
      '<button class="tombol utama" id="btn-ulang">🔄 Coba Lagi</button></div>';
    const ulang = el('btn-ulang');
    if (ulang) ulang.addEventListener('click', function () {
      ulang.disabled = true;
      ulang.textContent = '⏳ Memuat…';
      muatInfo();
      // Bila percobaan berikutnya juga gagal, tombol dibuka lagi oleh
      // muatInfo (kartu digambar ulang), jadi tidak perlu direset di sini.
    });
  }
}

// Orang tua yang sudah login di situs utama (token admin tersimpan di origin
// yang sama) bisa memilih anaknya: nama terisi otomatis, nama tidak bisa diedit
// manual, dan pengerjaan tercatat ke riwayat ujian anak di akun orang tua.
async function pasangInfoAkun() {
  const wadah = el('info-akun');
  if (!wadah) return;
  let token = '';
  try { token = localStorage.getItem('aksara_token') || ''; } catch (e) { return; }
  if (!token) return;
  let akun = null;
  try {
    const r = await fetch(API_URL + '/auth/me', { headers: { 'Authorization': 'Bearer ' + token } });
    const d = r.ok ? await r.json() : {};
    if (!d.success) return;
    akun = d;
  } catch (e) { return; }
  if (!akun || akun.peran !== 'Orang Tua') return;
  let anak = [];
  try {
    const r = await fetch(API_URL + '/my-children', { headers: { 'Authorization': 'Bearer ' + token } });
    const d = r.ok ? await r.json() : {};
    if (!d.success) return;
    anak = d.children || [];
  } catch (e) { return; }
  if (!anak.length) return;
  wadah.innerHTML =
    '<div class="akun-pilih">' +
      '<label class="label" for="pilih-anak">Mengerjakan sebagai</label>' +
      '<select id="pilih-anak" class="isian">' +
        '<option value="">👤 Tulis manual (tanpa akun)</option>' +
        anak.map(a => '<option value="' + esc(a.studentId) + '">' + esc(a.nama) + '</option>').join('') +
      '</select>' +
      '<p class="catatan">Bila memilih anak, nama terisi otomatis dan hasilnya tercatat di riwayat ujian anak pada akun Anda.</p>' +
    '</div>';
  const inpNama = el('nama');
  const pilihAnak = el('pilih-anak');
  pilihAnak.addEventListener('change', function () {
    const idAnak = pilihAnak.value;
    if (idAnak) {
      inpNama.value = pilihAnak.options[pilihAnak.selectedIndex].text;
      inpNama.readOnly = true;
      stateAkun.idAnak = idAnak;
    } else {
      inpNama.value = '';
      inpNama.readOnly = false;
      stateAkun.idAnak = '';
    }
    inpNama.focus();
  });
}

async function mulai() {
  // Bila orang tua memilih anaknya di kotak akun, nama terisi otomatis dan
  // student_id ikut terkirim agar riwayat tercatat di akun anak.
  const nama = (el('nama').value || '').trim();
  if (nama.length < 3) { pesan('Nama wajib diisi (minimal 3 huruf).', 'err'); return; }
  const tombol = el('btn-mulai');
  tombol.disabled = true;
  tombol.textContent = '⏳ Menyiapkan soal…';
  try {
    const data = await post('/public/asesmen/' + encodeURIComponent(asesmenId) + '/mulai', {
      nama: nama,
      student_id: stateAkun.idAnak || undefined
    });
    attempt = data;
    jawaban = {};
    tampilkanUjian();
    mulaiTimer();
    pasangProktor();
    pesan(data.message || 'Selamat mengerjakan!', 'ok');
  } catch (ex) {
    tombol.disabled = false;
    tombol.textContent = '▶️ Mulai Mengerjakan';
    pesan(ex.message, 'err');
  }
}

// ---------- TAHAP 2: MENGERJAKAN ----------
function labelJenis(j) {
  if (j === 'pg') return 'Pilihan ganda';
  if (j === 'listening') return 'Listening';
  if (j === 'isian') return 'Isian singkat';
  return 'Esai';
}

function htmlSoal(s) {
  const nomor = '<div class="soal-nomor"><b>' + s.no + '</b><span>' + labelJenis(s.jenis) + '</span></div>';
  let isi = '';
  if (s.jenis === 'pg' || s.jenis === 'listening') {
    // Listening (pola TOEFL): pemutar audio di atas pilihan jawaban A–D.
    const audio = (s.jenis === 'listening' && s.audio_url)
      ? '<div class="soal-audio"><audio controls preload="metadata" src="' + esc(s.audio_url) + '"></audio>' +
        '<p class="hint-audio">🔊 Dengarkan rekaman, lalu pilih jawaban.</p></div>'
      : '';
    isi = audio + '<div class="opsi-lis">' + (s.opsi || []).map(function (o) {
      const nilai = esc(o);
      return '<label class="opsi"><input type="radio" name="q_' + esc(s.id) + '" value="' + nilai + '"><span>' + nilai + '</span></label>';
    }).join('') + '</div>';
  } else if (s.jenis === 'isian') {
    isi = '<input class="isian" data-jawab="' + esc(s.id) + '" placeholder="Tulis jawaban singkat" autocomplete="off">';
  } else {
    isi = '<textarea class="isian" rows="6" data-jawab="' + esc(s.id) + '" placeholder="Tulis jawaban lengkap Anda"></textarea>';
  }
  return '<section class="kartu soal" data-soal="' + esc(s.id) + '">' + nomor +
    '<p class="teks-soal">' + esc(s.pertanyaan) + '</p>' + isi + '</section>';
}

function tampilkanUjian() {
  el('kotak-waktu').hidden = false;
  el('panel-aksi').hidden = false;
  el('isi').innerHTML =
    '<div class="judul-ujian"><h1>' + esc(attempt.judul) + '</h1><p>Dikerjakan oleh <b>' + esc(attempt.nama) + '</b> · ' + attempt.soal.length + ' soal</p></div>' +
    attempt.soal.map(htmlSoal).join('');
  pasangInput();
  segarkanKemajuan();
  el('btn-kirim').addEventListener('click', kumpulkan);
}

function pasangInput() {
  el('isi').addEventListener('change', function (e) {
    const radio = e.target.closest('input[type="radio"]');
    if (!radio) return;
    const wadah = radio.closest('[data-soal]');
    if (!wadah) return;
    jawaban[wadah.dataset.soal] = radio.value;
    wadah.classList.add('terjawab');
    simpanSementara();
    segarkanKemajuan();
  });
  el('isi').addEventListener('input', function (e) {
    const inp = e.target.closest('[data-jawab]');
    if (!inp) return;
    jawaban[inp.dataset.jawab] = inp.value;
    const wadah = inp.closest('[data-soal]');
    if (wadah) wadah.classList.toggle('terjawab', !!inp.value.trim());
    simpanSementara();
    segarkanKemajuan();
  });
}

function terisi() {
  if (!attempt) return 0;
  return attempt.soal.filter(s => String(jawaban[s.id] || '').trim() !== '').length;
}

function segarkanKemajuan() {
  const total = attempt ? attempt.soal.length : 0;
  const n = terisi();
  const k = el('kemajuan');
  if (k) k.innerHTML = 'Terjawab <b>' + n + '</b> dari <b>' + total + '</b>' + (n < total ? ' · masih ada yang kosong' : ' · lengkap');
}

function batasWaktu() {
  return new Date(attempt.mulai).getTime() + (Number(attempt.durasi_menit) || 0) * 60 * 1000;
}

function mulaiTimer() {
  clearInterval(timer);
  const perbarui = function () {
    const sisa = Math.max(0, Math.round((batasWaktu() - Date.now()) / 1000));
    const m = String(Math.floor(sisa / 60)).padStart(2, '0');
    const d = String(sisa % 60).padStart(2, '0');
    const t = el('waktu-teks');
    if (t) t.textContent = m + ':' + d;
    const kotak = el('kotak-waktu');
    if (kotak) kotak.classList.toggle('habis', sisa <= 60);
    if (sisa <= 0) {
      clearInterval(timer);
      pesan('Waktu habis — jawaban Anda langsung dikumpulkan.', 'err');
      kumpulkan(true);
    }
  };
  perbarui();
  timer = setInterval(perbarui, 1000);
}

async function kumpulkan(otomatis) {
  if (!attempt) return;
  proktor.aktif = false;
  clearTimeout(proktor.timer);
  sembunyikanKunci(true);
  const tombol = el('btn-kirim');
  if (tombol) { tombol.disabled = true; tombol.textContent = '⏳ Mengirim…'; }
  clearInterval(timer);
  const daftar = attempt.soal.map(s => ({ question_id: s.id, jawaban: String(jawaban[s.id] || '') }));
  try {
    const hasil = await post('/public/asesmen/attempts/' + encodeURIComponent(attempt.attempt_id) + '/kirim', { jawaban: daftar });
    hapusSimpanan();
    tampilkanHasil(hasil, otomatis);
  } catch (ex) {
    pesan(ex.message, 'err');
    // Gagal kirim (mis. jaringan putus): jawaban tetap tersimpan, tombol dibuka
    // lagi, dan hitungan waktu dilanjutkan supaya siswa bisa mencoba lagi.
    if (tombol) { tombol.disabled = false; tombol.textContent = '📤 Coba Kirim Lagi'; }
    if (!otomatis) mulaiTimer();
  }
}

// ---------- TAHAP 3: HASIL ----------
function tampilkanHasil(h, otomatis) {
  clearInterval(timer);
  el('kotak-waktu').hidden = true;
  el('panel-aksi').hidden = true;
  const lulus = h.nilai_lulus != null ? (Number(h.skor) >= Number(h.nilai_lulus)) : null;
  const kelasNilai = lulus === null ? '' : (lulus ? 'lulus' : 'belum');
  el('isi').innerHTML =
    '<div class="kartu hasil">' +
      '<h1>' + (dikumpulProktor ? '⛔ Dikumpulkan otomatis' : (otomatis ? '⏰ Waktu habis' : '✅ Jawaban terkumpul')) + '</h1>' +
      '<p class="catatan">' + esc(h.message || '') + '</p>' +
      (dikumpulProktor ? '<p class="peringatan">Jawaban Anda dikumpulkan karena halaman ujian ditinggalkan beberapa kali. Pengajar akan melihat catatan ini pada hasil Anda.</p>' : '') +
      '<div class="skor-bulat ' + kelasNilai + '"><b>' + h.skor + '</b><span>skor</span></div>' +
      (lulus === null ? '' : '<p class="status-lulus ' + kelasNilai + '">' + (lulus ? '🎉 Mencapai nilai kelulusan (' + h.nilai_lulus + ')' : '📌 Belum mencapai nilai kelulusan (' + h.nilai_lulus + ')') + '</p>') +
      '<div class="info-baris">' +
        '<div><span>Benar</span><b>' + h.benar + '</b></div>' +
        '<div><span>Salah</span><b>' + h.salah + '</b></div>' +
        '<div><span>Kosong</span><b>' + h.kosong + '</b></div>' +
        (h.perlu_nilai ? '<div><span>Menunggu penilaian</span><b>' + h.perlu_nilai + '</b></div>' : '') +
      '</div>' +
      (h.lewat_waktu === 'Ya' ? '<p class="peringatan">Catatan: jawaban dikumpulkan setelah batas waktu, jadi pengajar diberi tahu hal ini.</p>' : '') +
      '<p class="catatan">Nilai sudah tersimpan dan bisa dilihat pengajar. Anda boleh menutup halaman ini.</p>' +
    '</div>';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- MULAI ----------
(function init() {
  try { asesmenId = new URLSearchParams(window.location.search).get('id') || ''; } catch (e) { asesmenId = ''; }

  // Melanjutkan pengerjaan yang belum selesai di perangkat ini (refresh/HP
  // mati). Hanya simpanan untuk ASESMEN YANG SAMA yang dipulihkan — kalau siswa
  // membuka tautan ujian lain, pengerjaan lama tidak boleh ikut terbawa.
  const kunciSimpanan = asesmenId ? Object.keys(localStorage).filter(k => k.indexOf('aksara_ujian_') === 0) : [];
  for (const kunci of kunciSimpanan) {
    try {
      const simpanan = JSON.parse(localStorage.getItem(kunci));
      if (!simpanan || !simpanan.soal || !simpanan.mulai) continue;
      if (simpanan.asesmen_id !== asesmenId) continue;
      if (simpanan.attempt_id && simpanan.attempt_id !== '') {
        const sisa = new Date(simpanan.mulai).getTime() + (Number(simpanan.durasi_menit) || 0) * 60 * 1000 - Date.now();
        if (sisa > 5000) {
          attempt = simpanan;
          jawaban = simpanan.jawaban || {};
          tampilkanUjian();
          // Pulihkan pilihan yang sudah diisi sebelum refresh.
          Object.keys(jawaban).forEach(function (qid) {
            const nilai = jawaban[qid];
            // Bandingkan lewat properti .value (bukan selektor) supaya teks opsi
            // yang mengandung tanda kutip tetap aman dipulihkan.
            let terpasang = false;
            document.querySelectorAll('input[name="q_' + qid + '"]').forEach(function (r) {
              if (!terpasang && r.value === nilai) { r.checked = true; terpasang = true; }
            });
            if (!terpasang) {
              const inp = document.querySelector('[data-jawab="' + qid + '"]');
              if (inp) inp.value = nilai;
            }
            const wadah = document.querySelector('[data-soal="' + qid + '"]');
            if (wadah && String(nilai || '').trim()) wadah.classList.add('terjawab');
          });
          mulaiTimer();
          pesan('Melanjutkan pengerjaan yang belum selesai.', 'ok');
          pasangProktor();
          return;
        }
        // Sudah lewat batas → bersihkan agar tidak menggantung.
        localStorage.removeItem(kunci);
      }
    } catch (e) { /* simpanan rusak → abaikan */ }
  }

  muatInfo();
})();

// Mencegah halaman tertutup tanpa sengaja saat masih mengerjakan.
window.addEventListener('beforeunload', function (e) {
  if (attempt && !el('panel-aksi').hidden && el('btn-kirim') && !el('btn-kirim').disabled) {
    simpanSementara();
    e.preventDefault();
    e.returnValue = '';
  }
});
