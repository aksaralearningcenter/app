// ============ HALAMAN: MURID · ABSENSI · TABUNGAN · TRANSAKSI · PROGRES ============
import { state, invalidateCache } from '../state.js';
import { $, esc, rp, toast } from '../ui.js';
import { api } from '../api.js';
import { app, modal, closeModal, studentOptions, unduhCSV } from '../helpers.js';
import { STATUS_ABSENSI, BADGE_ABSENSI, tanggalHariIni, tanggalKeTeks, geserTanggal,
  hitungSesi, perluSusulan, masaDepan } from '../../shared/jadwal.js';

// ============ ABSENSI: TANGGAL & KELAS YANG SEDANG DIISI ============
// Dipilih guru di halaman Absensi dan diingat lintas refresh (halaman ini punya
// alamat sendiri), supaya membuka kembali tidak balik ke tanggal hari ini.
const KUNCI_TGL = 'aksara_absen_tanggal';
const KUNCI_KELAS = 'aksara_absen_kelas';

function simpanLokal(kunci, nilai) {
  try { localStorage.setItem(kunci, nilai || ''); } catch (_e) { /* localStorage diblokir */ }
}

function absenTanggal() {
  let t = '';
  try { t = localStorage.getItem(KUNCI_TGL) || ''; } catch (_e) { t = ''; }
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : tanggalHariIni();
}

function absenKelas() {
  try { return localStorage.getItem(KUNCI_KELAS) || ''; } catch (_e) { return ''; }
}

// Lembar absensi yang terakhir dimuat — dipakai tombol cepat tanpa memanggil
// ulang API (tanggalnya sudah pasti sama).
let lembarAbsen = {};
// Baris riwayat absensi yang sedang tampil (untuk ekspor CSV).
let riwayatAbsen = [];

// ---------- LEMBAR ABSENSI: POTONGAN TAMPILAN ----------
function pilihanKelasAbsen() {
  const daftar = (lembarAbsen && lembarAbsen.daftarKelas) || [];
  const aktif = absenKelas();
  return '<option value="">Semua kelas</option>' + daftar.map(k =>
    '<option value="' + esc(k.id) + '"' + (k.id === aktif ? ' selected' : '') + '>' + esc(k.nama) + '</option>').join('');
}

// Empat tombol status (H/S/I/A) untuk satu murid. Menyimpan seketika.
function barisMuridAbsen(m, sesiId) {
  const tombol = STATUS_ABSENSI.map(s =>
    '<button type="button" class="ab-tb ' + BADGE_ABSENSI[s] + (m.status === s ? ' on' : '') + '"' +
    ' data-action="absen-cepat" data-id="' + esc(m.studentId) + '" data-extra="' + s + '" data-name="' + esc(sesiId) + '"' +
    ' title="Tandai ' + s + '">' + s.charAt(0) + '</button>').join('');
  const statusTeks = m.status
    ? '<span class="badge ' + BADGE_ABSENSI[m.status] + '">' + esc(m.status) + '</span>' + (m.telat === 'Ya' ? ' <span class="badge b-warn" title="Diisi setelah tanggalnya">susulan</span>' : '')
    : '<span class="badge b-info">Belum</span>';
  return '<tr data-murid="' + esc(m.studentId) + '" data-status="' + esc(m.status || '') + '">' +
    '<td><b>' + esc(m.nama) + '</b><div class="ab-kecil">' + esc(m.kelasNama || '') + '</div></td>' +
    '<td class="ab-status-teks">' + statusTeks + '</td>' +
    '<td class="ab-tombol">' + tombol + '</td>' +
    '<td>' + esc(m.catatan || '-') + '</td></tr>';
}

// Satu kartu = satu sesi jadwal pada tanggal terpilih.
function kartuSesiAbsen(s) {
  const h = hitungSesi(s);
  const rows = (s.murid || []).map(m => barisMuridAbsen(m, s.jadwalId)).join('');
  const meta = [
    'Guru: ' + (s.guru || s.guruEmail || '-'),
    s.ruang ? 'Ruang: ' + s.ruang : '',
    s.catatan || ''
  ].filter(Boolean).join(' · ');
  return '<div class="card ab-sesi" data-sesi="' + esc(s.jadwalId) + '">' +
    '<div class="card-head"><h3>🕒 ' + esc(s.jam || 'Tanpa jam') + (s.mapel ? ' · ' + esc(s.mapel) : '') + '</h3>' +
      '<span class="ab-kanan"><span class="badge b-info">' + esc(s.kelasNama) + '</span> ' +
      '<span class="badge ab-hitung ' + (h.lengkap ? 'b-ok' : 'b-warn') + '">' + h.tercatat + '/' + h.total + ' tercatat</span></span></div>' +
    (meta ? '<p class="ab-meta">' + esc(meta) + '</p>' : '') +
    '<div class="table-wrap"><table><thead><tr><th>Murid</th><th>Status</th><th>Tandai</th><th>Catatan</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="4" style="text-align:center;">Belum ada murid aktif di sesi ini.</td></tr>') +
    '</tbody></table></div>' +
    (h.sisa ? '<div style="margin-top:10px;"><button class="btn btn-o btn-sm" data-action="absen-semua-hadir" data-id="' + esc(s.jadwalId) + '">✅ Tandai semua hadir (' + h.sisa + ')</button></div>' : '') +
    '</div>';
}

// Murid aktif yang tidak punya sesi jadwal hari itu — tetap bisa diabsen
// (mis. kelas insidental), disimpan tanpa tautan sesi.
function kartuTanpaJadwal(tanpa) {
  const rows = tanpa.map(m => barisMuridAbsen(m, '')).join('');
  return '<div class="card ab-sesi" data-sesi="">' +
    '<div class="card-head"><h3>🧩 Tanpa sesi jadwal hari ini</h3>' +
      '<span class="badge b-info">' + tanpa.length + ' murid</span></div>' +
    '<p class="ab-meta">Murid ini belum punya jadwal pada hari tersebut; kehadirannya tetap bisa dicatat.</p>' +
    '<div class="table-wrap"><table><thead><tr><th>Murid</th><th>Status</th><th>Tandai</th><th>Catatan</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
}

function kartuRiwayatAbsen() {
  const hariIni = tanggalHariIni();
  return '<div class="card" style="margin-top:18px;">' +
    '<div class="card-head"><h3>📜 Riwayat Absensi</h3><span class="badge b-info" id="ab-rw-jumlah">–</span></div>' +
    '<p style="font-size:.85rem;">Termasuk absensi susulan — baris bertanda <span class="badge b-warn">susulan</span> diisi setelah tanggalnya.</p>' +
    '<div class="frow">' +
      '<div class="fg"><label>Dari</label><input type="date" id="ab-rw-dari" value="' + esc(geserTanggal(hariIni, -30)) + '"></div>' +
      '<div class="fg"><label>Sampai</label><input type="date" id="ab-rw-sampai" value="' + esc(hariIni) + '"></div>' +
      '<div class="fg"><label>Status</label><select id="ab-rw-status"><option value="">Semua</option>' +
        STATUS_ABSENSI.map(s => '<option value="' + s + '">' + s + '</option>').join('') + '</select></div>' +
      '<div class="fg" style="align-self:end;"><button class="btn btn-o btn-sm" onclick="muatRiwayatAbsensi()">🔍 Tampilkan</button></div>' +
    '</div>' +
    '<div id="ab-rw-hasil"></div></div>';
}

// Hitung ulang angka “tercatat” dari DOM (setelah isian cepat) tanpa memanggil API.
function segarkanHitunganAbsen() {
  const halaman = $('page');
  if (!halaman) return;
  let totalMurid = 0, tercatat = 0;
  halaman.querySelectorAll('.ab-sesi').forEach(kartu => {
    const baris = kartu.querySelectorAll('tbody tr[data-murid]');
    const sudah = Array.prototype.filter.call(baris, tr => tr.dataset.status).length;
    totalMurid += baris.length;
    tercatat += sudah;
    const hitung = kartu.querySelector('.ab-hitung');
    if (hitung) {
      hitung.textContent = sudah + '/' + baris.length + ' tercatat';
      hitung.classList.toggle('b-ok', baris.length > 0 && sudah === baris.length);
      hitung.classList.toggle('b-warn', !(baris.length > 0 && sudah === baris.length));
    }
    const tombol = kartu.querySelector('[data-action="absen-semua-hadir"]');
    if (tombol) {
      const sisa = baris.length - sudah;
      if (!sisa) tombol.remove();
      else tombol.textContent = '✅ Tandai semua hadir (' + sisa + ')';
    }
  });
  const angka = $('ab-total');
  if (angka) {
    angka.textContent = tercatat + '/' + totalMurid + ' murid tercatat';
    angka.classList.toggle('b-ok', totalMurid > 0 && tercatat === totalMurid);
    angka.classList.toggle('b-warn', !(totalMurid > 0 && tercatat === totalMurid));
  }
}


  export const render = {
    students: function(list) {
      list = list || [];
      state.students = list;
      const rows = list.map((s, i) =>
        '<tr><td>' + (i + 1) + '</td><td><b>' + esc(s.nama) + '</b></td><td>' + esc(s.kelasNama || '-') + '</td><td>' + esc(s.noHP || '-') + '</td>' +
        '<td><span class="badge ' + (s.status === 'Aktif' ? 'b-ok' : 'b-warn') + '">' + esc(s.status) + '</span></td>' +
        '<td style="text-align:right;"><button class="btn btn-o btn-sm" data-action="edit-student" data-id="' + s.id + '">✏️</button> <button class="btn btn-d btn-sm" data-action="del-student" data-id="' + s.id + '" data-name="' + esc(s.nama) + '">🗑️</button></td></tr>').join('');
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>👨‍🎓 Murid (' + list.length + ')</h2><button class="btn btn-n btn-sm" data-action="add-student">➕ Tambah Murid</button></div>' +
        '<div class="card"><input class="search-in" placeholder="🔍 Cari nama/kelas..." oninput="filterTable(this, \'tb-students\')">' +
        '<div class="table-wrap tall" style="margin-top:12px;"><table><thead><tr><th>No</th><th>Nama</th><th>Kelas</th><th>No HP</th><th>Status</th><th></th></tr></thead><tbody id="tb-students">' + (rows || '') + '</tbody></table></div></div>';
    },

    // Lembar absensi: guru memilih TANGGAL (boleh tanggal lampau → absensi
    // susulan bila lupa mengisi di hari yang sama), lalu halaman menampilkan
    // sesi jadwal hari itu beserta murid yang harus diabsen. Satu klik tombol
    // H/S/I/A langsung menyimpan status — cepat dipakai sambil mengajar.
    attendance: function(data) {
      data = data || {};
      lembarAbsen = data;
      const sesi = data.sesi || [];
      const tanpa = data.tanpaJadwal || [];
      const tanggal = data.tanggal || absenTanggal();
      const susulan = data.telat === 'Ya' || perluSusulan(tanggal);
      const depan = masaDepan(tanggal);
      const total = Number(data.totalMurid || 0);
      const tercatat = Number(data.totalTercatat || 0);
      const kelasOpt = pilihanKelasAbsen();

      const kartu = sesi.map(kartuSesiAbsen).join('');
      const kartuTanpa = tanpa.length ? kartuTanpaJadwal(tanpa) : '';

      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>📝 Absensi</h2>' +
          '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
            '<button class="btn btn-o btn-sm" data-action="absen-hari-ini">📅 Hari Ini</button>' +
            '<button class="btn btn-o btn-sm" data-action="export-attendance-csv">⬇️ CSV</button>' +
            '<button class="btn btn-n btn-sm" data-action="open-attendance">➕ Catat Absensi</button>' +
          '</div></div>' +
        '<div class="card ab-bar">' +
          '<div class="frow">' +
            '<div class="fg"><label>Tanggal absensi</label>' +
              '<input type="date" id="ab-tanggal" value="' + esc(tanggal) + '" max="' + esc(tanggalHariIni()) + '" onchange="muatAbsensi()"></div>' +
            '<div class="fg"><label>Kelas</label><select id="ab-kelas" onchange="muatAbsensi()">' + kelasOpt + '</select></div>' +
            '<div class="fg" style="align-self:end;"><button class="btn btn-n btn-sm" onclick="muatAbsensi()">🔄 Muat</button></div>' +
          '</div>' +
          (susulan ? '<div class="ab-banner warn">📌 <b>Absensi susulan.</b> Anda mengisi kehadiran untuk <b>' + esc(data.tanggalPanjang || tanggalKeTeks(tanggal)) + '</b> — absensi yang sudah ada akan diperbarui, bukan ditolak.</div>' : '') +
          (depan ? '<div class="ab-banner err">⚠️ Tanggal di masa depan tidak bisa dipakai. Pilih hari ini atau tanggal sebelumnya.</div>' : '') +
          '<div class="ab-ringkas">' +
            '<span class="badge b-info">🗓️ ' + esc(data.tanggalPanjang || tanggalKeTeks(tanggal)) + '</span>' +
            '<span class="badge b-info">' + sesi.length + ' sesi</span>' +
            '<span class="badge ' + (tercatat >= total && total ? 'b-ok' : 'b-warn') + '" id="ab-total">' + tercatat + '/' + total + ' murid tercatat</span>' +
          '</div>' +
        '</div>' +
        (kartu || '<div class="card"><div class="empty">Tidak ada sesi jadwal pada hari ini. ' +
          'Tambahkan jadwal di menu <b>🗓️ Jadwal</b>, atau catat absensi manual dengan tombol “Catat Absensi”.</div></div>') +
        kartuTanpa +
        kartuRiwayatAbsen();
      muatRiwayatAbsensi();
    },

    savings: function(list) {
      list = list || [];
      const total = list.reduce((s, a) => s + Number(a.balance || 0), 0);
      const rows = list.map((a, i) =>
        '<tr><td>' + (i + 1) + '</td><td><b>' + esc(a.studentName) + '</b></td><td class="mono">' + esc(a.id) + '</td>' +
        '<td style="text-align:right;"><b>' + rp(a.balance) + '</b></td>' +
        '<td><button class="btn btn-o btn-sm" data-action="open-transaction-for" data-id="' + a.id + '">💰 Transaksi</button></td></tr>').join('');
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>💰 Tabungan</h2><button class="btn btn-n btn-sm" data-action="open-transaction">➕ Transaksi</button></div>' +
        '<div class="grid"><div class="stat"><div class="n">' + list.length + '</div><div class="l">Rekening</div></div><div class="stat"><div class="n">' + rp(total) + '</div><div class="l">Total Saldo</div></div></div>' +
        '<div class="card" style="margin-top:16px;"><div class="table-wrap"><table><thead><tr><th>No</th><th>Murid</th><th>ID Rekening</th><th style="text-align:right;">Saldo</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    },

    transactions: function(list) {
      list = list || [];
      const rows = list.map((t, i) =>
        '<tr><td>' + (i + 1) + '</td><td>' + new Date(t.tanggal).toLocaleDateString('id-ID') + '</td><td><b>' + esc(t.nama) + '</b></td>' +
        '<td><span class="badge ' + (t.jenis === 'Setoran' ? 'b-ok' : 'b-err') + '">' + t.jenis + '</span></td>' +
        '<td style="text-align:right;">' + rp(t.jumlah) + '</td><td style="text-align:right;">' + rp(t.saldoSetelah) + '</td><td>' + esc(t.catatan || '-') + '</td></tr>').join('');
      const note = list.length >= 200 ? '<p style="font-size:0.78rem; margin-top:8px; color:#888;">Menampilkan 200 transaksi terbaru. Export CSV untuk data lengkap.</p>' : '';
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>🧾 Transaksi</h2><button class="btn btn-n btn-sm" data-action="open-transaction">➕ Baru</button></div>' +
        '<div class="card"><div class="table-wrap tall"><table><thead><tr><th>No</th><th>Tanggal</th><th>Murid</th><th>Jenis</th><th style="text-align:right;">Jumlah</th><th style="text-align:right;">Saldo</th><th>Catatan</th></tr></thead><tbody>' + (rows || '<tr><td colspan="7" style="text-align:center;">Belum ada transaksi.</td></tr>') + '</tbody></table></div>' + note + '</div>';
    },

    progress: function() {
      const stus = state.students || [];
      const sel = stus.map(s => '<option value="' + s.id + '">' + esc(s.nama) + ' (' + esc(s.kelasNama || '-') + ')</option>').join('');
      $('page').innerHTML =
        '<div class="card"><div class="card-head"><h2>📈 Progres Murid</h2><button class="btn btn-n btn-sm" onclick="openAddProgress()">➕ Tambah Progres</button></div>' +
        '<p style="font-size:0.88rem;">Pilih murid untuk melihat riwayat progres belajarnya.</p>' +
        '<div class="frow" style="max-width:640px;"><div class="fg"><label>Murid</label><select id="pg-murid"><option value="">-- Pilih Murid --</option>' + sel + '</select></div>' +
        '<div class="fg" style="align-self:end;"><button class="btn btn-o btn-sm" onclick="loadProgressStudent()">👁️ Lihat Progres</button></div></div>' +
        '<div id="pg-result"></div></div>';
    },
  };


  // ============ AKSI: MURID ============
  async function openAddStudent() {
    let classes = [];
    try { classes = await api('getClasses'); } catch (_e) {}
    const opts = classes.map(c => '<option value="' + c.id + '">' + esc(c.nama) + '</option>').join('');
    modal('➕ Tambah Murid',
      '<div class="fg"><label>Nama Lengkap *</label><input id="f-nama" required></div>' +
      '<div class="frow"><div class="fg"><label>Kelas</label><select id="f-kelas"><option value="">-- Pilih --</option>' + opts + '</select></div>' +
      '<div class="fg"><label>Tanggal Lahir</label><input type="date" id="f-lahir"></div></div>' +
      '<div class="frow"><div class="fg"><label>Email Orang Tua</label><input type="email" id="f-email"></div>' +
      '<div class="fg"><label>No HP</label><input id="f-hp" placeholder="08xx"></div></div>' +
      '<div class="fg"><label>Status</label><select id="f-status"><option>Aktif</option><option>Cuti</option><option>Lulus</option></select></div>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="saveAddStudent()">💾 Simpan</button>');
  }

  async function saveAddStudent() {
    const data = { nama: $('f-nama').value, kelasId: $('f-kelas').value, tanggalLahir: $('f-lahir').value, email: $('f-email').value, noHP: $('f-hp').value, status: $('f-status').value };
    if (!data.nama || data.nama.length < 3) { toast('Nama wajib diisi (min. 3 huruf).', 'err'); return; }
    try {
      const res = await api('addStudent', data);
      closeModal(); toast(res.message || 'Murid ditambahkan.', 'ok'); invalidateCache('students'); app.loadPage('students');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  async function openEditStudent(id) {
    const [s, classes] = await Promise.all([
      api('getStudent', id),
      api('getClasses').catch(function() { return []; })
    ]);
    const opts = (classes || []).map(c => '<option value="' + c.id + '"' + (c.id === s.kelasId ? ' selected' : '') + '>' + esc(c.nama) + '</option>').join('');
    modal('✏️ Edit Murid — ' + esc(s.nama),
      '<div class="fg"><label>Nama *</label><input id="e-nama" value="' + esc(s.nama) + '"></div>' +
      '<div class="frow"><div class="fg"><label>Kelas</label><select id="e-kelas"><option value="">-- Pilih --</option>' + opts + '</select></div>' +
      '<div class="fg"><label>Status</label><select id="e-status">' + ['Aktif', 'Cuti', 'Lulus'].map(x => '<option' + (x === s.status ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div></div>' +
      '<div class="frow"><div class="fg"><label>Email</label><input id="e-email" value="' + esc(s.email || '') + '"></div>' +
      '<div class="fg"><label>No HP</label><input id="e-hp" value="' + esc(s.noHP || '') + '"></div></div>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="saveEditStudent(\'' + id + '\')">💾 Simpan</button>');
  }

  async function saveEditStudent(id) {
    const data = { id, nama: $('e-nama').value, kelasId: $('e-kelas').value, email: $('e-email').value, noHP: $('e-hp').value, status: $('e-status').value };
    try {
      const res = await api('updateStudent', id, data);
      closeModal(); toast(res.message || 'Tersimpan.', 'ok'); invalidateCache('students'); app.loadPage('students');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  async function delStudent(id, nama) {
    if (!confirm('Hapus murid ' + nama + '?')) return;
    try { const res = await api('deleteStudent', id); toast(res.message || 'Terhapus.', 'ok'); invalidateCache('students'); app.loadPage('students'); }
    catch (ex) { toast(ex.message, 'err'); }
  }

  // ============ AKSI: ABSENSI ============
  // Muat lembar absensi untuk tanggal & kelas yang dipilih. Pilihannya disimpan
  // di localStorage supaya refresh (halaman ini punya alamat sendiri) tetap
  // membuka tanggal yang sama — bukan selalu kembali ke hari ini.
  function muatAbsensi(tanggal) {
    const input = $('ab-tanggal');
    const tgl = String(tanggal || (input && input.value) || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl)) { toast('Tanggal tidak sah.', 'err'); return; }
    if (masaDepan(tgl)) { toast('Tanggal absensi tidak boleh melewati hari ini.', 'err'); return; }
    const sel = $('ab-kelas');
    simpanLokal(KUNCI_TGL, tgl);
    simpanLokal(KUNCI_KELAS, sel ? sel.value : '');
    invalidateCache('attendance');
    app.loadPage('attendance');
  }

  function tandaiBaris(tr, status) {
    if (!tr) return;
    tr.dataset.status = status;
    Array.prototype.forEach.call(tr.querySelectorAll('[data-action="absen-cepat"]'), b => {
      b.classList.toggle('on', b.dataset.extra === status);
    });
    const sel = tr.querySelector('.ab-status-teks');
    if (sel) {
      sel.innerHTML = '<span class="badge ' + BADGE_ABSENSI[status] + '">' + esc(status) + '</span>' +
        (perluSusulan(lembarAbsen.tanggal) ? ' <span class="badge b-warn" title="Diisi setelah tanggalnya">susulan</span>' : '');
    }
  }

  // Satu klik tombol H/S/I/A langsung menulis ke server (tanpa tombol simpan
  // terpisah) — guru mengisi sambil mengajar, dan bisa memperbaiki statusnya.
  async function simpanAbsenCepat(studentId, status, sesiId, btn) {
    if (!studentId || STATUS_ABSENSI.indexOf(status) === -1) return;
    const tr = btn ? btn.closest('tr') : null;
    if (btn) btn.disabled = true;
    try {
      await api('recordAttendance', {
        studentId, status, jadwalId: sesiId || '',
        tanggal: lembarAbsen.tanggal || absenTanggal()
      });
      tandaiBaris(tr, status);
      segarkanHitunganAbsen();
    } catch (ex) {
      toast(ex.message, 'err');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function absenSemuaHadir(sesiId) {
    const lembar = lembarAbsen || {};
    const sesi = sesiId
      ? (lembar.sesi || []).filter(s => s.jadwalId === sesiId)[0]
      : { murid: lembar.tanpaJadwal || [] };
    if (!sesi) { toast('Sesi tidak ditemukan. Muat ulang halaman.', 'err'); return; }
    const belum = (sesi.murid || []).filter(m => !m.status);
    if (!belum.length) { toast('Semua murid di sesi ini sudah tercatat.', 'ok'); return; }
    const kartu = document.querySelector('.ab-sesi[data-sesi="' + sesiId + '"]');
    let gagal = 0;
    for (const m of belum) {
      try {
        await api('recordAttendance', {
          studentId: m.studentId, status: 'Hadir', jadwalId: sesiId || '',
          tanggal: lembar.tanggal || absenTanggal()
        });
        m.status = 'Hadir';
        tandaiBaris(kartu ? kartu.querySelector('tr[data-murid="' + m.studentId + '"]') : null, 'Hadir');
      } catch (_e) { gagal++; }
    }
    segarkanHitunganAbsen();
    toast(gagal
      ? (belum.length - gagal) + ' murid ditandai hadir, ' + gagal + ' gagal.'
      : belum.length + ' murid ditandai hadir.', gagal ? 'err' : 'ok');
  }

  async function muatRiwayatAbsensi() {
    const el = $('ab-rw-hasil');
    if (!el) return;
    const dari = ($('ab-rw-dari') || {}).value || '';
    const sampai = ($('ab-rw-sampai') || {}).value || tanggalHariIni();
    const status = ($('ab-rw-status') || {}).value || '';
    el.innerHTML = '<p style="font-size:.85rem; margin-top:10px;">⏳ Memuat riwayat…</p>';
    try {
      const res = await api('getAttendanceHistory', dari, sampai, absenKelas(), status);
      riwayatAbsen = (res && res.data) || [];
      const jml = $('ab-rw-jumlah');
      if (jml) jml.textContent = riwayatAbsen.length + ' baris';
      const rows = riwayatAbsen.map(a =>
        '<tr><td>' + esc(tanggalKeTeks(a.tanggal, 'pendek')) + '<div class="ab-kecil">' + esc(a.hari || '') + '</div></td>' +
        '<td><b>' + esc(a.nama) + '</b><div class="ab-kecil">' + esc(a.kelasNama) + '</div></td>' +
        '<td>' + esc(a.sesi || a.jam || '-') + '</td>' +
        '<td><span class="badge ' + (BADGE_ABSENSI[a.status] || 'b-info') + '">' + esc(a.status) + '</span>' +
          (a.telat === 'Ya' ? ' <span class="badge b-warn" title="Diisi setelah tanggalnya">susulan</span>' : '') + '</td>' +
        '<td>' + esc(a.catatan || '-') + '</td>' +
        '<td>' + esc(a.diisiOleh || '-') + '</td></tr>').join('');
      el.innerHTML = '<div class="table-wrap tall" style="margin-top:12px;"><table><thead><tr><th>Tanggal</th><th>Murid</th><th>Sesi</th><th>Status</th><th>Catatan</th><th>Diisi oleh</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="6" style="text-align:center;">Belum ada absensi pada rentang itu.</td></tr>') + '</tbody></table></div>';
    } catch (ex) {
      el.innerHTML = '<p style="color:var(--err); margin-top:10px;">' + esc(ex.message) + '</p>';
    }
  }

  function exportAbsensiCSV() {
    if (!riwayatAbsen.length) { toast('Tampilkan riwayat dulu (tombol “Tampilkan”), lalu ekspor.', 'err'); return; }
    const rows = [['Tanggal', 'Hari', 'Murid', 'Kelas', 'Sesi', 'Status', 'Catatan', 'Susulan', 'Diisi Oleh']];
    riwayatAbsen.forEach(a => rows.push([
      a.tanggal, a.hari || '', a.nama, a.kelasNama, a.sesi || a.jam || '',
      a.status, a.catatan || '', a.telat === 'Ya' ? 'Ya' : 'Tidak', a.diisiOleh || ''
    ]));
    unduhCSV('riwayat-absensi.csv', rows);
  }

  // Murid dari lembar absensi (dipakai bila daftar murid belum dimuat).
  function muridDariLembar() {
    const out = [], ada = {};
    (lembarAbsen.sesi || []).forEach(s => (s.murid || []).forEach(m => {
      if (!ada[m.studentId]) { ada[m.studentId] = 1; out.push(m); }
    }));
    (lembarAbsen.tanpaJadwal || []).forEach(m => {
      if (!ada[m.studentId]) { ada[m.studentId] = 1; out.push(m); }
    });
    return out.sort((a, b) => String(a.nama).localeCompare(String(b.nama)));
  }

  // Catat/perbaiki absensi lewat formulir lengkap (murid, sesi, catatan,
  // notifikasi). Tanggalnya bebas — tanggal lampau = absensi susulan.
  async function openAttendance() {
    let students = state.students || [];
    try {
      if (!students.length) { students = await api('getStudents'); state.students = students; }
    } catch (_e) { /* pakai daftar dari lembar absensi */ }
    const daftarMurid = students.length ? students : muridDariLembar();
    const mOpt = '<option value="">-- Pilih --</option>' + daftarMurid.map(s =>
      '<option value="' + esc(s.id) + '">' + esc(s.nama) + (s.kelasNama ? ' (' + esc(s.kelasNama) + ')' : '') + '</option>').join('');
    const sesiOpt = '<option value="">Tanpa sesi (absensi harian)</option>' + (lembarAbsen.sesi || []).map(s =>
      '<option value="' + esc(s.jadwalId) + '">' + esc([s.jam, s.mapel].filter(Boolean).join(' · ') + ' · ' + s.kelasNama) + '</option>').join('');
    modal('📝 Catat Absensi',
      '<div class="frow">' +
        '<div class="fg"><label>Tanggal *</label><input type="date" id="a-tanggal" value="' + esc(absenTanggal()) + '" max="' + esc(tanggalHariIni()) + '"></div>' +
        '<div class="fg"><label>Status *</label><select id="a-status">' + STATUS_ABSENSI.map(s => '<option value="' + s + '">' + s + '</option>').join('') + '</select></div>' +
      '</div>' +
      '<div class="fg"><label>Murid *</label><select id="a-murid">' + mOpt + '</select></div>' +
      '<div class="fg"><label>Sesi jadwal</label><select id="a-sesi">' + sesiOpt + '</select></div>' +
      '<div class="fg"><label>Catatan</label><input id="a-catatan" placeholder="mis. izin acara keluarga"></div>' +
      '<p class="ab-kecil" style="margin:2px 0 10px;">Tanggal lampau dipakai untuk <b>absensi susulan</b>; catatan yang sudah ada akan diperbarui, bukan ditolak.</p>' +
      '<div class="fg"><label style="display:flex; gap:8px; align-items:center;"><input type="checkbox" id="a-email" style="width:auto;"> 📧 Kirim Email ke Orang Tua</label></div>' +
      '<div class="fg"><label style="display:flex; gap:8px; align-items:center;"><input type="checkbox" id="a-wa" style="width:auto;"> 💬 Kirim WhatsApp ke Orang Tua</label></div>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="saveAttendance()">💾 Simpan</button>');
  }

  async function saveAttendance() {
    const data = {
      studentId: $('a-murid').value,
      status: $('a-status').value,
      jadwalId: ($('a-sesi') || {}).value || '',
      tanggal: ($('a-tanggal') || {}).value || '',
      catatan: $('a-catatan').value,
      notifyParent: $('a-email').checked,
      notifyWhatsApp: $('a-wa').checked
    };
    if (!data.studentId) { toast('Pilih murid dulu.', 'err'); return; }
    try {
      const res = await api('recordAttendance', data);
      closeModal();
      toast(res.message || 'Absensi disimpan.', 'ok');
      if (data.tanggal) simpanLokal(KUNCI_TGL, data.tanggal);   // lembar ikut tanggal yang barusan diisi
      invalidateCache('attendance');
      app.loadPage('attendance');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  // ============ AKSI: TRANSAKSI ============
  function openTransaction() {
    modal('💰 Transaksi Tabungan',
      '<div class="fg"><label>Murid *</label><select id="t-murid" onchange="txFillSavings()"><option value="">-- Pilih --</option>' + studentOptions() + '</select></div>' +
      '<div class="fg"><label>ID Rekening</label><input id="t-savings" readonly class="mono"></div>' +
      '<div class="frow"><div class="fg"><label>Jenis *</label><select id="t-jenis"><option>Setoran</option><option>Penarikan</option></select></div>' +
      '<div class="fg"><label>Jumlah (Rp) *</label><input type="number" id="t-jumlah" min="1"></div></div>' +
      '<div class="fg"><label>Catatan</label><input id="t-catatan"></div>' +
      '<div class="fg"><label style="display:flex; gap:8px; align-items:center;"><input type="checkbox" id="t-email" style="width:auto;"> 📧 Kirim Email ke Orang Tua</label></div>' +
      '<div class="fg"><label style="display:flex; gap:8px; align-items:center;"><input type="checkbox" id="t-wa" style="width:auto;"> 💬 Kirim WhatsApp ke Orang Tua</label></div>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="saveTransaction()">✅ Proses</button>');
  }

  async function txFillSavings() {
    const id = $('t-murid').value;
    if (!id) { $('t-savings').value = ''; return; }
    try { const s = await api('getStudent', id); $('t-savings').value = s.savingsId || ''; } catch (_e) {}
  }

  async function saveTransaction() {
    const studentId = $('t-murid').value;
    const data = { studentId, savingsId: $('t-savings').value, jenis: $('t-jenis').value, jumlah: parseInt($('t-jumlah').value) || 0, catatan: $('t-catatan').value, notifyWhatsApp: $('t-wa').checked };
    if (!studentId || !data.savingsId) { toast('Pilih murid dulu.', 'err'); return; }
    if (data.jumlah < 1) { toast('Jumlah minimal Rp 1.', 'err'); return; }
    try {
      const res = await api('addTransaction', data);
      closeModal(); toast(res.message || 'Transaksi berhasil.', 'ok'); invalidateCache('savings'); app.loadPage('savings');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  async function openTransactionFor(savingsId) {
    const acc = (state.cache.savings || []).find(a => a.id === savingsId);
    if (!acc) return;
    try { const st = await api('getStudent', acc.studentId); state.students = [st].concat(state.students.filter(s => s.id !== st.id)); } catch (_e) {}
    openTransaction();
    setTimeout(() => {
      const sel = $('t-murid');
      if (sel) { sel.value = (state.students.find(s => s.savingsId === savingsId) || {}).id || ''; txFillSavings(); }
    }, 50);
  }

  // ---------- AKSI: PROGRES ----------
  function openAddProgress() {
    modal('📈 Tambah Progres',
      '<div class="fg"><label>Murid *</label><select id="p-murid"><option value="">-- Pilih --</option>' + studentOptions() + '</select></div>' +
      '<div class="frow"><div class="fg"><label>Mata Pelajaran *</label><input id="p-mapel" placeholder="Matematika"></div>' +
      '<div class="fg"><label>Nilai</label><input type="number" id="p-nilai" min="0" max="100"></div></div>' +
      '<div class="fg"><label>Topik</label><input id="p-topik" placeholder="Contoh: Penjumlahan pecahan"></div>' +
      '<div class="fg"><label>Deskripsi</label><textarea id="p-desc" rows="2"></textarea></div>' +
      '<div class="fg"><label>Guru</label><input id="p-guru"></div>' +
      '<div class="fg"><label style="display:flex; gap:8px; align-items:center;"><input type="checkbox" id="p-email" style="width:auto;"> 📧 Kirim Email ke Orang Tua</label></div>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="saveProgress()">💾 Simpan</button>');
  }

  async function saveProgress() {
    const data = { studentId: $('p-murid').value, mapel: $('p-mapel').value, topik: $('p-topik').value, nilai: parseFloat($('p-nilai').value) || 0, deskripsi: $('p-desc').value, guru: $('p-guru').value };
    if (!data.studentId || !data.mapel) { toast('Pilih murid & isi mapel.', 'err'); return; }
    try { const res = await api('addProgress', data); closeModal(); toast(res.message || 'Progres disimpan.', 'ok'); } catch (ex) { toast(ex.message, 'err'); }
  }

  async function loadProgressStudent() {
    const id = $('pg-murid').value;
    if (!id) { toast('Pilih murid dulu.', 'err'); return; }
    const el = $('pg-result');
    el.innerHTML = '<p>⏳ Memuat...</p>';
    try {
      const rows = await api('getProgressByStudent', id);
      const trs = (rows || []).map(p =>
        '<tr><td>' + new Date(p.tanggal).toLocaleDateString('id-ID') + '</td><td>' + esc(p.mapel) + '</td><td>' + esc(p.topik || '-') + '</td>' +
        '<td style="text-align:right;"><b>' + (p.nilai === '' || p.nilai == null ? '-' : p.nilai) + '</b></td><td>' + esc(p.deskripsi || '-') + '</td></tr>').join('');
      el.innerHTML = '<div class="table-wrap" style="margin-top:14px;"><table><thead><tr><th>Tanggal</th><th>Mapel</th><th>Topik</th><th style="text-align:right;">Nilai</th><th>Deskripsi</th></tr></thead><tbody>' +
        (trs || '<tr><td colspan="5" style="text-align:center;">Belum ada progres.</td></tr>') + '</tbody></table></div>' +
        '<button class="btn btn-o btn-sm" style="margin-top:12px;" onclick="openAddProgressFor(\'' + id + '\')">➕ Tambah Progres</button>';
    } catch (ex) { el.innerHTML = '<p style="color:var(--err);">' + esc(ex.message) + '</p>'; }
  }

  function openAddProgressFor(studentId) {
    openAddProgress();
    setTimeout(() => { const sel = $('p-murid'); if (sel) sel.value = studentId; }, 50);
  }

  // ---------- EXPORT CSV (browser) ----------
  // Penulis CSV-nya dipakai bersama halaman lain (lihat helpers.js → unduhCSV).
  async function exportStudentsCSV() {
    try {
      const list = await api('getStudents');
      const rows = [['ID', 'Nama', 'Kelas', 'No HP', 'Status', 'Rekening', 'Tanggal Daftar']];
      (list || []).forEach(s => rows.push([s.id, s.nama, s.kelasNama || '', s.noHP || '', s.status, s.savingsId || '', s.tanggalDaftar ? new Date(s.tanggalDaftar).toLocaleDateString('id-ID') : '']));
      unduhCSV('data-murid.csv', rows);
    } catch (ex) { toast(ex.message, 'err'); }
  }

  async function exportTransactionsCSV() {
    try {
      const list = await api('getAllTransactions');
      const rows = [['Tanggal', 'Nama', 'Jenis', 'Jumlah', 'Saldo', 'Catatan']];
      (list || []).forEach(t => rows.push([new Date(t.tanggal).toLocaleDateString('id-ID'), t.nama || '', t.jenis, Number(t.jumlah), Number(t.saldoSetelah), t.catatan || '']));
      unduhCSV('transaksi.csv', rows);
    } catch (ex) { toast(ex.message, 'err'); }
  }

  // Dipakai main.js (jembatan global untuk atribut inline).
  // absenTanggal()/absenKelas() dipakai main.js saat memuat halaman Absensi.
  export { openAddProgress, openAddProgressFor, loadProgressStudent, saveProgress,
    openAddStudent, saveAddStudent, saveEditStudent, openAttendance, saveAttendance,
    openTransaction, txFillSavings, saveTransaction,
    muatAbsensi, muatRiwayatAbsensi, absenTanggal, absenKelas };
  export const actions = {
    'add-student': function () { openAddStudent(); },
    'edit-student': function (id) { openEditStudent(id); },
    'del-student': function (id, name) { delStudent(id, name); },
    'open-attendance': function () { openAttendance(); },
    // data-id = murid · data-extra = status · data-name = id sesi jadwal;
    // parameter ke-4 (tombol yang diklik) dipakai untuk menyorot barisnya.
    'absen-cepat': function (id, nama, extra, el) { simpanAbsenCepat(id, extra, nama, el); },
    'absen-semua-hadir': function (id) { absenSemuaHadir(id); },
    'absen-hari-ini': function () { muatAbsensi(tanggalHariIni()); },
    'export-attendance-csv': function () { exportAbsensiCSV(); },
    'open-transaction': function () { openTransaction(); },
    'open-transaction-for': function (id) { openTransactionFor(id); },
    'add-progress': function () { openAddProgress(); },
    'view-progress': function () { loadProgressStudent(); },
    'add-progress-for': function (id) { openAddProgressFor(id); },
    'export-students-csv': function () { exportStudentsCSV(); },
    'export-transactions-csv': function () { exportTransactionsCSV(); }
  };
