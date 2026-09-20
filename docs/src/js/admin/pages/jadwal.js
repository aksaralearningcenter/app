// ============ HALAMAN: JADWAL BELAJAR ============
// Satu baris jadwal = satu sesi yang berulang tiap pekan untuk sebuah KELAS
// (mis. “Kelas 1A, Senin 15.00”) atau untuk SATU MURID saja (les privat).
//
// Jadwal inilah yang dipakai halaman Absensi: saat guru memilih tanggal, sistem
// mencari sesi yang jatuh pada hari itu lalu menyiapkan daftar muridnya — jadi
// guru tidak perlu mengingat siapa yang belajar hari itu, dan absen yang
// terlewat tetap bisa diisi di lain hari (absensi susulan).
import { state, invalidateCache } from '../state.js';
import { $, esc, toast } from '../ui.js';
import { api } from '../api.js';
import { app, modal, closeModal, unduhCSV } from '../helpers.js';
import { HARI_PEKAN, STATUS_JADWAL, kelompokkanPerHari, jadwalUntukMurid,
  validasiJadwal } from '../../shared/jadwal.js';

// Salinan jadwal yang sedang tampil (untuk form, filter, dan ekspor).
let daftar = [];
// Kelas & murid untuk formulir (diambil sekali, lalu dipakai ulang).
let kelasCache = [];
let muridCache = [];

function opsi(pilih, nilai, teks) {
  return '<option value="' + esc(nilai) + '"' + (String(pilih) === String(nilai) ? ' selected' : '') + '>' + esc(teks) + '</option>';
}

// Lengkapi daftar kelas & murid dari data jadwal + cache halaman lain, supaya
// filter tetap terisi walau halaman Murid/Kelas belum pernah dibuka.
function kumpulkanRelasi() {
  const kelas = {}, murid = {};
  (state.cache.classes || []).forEach(c => { kelas[c.id] = c.nama; });
  (state.cache.students || state.students || []).forEach(s => {
    murid[s.id] = { id: s.id, nama: s.nama, kelasId: s.kelasId || '' };
  });
  daftar.forEach(j => {
    if (j.kelasId && !kelas[j.kelasId]) kelas[j.kelasId] = j.kelasNama || j.kelasId;
    if (j.studentId && !murid[j.studentId]) murid[j.studentId] = { id: j.studentId, nama: j.namaMurid || j.studentId, kelasId: j.kelasId || '' };
  });
  kelasCache = Object.keys(kelas).map(id => ({ id, nama: kelas[id] })).sort((a, b) => a.nama.localeCompare(b.nama));
  muridCache = Object.keys(murid).map(id => murid[id]).sort((a, b) => a.nama.localeCompare(b.nama));
}

function barisJadwal(j) {
  const cari = [j.hari, j.kelasNama, j.mapel, j.guru, j.ruang, j.namaMurid].join(' ').toLowerCase();
  return '<tr data-jd-row data-jd-hari="' + esc(j.hari) + '" data-jd-kelas="' + esc(j.kelasId) + '"' +
    ' data-jd-guru="' + esc(j.guruEmail) + '" data-jd-cari="' + esc(cari) + '">' +
    '<td class="mono"><b>' + esc(j.jam || '-') + '</b></td>' +
    '<td><b>' + esc(j.kelasNama) + '</b></td>' +
    '<td>' + esc(j.mapel || '-') + '</td>' +
    '<td>' + esc(j.guru || '-') + '</td>' +
    '<td>' + esc(j.ruang || '-') + '</td>' +
    '<td>' + (j.studentId
      ? '<span class="badge b-warn">Khusus ' + esc(j.namaMurid || j.studentId) + '</span>'
      : '<span class="badge b-info">Seluruh kelas</span>') + '</td>' +
    '<td><span class="badge ' + (j.status === 'Aktif' ? 'b-ok' : 'b-warn') + '">' + esc(j.status) + '</span></td>' +
    '<td style="white-space:nowrap;"><button class="btn btn-o btn-sm" data-action="edit-schedule" data-id="' + esc(j.id) + '">✏️</button> ' +
      '<button class="btn btn-d btn-sm" data-action="del-schedule" data-id="' + esc(j.id) + '" data-name="' + esc(j.kelasNama + ' ' + j.hari) + '">🗑️</button></td></tr>';
}

function kartuHari(grup) {
  const rows = grup.sesi.map(barisJadwal).join('');
  return '<div class="card jd-hari" data-jd-hari-card="' + esc(grup.hari) + '">' +
    '<div class="card-head"><h3>🗓️ ' + esc(grup.hari) + '</h3>' +
      '<span class="badge b-info jd-hitung">' + grup.sesi.length + ' sesi</span></div>' +
    '<div class="table-wrap"><table><thead><tr><th>Jam</th><th>Kelas</th><th>Mapel</th><th>Guru</th><th>Ruang</th><th>Peserta</th><th>Status</th><th></th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table></div></div>';
}

export const render = {
  schedules: function (list) {
    daftar = (list || []).slice();
    kumpulkanRelasi();
    const grup = kelompokkanPerHari(daftar);
    const privat = daftar.filter(j => j.studentId).length;
    const kelasUnik = {}; daftar.forEach(j => { kelasUnik[j.kelasId] = 1; });

    const kartu = grup.map(kartuHari).join('');
    $('page').innerHTML =
      '<div class="card-head" style="margin-bottom:16px;"><h2>🗓️ Jadwal Belajar (' + daftar.length + ')</h2>' +
        '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
          '<button class="btn btn-o btn-sm" data-action="export-schedule-csv">⬇️ CSV</button>' +
          '<button class="btn btn-n btn-sm" data-action="add-schedule">➕ Tambah Jadwal</button>' +
        '</div></div>' +
      '<div class="grid">' +
        '<div class="stat"><div class="n">' + daftar.length + '</div><div class="l">Sesi / Pekan</div></div>' +
        '<div class="stat"><div class="n">' + grup.filter(g => g.hari !== 'Lainnya').length + '</div><div class="l">Hari Aktif</div></div>' +
        '<div class="stat"><div class="n">' + Object.keys(kelasUnik).length + '</div><div class="l">Kelas Terlayani</div></div>' +
        '<div class="stat"><div class="n">' + privat + '</div><div class="l">Sesi Privat</div></div>' +
      '</div>' +
      '<div class="card" style="margin-top:16px;"><div class="card-head"><h3>🔍 Saring &amp; Cari</h3>' +
        '<span class="badge b-info" id="jd-info-hasil">' + daftar.length + ' dari ' + daftar.length + ' sesi tampil</span></div>' +
        '<div class="frow">' +
          '<div class="fg"><label>Hari</label><select id="jd-s-hari" onchange="saringJadwal()">' + opsi('', '', 'Semua hari') +
            HARI_PEKAN.map(h => opsi('', h, h)).join('') + '</select></div>' +
          '<div class="fg"><label>Kelas</label><select id="jd-s-kelas" onchange="saringJadwal()">' + opsi('', '', 'Semua kelas') +
            kelasCache.map(k => opsi('', k.id, k.nama)).join('') + '</select></div>' +
          '<div class="fg"><label>Guru</label><select id="jd-s-guru" onchange="saringJadwal()">' + opsi('', '', 'Semua guru') +
            guruUnik().map(g => opsi('', g.email, g.nama)).join('') + '</select></div>' +
          '<div class="fg"><label>Cari</label><input id="jd-s-cari" placeholder="🔍 Mapel / kelas / ruang…" oninput="saringJadwal()"></div>' +
        '</div></div>' +
      (kartu || '<div class="card"><div class="empty">Belum ada jadwal. Tekan <b>➕ Tambah Jadwal</b> untuk membuat sesi pertama ' +
        '(mis. Kelas 1A · Senin · 15.00–16.30). Setelah itu halaman Absensi otomatis menampilkan sesi hari itu.</div></div>') +
      '<div class="card" style="margin-top:18px;"><div class="card-head"><h3>👨‍🎓 Jadwal Satu Murid</h3></div>' +
        '<p style="font-size:.85rem;">Lihat jadwal pekanan seorang murid (sesi kelasnya + sesi privatnya).</p>' +
        '<div class="frow">' +
          '<div class="fg"><label>Murid</label><select id="jd-murid">' + opsi('', '', '-- Pilih Murid --') +
            muridCache.map(m => opsi('', m.id, m.nama)).join('') + '</select></div>' +
          '<div class="fg" style="align-self:end;"><button class="btn btn-o btn-sm" data-action="jadwal-murid">👁️ Lihat Jadwal</button></div>' +
        '</div>' +
        '<div id="jd-murid-hasil"></div></div>';
  }
};

// Daftar guru unik dari jadwal yang tampil (nama diutamakan, email sebagai kunci).
function guruUnik() {
  const map = {};
  daftar.forEach(j => {
    const email = j.guruEmail || '';
    if (!map[email]) map[email] = { email, nama: j.guru || (email || 'Tanpa guru') };
  });
  return Object.keys(map).map(k => map[k]).sort((a, b) => a.nama.localeCompare(b.nama));
}

// ---------- SARING (murni tampilan, tanpa memanggil API) ----------
function saringJadwal() {
  const hari = ($('jd-s-hari') || {}).value || '';
  const kelas = ($('jd-s-kelas') || {}).value || '';
  const guru = ($('jd-s-guru') || {}).value || '';
  const q = (($('jd-s-cari') || {}).value || '').toLowerCase().trim();
  let tampil = 0;
  document.querySelectorAll('#page [data-jd-row]').forEach(tr => {
    const cocok = (!hari || tr.dataset.jdHari === hari) &&
      (!kelas || tr.dataset.jdKelas === kelas) &&
      (!guru || tr.dataset.jdGuru === guru) &&
      (!q || (tr.dataset.jdCari || '').indexOf(q) !== -1);
    tr.style.display = cocok ? '' : 'none';
    if (cocok) tampil++;
  });
  // Kartu hari disembunyikan bila seluruh barisnya tersaring keluar.
  document.querySelectorAll('#page [data-jd-hari-card]').forEach(kartu => {
    const sisa = Array.prototype.filter.call(kartu.querySelectorAll('tbody tr'), tr => tr.style.display !== 'none').length;
    kartu.style.display = sisa ? '' : 'none';
    const hitung = kartu.querySelector('.jd-hitung');
    if (hitung) hitung.textContent = sisa + ' sesi';
  });
  const info = $('jd-info-hasil');
  if (info) info.textContent = tampil + ' dari ' + daftar.length + ' sesi tampil';
}

function tampilkanJadwalMurid() {
  const el = $('jd-murid-hasil');
  const id = ($('jd-murid') || {}).value || '';
  if (!el) return;
  if (!id) { el.innerHTML = '<p style="font-size:.85rem;">Pilih murid dulu.</p>'; return; }
  const siswa = muridCache.filter(s => s.id === id)[0] || { id };
  const sesi = jadwalUntukMurid(daftar, { id, kelasId: siswa.kelasId });
  const rows = sesi.map(j =>
    '<tr><td><b>' + esc(j.hari) + '</b></td><td class="mono">' + esc(j.jam || '-') + '</td>' +
    '<td>' + esc(j.mapel || '-') + '</td><td>' + esc(j.kelasNama || '-') + '</td>' +
    '<td>' + esc(j.guru || '-') + '</td>' +
    '<td>' + (j.studentId ? '<span class="badge b-warn">privat</span>' : '<span class="badge b-info">kelas</span>') + '</td></tr>').join('');
  el.innerHTML = '<div class="table-wrap" style="margin-top:12px;"><table><thead><tr><th>Hari</th><th>Jam</th><th>Mapel</th><th>Kelas</th><th>Guru</th><th>Jenis</th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="6" style="text-align:center;">Murid ini belum punya jadwal.</td></tr>') + '</tbody></table></div>' +
    '<p class="ab-kecil" style="margin-top:8px;">' + sesi.length + ' sesi per pekan.</p>';
}

// ---------- FORM JADWAL ----------
function opsiMurid(kelasId, pilih) {
  const anggota = muridCache.filter(m => !kelasId || m.kelasId === kelasId);
  return opsi(pilih || '', '', '— Seluruh kelas —') +
    anggota.map(m => opsi(pilih || '', m.id, m.nama)).join('');
}

// Dipanggil saat kelas di form diganti → pilihan murid menyesuaikan kelas itu.
function jadwalKelasBerubah() {
  const sel = $('j-murid');
  if (!sel) return;
  const kelasId = $('j-kelas').value;
  const pilih = sel.value;
  sel.innerHTML = opsiMurid(kelasId, pilih);
}

async function bukaFormJadwal(id) {
  const j = id ? daftar.filter(x => x.id === id)[0] : null;
  if (id && !j) { toast('Jadwal tidak ditemukan. Muat ulang halaman.', 'err'); return; }
  // Kelas & murid untuk pilihan sesi (di-cache ke state agar halaman lain ikut
  // memanfaatkannya).
  try {
    const [classes, students] = await Promise.all([
      api('getClasses').catch(() => []),
      api('getStudents').catch(() => [])
    ]);
    kelasCache = classes || [];
    muridCache = students || [];
    state.cache.classes = kelasCache;
    state.students = muridCache;
  } catch (_e) { /* pakai relasi dari daftar jadwal */ }

  const kelasId = j ? j.kelasId : (kelasCache[0] || {}).id || '';
  modal(j ? '✏️ Edit Jadwal' : '➕ Tambah Jadwal',
    '<div class="frow">' +
      '<div class="fg"><label>Kelas *</label><select id="j-kelas" onchange="jadwalKelasBerubah()">' +
        kelasCache.map(k => opsi(kelasId, k.id, k.nama)).join('') + '</select></div>' +
      '<div class="fg"><label>Hari *</label><select id="j-hari">' +
        HARI_PEKAN.map(h => opsi(j ? j.hari : 'Senin', h, h)).join('') + '</select></div>' +
    '</div>' +
    '<div class="frow">' +
      '<div class="fg"><label>Jam mulai *</label><input id="j-mulai" placeholder="15:00" value="' + esc(j ? j.jamMulai : '') + '"></div>' +
      '<div class="fg"><label>Jam selesai</label><input id="j-selesai" placeholder="16:30" value="' + esc(j ? j.jamSelesai : '') + '"></div>' +
    '</div>' +
    '<div class="fg"><label>Peserta</label><select id="j-murid">' + opsiMurid(kelasId, j ? j.studentId : '') + '</select>' +
      '<small class="ab-kecil">Pilih satu murid untuk sesi privat; biarkan “Seluruh kelas” untuk sesi kelas.</small></div>' +
    '<div class="frow">' +
      '<div class="fg"><label>Mapel</label><input id="j-mapel" placeholder="Matematika" value="' + esc(j ? j.mapel : '') + '"></div>' +
      '<div class="fg"><label>Ruang</label><input id="j-ruang" placeholder="Ruang 1" value="' + esc(j ? j.ruang : '') + '"></div>' +
    '</div>' +
    '<div class="frow">' +
      '<div class="fg"><label>Status</label><select id="j-status">' +
        STATUS_JADWAL.map(s => opsi(j ? j.status : 'Aktif', s, s)).join('') + '</select></div>' +
      '<div class="fg"><label>Catatan</label><input id="j-catatan" value="' + esc(j ? j.catatan : '') + '"></div>' +
    '</div>',
    '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button>' +
    '<button class="btn btn-n btn-sm" onclick="saveSchedule(\'' + (j ? j.id : '') + '\')">💾 Simpan</button>');
}

async function saveSchedule(id) {
  const data = {
    kelasId: $('j-kelas').value,
    hari: $('j-hari').value,
    jamMulai: $('j-mulai').value,
    jamSelesai: $('j-selesai').value,
    studentId: ($('j-murid') || {}).value || '',
    mapel: $('j-mapel').value,
    ruang: $('j-ruang').value,
    catatan: $('j-catatan').value,
    status: $('j-status').value
  };
  const v = validasiJadwal(data);
  if (!v.ok) { toast(v.pesan, 'err'); return; }
  try {
    const res = id ? await api('updateSchedule', id, data) : await api('addSchedule', data);
    closeModal();
    toast(res.message || 'Jadwal disimpan.', 'ok');
    invalidateCache('schedules');
    app.loadPage('schedules');
  } catch (ex) { toast(ex.message, 'err'); }
}

async function hapusJadwal(id, nama) {
  if (!confirm('Hapus jadwal ' + nama + '?')) return;
  try {
    const res = await api('deleteSchedule', id);
    toast(res.message || 'Jadwal dihapus.', 'ok');
    invalidateCache('schedules');
    app.loadPage('schedules');
  } catch (ex) { toast(ex.message, 'err'); }
}

function jadwalCSV() {
  if (!daftar.length) { toast('Belum ada jadwal untuk diekspor.', 'err'); return; }
  const rows = [['Hari', 'Jam Mulai', 'Jam Selesai', 'Kelas', 'Mapel', 'Guru', 'Ruang', 'Peserta', 'Status', 'Catatan']];
  kelompokkanPerHari(daftar).forEach(g => g.sesi.forEach(j => rows.push([
    j.hari, j.jamMulai, j.jamSelesai, j.kelasNama, j.mapel || '', j.guru || '', j.ruang || '',
    j.studentId ? 'Khusus ' + (j.namaMurid || j.studentId) : 'Seluruh kelas', j.status, j.catatan || ''
  ])));
  unduhCSV('jadwal-belajar.csv', rows);
}

// Dipakai main.js (jembatan global untuk atribut inline di dalam modal).
export { bukaFormJadwal, saveSchedule, jadwalKelasBerubah, saringJadwal };

export const actions = {
  'add-schedule': function () { bukaFormJadwal(''); },
  'edit-schedule': function (id) { bukaFormJadwal(id); },
  'del-schedule': function (id, nama) { hapusJadwal(id, nama); },
  'schedule-murid': function () { tampilkanJadwalMurid(); },
  'jadwal-murid': function () { tampilkanJadwalMurid(); },
  'export-schedule-csv': function () { jadwalCSV(); },
  'filter-schedule': function () { saringJadwal(); }
};
