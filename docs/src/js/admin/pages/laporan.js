// ============ HALAMAN: LAPORAN · STATISTIK · LOG · WHATSAPP · PEMELIHARAAN ============
import { state, invalidateCache } from '../state.js';
import { $, esc, rp, toast } from '../ui.js';
import { api, post } from '../api.js';
import { app, modal, closeModal, studentOptions } from '../helpers.js';


  export const render = {
    reports: function(cfg) {
      cfg = cfg || {};
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>📄 Laporan & Export</h2></div>' +
        '<div class="grid"><div class="card"><h3 style="margin-bottom:10px;">📝 Laporan Absensi</h3><p style="font-size:0.85rem; margin-bottom:12px;">Riwayat kehadiran semua murid + ringkasan Hadir/Sakit/Izin/Alpha.</p><button class="btn btn-n btn-sm" data-action="gen-report" data-id="absensi">📄 Generate</button></div>' +
        '<div class="card"><h3 style="margin-bottom:10px;">💰 Laporan Tabungan</h3><p style="font-size:0.85rem; margin-bottom:12px;">Rekening per murid + riwayat transaksi terakhir.</p><button class="btn btn-g btn-sm" data-action="gen-report" data-id="tabungan">📄 Generate</button></div>' +
        '<div class="card"><h3 style="margin-bottom:10px;">👤 Laporan Per Murid</h3><p style="font-size:0.85rem; margin-bottom:12px;">Laporan lengkap satu murid: data, tabungan, absensi, progres.</p><button class="btn btn-o btn-sm" data-action="pick-student-report">📄 Pilih Murid</button></div>' +
        '<div class="card"><h3 style="margin-bottom:10px;">🏫 Laporan Per Kelas</h3><p style="font-size:0.85rem; margin-bottom:12px;">Daftar murid per kelas + statistik + riwayat absensi.</p><button class="btn btn-o btn-sm" data-action="pick-class-report">📄 Pilih Kelas</button></div></div>' +
        '<div class="card" style="margin-top:18px;"><h3 style="margin-bottom:8px;">⏰ Laporan Otomatis Bulanan</h3>' +
        '<p style="font-size:0.85rem; margin-bottom:12px;">Ringkasan Laporan Tabungan + Absensi bulan sebelumnya dikirim otomatis ke email di bawah setiap tanggal 1 pukul 08:00 WIB.</p>' +
        '<div id="rep-status" style="margin-bottom:12px;"><span class="badge ' + (cfg.triggerActive ? 'b-ok' : 'b-info') + '">' + esc(cfg.triggerMessage || 'Status belum diketahui') + '</span></div>' +
        '<div class="fg"><label>📧 Email Penerima (pisahkan dengan koma)</label><input id="rep-emails" value="' + esc(cfg.emails || '') + '" placeholder="admin@sekolah.com, guru@sekolah.com"></div>' +
        '<div style="display:flex; gap:10px; flex-wrap:wrap;"><button class="btn btn-n btn-sm" data-action="save-reports">💾 Simpan & Aktifkan</button>' +
        '<button class="btn btn-d btn-sm" data-action="stop-reports">⏹️ Hentikan</button>' +
        '<button class="btn btn-o btn-sm" data-action="test-report">🧪 Test Sekarang</button></div></div>' +
        '<div class="card" style="margin-top:18px;"><h3 style="margin-bottom:8px;">📥 Export CSV</h3><div style="display:flex; gap:10px; flex-wrap:wrap;">' +
        '<button class="btn btn-o btn-sm" data-action="export-students-csv">👨‍🎓 Data Murid</button>' +
        '<button class="btn btn-o btn-sm" data-action="export-transactions-csv">🧾 Transaksi</button></div></div>';
    },

    stats: function(st) {
      st = st || {};
      const months = (st.monthly || []).map(m => m.label);
      const W = 640, H = 260, P = { top: 20, right: 20, bottom: 30, left: 60 };
      const maxTx = Math.max(1, ...(st.monthly || []).map(m => Math.max(m.deposit, m.withdraw)));
      const cw = (W - P.left - P.right) / Math.max(1, months.length);
      const y = v => H - P.bottom - (v / maxTx) * (H - P.top - P.bottom);
      let bars = '';
      for (let g = 0; g <= 4; g++) {
        bars += '<line x1="' + P.left + '" y1="' + y(maxTx * g / 4) + '" x2="' + (W - P.right) + '" y2="' + y(maxTx * g / 4) + '" stroke="#EAE5D9"/>' +
          '<text x="' + (P.left - 8) + '" y="' + (y(maxTx * g / 4) + 4) + '" text-anchor="end" font-size="11" fill="#999">' + fmtCompact(maxTx * g / 4) + '</text>';
      }
      (st.monthly || []).forEach((d, i) => {
        const bw = Math.max(4, cw * 0.32), x1 = P.left + i * cw + cw / 2;
        if (d.deposit > 0) bars += '<rect x="' + (x1 - bw - 1) + '" y="' + y(d.deposit) + '" width="' + bw + '" height="' + (H - P.bottom - y(d.deposit)) + '" rx="3" fill="#0F9D58"><title>Setoran ' + d.label + ': ' + rp(d.deposit) + '</title></rect>';
        if (d.withdraw > 0) bars += '<rect x="' + (x1 + 1) + '" y="' + y(d.withdraw) + '" width="' + bw + '" height="' + (H - P.bottom - y(d.withdraw)) + '" rx="3" fill="#d93025"><title>Tarik ' + d.label + ': ' + rp(d.withdraw) + '</title></rect>';
        bars += '<text x="' + x1 + '" y="' + (H - 10) + '" text-anchor="middle" font-size="11" fill="#999">' + d.label + '</text>';
      });
      const maxAtt = Math.max(1, ...(st.byClass || []).map(c => c.Hadir + c.Sakit + c.Izin + c.Alpha));
      const rw = (W - P.left - P.right) / Math.max(1, (st.byClass || []).length);
      let att = '';
      (st.byClass || []).forEach((c, i) => {
        let acc2 = 0; const bw = Math.max(4, rw * 0.55), x0 = P.left + i * rw + (rw - bw) / 2;
        ['Hadir', 'Sakit', 'Izin', 'Alpha'].forEach(stn => {
          const h = (c[stn] / maxAtt) * (H - P.top - P.bottom);
          if (c[stn] > 0) att += '<rect x="' + x0 + '" y="' + (H - P.bottom - ((acc2 + c[stn]) / maxAtt) * (H - P.top - P.bottom)) + '" width="' + bw + '" height="' + Math.max(1, h) + '" fill="#' + ({ Hadir: '0F9D58', Sakit: 'F4B400', Izin: '1a73e8', Alpha: 'd93025' }[stn]) + '"><title>' + esc(c.nama) + ' — ' + stn + ': ' + c[stn] + '</title></rect>';
          acc2 += c[stn];
        });
        att += '<text x="' + (x0 + bw / 2) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="10" fill="#999">' + esc(c.nama.length > 8 ? c.nama.slice(0, 7) + '…' : c.nama) + '</text>';
      });
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>📊 Statistik</h2><span style="font-size:0.82rem;">12 bulan terakhir · ' + (st.totalTransactions || 0) + ' transaksi · ' + (st.totalAttendance || 0) + ' absensi</span></div>' +
        '<div class="card"><h3 style="margin-bottom:6px;">💰 Setoran vs Penarikan per Bulan</h3>' +
        '<p style="font-size:0.78rem; margin-bottom:10px;"><span class="sw" style="background:#0F9D58;"></span> Setoran &nbsp;<span class="sw" style="background:#d93025;"></span> Penarikan</p>' +
        '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%; height:auto;">' + bars + '</svg></div>' +
        '<div class="card"><h3 style="margin-bottom:6px;">📝 Absensi per Kelas</h3>' +
        ((st.byClass || []).length ? '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%; height:auto;">' + att + '</svg>' : '<p style="font-size:0.85rem;">Belum ada kelas.</p>') + '</div>';
    },

    activitylog: function(logs) {
      logs = logs || [];
      const rows = logs.map(l =>
        '<tr><td style="white-space:nowrap;">' + new Date(l.waktu).toLocaleString('id-ID') + '</td><td><b>' + esc(l.user) + '</b></td>' +
        '<td><span class="badge b-info">' + esc(l.aksi) + '</span></td><td>' + esc(l.detail || '-') + '</td><td class="mono">' + esc(l.target || '-') + '</td></tr>').join('');
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>📜 Log Aktivitas</h2><button class="btn btn-o btn-sm" data-action="refresh-page" data-id="activitylog">🔄 Muat Ulang</button></div>' +
        '<div class="card"><input class="search-in" placeholder="🔍 Cari user / aksi..." oninput="filterTable(this, \'tb-log\')">' +
        '<div class="table-wrap tall" style="margin-top:12px;"><table><thead><tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Detail</th><th>Target</th></tr></thead><tbody id="tb-log">' +
        (rows || '<tr><td colspan="5" style="text-align:center;">Belum ada aktivitas.</td></tr>') + '</tbody></table></div></div>';
    },

    loginhistory: function(rows) {
      rows = rows || [];
      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayCount = rows.filter(r => new Date(r.waktu) >= startToday).length;
      const activeWeek = new Set(rows.filter(r => new Date(r.waktu) >= new Date(now.getTime() - 7 * 864e5)).map(r => (r.email || '').toLowerCase())).size;
      const trs = rows.map(r =>
        '<tr><td style="white-space:nowrap;">' + new Date(r.waktu).toLocaleString('id-ID') + '</td><td><b>' + esc(r.email) + '</b>' + (r.nama ? '<div style="font-size:0.75rem;">' + esc(r.nama) + '</div>' : '') + '</td>' +
        '<td><span class="badge ' + (r.peran === 'Admin' ? 'b-info' : 'b-warn') + '">' + esc(r.peran || 'Guru') + '</span></td>' +
        '<td>' + esc(r.metode || 'Google') + '</td><td><span class="badge ' + (r.status === 'Berhasil' ? 'b-ok' : 'b-err') + '">' + esc(r.status) + '</span></td></tr>').join('');
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>🕘 Riwayat Login</h2>' +
        '<div style="display:flex; gap:6px;">' + [50, 100, 250, 500].map(n => '<span class="badge ' + (lhLimit === n ? 'b-info' : 'b-warn') + '" style="cursor:pointer;" data-action="set-lh-limit" data-extra="' + n + '">' + n + '</span>').join('') +
        '<button class="btn btn-o btn-sm" data-action="refresh-page" data-id="loginhistory">🔄</button></div></div>' +
        '<div class="grid" style="margin-bottom:16px;"><div class="stat"><div class="n">' + todayCount + '</div><div class="l">Login Hari Ini</div></div>' +
        '<div class="stat"><div class="n">' + activeWeek + '</div><div class="l">User Aktif 7 Hari</div></div>' +
        '<div class="stat"><div class="n">' + rows.length + '</div><div class="l">Baris</div></div></div>' +
        '<div class="card"><div class="table-wrap tall"><table><thead><tr><th>Waktu</th><th>User</th><th>Peran</th><th>Metode</th><th>Status</th></tr></thead><tbody>' +
        (trs || '<tr><td colspan="5" style="text-align:center;">Belum ada riwayat login.</td></tr>') + '</tbody></table></div></div>';
    },

    settings: function(cfg) {
      cfg = cfg || {};
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>💬 Notifikasi WhatsApp (Fonnte)</h2></div>' +
        '<div class="card"><div id="wa-status" style="margin-bottom:14px;"><span class="badge ' + (cfg.hasToken && cfg.enabled ? 'b-ok' : 'b-info') + '">' +
        'Token: ' + (cfg.hasToken ? 'sudah diisi' : 'belum diisi') + ' · Status: ' + (cfg.enabled ? 'AKTIF' : 'NONAKTIF') + '</span></div>' +
        '<div class="fg"><label>🔑 Token Fonnte</label><input type="password" id="wa-token" placeholder="Tempel token dari dashboard Fonnte">' +
        '<p style="font-size:0.78rem; margin-top:5px;">Kosongkan jika tidak ingin mengganti.</p></div>' +
        '<div class="fg"><label style="display:flex; gap:8px; align-items:center;"><input type="checkbox" id="wa-enabled" style="width:auto;"' + (cfg.enabled ? ' checked' : '') + '> ✅ Aktifkan notifikasi WhatsApp</label></div>' +
        '<div class="fg"><label>🧪 Nomor Test</label><div style="display:flex; gap:10px;"><input id="wa-test" placeholder="08xxxxxxxxxx" style="flex:1;"><button class="btn btn-o btn-sm" data-action="test-wa">Test Kirim</button></div></div>' +
        '<button class="btn btn-n btn-sm" data-action="save-wa">💾 Simpan Pengaturan</button>' +
        '<p style="font-size:0.8rem; margin-top:14px;">Nomor HP orang tua diambil dari data murid (format 08xx otomatis jadi 628xx). Pesan terkirim jika checkbox WhatsApp dicentang saat input absensi/transaksi.</p></div>';
    },

    maintenance: function(info) {
      const d = info || {};
      if (!d.success) {
        $('page').innerHTML = '<div class="card"><div class="empty">⚠️ ' + esc(d.message || 'Tidak bisa memuat info pemeliharaan.') + '</div></div>';
        return;
      }
      const tabel = function (judul, daftar) {
        const baris = (daftar || []).map(function (k) {
          return '<tr><td>' + esc(k.nama) + '</td><td style="text-align:right;">' + k.baris + '</td></tr>';
        }).join('');
        return '<div class="card" style="margin-bottom:16px;"><h3 style="margin-bottom:10px;">' + judul + '</h3>' +
          '<div class="table-wrap"><table><thead><tr><th>Sheet</th><th style="text-align:right;">Baris Data</th></tr></thead><tbody>' +
          (baris || '<tr><td colspan="2">-</td></tr>') + '</tbody></table></div></div>';
      };
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>🛠️ Pemeliharaan Data</h2>' +
        '<button class="btn btn-o btn-sm" data-action="refresh-page" data-id="maintenance">🔄 Muat Ulang</button></div>' +
        '<p style="font-size:.78rem; margin-bottom:14px;">Isi data contoh atau kosongkan data. Sheet <b>Log Aktivitas</b> tidak pernah dikosongkan (jejak audit). Menu yang sama juga tersedia di spreadsheet: <b>LMS &amp; Tabungan → Data (seed / unseed)</b>.</p>' +
        '<div class="card" style="margin-bottom:16px;"><h3 style="margin-bottom:10px;">🌱 Seed Data</h3>' +
          '<p style="font-size:.78rem; margin-bottom:10px;">Mengisi <b>sheet yang masih kosong</b> dengan data contoh (kelas, murid, akun, harga, program, dst). Data yang sudah ada <b>tidak diubah</b> — aman dijalankan ulang.</p>' +
          '<button class="btn btn-g btn-sm" data-action="seed-semua">🌱 Seed Semua (LMS + Konten Landing)</button></div>' +
        tabel('Konten Landing', d.konten) +
        tabel('Data Operasional LMS', d.lms) +
        tabel('Asesmen (paket, soal & hasil ujian)', d.asesmen) +
        '<div class="card" style="margin-bottom:16px;"><h3 style="margin-bottom:10px;">🗑️ Unseed (Kosongkan Data)</h3>' +
          '<p style="font-size:.78rem; margin-bottom:12px;">Menghapus baris data pada sheet yang dipilih (header tetap). <b>Tidak bisa dibatalkan</b> — pertimbangkan export CSV dulu.</p>' +
          '<div style="display:flex; flex-direction:column; gap:12px; max-width:520px;">' +
            '<div><button class="btn btn-o btn-sm" data-action="unseed-konten">🗑️ Kosongkan Konten Landing (' + (d.konten || []).length + ' sheet)</button>' +
            '<p style="font-size:.7rem; opacity:.75; margin-top:5px;">Harga, Berita, Buku, Galeri, Mitra, Testimoni, FAQ, Program, Kurikulum, Kartu Info, Pengaturan Situs. Setelah ini landing memakai konten statis bawaan.</p></div>' +
            '<div><button class="btn btn-o btn-sm" data-action="unseed-lms">🗑️ Kosongkan Data LMS (' + (d.lms || []).length + ' sheet)</button>' +
            '<p style="font-size:.7rem; opacity:.75; margin-top:5px;">Murid, Kelas, Absensi, Progres, Tabungan, Transaksi.</p></div>' +
          '</div></div>' +
        '<div class="card" style="border:1px solid #F3CFC9;"><h3 style="margin-bottom:10px;">☠️ Reset Total</h3>' +
          '<p style="font-size:.78rem; margin-bottom:10px;">Mengosongkan <b>semua</b> sheet di atas (termasuk asesmen, bank soal, dan hasil ujian siswa) + Pendaftaran + Riwayat Login + semua akun <b>kecuali akun Admin yang sedang dipakai</b> (agar Anda tetap bisa login). Akun Orang Tua, Guru, dan pendaftar ikut terhapus.</p>' +
          '<div class="fg"><label>Ketik “' + esc((d.konfirmasi || {}).semua || 'HAPUS SEMUA') + '” untuk mengaktifkan tombol</label>' +
          '<input id="maint-konfirmasi" placeholder="' + esc((d.konfirmasi || {}).semua || 'HAPUS SEMUA') + '" autocomplete="off"></div>' +
          '<div style="margin-top:12px;"><button class="btn btn-d btn-sm" data-action="unseed-semua" id="btn-reset-total" disabled>☠️ Reset Total Data</button></div></div>' +
        '<p style="font-size:.72rem; opacity:.7; margin-top:14px;">Sheet “' + esc((d.users || {}).nama || 'Users') + '” saat ini: ' + ((d.users || {}).baris || 0) + ' akun · login sebagai ' + esc(d.emailSekarang || '-') + '.</p>';
      // Konfirmasi diketik → tombol reset aktif.
      const inpK = $('maint-konfirmasi');
      const btnT = $('btn-reset-total');
      if (inpK && btnT) inpK.addEventListener('input', function () {
        btnT.disabled = inpK.value.trim().toUpperCase() !== ((d.konfirmasi || {}).semua || 'HAPUS SEMUA');
      });
    },
  };


  function fmtCompact(v) {
    if (v >= 1e9) return (v / 1e9).toFixed(1) + 'M';
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'jt';
    if (v >= 1e3) return Math.round(v / 1e3) + 'rb';
    return Math.round(v);
  }

  let lhLimit = 100;
  function setLhLimit(n) { lhLimit = n; app.loadPage('loginhistory'); }

  // ---------- AKSI: LAPORAN ----------
  async function genReport(type, id) {
    toast('⏳ Membuat laporan...', 'ok');
    try {
      const res = id ? await api('downloadReport', type, id) : await api('downloadReport', type);
      if (res && res.success && res.htmlContent) {
        const w = window.open('', '_blank');
        if (!w) { toast('Popup diblokir! Izinkan popup untuk membuka laporan.', 'err'); return; }
        w.document.open();
        w.document.write(res.htmlContent);
        w.document.close();
        w.onload = function() { w.focus(); w.print(); };
      } else { toast((res && res.message) || 'Gagal membuat laporan.', 'err'); }
    } catch (ex) { toast(ex.message, 'err'); }
  }

  async function pickStudentReport() {
    try {
      const list = await api('getStudents');
      modal('👤 Pilih Murid', '<div class="fg"><label>Murid</label><select id="rep-sid"><option value="">-- Pilih --</option>' +
        (list || []).map(s => '<option value="' + s.id + '">' + esc(s.nama) + ' (' + esc(s.kelasNama || '-') + ')</option>').join('') + '</select></div>',
        '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="closeModal(); genReport(\'murid\', document.getElementById(\'rep-sid\').value)">📄 Generate</button>');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  async function pickClassReport() {
    try {
      const list = await api('getClasses');
      modal('🏫 Pilih Kelas', '<div class="fg"><label>Kelas</label><select id="rep-cid"><option value="">-- Pilih --</option>' +
        (list || []).map(c => '<option value="' + c.id + '">' + esc(c.nama) + '</option>').join('') + '</select></div>',
        '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="closeModal(); genReport(\'kelas\', document.getElementById(\'rep-cid\').value)">📄 Generate</button>');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  async function saveReports() {
    const emails = $('rep-emails').value.trim();
    if (!emails) { toast('Isi email penerima dulu.', 'err'); return; }
    try {
      const [save, inst] = await Promise.all([
        api('saveReportSettings', emails),
        api('triggerInstallMonthly')
      ]);
      toast((save.message || '') + ' ' + (inst.message || ''), 'ok'); app.loadPage('reports');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  async function stopReports() {
    if (!confirm('Hentikan laporan otomatis bulanan?')) return;
    try { const res = await api('triggerRemoveMonthly'); toast(res.message || 'OK', 'ok'); app.loadPage('reports'); } catch (ex) { toast(ex.message, 'err'); }
  }

  async function testReport() {
    toast('⏳ Membuat & mengirim email test...', 'ok');
    try { const res = await api('triggerTestReport'); toast(res.message || 'Selesai.', (res && res.success) ? 'ok' : 'err'); } catch (ex) { toast(ex.message, 'err'); }
  }

  // ---------- AKSI: WHATSAPP ----------
  async function saveWA() {
    const token = $('wa-token').value.trim();
    const enabled = $('wa-enabled').checked;
    if (!token && !confirm('Token kosong — tetap simpan (hanya ubah status aktif)?')) return;
    try { const res = await api('saveWhatsAppSettings', token, enabled); toast(res.message || 'Tersimpan.', 'ok'); app.loadPage('settings'); } catch (ex) { toast(ex.message, 'err'); }
  }

  async function testWA() {
    const phone = $('wa-test').value.trim();
    if (!phone) { toast('Isi nomor test dulu.', 'err'); return; }
    toast('⏳ Mengirim WA test...', 'ok');
    try { const res = await api('testWhatsApp', phone); toast(res.message || 'Selesai.', (res && res.success) ? 'ok' : 'err'); } catch (ex) { toast(ex.message, 'err'); }
  }

  // ============ PEMELIHARAAN DATA (SEED / UNSEED) ============
  const JUDUL_UNSEED = {
    konten: { kode: 'HAPUS KONTEN', judul: 'Kosongkan Konten Landing', teks: 'SEMUA baris pada sheet Harga, Berita, Buku, Galeri, Mitra, Testimoni, FAQ, Program, Kurikulum, Kartu Info, dan Pengaturan Situs akan DIHAPUS (header tetap).\n\nSetelah ini landing otomatis memakai konten statis bawaan. Tindakan ini tidak bisa dibatalkan.\n\nLanjutkan?' },
    lms: { kode: 'HAPUS LMS', judul: 'Kosongkan Data LMS', teks: 'SEMUA baris pada sheet Murid, Kelas, Absensi, Progres, Tabungan, dan Transaksi akan DIHAPUS (header tetap).\n\nTindakan ini tidak bisa dibatalkan.\n\nLanjutkan?' },
    total: { kode: 'HAPUS SEMUA', judul: 'Reset Total Data', teks: 'SEMUA data akan dihapus: konten landing, murid, kelas, absensi, progres, tabungan, transaksi, pendaftaran, riwayat login, dan semua akun KECUALI akun Admin yang sedang dipakai.\n\nTindakan ini TIDAK BISA DIBATALKAN.\n\nLanjutkan?' }
  };

  async function seedSemuaDataUi() {
    if (!confirm('Isi data contoh (LMS + konten landing)?\n\nHanya sheet yang masih kosong yang diisi — data yang sudah ada tidak diubah.')) return;
    toast('Menjalankan seed… halaman ini mungkin sibuk beberapa detik.', 'ok');
    try {
      const res = await api('seedSemuaData');
      toast(res.message || 'Seed selesai.', res && res.success ? 'ok' : 'err');
      ['students', 'classes', 'users', 'pricing', 'news', 'books', 'gallery', 'partners', 'testimoni', 'faq', 'program', 'kurikulum', 'kartu', 'situs', 'maintenance', 'dashboard'].forEach(k => invalidateCache(k));
      app.loadPage('maintenance');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  async function unseedUi(mode) {
    const m = JUDUL_UNSEED[mode];
    if (!m) return;
    if (!confirm(m.judul + '\n\n' + m.teks)) return;
    try {
      const res = await api(mode === 'total' ? 'unseedSemuaData' : mode === 'lms' ? 'unseedDataLms' : 'unseedKontenLanding', { konfirmasi: m.kode });
      if (!res || !res.success) { toast((res && res.message) || 'Gagal.', 'err'); return; }
      toast(res.message || 'Selesai.', 'ok');
      // Semua data bisa berubah → kosongkan cache halaman terkait.
      Object.keys(state.cacheTime).forEach(k => invalidateCache(k));
      app.loadPage('maintenance');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  // main.js butuh batas jumlah baris riwayat login saat memuat halamannya.
  export function getLhLimit() { return lhLimit; }
  export { genReport };
  export const actions = {
    'gen-report': function (id, name, extra) { genReport(id, extra || undefined); },
    'pick-student-report': function () { pickStudentReport(); },
    'pick-class-report': function () { pickClassReport(); },
    'save-reports': function () { saveReports(); },
    'stop-reports': function () { stopReports(); },
    'test-report': function () { testReport(); },
    'set-lh-limit': function (id, name, extra) { setLhLimit(parseInt(extra) || 100); },
    'save-wa': function () { saveWA(); },
    'test-wa': function () { testWA(); },
    'seed-semua': function () { seedSemuaDataUi(); },
    'unseed-konten': function () { unseedUi('konten'); },
    'unseed-lms': function () { unseedUi('lms'); },
    'unseed-semua': function () { unseedUi('total'); }
  };
