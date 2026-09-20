// ============ HELPER JADWAL & ABSENSI (MURNI, TANPA DOM) ============
// Dipakai halaman admin “Jadwal” dan “Absensi”, serta panel Orang Tua.
// Semua fungsi di sini murni supaya bisa diuji langsung (tests/jadwal.test.mjs)
// dan tidak bergantung pada keadaan halaman.
//
// Istilah:
//   jadwal  = sesi belajar berulang tiap pekan (hari + jam + kelas/guru).
//   sesi    = satu baris jadwal pada hari tertentu (dipakai di lembar absensi).
//   absensi = catatan kehadiran murid untuk SEBUAH TANGGAL pada sebuah sesi.

// Urutan tampilan: Senin dulu (pekan sekolah), Minggu di akhir.
export const HARI_PEKAN = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
// Indeks 0 = Minggu mengikuti Date.getUTCDay().
const HARI_UTC = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const STATUS_ABSENSI = ['Hadir', 'Sakit', 'Izin', 'Alpha'];
export const STATUS_JADWAL = ['Aktif', 'Nonaktif'];
// Permintaan jadwal (Guru / Orang Tua) → disetujui Admin atau Guru pengampu.
export const STATUS_PERMINTAAN = ['Menunggu', 'Disetujui', 'Ditolak', 'Dibatalkan'];
// Warna badge per status absensi (kelas CSS panel admin).
export const BADGE_ABSENSI = { Hadir: 'b-ok', Sakit: 'b-warn', Izin: 'b-warn', Alpha: 'b-err' };
export const BADGE_PERMINTAAN = { Menunggu: 'b-warn', Disetujui: 'b-ok', Ditolak: 'b-err', Dibatalkan: 'b-info' };

function pad2(n) { return String(n).padStart(2, '0'); }

// 'YYYY-MM-DD' → 'Senin'. Tanggal mustahil (30 Februari) → ''.
export function hariDariTanggal(tanggal) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(tanggal || ''));
  if (!m) return '';
  const y = Number(m[1]), bl = Number(m[2]), tg = Number(m[3]);
  const d = new Date(Date.UTC(y, bl - 1, tg));
  if (isNaN(d.getTime()) || d.getUTCFullYear() !== y || d.getUTCMonth() !== bl - 1 || d.getUTCDate() !== tg) return '';
  return HARI_UTC[d.getUTCDay()];
}

// Tanggal hari ini menurut jam peramban pengguna (guru mengisi absen pada
// harinya sendiri, bukan menurut UTC server).
export function tanggalHariIni() {
  try {
    const s = new Date().toLocaleDateString('en-CA');
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  } catch (_e) { /* jatuh ke UTC */ }
  return new Date().toISOString().substring(0, 10);
}

// 'YYYY-MM-DD' digeser sekian hari (boleh negatif) → 'YYYY-MM-DD'.
export function geserTanggal(tanggal, hari) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(tanggal || ''));
  if (!m) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + Number(hari || 0)));
  return isNaN(d.getTime()) ? '' : d.toISOString().substring(0, 10);
}

// 'YYYY-MM-DD' → 'Senin, 21 September 2026' (gaya 'pendek' → '21 Sep 2026').
export function tanggalKeTeks(tanggal, gaya) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(tanggal || ''));
  if (!m) return String(tanggal || '');
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const opsi = gaya === 'pendek'
    ? { day: 'numeric', month: 'short', year: 'numeric' }
    : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return d.toLocaleDateString('id-ID', opsi);
}

// '0900' · '9.30' · ' 8 : 5 ' → '09:00' · '09:30' · '08:05' · tak sah → ''
export function jamRapi(v) {
  const t = String(v == null ? '' : v).trim().replace(/[.\s]/g, ':').replace(/:{2,}/g, ':');
  if (!t) return '';
  const m = /^(\d{1,2})(?::?(\d{1,2}))?$/.exec(t);
  if (!m) return '';
  const jam = Number(m[1]);
  const menit = m[2] === undefined ? 0 : Number(m[2]);
  if (jam > 23 || menit > 59) return '';
  return pad2(jam) + ':' + pad2(menit);
}

// Menit sejak 00.00; -1 bila jam tidak sah (dipakai untuk mengurutkan).
export function menitDariJam(v) {
  const j = jamRapi(v);
  return j ? Number(j.substring(0, 2)) * 60 + Number(j.substring(3, 5)) : -1;
}

// '15:00' + '16:30' → '15:00–16:30' · tanpa jam selesai → '15:00'
export function rentangJam(mulai, selesai) {
  const a = jamRapi(mulai);
  const b = jamRapi(selesai);
  if (!a) return '';
  return b ? a + '–' + b : a;
}

// Satu baris keterangan: 'Senin, 15:00–16:30 · Matematika'
export function ringkasJadwal(j) {
  const x = j || {};
  const jam = rentangJam(x.jamMulai || x.jam_mulai, x.jamSelesai || x.jam_selesai);
  return [x.hari, jam].filter(Boolean).join(', ') + (x.mapel ? ' · ' + x.mapel : '');
}

// Urut: hari pekan → jam mulai → nama kelas. Sesi tanpa jam ditaruh di akhir.
export function urutkanJadwal(list) {
  const pangkat = {};
  HARI_PEKAN.forEach((h, i) => { pangkat[h] = i; });
  return (list || []).slice().sort((a, b) => {
    const ha = pangkat[a.hari] === undefined ? 99 : pangkat[a.hari];
    const hb = pangkat[b.hari] === undefined ? 99 : pangkat[b.hari];
    if (ha !== hb) return ha - hb;
    const ja = menitDariJam(a.jamMulai || a.jam_mulai);
    const jb = menitDariJam(b.jamMulai || b.jam_mulai);
    const na = ja === -1 ? 9999 : ja;
    const nb = jb === -1 ? 9999 : jb;
    if (na !== nb) return na - nb;
    return String(a.kelasNama || a.kelas_id || '').localeCompare(String(b.kelasNama || b.kelas_id || ''));
  });
}

// Kelompokkan sesi per hari: [{ hari, sesi: [...] }] — hanya hari yang ada isinya.
export function kelompokkanPerHari(list) {
  const urut = urutkanJadwal(list);
  const out = [];
  HARI_PEKAN.forEach(hari => {
    const sesi = urut.filter(j => j.hari === hari);
    if (sesi.length) out.push({ hari, sesi: sesi });
  });
  // Hari tak dikenal (mis. data lama) tetap ditampilkan, tidak dibuang.
  const lain = urut.filter(j => HARI_PEKAN.indexOf(j.hari) === -1);
  if (lain.length) out.push({ hari: 'Lainnya', sesi: lain });
  return out;
}

// Jadwal milik seorang murid: sesi kelasnya + sesi khusus atas namanya.
export function jadwalUntukMurid(list, siswa) {
  if (!siswa) return [];
  return urutkanJadwal((list || []).filter(j => (j.status || 'Aktif') === 'Aktif' &&
    (String(j.studentId || '') === String(siswa.id) ||
      (!j.studentId && j.kelasId && j.kelasId === siswa.kelasId))));
}

// ---------- VALIDASI FORM (kembaran aturan server) ----------
// Server tetap memvalidasi ulang; ini hanya agar guru tahu lebih cepat.
export function validasiJadwal(data) {
  const d = data || {};
  const kelasId = String(d.kelasId || '').trim();
  if (!kelasId) return { ok: false, pesan: 'Kelas wajib dipilih.' };
  if (HARI_PEKAN.indexOf(d.hari) === -1) return { ok: false, pesan: 'Hari wajib dipilih (Senin–Minggu).' };
  const mulai = jamRapi(d.jamMulai);
  if (!mulai) return { ok: false, pesan: 'Jam mulai wajib diisi (contoh 15:00).' };
  const selesai = jamRapi(d.jamSelesai);
  if (d.jamSelesai && !selesai) return { ok: false, pesan: 'Jam selesai tidak sah (contoh 16:30).' };
  if (selesai && menitDariJam(selesai) <= menitDariJam(mulai)) {
    return { ok: false, pesan: 'Jam selesai harus lebih dari jam mulai.' };
  }
  return { ok: true, bersih: { kelasId, hari: d.hari, jamMulai: mulai, jamSelesai: selesai } };
}

// Form PERMINTAAN jadwal (Guru & Orang Tua): hari, kelas, jam, catatan.
// Sama seperti server — yang beda hanya penamaan kolom (camelCase).
export function validasiPermintaan(data) {
  const d = data || {};
  if (HARI_PEKAN.indexOf(d.hari) === -1) return { ok: false, pesan: 'Hari wajib dipilih (Senin–Minggu).' };
  const kelasId = String(d.kelasId || '').trim();
  if (!kelasId) return { ok: false, pesan: 'Kelas wajib dipilih.' };
  const mulai = jamRapi(d.jamMulai);
  if (!mulai) return { ok: false, pesan: 'Jam mulai wajib diisi (contoh 15:00).' };
  const selesai = jamRapi(d.jamSelesai);
  if (d.jamSelesai && !selesai) return { ok: false, pesan: 'Jam selesai tidak sah (contoh 16:30).' };
  if (selesai && menitDariJam(selesai) <= menitDariJam(mulai)) {
    return { ok: false, pesan: 'Jam selesai harus lebih dari jam mulai.' };
  }
  const catatan = String(d.catatan || '').trim();
  if (catatan.length > 300) return { ok: false, pesan: 'Catatan terlalu panjang (maks 300 karakter).' };
  return {
    ok: true,
    bersih: {
      kelasId, studentId: String(d.studentId || '').trim(), hari: d.hari,
      jamMulai: mulai, jamSelesai: selesai,
      mapel: String(d.mapel || '').trim(), ruang: String(d.ruang || '').trim(), catatan
    }
  };
}

// ---------- LEMBAR ABSENSI ----------
// Tanggal lampau → isian ini adalah absensi susulan (guru lupa mengisi hari-H).
export function perluSusulan(tanggal, hariIni) {
  const t = String(tanggal || '').substring(0, 10);
  if (!t) return false;
  return t < (hariIni || tanggalHariIni());
}

export function masaDepan(tanggal, hariIni) {
  const t = String(tanggal || '').substring(0, 10);
  if (!t) return false;
  return t > (hariIni || tanggalHariIni());
}

// Hitungan isian sebuah sesi: { tercatat, total, sisa, lengkap }
export function hitungSesi(sesi) {
  const murid = (sesi && sesi.murid) || [];
  const tercatat = murid.filter(m => m.status).length;
  return { tercatat, total: murid.length, sisa: murid.length - tercatat, lengkap: murid.length > 0 && tercatat === murid.length };
}

// Ringkasan kehadiran satu murid/daftar absensi: hitungan per status + persen hadir.
export function ringkasKehadiran(daftar) {
  const hasil = { Hadir: 0, Sakit: 0, Izin: 0, Alpha: 0, total: 0, persen: 0 };
  (daftar || []).forEach(a => {
    const s = String((a && a.status) || '');
    if (hasil[s] === undefined) return;   // status tak dikenal diabaikan
    hasil[s]++;
    hasil.total++;
  });
  hasil.persen = hasil.total ? Math.round(hasil.Hadir / hasil.total * 100) : 0;
  return hasil;
}

// Murid yang belum diabsen pada sebuah sesi (dipakai tombol “Tandai semua hadir”).
export function belumDiabsen(sesi) {
  return ((sesi && sesi.murid) || []).filter(m => !m.status);
}

// ---------- KUOTA SESI ----------
// Kuota = jumlah sesi per pekan (0 = belum diatur → tanpa batas). Nilai `kuota`
// datang dari server (lihat lib/jadwal.js), jadi di sini hanya penyajian.
export function labelKuota(k) {
  const q = k || {};
  const kuota = Number(q.kuota || 0);
  if (!kuota) return 'tanpa batas';
  return (Number(q.dipakai || 0)) + '/' + kuota + ' sesi';
}

export function ringkasKuota(k) {
  const q = k || {};
  const kuota = Number(q.kuota || 0);
  if (!kuota) return 'Belum ada batas kuota untuk ' + (q.satuan || 'murid ini') + '.';
  if (q.penuh) return 'Kuota penuh: ' + q.dipakai + ' dari ' + kuota + ' sesi/pekan terpakai.';
  return 'Sisa ' + q.sisa + ' dari ' + kuota + ' sesi/pekan' + (q.menunggu ? ' (' + q.menunggu + ' pengajuan menunggu)' : '') + '.';
}

// Kelas CSS badge untuk sisa kuota.
export function badgeKuota(k) {
  const q = k || {};
  if (!Number(q.kuota || 0)) return 'b-info';
  return q.penuh ? 'b-err' : (Number(q.sisa) === 1 ? 'b-warn' : 'b-ok');
}

// ---------- IZIN DI SISI TAMPILAN (cerminan aturan server) ----------
// Server tetap memutuskan; ini hanya agar tombol yang pasti ditolak tidak
// ditampilkan. `kelasSaya` = daftar id kelas yang boleh dikelola pengguna.
export function bolehProsesPermintaanLokal(p, aku, kelasSaya) {
  const r = p || {};
  const me = aku || {};
  if ((r.status || 'Menunggu') !== 'Menunggu') return false;
  if (me.peran === 'Admin') return true;
  if (me.peran !== 'Guru') return false;
  if (r.pemohon && r.pemohon === me.email) return false;   // permintaan sendiri → Admin
  return !!(kelasSaya && kelasSaya.indexOf(r.kelasId) !== -1);
}

export function bolehBatalkan(p, aku) {
  const r = p || {};
  const me = aku || {};
  if ((r.status || 'Menunggu') !== 'Menunggu') return false;
  if (me.peran === 'Admin') return true;
  return !!(r.pemohon && r.pemohon === me.email);
}
