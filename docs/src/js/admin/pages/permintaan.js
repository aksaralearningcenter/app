// ============ HALAMAN: PERMINTAAN JADWAL & KUOTA SESI ============
// Guru dan Orang Tua tidak membuat jadwal langsung — mereka MENGAJUKAN, dan
// pengajuan hanya lolos bila kuota sesi (per pekan) masih tersisa:
//
//   • kuota MURID  → dari paket yang dipilih (pricing.kuota_sesi) atau diberikan
//                    Admin di halaman Murid / di halaman ini,
//   • kuota KELAS  → diberikan Admin (atau guru pengampu) per kelas.
//
// Angka 0 = belum diatur → tanpa batas, supaya data lama tidak mendadak terkunci.
// Saat disetujui (Admin, atau Guru pengampu kelasnya), sesinya dibuat otomatis
// dan langsung muncul di halaman Absensi.
import { state, invalidateCache, peranTampil } from '../state.js';
import { $, esc, toast } from '../ui.js';
import { api } from '../api.js';
import { app, modal, closeModal, unduhCSV } from '../helpers.js';
import { HARI_PEKAN, STATUS_PERMINTAAN, BADGE_PERMINTAAN, labelKuota, badgeKuota,
  ringkasKuota, bolehProsesPermintaanLokal, bolehBatalkan, validasiPermintaan, tabArsip }
  from '../../shared/jadwal.js';

// Data halaman yang sedang tampil + pilihan kelas/murid untuk formulir.
let halaman = { permintaan: [], jadwal: [], kuotaMurid: {}, kuotaKelas: {}, paket: [] };
let kelasCache = [];
let muridCache = [];
// Tab status: Diajukan | Disetujui | Selesai | Riwayat (arsip otomatis).
let tabAktif = 'Diajukan';

const aku = () => Object.assign({}, state.me || {}, { peran: peranTampil() });
const ortu = () => aku().peran === 'Orang Tua';
// Non-staf = Orang Tua & Murid: keduanya hanya mengajukan (tidak memproses),
// kelasnya terkunci ke kelas anaknya/dirinya, dan tidak melihat kuota org lain.
const nonStaf = () => ortu() || aku().peran === 'Murid';
const mandiri = () => aku().peran === 'Murid';

function opsi(pilih, nilai, teks) {
  return '<option value="' + esc(nilai) + '"' + (String(pilih) === String(nilai) ? ' selected' : '') + '>' + esc(teks) + '</option>';
}

// Murid yang tertaut ke akun ini: anak-anak (Orang Tua) atau dirinya sendiri
// (peran Murid, dari `getScheduleRequests.murid`).
function anakSaya() {
  if (mandiri()) {
    return halaman.murid ? [{
      studentId: halaman.murid.studentId, nama: halaman.murid.nama,
      kelasId: halaman.murid.kelasId, kelas: halaman.murid.kelasNama
    }] : [];
  }
  return (((state.cache.dashboard || {}).children) || []);
}

// Kelas yang boleh diurus pengguna ini. Untuk Guru, server hanya mengirim kuota
// kelas yang dia ampu — jadi daftar itu sekaligus jadi batas tampilannya.
function kelasSaya() {
  const id = Object.keys(halaman.kuotaKelas || {});
  if (id.length) return id;
  return kelasCache.map(k => k.id);
}

// Pilihan kelas & murid dari semua sumber yang ada (cache halaman lain, data
// permintaan, jadwal, dan daftar anak) supaya formulir tetap terisi walau
// halaman Murid/Kelas belum pernah dibuka.
function kumpulkanRelasi() {
  const kelas = {}, murid = {};
  (state.cache.classes || []).forEach(c => { kelas[c.id] = c.nama; });
  (state.cache.students || state.students || []).forEach(s => {
    murid[s.id] = { id: s.id, nama: s.nama, kelasId: s.kelasId || '' };
  });
  anakSaya().forEach(c => {
    if (!c.kelasId) return;
    kelas[c.kelasId] = kelas[c.kelasId] || c.kelas || c.kelasId;
    murid[c.studentId] = { id: c.studentId, nama: c.nama, kelasId: c.kelasId };
  });
  halaman.jadwal.forEach(j => {
    if (j.kelasId && !kelas[j.kelasId]) kelas[j.kelasId] = j.kelasNama || j.kelasId;
    if (j.studentId && !murid[j.studentId]) murid[j.studentId] = { id: j.studentId, nama: j.namaMurid || j.studentId, kelasId: j.kelasId || '' };
  });
  halaman.permintaan.forEach(r => {
    if (r.kelasId && !kelas[r.kelasId]) kelas[r.kelasId] = r.kelasNama || r.kelasId;
    if (r.studentId && !murid[r.studentId]) murid[r.studentId] = { id: r.studentId, nama: r.namaMurid || r.studentId, kelasId: r.kelasId || '' };
  });
  kelasCache = Object.keys(kelas).filter(Boolean).map(id => ({ id, nama: kelas[id] }))
    .sort((a, b) => String(a.nama).localeCompare(String(b.nama)));
  muridCache = Object.keys(murid).filter(Boolean).map(id => murid[id])
    .sort((a, b) => String(a.nama).localeCompare(String(b.nama)));
}

function barisPermintaan(p) {
  const kuota = p.kuota || null;
  const bolehProses = bolehProsesPermintaanLokal(p, aku(), kelasSaya());
  const bolehBatal = bolehBatalkan(p, aku());
  // Tandai selesai: staf, dari status Disetujui (guru: kelas ampuan saja).
  const staf = !nonStaf();
  const bolehSelesai = staf && p.status === 'Disetujui' &&
    (aku().peran === 'Admin' || kelasSaya().indexOf(p.kelasId) !== -1);
  const cari = [p.pemohonNama, p.pemohon, p.kelasNama, p.namaMurid, p.mapel, p.ruang, p.hari, p.status, p.catatan]
    .join(' ').toLowerCase();
  const jenis = p.tipe === 'Guru' ? 'b-info' : (p.tipe === 'Ortu' ? 'b-warn' : 'b-ok');
  const aksi = [];
  if (bolehProses) aksi.push('<button class="btn btn-n btn-sm" data-action="proses-request" data-id="' + esc(p.id) + '">⚙️ Proses</button>');
  if (bolehSelesai) aksi.push('<button class="btn btn-g btn-sm" data-action="selesai-request" data-id="' + esc(p.id) + '">✅ Selesai</button>');
  if (bolehBatal) aksi.push('<button class="btn btn-o btn-sm" data-action="batal-request" data-id="' + esc(p.id) + '" data-name="' + esc(p.kelasNama) + '">🚫 Batalkan</button>');
  return '<tr data-rq-row data-rq-status="' + esc(p.status) + '" data-rq-kelas="' + esc(p.kelasId) + '" data-rq-cari="' + esc(cari) + '" data-rq-tab="' + tabArsip(p.status, p.diproses || p.dibuat) + '">' +
    '<td><span class="badge ' + jenis + '">' + esc(p.tipe || '-') + '</span>' +
      '<div class="ab-kecil">' + esc(p.pemohonNama || p.pemohon || '-') + '</div></td>' +
    '<td><b>' + esc(p.kelasNama) + '</b><div class="ab-kecil">' +
      (p.namaMurid ? '👤 ' + esc(p.namaMurid) : 'Seluruh kelas') + '</div></td>' +
    '<td>' + esc([p.hari, p.jam].filter(Boolean).join(' · ') || '-') +
      '<div class="ab-kecil">' + esc([p.mapel, p.ruang].filter(Boolean).join(' · ') || '-') + '</div></td>' +
    '<td><span class="badge ' + badgeKuota(kuota) + '">' + esc(labelKuota(kuota)) + '</span>' +
      (kuota && kuota.menunggu ? '<div class="ab-kecil">' + kuota.menunggu + ' menunggu</div>' : '') + '</td>' +
    '<td><span class="badge ' + (BADGE_PERMINTAAN[p.status] || 'b-info') + '">' + esc(p.status) + '</span>' +
      (p.catatan ? '<div class="ab-kecil">📝 ' + esc(p.catatan) + '</div>' : '') +
      (p.jawaban ? '<div class="ab-kecil">💬 ' + esc(p.jawaban) + '</div>' : '') + '</td>' +
    '<td class="ab-kecil">' + esc(String(p.dibuat || '').substring(0, 10)) +
      (p.pemroses ? '<div class="ab-kecil">oleh ' + esc(p.pemroses) + '</div>' : '') + '</td>' +
    '<td style="white-space:nowrap;">' + (aksi.join(' ') || '<span class="ab-kecil">-</span>') + '</td></tr>';
}

// Tabel kuota: kelas (staff) atau murid (staff) — orang tua cukup melihat
// kuota anaknya di panel masing-masing.
function kartuKuota(staf) {
  if (!staf) return '';   // Orang Tua & Murid cukup melihat kuotanya sendiri di kartu
  const admin = aku().peran === 'Admin';
  const kelasId = kelasSaya();
  const rowsKelas = kelasId.map(id => {
    const k = halaman.kuotaKelas[id] || { kuota: 0, dipakai: 0, sisa: 0 };
    const nama = (kelasCache.filter(c => c.id === id)[0] || {}).nama || id;
    return '<tr><td><b>' + esc(nama) + '</b></td>' +
      '<td><span class="badge ' + badgeKuota(k) + '">' + esc(labelKuota(k)) + '</span></td>' +
      '<td class="ab-kecil">' + esc(ringkasKuota(k)) + '</td>' +
      '<td style="white-space:nowrap;"><button class="btn btn-o btn-sm" data-action="kuota-kelas" data-id="' + esc(id) + '">✏️ Kuota</button></td></tr>';
  }).join('') || '<tr><td colspan="4" style="text-align:center;">Belum ada kelas yang bisa diatur.</td></tr>';

  const idsMurid = Object.keys(halaman.kuotaMurid || {});
  const rowsMurid = idsMurid.map(id => {
    const k = halaman.kuotaMurid[id] || {};
    const m = muridCache.filter(x => x.id === id)[0] || { nama: id, kelasId: '' };
    const kelasNama = (kelasCache.filter(c => c.id === m.kelasId)[0] || {}).nama || '-';
    return '<tr><td><b>' + esc(m.nama) + '</b><div class="ab-kecil">' + esc(kelasNama) + '</div></td>' +
      '<td><span class="badge ' + badgeKuota(k) + '">' + esc(labelKuota(k)) + '</span></td>' +
      '<td class="ab-kecil">' + esc(k.paket || 'tanpa paket') + '</td>' +
      '<td style="white-space:nowrap;"><button class="btn btn-o btn-sm" data-action="kuota-murid" data-id="' + esc(id) + '">✏️ Kuota</button></td></tr>';
  }).join('') || '<tr><td colspan="4" style="text-align:center;">Belum ada murid.</td></tr>';

  const paketRows = (halaman.paket || []).map(p =>
    '<tr><td><b>' + esc(p.c1 || p.id) + '</b></td><td class="mono">' +
      (Number(p.kuota_sesi || 0) ? Number(p.kuota_sesi) + ' sesi/pekan' : 'belum diatur') + '</td></tr>').join('');

  return '<div class="grid" style="margin-top:18px;">' +
      '<div class="card"><div class="card-head"><h3>🏫 Kuota Kelas</h3>' +
        '<span class="badge b-info">0 = tanpa batas</span></div>' +
        '<div class="table-wrap"><table><thead><tr><th>Kelas</th><th>Terpakai</th><th>Keterangan</th><th></th></tr></thead><tbody>' +
        rowsKelas + '</tbody></table></div></div>' +
      '<div class="card"><div class="card-head"><h3>👤 Kuota Murid (dari paket)</h3>' +
        (admin ? '<button class="btn btn-o btn-sm" data-action="terapkan-kuota-paket">⚙️ Terapkan kuota paket</button>' : '') +
        '</div>' +
        '<div class="table-wrap"><table><thead><tr><th>Murid</th><th>Terpakai</th><th>Paket</th><th></th></tr></thead><tbody>' +
        rowsMurid + '</tbody></table></div>' +
        (paketRows ? '<p class="ab-kecil" style="margin-top:10px;"><b>Kuota bawaan paket:</b> ' +
          (halaman.paket || []).map(p => esc(p.c1 || p.id) + ' · ' + Number(p.kuota_sesi || 0) + '×').join(' | ') + '</p>' : '') +
      '</div></div>';
}

export const render = {
  requests: function (d) {
    halaman = Object.assign({ permintaan: [], jadwal: [], kuotaMurid: {}, kuotaKelas: {}, paket: [], pengajuanUmum: [] }, d || {});
    halaman.permintaan = halaman.permintaan || [];
    halaman.pengajuanUmum = (d && d.pengajuanUmum && d.pengajuanUmum.pengajuan) || d.pengajuanUmum || [];
    kumpulkanRelasi();

    const staf = !nonStaf();
    const hitungTab = { Diajukan: 0, Disetujui: 0, Selesai: 0, Riwayat: 0 };
    halaman.permintaan.forEach(p => { hitungTab[tabArsip(p.status, p.diproses || p.dibuat)]++; });
    if (!hitungTab[tabAktif] && tabAktif !== 'Diajukan') tabAktif = 'Diajukan';
    const tabBar = '<div class="ortu-tabs" role="tablist" style="margin:0 0 14px;">' +
      ['Diajukan', 'Disetujui', 'Selesai', 'Riwayat'].map(t =>
        '<button type="button" role="tab" aria-selected="' + (t === tabAktif) + '" class="ortu-tab' + (t === tabAktif ? ' on' : '') + '" data-action="tab-request" data-id="' + t + '">' +
        (t === 'Diajukan' ? '📩 ' : t === 'Disetujui' ? '✅ ' : t === 'Selesai' ? '🏁 ' : '🗂️ ') + t + ' · ' + hitungTab[t] + '</button>').join('') + '</div>';
    const hitung = { Menunggu: 0, Disetujui: 0, Ditolak: 0 };
    halaman.permintaan.forEach(p => { if (hitung[p.status] !== undefined) hitung[p.status]++; });
    const menungguSaya = halaman.permintaan.filter(p => bolehProsesPermintaanLokal(p, aku(), kelasSaya())).length;
    const rows = halaman.permintaan.map(barisPermintaan).join('');
    const opsiKelas = (nonStaf() ? anakSaya().map(c => ({ id: c.kelasId, nama: c.kelas })) : kelasCache)
      .filter(k => k.id && k.id !== 'undefined');

    $('page').innerHTML =
      '<div class="card-head" style="margin-bottom:16px;"><h2>📩 Permintaan Jadwal (' + halaman.permintaan.length + ')</h2>' +
        '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
          '<button class="btn btn-o btn-sm" data-action="export-request-csv">⬇️ CSV</button>' +
          '<button class="btn btn-n btn-sm" data-action="add-request">➕ Ajukan Jadwal</button>' +
        '</div></div>' + tabBar +
      '<p class="ab-kecil" style="margin-bottom:14px;">' + (mandiri()
        ? 'Ajukan sendiri jadwal belajar Anda di sini (mis. minta ganti jam atau tambah sesi). Pengajuan dicek terhadap kuota sesi paket Anda — selama masih tersisa, permintaan langsung masuk ke antrean persetujuan pengajar.'
        : (ortu()
          ? 'Ajukan atau ubah jadwal belajar anak Anda di sini. Pengajuan otomatis dicek terhadap kuota sesi (dari paket) — selama masih tersisa, permintaan langsung masuk ke antrean persetujuan.'
          : 'Guru & Orang Tua mengajukan sesi di sini; sesi baru aktif setelah disetujui Admin (atau Guru pengampu kelasnya) dan langsung muncul di halaman Absensi.')) +
        '</p>' +
      '<div class="grid">' +
        '<div class="stat"><div class="n">' + hitung.Menunggu + '</div><div class="l">Menunggu</div></div>' +
        '<div class="stat"><div class="n">' + hitung.Disetujui + '</div><div class="l">Disetujui</div></div>' +
        '<div class="stat"><div class="n">' + hitung.Ditolak + '</div><div class="l">Ditolak</div></div>' +
        '<div class="stat"><div class="n">' + menungguSaya + '</div><div class="l">Perlu Keputusan Anda</div></div>' +
      '</div>' +
      '<div class="card" style="margin-top:16px;"><div class="card-head"><h3>🔍 Saring &amp; Cari</h3>' +
        '<span class="badge b-info" id="rq-hasil">' + halaman.permintaan.length + ' dari ' + halaman.permintaan.length + ' pengajuan</span></div>' +
        '<div class="frow">' +
          '<div class="fg"><label>Status</label><select id="rq-s-status" onchange="saringPermintaan()">' +
            opsi('', '', 'Semua status') + STATUS_PERMINTAAN.map(s => opsi('', s, s)).join('') + '</select></div>' +
          '<div class="fg"><label>Kelas</label><select id="rq-s-kelas" onchange="saringPermintaan()">' +
            opsi('', '', 'Semua kelas') + opsiKelas.map(k => opsi('', k.id, k.nama)).join('') + '</select></div>' +
          '<div class="fg"><label>Cari</label><input id="rq-s-cari" placeholder="🔍 Pemohon / murid / mapel…" oninput="saringPermintaan()"></div>' +
        '</div></div>' +
      '<div class="card" style="margin-top:16px;"><div class="table-wrap"><table>' +
        '<thead><tr><th>Pemohon</th><th>Kelas</th><th>Sesi</th><th>Kuota</th><th>Status</th><th>Diajukan</th><th></th></tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="7" style="text-align:center;">Belum ada pengajuan jadwal. Tekan <b>➕ Ajukan Jadwal</b> untuk mengajukan sesi baru.</td></tr>') + '</tbody>' +
      '</table></div></div>' +
      kartuKuota(staf) + kartuUmum() +
      '<p class="ab-kecil" style="margin-top:14px;">Kuota dihitung per pekan: sesi aktif + pengajuan yang masih menunggu. Angka <b>0</b> berarti belum diatur (tanpa batas). Butuh tabelnya? Jalankan <code>MIGRASI-jadwal.sql</code> bila halaman ini menolak memuat data.</p>';
    saringPermintaan();   // terapkan tab aktif sejak awal
    saringUmum();
  }
};

// ---------- SARING (murni tampilan) ----------
function saringPermintaan() {
  const status = ($('rq-s-status') || {}).value || '';
  const kelas = ($('rq-s-kelas') || {}).value || '';
  const q = (($('rq-s-cari') || {}).value || '').toLowerCase().trim();
  let tampil = 0;
  document.querySelectorAll('#page [data-rq-row]').forEach(tr => {
    const cocok = (tr.dataset.rqTab || 'Diajukan') === tabAktif &&
      (!status || tr.dataset.rqStatus === status) &&
      (!kelas || tr.dataset.rqKelas === kelas) &&
      (!q || (tr.dataset.rqCari || '').indexOf(q) !== -1);
    tr.style.display = cocok ? '' : 'none';
    if (cocok) tampil++;
  });
  const info = $('rq-hasil');
  if (info) info.textContent = tampil + ' dari ' + halaman.permintaan.length + ' pengajuan';
}

// ---------- PENGAJUAN UMUM (izin, pembayaran, progres) ----------
// Alur: Diajukan → Disetujui/Ditolak → Selesai → Riwayat (otomatis).
// Disetujui = baris asli auto-tercatat (absensi/transaksi/progres).
let tabUmum = 'Diajukan';

const LABEL_JENIS = { izin: '📝 Izin', pembayaran: '💰 Pembayaran', progres: '📈 Progres' };
const BADGE_JENIS = { izin: 'b-warn', pembayaran: 'b-ok', progres: 'b-info' };

function isiUmum(p) {
  const t = [];
  if (p.jenis === 'izin') t.push((p.subtipe || 'Izin') + ' · ' + (p.tanggal || '-'));
  if (p.jenis === 'pembayaran') t.push('Rp' + Number(p.jumlah || 0).toLocaleString('id-ID'));
  if (p.jenis === 'progres') t.push([p.mapel, p.topik, p.nilai ? ('nilai ' + p.nilai) : ''].filter(Boolean).join(' · '));
  if (p.bukti) t.push('<a href="' + esc(p.bukti) + '" target="_blank" rel="noopener">🧾 bukti</a>');
  if (p.catatan) t.push('📝 ' + esc(p.catatan));
  return t.join('<br>') || '-';
}

function barisUmum(p) {
  const bolehProsesUmum = !nonStaf() && p.status === 'Diajukan' &&
    (aku().peran === 'Admin' || (function () {
      const ids = Object.keys(halaman.kuotaMurid || {});
      return ids.indexOf(p.studentId) !== -1 || kelasSaya().indexOf(p.kelasId) !== -1;
    })());
  const bolehSelesaiUmum = !nonStaf() && p.status === 'Disetujui' &&
    (aku().peran === 'Admin' || kelasSaya().indexOf(p.kelasId) !== -1);
  const bolehBatalUmum = p.status === 'Diajukan' && (p.pemohon === (aku().email || '') || aku().peran === 'Admin');
  const aksi = [];
  if (bolehProsesUmum) aksi.push('<button class="btn btn-n btn-sm" data-action="proses-pengajuan" data-id="' + esc(p.id) + '">⚙️ Proses</button>');
  if (bolehSelesaiUmum) aksi.push('<button class="btn btn-g btn-sm" data-action="selesai-pengajuan" data-id="' + esc(p.id) + '">✅ Selesai</button>');
  if (bolehBatalUmum) aksi.push('<button class="btn btn-o btn-sm" data-action="batal-pengajuan" data-id="' + esc(p.id) + '">🚫 Batalkan</button>');
  const cari = [p.pemohonNama, p.pemohon, p.namaMurid, p.kelasNama, p.jenis, p.mapel, p.topik, p.status, p.catatan].join(' ').toLowerCase();
  return '<tr data-pu-row data-pu-tab="' + tabArsip(p.status, p.diproses || p.dibuat) + '" data-pu-cari="' + esc(cari) + '">' +
    '<td><span class="badge ' + (BADGE_JENIS[p.jenis] || 'b-info') + '">' + esc(LABEL_JENIS[p.jenis] || p.jenis) + '</span>' +
      '<div class="ab-kecil">' + esc(p.pemohonNama || p.pemohon || '-') + '</div></td>' +
    '<td><b>' + esc(p.namaMurid || '-') + '</b><div class="ab-kecil">' + esc(p.kelasNama || '') + '</div></td>' +
    '<td style="font-size:.8rem;">' + isiUmum(p) + '</td>' +
    '<td><span class="badge ' + (p.status === 'Diajukan' ? 'b-warn' : p.status === 'Disetujui' ? 'b-ok' : p.status === 'Selesai' ? 'b-info' : 'b-err') + '">' + esc(p.status) + '</span>' +
      (p.jawaban ? '<div class="ab-kecil">💬 ' + esc(p.jawaban) + '</div>' : '') + '</td>' +
    '<td class="ab-kecil">' + esc(String(p.dibuat || '').substring(0, 10)) +
      (p.pemroses ? '<div class="ab-kecil">oleh ' + esc(p.pemroses) + '</div>' : '') + '</td>' +
    '<td style="white-space:nowrap;">' + (aksi.join(' ') || '<span class="ab-kecil">-</span>') + '</td></tr>';
}

function kartuUmum() {
  const daftar = halaman.pengajuanUmum || [];
  const hitung = { Diajukan: 0, Disetujui: 0, Selesai: 0, Riwayat: 0 };
  daftar.forEach(p => { hitung[tabArsip(p.status, p.diproses || p.dibuat)]++; });
  if (!hitung[tabUmum] && tabUmum !== 'Diajukan') tabUmum = 'Diajukan';
  const tabs = '<div class="ortu-tabs" role="tablist" style="margin:0 0 12px;">' +
    ['Diajukan', 'Disetujui', 'Selesai', 'Riwayat'].map(t =>
      '<button type="button" role="tab" aria-selected="' + (t === tabUmum) + '" class="ortu-tab' + (t === tabUmum ? ' on' : '') + '" data-action="tab-pengajuan" data-id="' + t + '">' + t + ' · ' + hitung[t] + '</button>').join('') + '</div>';
  const rows = daftar.map(barisUmum).join('');
  return '<div class="card" style="margin-top:18px;"><div class="card-head"><h3>📬 Pengajuan Umum (Izin · Pembayaran · Progres)</h3>' +
    (nonStaf() ? '<button class="btn btn-n btn-sm" data-action="add-pengajuan">➕ Pengajuan Baru</button>' : '<span class="badge b-info">' + daftar.length + ' pengajuan</span>') + '</div>' +
    '<p class="ab-kecil" style="margin-bottom:12px;">Izin absensi, konfirmasi pembayaran, dan usulan progres dari orang tua — disetujui staf lalu <b>tercatat otomatis</b>, selesai otomatis masuk Riwayat.</p>' +
    tabs +
    '<div class="table-wrap"><table><thead><tr><th>Jenis</th><th>Murid</th><th>Isi</th><th>Status</th><th>Diajukan</th><th></th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="6" style="text-align:center;">Belum ada pengajuan.</td></tr>') + '</tbody></table></div></div>';
}

function saringUmum() {
  const q = (($('pu-cari') || {}).value || '').toLowerCase().trim();
  document.querySelectorAll('#page [data-pu-row]').forEach(tr => {
    const cocok = (tr.dataset.puTab || 'Diajukan') === tabUmum &&
      (!q || (tr.dataset.puCari || '').indexOf(q) !== -1);
    tr.style.display = cocok ? '' : 'none';
  });
}

// ---------- FORM PENGAJUAN UMUM ----------
function opsiAnakUmum() {
  return anakSaya().map(c => '<option value="' + esc(c.studentId) + '">' + esc(c.nama) + ' — ' + esc(c.kelas || '') + '</option>').join('');
}

export function pengajuanJenisBerubah() {
  const j = ($('pu-jenis') || {}).value || 'izin';
  const w = $('pu-jenis-fields');
  if (!w) return;
  if (j === 'izin') {
    w.innerHTML = '<div class="frow"><div class="fg"><label>Tanggal *</label><input type="date" id="pu-tanggal"></div>' +
      '<div class="fg"><label>Keperluan *</label><select id="pu-subtipe"><option>Sakit</option><option>Izin</option></select></div></div>';
  } else if (j === 'pembayaran') {
    w.innerHTML = '<div class="frow"><div class="fg"><label>Nominal (Rp) *</label><input type="number" id="pu-jumlah" min="1000" placeholder="mis. 350000"></div>' +
      '<div class="fg"><label>Link Bukti (opsional)</label><input id="pu-bukti" placeholder="https://…"></div></div>';
  } else {
    w.innerHTML = '<div class="frow"><div class="fg"><label>Mapel *</label><input id="pu-mapel" placeholder="mis. Matematika"></div>' +
      '<div class="fg"><label>Nilai (opsional)</label><input id="pu-nilai" placeholder="mis. 85"></div></div>' +
      '<div class="fg"><label>Topik *</label><input id="pu-topik" placeholder="mis. Pecahan"></div>';
  }
}

function bukaFormUmum() {
  const anak = anakSaya();
  if (!anak.length) { toast('Belum ada data anak pada akun ini. Hubungi admin sekolah.', 'err'); return; }
  modal('📬 Pengajuan Baru',
    '<div class="frow"><div class="fg"><label>Jenis *</label><select id="pu-jenis" onchange="pengajuanJenisBerubah()">' +
      '<option value="izin">📝 Izin Absensi</option><option value="pembayaran">💰 Konfirmasi Pembayaran</option><option value="progres">📈 Usulan Progres</option></select></div>' +
    '<div class="fg"><label>Anak *</label><select id="pu-anak">' + opsiAnakUmum() + '</select></div></div>' +
    '<div id="pu-jenis-fields"></div>' +
    '<div class="fg"><label>Catatan</label><textarea id="pu-catatan" rows="2" placeholder="Keterangan tambahan (opsional)"></textarea></div>',
    '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button>' +
    '<button class="btn btn-n btn-sm" data-action="kirim-pengajuan">📩 Kirim Pengajuan</button>');
  pengajuanJenisBerubah();
}

function bukaProsesUmum(id) {
  const p = (halaman.pengajuanUmum || []).filter(x => x.id === id)[0];
  if (!p) { toast('Pengajuan tidak ditemukan. Muat ulang halaman.', 'err'); return; }
  modal('⚙️ Proses Pengajuan',
    '<p><b>' + esc(p.pemohonNama || p.pemohon || '-') + '</b> mengajukan ' + esc(LABEL_JENIS[p.jenis] || p.jenis) + ' untuk <b>' + esc(p.namaMurid || '-') + '</b>:</p>' +
    '<p style="font-size:.85rem;">' + isiUmum(p) + '</p>' +
    '<div class="fg"><label>Catatan / alasan (opsional)</label><textarea id="pu-jawaban" rows="2"></textarea></div>',
    '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button>' +
    '<button class="btn btn-d btn-sm" data-action="tolak-pengajuan" data-id="' + esc(p.id) + '">❌ Tolak</button>' +
    '<button class="btn btn-n btn-sm" data-action="setujui-pengajuan" data-id="' + esc(p.id) + '">✅ Setujui &amp; Catat</button>');
}

export const actionsUmum = {
  'add-pengajuan': function () { bukaFormUmum(); },
  'kirim-pengajuan': async function () {
    const data = {
      jenis: ($('pu-jenis') || {}).value || 'izin',
      studentId: ($('pu-anak') || {}).value || '',
      tanggal: ($('pu-tanggal') || {}).value || '',
      subtipe: ($('pu-subtipe') || {}).value || '',
      jumlah: ($('pu-jumlah') || {}).value || '',
      bukti: ($('pu-bukti') || {}).value || '',
      mapel: ($('pu-mapel') || {}).value || '',
      topik: ($('pu-topik') || {}).value || '',
      nilai: ($('pu-nilai') || {}).value || '',
      catatan: ($('pu-catatan') || {}).value || ''
    };
    try {
      const res = await api('tambahPengajuan', data);
      closeModal();
      toast(res.message || 'Pengajuan terkirim.', 'ok');
      invalidateCache('requests');
      app.loadPage('requests');
    } catch (ex) { toast(ex.message, 'err'); }
  },
  'proses-pengajuan': function (id) { bukaProsesUmum(id); },
  'setujui-pengajuan': async function (id) { await kirimProsesUmum(id, 'setuju'); },
  'tolak-pengajuan': async function (id) { await kirimProsesUmum(id, 'tolak'); },
  'batal-pengajuan': async function (id) {
    if (!confirm('Batalkan pengajuan ini?')) return;
    try {
      const res = await api('batalPengajuan', id);
      toast(res.message || 'Dibatalkan.', 'ok');
      invalidateCache('requests');
      app.loadPage('requests');
    } catch (ex) { toast(ex.message, 'err'); }
  },
  'selesai-pengajuan': async function (id) {
    if (!confirm('Tandai selesai? Pengajuan otomatis masuk Riwayat.')) return;
    try {
      const res = await api('selesaikanPengajuan', id);
      toast(res.message || 'Selesai.', 'ok');
      invalidateCache('requests');
      app.loadPage('requests');
    } catch (ex) { toast(ex.message, 'err'); }
  },
  'tab-pengajuan': function (id) {
    if (['Diajukan', 'Disetujui', 'Selesai', 'Riwayat'].indexOf(id) !== -1) { tabUmum = id; render.requests(halaman); }
  }
};

async function kirimProsesUmum(id, aksi) {
  const jawaban = ($('pu-jawaban') || {}).value || '';
  try {
    const res = await api('prosesPengajuan', id, aksi, jawaban);
    closeModal();
    toast(res.message || 'Diproses.', 'ok');
    invalidateCache('requests');
    app.loadPage('requests');
  } catch (ex) { toast(ex.message, 'err'); }
}
function opsiMurid(kelasId, pilih) {
  const anggota = (nonStaf() ? anakSaya().map(c => ({ id: c.studentId, nama: c.nama, kelasId: c.kelasId })) : muridCache)
    .filter(m => !kelasId || m.kelasId === kelasId);
  const judul = mandiri() ? '— Diri sendiri —' : (ortu() ? '— Seluruh kelas (anak Anda) —' : '— Seluruh kelas —');
  return opsi(pilih || '', '', judul) +
    anggota.map(m => opsi(pilih || '', m.id, m.nama)).join('');
}

// Dipanggil saat kelas diganti → pilihan peserta menyesuaikan kelas itu.
function permintaanKelasBerubah() {
  const sel = $('rq-murid');
  if (!sel) return;
  const kelasId = ($('rq-kelas') || {}).value || '';
  const pilih = sel.value;
  sel.innerHTML = opsiMurid(kelasId, pilih);
  permintaanKuotaBerubah();
}

// Sisa kuota yang berlaku untuk pilihan saat ini (murid diutamakan, lalu kelas).
function permintaanKuotaBerubah() {
  const el = $('rq-kuota');
  if (!el) return;
  const kelasId = ($('rq-kelas') || {}).value || '';
  const studentId = ($('rq-murid') || {}).value || '';
  const k = studentId ? halaman.kuotaMurid[studentId] : (kelasId ? halaman.kuotaKelas[kelasId] : null);
  if (!k) {
    el.innerHTML = '<span class="badge b-info">tanpa batas</span> Kuota belum diatur untuk pilihan ini — pengajuan tetap bisa dikirim dan akan ditinjau admin.';
    return;
  }
  el.innerHTML = '<span class="badge ' + badgeKuota(k) + '">' + esc(labelKuota(k)) + '</span> ' + esc(ringkasKuota(k)) +
    (k.penuh ? ' <b>Pengajuan kemungkinan ditolak — minta admin menambah kuota.</b>' : '');
}

async function bukaFormPermintaan() {
  // Segarkan daftar kelas/murid bila cache-nya masih kosong (halaman lain belum
  // pernah dibuka). Orang Tua tetap dibatasi ke anaknya sendiri.
  if (!nonStaf()) {
    if (!kelasCache.length) {
      const classes = await api('getClasses').catch(() => []);
      if (classes && classes.length) state.cache.classes = classes;
    }
    if (!muridCache.length) {
      const students = await api('getStudents').catch(() => []);
      if (students && students.length) state.students = students;
    }
    kumpulkanRelasi();
  }

  const anak = nonStaf() ? anakSaya() : [];
  if (nonStaf() && !anak.length) {
    toast(mandiri()
      ? 'Akun Anda belum ditautkan ke data murid. Hubungi admin sekolah.'
      : 'Belum ada data anak pada akun ini. Hubungi admin sekolah.', 'err');
    return;
  }
  const pilihanKelas = (nonStaf() ? anak.map(c => ({ id: c.kelasId, nama: c.kelas || c.kelasId })) : kelasCache)
    .filter(k => k.id);
  const kelasId = ($('rq-s-kelas') || {}).value || (pilihanKelas[0] || {}).id || '';

  modal('📩 Ajukan Jadwal',
    '<p class="ab-kecil">Ajukan satu sesi. Contoh: Kelas ' + esc((pilihanKelas[0] || {}).nama || '1A') +
      ' · Senin · 15.00–16.30. Permintaan diperiksa terhadap kuota lalu disetujui Admin/Guru pengampu.</p>' +
    '<div class="frow">' +
      '<div class="fg"><label>Kelas *</label><select id="rq-kelas" onchange="permintaanKelasBerubah()"' +
        (nonStaf() ? ' disabled' : '') + '>' +
        pilihanKelas.map(k => opsi(kelasId, k.id, k.nama)).join('') + '</select></div>' +
      '<div class="fg"><label>Peserta</label><select id="rq-murid" onchange="permintaanKuotaBerubah()">' +
        // Murid mengajukan untuk dirinya sendiri → pesertanya sudah terpilih.
        opsiMurid(kelasId, mandiri() ? ((anak[0] || {}).studentId || '') : '') + '</select>' +
        '<small class="ab-kecil">' + (mandiri()
          ? 'Sesi ini diajukan atas nama Anda sendiri.'
          : 'Pilih satu murid untuk les privat; biarkan “Seluruh kelas” untuk sesi kelas.') + '</small></div>' +
    '</div>' +
    '<div class="frow">' +
      '<div class="fg"><label>Hari *</label><select id="rq-hari">' +
        HARI_PEKAN.map(h => opsi('Senin', h, h)).join('') + '</select></div>' +
      '<div class="fg"><label>Jam mulai *</label><input id="rq-mulai" placeholder="15:00"></div>' +
      '<div class="fg"><label>Jam selesai</label><input id="rq-selesai" placeholder="16:30"></div>' +
    '</div>' +
    '<div class="frow">' +
      '<div class="fg"><label>Mapel</label><input id="rq-mapel" placeholder="Matematika"></div>' +
      '<div class="fg"><label>Ruang</label><input id="rq-ruang" placeholder="Ruang 1"></div>' +
    '</div>' +
    '<div class="fg"><label>Catatan untuk admin</label>' +
      '<textarea id="rq-catatan" rows="2" placeholder="Contoh: anak saya hanya bisa hari Senin setelah jam 15.00."></textarea></div>' +
    '<div class="fg"><label>Sisa kuota</label><div id="rq-kuota" class="ab-kecil"></div></div>',
    '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button>' +
    '<button class="btn btn-n btn-sm" onclick="savePermintaan()">📩 Kirim Pengajuan</button>');

  permintaanKuotaBerubah();
}

async function savePermintaan() {
  const data = {
    kelasId: ($('rq-kelas') || {}).value || '',
    studentId: ($('rq-murid') || {}).value || '',
    hari: ($('rq-hari') || {}).value || '',
    jamMulai: ($('rq-mulai') || {}).value || '',
    jamSelesai: ($('rq-selesai') || {}).value || '',
    mapel: ($('rq-mapel') || {}).value || '',
    ruang: ($('rq-ruang') || {}).value || '',
    catatan: ($('rq-catatan') || {}).value || ''
  };
  const v = validasiPermintaan(data);
  if (!v.ok) { toast(v.pesan, 'err'); return; }
  try {
    // Yang dikirim adalah hasil pembersihan validasi (jam dirapikan, kolom asing
    // dibuang) supaya server menerima bentuk yang sama dengan form Jadwal.
    const res = await api('addScheduleRequest', v.bersih);
    closeModal();
    toast(res.message || 'Permintaan jadwal terkirim.', 'ok');
    invalidateCache('requests');
    invalidateCache('schedules');
    app.loadPage('requests');
  } catch (ex) { toast(ex.message, 'err'); }
}

// ---------- PROSES (SETUJUI / TOLAK) ----------
function bukaProses(id) {
  const p = halaman.permintaan.filter(x => x.id === id)[0];
  if (!p) { toast('Permintaan tidak ditemukan. Muat ulang halaman.', 'err'); return; }
  const rincian = (p.studentId ? '👤 ' + esc(p.namaMurid) + ' · ' : '') + esc(p.kelasNama) +
    ' · ' + esc([p.hari, p.jam].filter(Boolean).join(' ')) +
    (p.mapel ? ' · ' + esc(p.mapel) : '') + (p.ruang ? ' · ' + esc(p.ruang) : '');
  modal('⚙️ Proses Permintaan',
    '<p><b>' + esc(p.pemohonNama || p.pemohon || '-') + '</b> (' + esc(p.tipe || '-') + ') mengajukan:</p>' +
    '<p>' + rincian + '</p>' +
    (p.catatan ? '<p class="ab-kecil">📝 ' + esc(p.catatan) + '</p>' : '') +
    '<p class="ab-kecil">' + esc(ringkasKuota(p.kuota)) + '</p>' +
    '<div class="fg"><label>Catatan / alasan (opsional)</label>' +
      '<textarea id="rq-jawaban" rows="2" placeholder="Dikirim ke pemohon lewat email & WhatsApp."></textarea></div>',
    '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button>' +
    '<button class="btn btn-d btn-sm" onclick="prosesPermintaanSekarang(\'' + esc(p.id) + '\',\'tolak\')">❌ Tolak</button>' +
    '<button class="btn btn-n btn-sm" onclick="prosesPermintaanSekarang(\'' + esc(p.id) + '\',\'setujui\')">✅ Setujui</button>');
}

async function prosesPermintaanSekarang(id, aksi) {
  const jawaban = ($('rq-jawaban') || {}).value || '';
  try {
    const res = await api('prosesScheduleRequest', id, aksi, jawaban);
    closeModal();
    toast(res.message || 'Permintaan diproses.', 'ok');
    invalidateCache('requests');
    invalidateCache('schedules');
    app.loadPage('requests');
  } catch (ex) { toast(ex.message, 'err'); }
}

async function batalkanPermintaan(id, nama) {
  if (!confirm('Batalkan pengajuan jadwal' + (nama ? ' untuk ' + nama : '') + '?')) return;
  try {
    const res = await api('batalkanScheduleRequest', id);
    toast(res.message || 'Permintaan dibatalkan.', 'ok');
    invalidateCache('requests');
    app.loadPage('requests');
  } catch (ex) { toast(ex.message, 'err'); }
}

async function selesaikanPermintaan(id) {
  if (!confirm('Tandai sesi ini selesai? Pengajuan otomatis masuk Riwayat.')) return;
  try {
    const res = await api('selesaikanRequest', id);
    toast(res.message || 'Selesai.', 'ok');
    invalidateCache('requests');
    app.loadPage('requests');
  } catch (ex) { toast(ex.message, 'err'); }
}

// ---------- KUOTA ----------
function formKuotaKelas(id) {
  const k = halaman.kuotaKelas[id] || {};
  const nama = (kelasCache.filter(c => c.id === id)[0] || {}).nama || id;
  modal('✏️ Kuota Kelas — ' + nama,
    '<div class="fg"><label>Kuota sesi per pekan</label>' +
      '<input id="rq-kuota-kelas" type="number" min="0" value="' + esc(Number(k.kuota || 0)) + '">' +
      '<small class="ab-kecil">0 = tanpa batas. Berapa sesi/pekan yang boleh dimiliki kelas ini — sesi aktif dan pengajuan yang menunggu dihitung.</small></div>' +
    '<p class="ab-kecil">' + esc(ringkasKuota(k)) + '</p>',
    '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button>' +
    '<button class="btn btn-n btn-sm" onclick="saveKuotaKelas(\'' + esc(id) + '\')">💾 Simpan</button>');
}

async function saveKuotaKelas(id) {
  const nilai = Number(($('rq-kuota-kelas') || {}).value || 0);
  try {
    const res = await api('updateClass', id, { kuotaSesi: nilai });
    closeModal();
    toast(res.message || 'Kuota kelas disimpan.', 'ok');
    invalidateCache('requests');
    app.loadPage('requests');
  } catch (ex) { toast(ex.message, 'err'); }
}

function formKuotaMurid(id) {
  const k = halaman.kuotaMurid[id] || {};
  const m = muridCache.filter(x => x.id === id)[0] || { nama: id };
  const paketOpsi = (halaman.paket || []).map(p => opsi(k.paket || '', p.c1 || p.id, (p.c1 || p.id) +
    (Number(p.kuota_sesi || 0) ? ' · ' + Number(p.kuota_sesi) + '×/pekan' : ''))).join('');
  modal('✏️ Kuota Murid — ' + m.nama,
    '<p class="ab-kecil">Kuota murid menentukan berapa sesi/pekan yang boleh dijadwalkan untuknya (dipakai saat Guru/Orang Tua mengajukan jadwal).</p>' +
    '<div class="frow">' +
      '<div class="fg"><label>Paket</label><select id="rq-m-paket">' +
        opsi(k.paket || '', '', '— Tanpa paket —') + paketOpsi + '</select>' +
        '<small class="ab-kecil">Memilih paket sekaligus menyalin kuota bawaan paket itu.</small></div>' +
      '<div class="fg"><label>Kuota sesi per pekan</label>' +
        '<input id="rq-kuota-murid" type="number" min="0" value="' + esc(Number(k.kuota || 0)) + '">' +
        '<small class="ab-kecil">0 = tanpa batas.</small></div>' +
    '</div>' +
    '<p class="ab-kecil">' + esc(ringkasKuota(k)) + (k.paketKuota ? ' · kuota paket: ' + k.paketKuota + '×/pekan' : '') + '</p>',
    '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button>' +
    '<button class="btn btn-n btn-sm" onclick="saveKuotaMurid(\'' + esc(id) + '\')">💾 Simpan</button>');
}

async function saveKuotaMurid(id) {
  const paket = ($('rq-m-paket') || {}).value || '';
  const nilai = ($('rq-kuota-murid') || {}).value;
  const data = { paket };
  if (String(nilai) !== '') data.kuotaSesi = Number(nilai);
  try {
    const res = await api('updateStudent', id, data);
    closeModal();
    toast(res.message || 'Kuota murid disimpan.', 'ok');
    invalidateCache('requests');
    invalidateCache('students');
    app.loadPage('requests');
  } catch (ex) { toast(ex.message, 'err'); }
}

// Admin: salin kuota bawaan paket ke murid yang kuotanya belum sesuai.
async function terapkanKuotaPaket() {
  if (!confirm('Terapkan kuota bawaan paket ke semua murid yang paketnya punya kuota?')) return;
  try {
    const res = await api('terapkanKuotaPaket');
    toast(res.message || 'Kuota paket diterapkan.', 'ok');
    invalidateCache('requests');
    invalidateCache('students');
    app.loadPage('requests');
  } catch (ex) { toast(ex.message, 'err'); }
}

function permintaanCSV() {
  if (!halaman.permintaan.length) { toast('Belum ada pengajuan untuk diekspor.', 'err'); return; }
  const rows = [['Diajukan', 'Tipe', 'Pemohon', 'Kelas', 'Murid', 'Hari', 'Jam', 'Mapel', 'Ruang', 'Kuota', 'Status', 'Catatan', 'Jawaban', 'Diproses oleh']];
  halaman.permintaan.forEach(p => rows.push([
    String(p.dibuat || '').substring(0, 10), p.tipe || '', p.pemohonNama || p.pemohon || '', p.kelasNama || '',
    p.namaMurid || 'Seluruh kelas', p.hari || '', p.jam || '', p.mapel || '', p.ruang || '',
    labelKuota(p.kuota), p.status || '', p.catatan || '', p.jawaban || '', p.pemroses || ''
  ]));
  unduhCSV('permintaan-jadwal.csv', rows);
}

// Dipakai main.js sebagai jembatan global untuk atribut inline di dalam modal.
export { bukaFormPermintaan, savePermintaan, prosesPermintaanSekarang, permintaanKelasBerubah,
  permintaanKuotaBerubah, saveKuotaKelas, saveKuotaMurid, saringPermintaan };

export const actions = Object.assign({
  'add-request': function () { bukaFormPermintaan(); },
  'proses-request': function (id) { bukaProses(id); },
  'batal-request': function (id, nama) { batalkanPermintaan(id, nama); },
  'selesai-request': function (id) { selesaikanPermintaan(id); },
  'tab-request': function (id) {
    if (['Diajukan', 'Disetujui', 'Selesai', 'Riwayat'].indexOf(id) !== -1) { tabAktif = id; render.requests(halaman); }
  },
  'kuota-kelas': function (id) { formKuotaKelas(id); },
  'kuota-murid': function (id) { formKuotaMurid(id); },
  'terapkan-kuota-paket': function () { terapkanKuotaPaket(); },
  'export-request-csv': function () { permintaanCSV(); },
  'lihat-requests': function () { app.loadPage('requests'); }
}, actionsUmum);
