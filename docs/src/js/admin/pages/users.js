// ============ HALAMAN: PENGGUNA · PENDAFTAR · GANTI PASSWORD ============
import { state, invalidateCache } from '../state.js';
import { $, esc, toast } from '../ui.js';
import { api, post } from '../api.js';
import { app, modal, closeModal } from '../helpers.js';


  // Jumlah murid tertaut (kolom `users.anak` = "S-1:A, S-2:B"): anak-anak untuk
  // akun Orang Tua, atau dirinya sendiri untuk akun Murid.
  function hitungAnak(teks) {
    return String(teks || '').split(',').map(x => x.trim()).filter(Boolean).length;
  }
  // Akun non-staf (Orang Tua & Murid) diatur tautannya di menu 👨‍👩‍👧 Akun & Anak.
  const NON_STAF = ['Orang Tua', 'Murid'];
  const nonStaf = peran => NON_STAF.indexOf(peran) !== -1;

  export const render = {
    users: function(list) {
      list = list || [];
      const rows = list.map((u, i) =>
        '<tr><td>' + (i + 1) + '</td><td><b>' + esc(u.email) + '</b><div style="font-size:0.75rem;">' + esc(u.nama || '-') + '</div></td>' +
        '<td>' + (u.username ? '<span class="mono">' + esc(u.username) + '</span>' : '—') + '</td>' +
        '<td><span class="badge ' + (u.peran === 'Admin' ? 'b-info' : (nonStaf(u.peran) ? 'b-ok' : 'b-warn')) + '">' + esc(u.peran) + '</span>' +
        // Akun Orang Tua & Murid langsung menuju halaman Akun & Anak: di sana
        // muridnya bisa ditautkan/dilepas (kakak-adik, ayah & ibu beda email,
        // atau murid yang login sendiri).
        (nonStaf(u.peran)
          ? '<div class="ab-kecil" style="margin-top:4px;"><button class="btn btn-o btn-sm" data-action="lihat-anak" data-id="' + esc(u.email) + '">' +
            (u.peran === 'Murid' ? '🎒 ' + (hitungAnak(u.anak) ? 'Murid' : 'Belum tertaut') : '👨‍👩‍👧 ' + hitungAnak(u.anak) + ' anak') + '</button></div>'
          : '') + '</td>' +
        '<td><span class="badge ' + (u.status === 'Aktif' ? 'b-ok' : 'b-err') + '">' + esc(u.status) + '</span></td>' +
        '<td><span class="badge ' + ((u.notifEmail || 'Aktif') === 'Aktif' ? 'b-ok' : 'b-warn') + '" style="cursor:pointer;" data-action="toggle-notif-email" data-id="' + esc(u.email) + '" data-extra="' + esc(u.notifEmail || 'Aktif') + '">' + ((u.notifEmail || 'Aktif') === 'Aktif' ? '📧 Aktif' : '📧 Off') + '</span></td>' +
        '<td style="white-space:nowrap;">' +
        '<button class="btn btn-o btn-sm" data-action="toggle-user-status" data-id="' + esc(u.email) + '" data-extra="' + esc(u.status) + '" title="Aktif/Nonaktif">' + (u.status === 'Aktif' ? '🚫' : '✅') + '</button> ' +
        // Tombol 🔄 hanya untuk STAF: akun Orang Tua & Murid bukan staf, dan
        // dahulu menekannya malah mengusulkan "jadikan Admin".
        (nonStaf(u.peran) ? '' : '<button class="btn btn-o btn-sm" data-action="toggle-user-role" data-id="' + esc(u.email) + '" data-extra="' + esc(u.peran) + '" title="Ganti peran (Admin ⇄ Guru)">🔄</button> ') +
        '<button class="btn btn-o btn-sm" data-action="reset-pass" data-id="' + esc(u.email) + '" title="Reset password">🔑</button> ' +
        '<button class="btn btn-d btn-sm" data-action="del-user" data-id="' + esc(u.email) + '">🗑️</button></td></tr>').join('');
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>👥 Users</h2><button class="btn btn-n btn-sm" data-action="add-user">➕ Tambah User</button></div>' +
        '<div class="card"><div class="table-wrap"><table><thead><tr><th>No</th><th>Email</th><th>Username</th><th>Peran</th><th>Status</th><th>Email Notif</th><th>Aksi</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<p style="font-size:0.78rem; margin-top:10px;">Akun Orang Tua &amp; Murid dibuat di sini juga; yang belum punya password (belum ada <b>Username</b>) diberi kredensial lewat tombol 🔑.</p></div>';
    },

    registrations: function(list) {
      list = list || [];
      const count = st => list.filter(r => r.status === st).length;
      const rows = list.map(r =>
        '<tr><td><b>' + esc(r.nama) + '</b><div style="font-size:0.75rem;">' + esc(r.program || '-') + '</div></td>' +
        '<td>' + esc(r.noHP || '-') + '<div style="font-size:0.75rem;">' + esc(r.namaOrangTua || '-') + '</div></td>' +
        '<td><a href="mailto:' + esc(r.email || '') + '">' + esc(r.email || '-') + '</a></td>' +
        '<td>' + new Date(r.waktu).toLocaleDateString('id-ID') + '</td>' +
        '<td><span class="badge st-' + esc(r.status) + '">' + esc(r.status) + '</span></td>' +
        '<td>' + (r.status === 'Baru' ?
          '<button class="btn btn-g btn-sm" data-action="convert-reg" data-id="' + r.id + '">✅ Jadikan Murid</button> <button class="btn btn-d btn-sm" data-action="reject-reg" data-id="' + r.id + '">❌</button>' :
          '<span style="font-size:0.75rem;">selesai ✔</span>') + '</td></tr>').join('');
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>📥 Pendaftar</h2><button class="btn btn-o btn-sm" data-action="refresh-page" data-id="registrations">🔄 Refresh</button></div>' +
        '<div class="grid"><div class="stat"><div class="n">' + list.length + '</div><div class="l">Total</div></div>' +
        '<div class="stat"><div class="n">' + count('Baru') + '</div><div class="l">Menunggu</div></div>' +
        '<div class="stat"><div class="n">' + count('Selesai') + '</div><div class="l">Jadi Murid</div></div>' +
        '<div class="stat"><div class="n">' + count('Ditolak') + '</div><div class="l">Ditolak</div></div></div>' +
        '<div class="card" style="margin-top:16px;"><div class="table-wrap"><table><thead><tr><th>Calon Murid</th><th>Kontak</th><th>Email</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    },
  };


  // ============ AKSI: USERS ============
  function openAddUser() {
    modal('➕ Tambah User',
      '<div class="fg"><label>Email Google *</label><input type="email" id="u-email"></div>' +
      '<div class="fg"><label>Nama</label><input id="u-nama"></div>' +
      // Peran Murid = siswa yang login sendiri (SMA/mahasiswa/les privat dewasa);
      // tautan ke datanya diatur di menu 👨‍👩‍👧 Akun & Anak.
      '<div class="frow"><div class="fg"><label>Peran</label><select id="u-peran"><option value="Guru">Guru</option><option value="Admin">Admin</option><option value="Orang Tua">Orang Tua</option><option value="Murid">Murid</option></select></div>' +
      '<div class="fg"><label>Status</label><select id="u-status"><option>Aktif</option><option>Nonaktif</option></select></div></div>' +
      '<div class="fg"><label style="display:flex; gap:8px; align-items:center;"><input type="checkbox" id="u-notif" style="width:auto;" checked> 📧 Aktifkan notifikasi email</label></div>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="saveAddUser()">💾 Simpan</button>');
  }

  async function saveAddUser() {
    const data = { email: $('u-email').value.trim(), nama: $('u-nama').value.trim(), peran: $('u-peran').value, status: $('u-status').value, notifEmail: $('u-notif').checked ? 'Aktif' : 'Nonaktif' };
    if (!data.email) { toast('Email wajib diisi.', 'err'); return; }
    try {
      const res = await api('addUser', data);
      closeModal(); toast(res.message || 'User ditambahkan.', 'ok'); app.loadPage('users');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  async function toggleUserStatus(email, status) {
    if (!confirm((status === 'Aktif' ? 'Nonaktifkan ' : 'Aktifkan kembali ') + email + '?')) return;
    try { const res = await api('updateUser', email, { status: status === 'Aktif' ? 'Nonaktif' : 'Aktif' }); toast(res.message || 'OK', 'ok'); app.loadPage('users'); }
    catch (ex) { toast(ex.message, 'err'); }
  }

  async function toggleUserRole(email, peran) {
    if (nonStaf(peran)) {
      toast('Akun ' + peran + ' bukan akun staf — perannya tidak bisa ditukar. Buat akun staf baru lewat ➕ Tambah User.', 'err');
      return;
    }
    const target = peran === 'Admin' ? 'Guru' : 'Admin';
    if (!confirm('Ubah peran ' + email + ' menjadi ' + target + '?')) return;
    try { const res = await api('updateUser', email, { peran: target }); toast(res.message || 'OK', 'ok'); app.loadPage('users'); }
    catch (ex) { toast(ex.message, 'err'); }
  }

  async function toggleNotifEmail(email, currentStatus) {
    const newStatus = currentStatus === 'Aktif' ? 'Nonaktif' : 'Aktif';
    try { const res = await api('updateUser', email, { notifEmail: newStatus }); toast(res.message || 'OK', 'ok'); app.loadPage('users'); }
    catch (ex) { toast(ex.message, 'err'); }
  }

  async function toggleMyNotif(currentStatus) {
    const newStatus = currentStatus === 'Aktif' ? 'Nonaktif' : 'Aktif';
    try { const res = await api('setMyNotifEmail', newStatus); toast(res.message || 'OK', 'ok'); invalidateCache('dashboard'); app.loadPage('dashboard'); }
    catch (ex) { toast(ex.message, 'err'); }
  }

  async function resetPass(email) {
    if (!confirm('Reset password untuk ' + email + '?\nPassword baru akan dikirim ke email user.')) return;
    try {
      const res = await api('resetUserPassword', email);
      if (res && res.success) {
        toast(res.message || 'Password berhasil direset!', 'ok');
        app.loadPage('users');
      } else { toast((res && res.message) || 'Gagal.', 'err'); }
    } catch (ex) { toast(ex.message, 'err'); }
  }

  async function delUser(email) {
    if (!confirm('Hapus user ' + email + '?')) return;
    try { const res = await api('deleteUser', email); toast(res.message || 'Terhapus.', 'ok'); app.loadPage('users'); }
    catch (ex) { toast(ex.message, 'err'); }
  }

  // ============ AKSI: PENDAFTAR ============
  async function convertReg(id) {
    if (!confirm('Jadikan pendaftar ini murid resmi?\n\nRekening tabungan + akun orang tua otomatis dibuat & email konfirmasi terkirim.')) return;
    try {
      const res = await api('convertRegistrationToStudent', id);
      if (res.success) {
        let msg = res.message || 'Berhasil!';
        if (res.username && res.password) msg += '\n\n🔑 Login orang tua — Username: ' + res.username + ' | Password: ' + res.password;
        toast(msg, 'ok');
        invalidateCache('registrations'); app.loadPage('registrations');
      } else { toast(res.message || 'Gagal.', 'err'); }
    } catch (ex) { toast(ex.message, 'err'); }
  }

  async function rejectReg(id) {
    if (!confirm('Tolak pendaftaran ini?')) return;
    try { const res = await api('rejectRegistration', id); toast(res.message || 'OK', 'ok'); app.loadPage('registrations'); }
    catch (ex) { toast(ex.message, 'err'); }
  }

  // ============ GANTI PASSWORD SENDIRI ============
  function openChangePass() {
    modal('🔑 Ganti Password',
      '<div class="fg"><label>Password Lama *</label><input type="password" id="cp-old"></div>' +
      '<div class="fg"><label>Password Baru *</label><input type="password" id="cp-new" placeholder="min. 6 karakter"></div>' +
      '<div class="fg"><label>Ulangi Password Baru *</label><input type="password" id="cp-new2"></div>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="saveChangePass()">💾 Simpan</button>');
  }

  async function saveChangePass() {
    const oldPass = $('cp-old').value, newPass = $('cp-new').value, newPass2 = $('cp-new2').value;
    if (!oldPass || !newPass) { toast('Semua kolom wajib diisi.', 'err'); return; }
    if (newPass !== newPass2) { toast('Ulangi password tidak sama.', 'err'); return; }
    if (newPass.length < 6) { toast('Password baru minimal 6 karakter.', 'err'); return; }
    try {
      const res = await post('change-password', { token: state.token, oldPass, newPass });
      closeModal(); toast(res.message || 'Selesai.', (res && res.success) ? 'ok' : 'err');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  export { openChangePass, saveChangePass, saveAddUser };
  export const actions = {
    'add-user': function () { openAddUser(); },
    'toggle-user-status': function (id, extra) { toggleUserStatus(id, extra); },
    'toggle-user-role': function (id, extra) { toggleUserRole(id, extra); },
    'lihat-anak': function () { app.loadPage('orangtua'); },
    'reset-pass': function (id) { resetPass(id); },
    'del-user': function (id) { delUser(id); },
    'toggle-notif-email': function (id, extra) { toggleNotifEmail(id, extra); },
    'toggle-my-notif': function (id, name, extra) { toggleMyNotif(extra); },
    'convert-reg': function (id) { convertReg(id); },
    'reject-reg': function (id) { rejectReg(id); }
  };
