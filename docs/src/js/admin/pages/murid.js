// ============ HALAMAN: MURID · ABSENSI · TABUNGAN · TRANSAKSI · PROGRES ============
import { state, invalidateCache } from '../state.js';
import { $, esc, rp, toast } from '../ui.js';
import { api } from '../api.js';
import { app, modal, closeModal, studentOptions } from '../helpers.js';


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

    attendance: function(list) {
      list = list || [];
      const rows = list.map((a, i) => {
        const st = state.students.find(s => s.id === a.studentId);
        return '<tr><td>' + (i + 1) + '</td><td><b>' + esc(st ? st.nama : '?') + '</b></td>' +
          '<td><span class="badge ' + (a.status === 'Hadir' ? 'b-ok' : (a.status === 'Alpha' ? 'b-err' : 'b-warn')) + '">' + esc(a.status) + '</span></td>' +
          '<td>' + esc(a.catatan || '-') + '</td><td>' + new Date(a.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + '</td></tr>';
      }).join('');
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>📝 Absensi Hari Ini (' + list.length + ')</h2><button class="btn btn-n btn-sm" data-action="open-attendance">➕ Catat Absensi</button></div>' +
        '<div class="card"><div class="table-wrap"><table><thead><tr><th>No</th><th>Nama</th><th>Status</th><th>Catatan</th><th>Waktu</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
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
  function openAttendance() {
    modal('📝 Catat Absensi',
      '<div class="fg"><label>Murid *</label><select id="a-murid"><option value="">-- Pilih --</option>' + studentOptions() + '</select></div>' +
      '<div class="fg"><label>Status *</label><select id="a-status"><option>Hadir</option><option>Sakit</option><option>Izin</option><option>Alpha</option></select></div>' +
      '<div class="fg"><label>Catatan</label><input id="a-catatan"></div>' +
      '<div class="fg"><label style="display:flex; gap:8px; align-items:center;"><input type="checkbox" id="a-email" style="width:auto;"> 📧 Kirim Email ke Orang Tua</label></div>' +
      '<div class="fg"><label style="display:flex; gap:8px; align-items:center;"><input type="checkbox" id="a-wa" style="width:auto;"> 💬 Kirim WhatsApp ke Orang Tua</label></div>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="saveAttendance()">💾 Simpan</button>');
  }

  async function saveAttendance() {
    const data = { studentId: $('a-murid').value, status: $('a-status').value, catatan: $('a-catatan').value, notifyWhatsApp: $('a-wa').checked };
    if (!data.studentId) { toast('Pilih murid dulu.', 'err'); return; }
    try {
      const res = await api('recordAttendance', data);
      closeModal(); toast(res.message || 'Absensi dicatat.', 'ok'); invalidateCache('attendance'); app.loadPage('attendance');
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
  function downloadCSV(filename, rows) {
    const csv = rows.map(r => r.map(c => { const s = String(c == null ? '' : c); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    toast('✅ ' + filename + ' diunduh.', 'ok');
  }

  async function exportStudentsCSV() {
    try {
      const list = await api('getStudents');
      const rows = [['ID', 'Nama', 'Kelas', 'No HP', 'Status', 'Rekening', 'Tanggal Daftar']];
      (list || []).forEach(s => rows.push([s.id, s.nama, s.kelasNama || '', s.noHP || '', s.status, s.savingsId || '', s.tanggalDaftar ? new Date(s.tanggalDaftar).toLocaleDateString('id-ID') : '']));
      downloadCSV('data-murid.csv', rows);
    } catch (ex) { toast(ex.message, 'err'); }
  }

  async function exportTransactionsCSV() {
    try {
      const list = await api('getAllTransactions');
      const rows = [['Tanggal', 'Nama', 'Jenis', 'Jumlah', 'Saldo', 'Catatan']];
      (list || []).forEach(t => rows.push([new Date(t.tanggal).toLocaleDateString('id-ID'), t.nama || '', t.jenis, Number(t.jumlah), Number(t.saldoSetelah), t.catatan || '']));
      downloadCSV('transaksi.csv', rows);
    } catch (ex) { toast(ex.message, 'err'); }
  }

  // Dipakai main.js (jembatan global untuk atribut inline).
  export { openAddProgress, openAddProgressFor, loadProgressStudent, saveProgress,
    openAddStudent, saveAddStudent, saveEditStudent, openAttendance, saveAttendance,
    openTransaction, txFillSavings, saveTransaction };
  export const actions = {
    'add-student': function () { openAddStudent(); },
    'edit-student': function (id) { openEditStudent(id); },
    'del-student': function (id, name) { delStudent(id, name); },
    'open-attendance': function () { openAttendance(); },
    'open-transaction': function () { openTransaction(); },
    'open-transaction-for': function (id) { openTransactionFor(id); },
    'add-progress': function () { openAddProgress(); },
    'view-progress': function () { loadProgressStudent(); },
    'add-progress-for': function (id) { openAddProgressFor(id); },
    'export-students-csv': function () { exportStudentsCSV(); },
    'export-transactions-csv': function () { exportTransactionsCSV(); }
  };
