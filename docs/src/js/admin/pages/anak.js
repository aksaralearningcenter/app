// ============ HALAMAN: AKUN & ANAK (Orang Tua / Murid ↔ Data Murid) ============
// Ada dua jenis akun non-staf, dan keduanya memakai kolom `users.anak`:
//
//   • ORANG TUA — boleh memuat BANYAK anak (kakak-adik), "S-1:Aisyah, S-2:Budi".
//     Satu login untuk memantau semuanya; satu anak boleh tertaut ke beberapa
//     akun (ayah & ibu dengan email berbeda).
//   • MURID     — siswa yang login sendiri (SMA, mahasiswa, les privat dewasa).
//     Tautannya SATU: dirinya sendiri, dan panelnya hanya berisi datanya.
//
// Halaman ini yang mengatur tautan itu, jadi kasus “kakak-adik beda email” atau
// “anak SMA sudah bisa mandiri” tidak perlu dibetulkan lewat database.
import { invalidateCache } from '../state.js';
import { $, esc, toast } from '../ui.js';
import { api } from '../api.js';
import { app } from '../helpers.js';

// Data halaman yang sedang tampil (untuk saring & pencarian tanpa memanggil API).
let halaman = { orangTua: [], akunMurid: [], siswa: [] };

function opsi(pilih, nilai, teks) {
  return '<option value="' + esc(nilai) + '"' + (String(pilih) === String(nilai) ? ' selected' : '') + '>' + esc(teks) + '</option>';
}

// Murid yang bisa ditautkan ke akun: semua murid aktif, yang sudah tertaut ditandai.
function opsiMurid(tertaut) {
  return opsi('', '', '— Pilih murid — ') + (halaman.siswa || []).map(m =>
    opsi('', m.id, m.nama + ' · ' + m.kelas + (tertaut.indexOf(m.id) !== -1 ? ' (sudah tertaut)' : ''))).join('');
}

function opsiOrtu() {
  return opsi('', '', '— Pilih akun orang tua — ') +
    (halaman.orangTua || []).filter(u => u.status === 'Aktif')
      .map(u => opsi('', u.email, (u.nama || u.email) + ' · ' + u.email)).join('');
}

function tombolKredensial(email) {
  return '<button class="btn btn-o btn-sm" data-action="kirim-kredensial" data-id="' + esc(email) + '">🔑 Kirim kredensial baru</button>';
}

// Baris satu murid (dipakai daftar “belum punya akun” & kartu akun murid).
function rincianMurid(m) {
  return '<b>' + esc(m.nama) + '</b><div class="ab-kecil mono">' + esc(m.id) + '</div>';
}

// Satu kartu = satu akun Orang Tua beserta daftar anaknya (boleh banyak).
function kartuOrtu(u) {
  const ids = u.anak.map(a => a.id);
  const baris = u.anak.map(a =>
    '<tr data-anak-baris data-anak-cari="' + esc((a.nama + ' ' + a.id).toLowerCase()) + '">' +
      '<td>' + rincianMurid(a) + '</td>' +
      '<td>' + (a.hilang ? '<span class="badge b-err">murid dihapus</span>'
        : esc(a.kelas || '-') + (a.nonaktif ? ' <span class="badge b-warn">nonaktif</span>' : '')) + '</td>' +
      '<td style="white-space:nowrap;"><button class="btn btn-o btn-sm" data-action="lepas-anak" data-id="' + esc(u.email) +
        '" data-extra="' + esc(a.id) + '" data-name="' + esc(a.nama) + '">🔓 Lepas</button></td></tr>').join('');
  const cari = (u.email + ' ' + (u.nama || '') + ' ' + u.anak.map(a => a.nama).join(' ')).toLowerCase();

  return '<div class="card" data-anak-kartu data-anak-kartu-cari="' + esc(cari) + '" style="margin-top:16px;">' +
    '<div class="card-head">' +
      '<h3>👤 ' + esc(u.nama || u.email) + '</h3>' +
      '<div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">' +
        '<span class="badge ' + (u.status === 'Aktif' ? 'b-ok' : 'b-err') + '">' + esc(u.status) + '</span>' +
        '<span class="badge ' + (u.anak.length ? 'b-info' : 'b-warn') + '">' + u.anak.length + ' anak</span>' +
        tombolKredensial(u.email) +
      '</div></div>' +
    '<p class="ab-kecil" style="margin-bottom:12px;">' + esc(u.email) +
      ' · username: <span class="mono">' + esc(u.username || 'belum dibuat (tekan 🔑)') + '</span></p>' +
    '<div class="table-wrap"><table><thead><tr><th>Anak</th><th>Kelas</th><th></th></tr></thead><tbody>' +
      (baris || '<tr><td colspan="3" style="text-align:center;">Belum ada anak tertaut ke akun ini.</td></tr>') +
    '</tbody></table></div>' +
    '<div class="frow" data-anak-form style="margin-top:12px;">' +
      '<div class="fg"><label>Tautkan anak</label><select data-anak-pilih>' + opsiMurid(ids) + '</select>' +
        '<small class="ab-kecil">Anak langsung muncul di panel orang tua; email pemberitahuan ikut dikirim.</small></div>' +
      '<div class="fg" style="align-self:end;">' +
        '<button class="btn btn-n btn-sm" data-action="tautkan-anak" data-id="' + esc(u.email) + '">➕ Tautkan</button></div>' +
    '</div></div>';
}

// Satu kartu = satu akun Murid (siswa yang login sendiri). Tautannya satu:
// dirinya sendiri — menyimpan murid lain akan MENGGANTI tautan sebelumnya.
function kartuMuridAkun(u) {
  const m = u.murid;
  const cari = (u.email + ' ' + (u.nama || '') + ' ' + (m ? m.nama : '')).toLowerCase();
  const isi = m
    ? '<div class="table-wrap"><table><thead><tr><th>Murid</th><th>Kelas</th><th></th></tr></thead><tbody>' +
        '<tr data-anak-baris data-anak-cari="' + esc((m.nama + ' ' + m.id).toLowerCase()) + '">' +
        '<td>' + rincianMurid(m) + '</td>' +
        '<td>' + (m.hilang ? '<span class="badge b-err">murid dihapus</span>' : esc(m.kelas || '-')) + '</td>' +
        '<td style="white-space:nowrap;"><button class="btn btn-o btn-sm" data-action="lepas-anak" data-id="' + esc(u.email) +
          '" data-extra="' + esc(m.id) + '" data-name="' + esc(m.nama) + '">🔓 Lepas</button></td></tr>' +
      '</tbody></table></div>'
    : '<p class="ab-kecil" style="margin:0 0 10px;">⚠️ Akun ini belum tertaut ke murid mana pun — muridnya belum bisa melihat data apa pun.</p>';
  return '<div class="card" data-anak-kartu data-anak-kartu-cari="' + esc(cari) + '" style="margin-top:16px;">' +
    '<div class="card-head">' +
      '<h3>🎒 ' + esc(u.nama || u.email) + '</h3>' +
      '<div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">' +
        '<span class="badge ' + (u.status === 'Aktif' ? 'b-ok' : 'b-err') + '">' + esc(u.status) + '</span>' +
        '<span class="badge b-info">akun murid</span>' +
        tombolKredensial(u.email) +
      '</div></div>' +
    '<p class="ab-kecil" style="margin-bottom:12px;">' + esc(u.email) +
      ' · username: <span class="mono">' + esc(u.username || 'belum dibuat (tekan 🔑)') + '</span></p>' +
    isi +
    '<div class="frow" data-anak-form style="margin-top:12px;">' +
      '<div class="fg"><label>' + (m ? 'Ganti ke murid lain' : 'Tautkan ke murid') + '</label><select data-anak-pilih>' +
        opsiMurid(m ? [m.id] : []) + '</select>' +
        '<small class="ab-kecil">Akun Murid hanya menunjuk satu murid: menyimpan pilihan baru akan menggantikan tautan lama.</small></div>' +
      '<div class="fg" style="align-self:end;">' +
        '<button class="btn btn-n btn-sm" data-action="tautkan-anak" data-id="' + esc(u.email) + '">💾 Simpan tautan</button></div>' +
    '</div></div>';
}

export const render = {
  orangtua: function (d) {
    halaman = Object.assign({ orangTua: [], akunMurid: [], siswa: [] }, d || {});
    halaman.orangTua = halaman.orangTua || [];
    halaman.akunMurid = halaman.akunMurid || [];
    halaman.siswa = halaman.siswa || [];

    const totalAnak = halaman.orangTua.reduce((n, u) => n + u.anak.length, 0);
    const tanpaAkun = halaman.siswa.filter(m => !(m.orangTua || []).length && !m.muridAkun);
    const ganda = halaman.siswa.filter(m => (m.orangTua || []).length > 1).length;
    const kartuOrtuHtml = halaman.orangTua.map(kartuOrtu).join('');
    const kartuMuridHtml = halaman.akunMurid.map(kartuMuridAkun).join('');
    const rowsTanpa = tanpaAkun.map(m =>
      '<tr data-anak-baris data-anak-cari="' + esc((m.nama + ' ' + m.id + ' ' + m.kelas).toLowerCase()) + '">' +
        '<td>' + rincianMurid(m) + '</td>' +
        '<td>' + esc(m.kelas) + '</td>' +
        '<td><div class="frow" data-anak-form style="align-items:end;">' +
          '<div class="fg" style="margin:0;"><select data-ortu-pilih>' + opsiOrtu() + '</select></div>' +
          '<div class="fg" style="margin:0;"><button class="btn btn-n btn-sm" data-action="tautkan-anak-ke" data-id="' + esc(m.id) +
            '" data-name="' + esc(m.nama) + '">➕ Tautkan</button></div></div></td></tr>').join('');

    $('page').innerHTML =
      '<div class="card-head" style="margin-bottom:16px;"><h2>👨‍👩‍👧 Akun &amp; Anak (' + (halaman.orangTua.length + halaman.akunMurid.length) + ' akun)</h2>' +
        '<button class="btn btn-o btn-sm" data-action="refresh-page" data-id="orangtua">🔄 Muat ulang</button></div>' +
      '<p class="ab-kecil" style="margin-bottom:14px;">' +
        '<b>Akun Orang Tua</b> bisa memantau beberapa anak sekaligus — kakak-adik cukup satu login, dan satu anak boleh dipegang dua akun (ayah &amp; ibu dengan email berbeda). ' +
        '<b>Akun Murid</b> untuk siswa yang sudah mandiri (SMA, mahasiswa, les privat dewasa): mereka login sendiri dan hanya melihat jadwal, kehadiran, tabungan, progres, serta ujiannya. ' +
        'Menautkan murid mengirim email pemberitahuan; melepasnya tidak memengaruhi murid lain.</p>' +
      '<div class="grid">' +
        '<div class="stat"><div class="n">' + halaman.orangTua.length + '</div><div class="l">Akun Orang Tua</div></div>' +
        '<div class="stat"><div class="n">' + halaman.akunMurid.length + '</div><div class="l">Akun Murid</div></div>' +
        '<div class="stat"><div class="n">' + totalAnak + '</div><div class="l">Anak Tertaut</div></div>' +
        '<div class="stat"><div class="n">' + halaman.siswa.length + '</div><div class="l">Murid Aktif</div></div>' +
      '</div>' +
      '<div class="grid">' +
        '<div class="stat"><div class="n">' + tanpaAkun.length + '</div><div class="l">Belum Punya Akun</div></div>' +
        '<div class="stat"><div class="n">' + ganda + '</div><div class="l">Murid Dua Akun</div></div>' +
      '</div>' +
      (ganda ? '<p class="ab-kecil" style="margin-top:10px;">ℹ️ ' + ganda + ' murid tertaut ke lebih dari satu akun (mis. ayah &amp; ibu). Itu wajar — semua akun itu bisa memantau murid yang sama.</p>' : '') +
      '<div class="card" style="margin-top:16px;"><div class="card-head"><h3>🔍 Cari</h3>' +
        '<span class="badge b-info" id="an-hasil">' + (halaman.orangTua.length + halaman.akunMurid.length) + ' akun · ' + tanpaAkun.length + ' murid belum punya akun</span></div>' +
        '<div class="fg"><input id="an-cari" placeholder="🔍 Nama murid / email akun / kelas…" oninput="saringAkunAnak()"></div></div>' +
      '<div class="card" style="margin-top:16px;"><div class="card-head"><h3>👤 Akun Orang Tua</h3>' +
        '<span class="badge b-info">' + halaman.orangTua.length + ' akun</span></div>' +
        (kartuOrtuHtml ? '' : '<div class="empty">Belum ada akun Orang Tua. Akun dibuat otomatis saat pendaftaran dikonversi menjadi murid ' +
          '(menu <b>📥 Pendaftar</b>), atau ditambahkan manual lewat <b>👥 Users</b>.</div>') +
      '</div>' + kartuOrtuHtml +
      '<div class="card" style="margin-top:18px;"><div class="card-head"><h3>🎒 Akun Murid</h3>' +
        '<span class="badge ' + (halaman.akunMurid.length ? 'b-info' : 'b-warn') + '">' + halaman.akunMurid.length + ' akun</span></div>' +
        (kartuMuridHtml ? '' : '<div class="empty">Belum ada akun Murid. Buat lewat <b>👥 Users → ➕ Tambah User</b> dengan peran <b>Murid</b>, ' +
          'lalu tekan 🔑 untuk mengirim kredensialnya.</div>') +
      '</div>' + kartuMuridHtml +
      '<div class="card" style="margin-top:18px;"><div class="card-head"><h3>🧒 Murid Belum Punya Akun</h3>' +
        '<span class="badge ' + (tanpaAkun.length ? 'b-warn' : 'b-ok') + '">' + tanpaAkun.length + ' murid</span></div>' +
        '<p class="ab-kecil">Belum tertaut ke akun orang tua <i>maupun</i> akun murid — jadi belum ada yang bisa memantau. Pilih akun orang tuanya lalu tautkan. ' +
          'Untuk siswa SMA/mahasiswa, buat dulu akun peran <b>Murid</b> di menu 👥 Users (lebih mandiri: mereka melihat datanya sendiri), lalu tautkan di bagian 🎒 Akun Murid.</p>' +
        '<div class="table-wrap"><table><thead><tr><th>Murid</th><th>Kelas</th><th>Akun orang tua</th></tr></thead><tbody>' +
        (rowsTanpa || '<tr><td colspan="3" style="text-align:center;">🎉 Semua murid aktif sudah punya akun (orang tua atau dirinya sendiri).</td></tr>') +
        '</tbody></table></div></div>';
  }
};

// ---------- SARING (murni tampilan) ----------
function saringAkunAnak() {
  const q = (($('an-cari') || {}).value || '').toLowerCase().trim();
  let akunTampil = 0, muridTampil = 0;
  document.querySelectorAll('#page [data-anak-kartu]').forEach(k => {
    const cocok = !q || (k.dataset.anakKartuCari || '').indexOf(q) !== -1;
    k.style.display = cocok ? '' : 'none';
    if (cocok) akunTampil++;
  });
  document.querySelectorAll('#page [data-anak-baris]').forEach(tr => {
    const cocok = !q || (tr.dataset.anakCari || '').indexOf(q) !== -1;
    tr.style.display = cocok ? '' : 'none';
    if (cocok && tr.closest('[data-anak-kartu]') === null) muridTampil++;
  });
  const info = $('an-hasil');
  if (info) info.textContent = akunTampil + ' akun · ' + muridTampil + ' murid belum punya akun';
}

// ---------- TAUT / LEPAS ----------
async function tautkan(email, studentId, namaMurid) {
  if (!email) { toast('Pilih akun dulu.', 'err'); return; }
  if (!studentId) { toast('Pilih murid yang mau ditautkan.', 'err'); return; }
  try {
    const res = await api('tautkanAnak', email, studentId);
    toast(res.message || ('Murid ' + (namaMurid || '') + ' ditautkan.'), 'ok');
    invalidateCache('orangtua');
    app.loadPage('orangtua');
  } catch (ex) { toast(ex.message, 'err'); }
}

async function lepas(email, studentId, namaMurid) {
  if (!confirm('Lepas ' + (namaMurid || 'murid ini') + ' dari akun ' + email + '?')) return;
  try {
    const res = await api('lepasAnak', email, studentId);
    toast(res.message || 'Tautan dilepas.', 'ok');
    invalidateCache('orangtua');
    app.loadPage('orangtua');
  } catch (ex) { toast(ex.message, 'err'); }
}

// Kirim ulang kredensial: membuat username bila belum ada + password baru, lalu
// mengirimkannya ke email pemilik akun (pakai jalur reset password yang ada).
async function kirimKredensial(email) {
  if (!confirm('Buat password baru untuk ' + email + ' dan kirim ke emailnya?\n\nPassword lama tidak berlaku lagi.')) return;
  try {
    const res = await api('resetUserPassword', email);
    toast(res.message || 'Kredensial baru dikirim.', 'ok');
    invalidateCache('orangtua');
    app.loadPage('orangtua');
  } catch (ex) { toast(ex.message, 'err'); }
}

export { saringAkunAnak };

export const actions = {
  'tautkan-anak': function (email, nama, extra, el) {
    const sel = el && el.closest('[data-anak-form]') ? el.closest('[data-anak-form]').querySelector('select[data-anak-pilih]') : null;
    const studentId = sel ? sel.value : '';
    const murid = (halaman.siswa || []).filter(m => m.id === studentId)[0];
    tautkan(email, studentId, murid ? murid.nama : '');
  },
  'tautkan-anak-ke': function (studentId, nama, extra, el) {
    const sel = el && el.closest('[data-anak-form]') ? el.closest('[data-anak-form]').querySelector('select[data-ortu-pilih]') : null;
    tautkan(sel ? sel.value : '', studentId, nama);
  },
  'lepas-anak': function (email, nama, studentId) { lepas(email, studentId, nama); },
  'kirim-kredensial': function (email) { kirimKredensial(email); }
};
