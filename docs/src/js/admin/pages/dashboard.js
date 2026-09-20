// ============ HALAMAN: DASHBOARD ============
import { state, invalidateCache } from '../state.js';
import { $, esc, rp } from '../ui.js';
import { app } from '../helpers.js';


  export const render = {
    dashboard: function(data) {
      if (data.children) { // Orang Tua
        const cards = (data.children || []).map(c => {
          const abs = (c.absensi || []);
          const hadir = abs.filter(a => a.status === 'Hadir').length;
          const persen = abs.length ? Math.round(hadir / abs.length * 100) : 0;
          const tx = (c.transaksi || []).slice(0, 5).map(t =>
            '<tr><td>' + new Date(t.tanggal).toLocaleDateString('id-ID') + '</td><td><span class="badge ' + (t.jenis === 'Setoran' ? 'b-ok' : 'b-warn') + '">' + t.jenis + '</span></td><td style="text-align:right;">' + rp(t.jumlah) + '</td></tr>').join('');
          const ab = abs.slice(-7).reverse().map(a =>
            '<tr><td>' + new Date(a.tanggal).toLocaleDateString('id-ID') + '</td><td><span class="badge ' + (a.status === 'Hadir' ? 'b-ok' : (a.status === 'Alpha' ? 'b-err' : 'b-warn')) + '">' + a.status + '</span></td></tr>').join('');
          const pr = (c.progres || []).slice(0, 5).map(p =>
            '<tr><td>' + new Date(p.tanggal).toLocaleDateString('id-ID') + '</td><td>' + esc(p.mapel) + '</td><td>' + esc(p.topik) + '</td><td style="text-align:right;"><b>' + (p.nilai === '' || p.nilai == null ? '-' : p.nilai) + '</b></td></tr>').join('');
          const uj = (c.ujian || []).map(u => {
            const lulus = u.nilai_lulus != null ? (Number(u.skor) >= Number(u.nilai_lulus)) : null;
            const cls = lulus === null ? 'b-info' : (lulus ? 'b-ok' : 'b-warn');
            const label = u.status === 'Selesai' ? (lulus === null ? 'Selesai' : (lulus ? '✔ Lulus' : '✔ Tuntas')) : (u.status === 'Mengerjakan' ? '⏳ Dikerjakan' : u.status || '-');
            const ekstra = Number(u.pindah_tab) > 0 ? ' <span class="badge b-warn" title="Meninggalkan halaman ujian ' + Number(u.pindah_tab) + '×">⚠️' + Number(u.pindah_tab) + '×</span>' : '';
            return '<tr><td>' + esc(u.judul) + '</td><td>' + (u.mulai ? new Date(u.mulai).toLocaleDateString('id-ID') : '-') + '</td><td style="text-align:right;"><b>' + (u.skor || 0) + '</b></td><td><span class="badge ' + cls + '">' + label + '</span>' + ekstra + '</td></tr>';
          }).join('');
          return '<div class="card"><div class="card-head"><h3>👨‍🎓 ' + esc(c.nama) + ' — ' + esc(c.kelas) + '</h3><span class="badge b-ok">' + rp(c.saldo) + '</span></div>' +
            '<div class="grid"><div><h4 style="margin-bottom:8px;">💰 Tabungan</h4><table><tbody>' + (tx || '<tr><td>Belum ada transaksi.</td></tr>') + '</tbody></table></div>' +
            '<div><h4 style="margin-bottom:8px;">📝 Kehadiran ' + (abs.length ? '· ' + persen + '%' : '') + '</h4><table><tbody>' + (ab || '<tr><td>Belum ada catatan.</td></tr>') + '</tbody></table></div>' +
            '<div><h4 style="margin-bottom:8px;">📈 Progres</h4><table><tbody>' + (pr || '<tr><td>Belum ada catatan.</td></tr>') + '</tbody></table></div></div>' +
            '<div class="ujian-riwayat"><h4 style="margin-bottom:8px;">📚 Ujian</h4>' +
            (uj ? '<table><thead><tr><th>Ujian</th><th>Tanggal</th><th style="text-align:right;">Skor</th><th>Status</th></tr></thead><tbody>' + uj + '</tbody></table>' : '<p style="font-size:.8rem; color:var(--redup); margin:0;">Belum ada riwayat ujian.</p>') +
            '</div></div>';
        }).join('');
        const notifOn = (data.notifEmail || 'Aktif') === 'Aktif';
        // Buku pelajaran/modul yang dibagikan admin — orang tua & murid bisa
        // membukanya langsung dari sini tanpa perlu login ke panel konten.
        const buku = (data.buku || []);
        const bukuHtml = buku.length
          ? '<table><thead><tr><th>Judul</th><th>Keterangan</th><th style="text-align:right;">Aksi</th></tr></thead><tbody>' +
            buku.map(function (b) {
              const aksi = b.link
                ? '<a class="btn btn-o btn-sm" href="' + esc(b.link) + '" target="_blank" rel="noopener">📖 Buka</a>'
                : '<span class="badge b-info">Tersedia di kelas</span>';
              return '<tr><td><b>' + esc(b.judul) + '</b></td><td>' + esc(b.deskripsi || '-') + '</td><td style="text-align:right;">' + aksi + '</td></tr>';
            }).join('') + '</tbody></table>'
          : '<div class="empty">Belum ada buku pelajaran yang dibagikan admin.</div>';
        $('page').innerHTML = '<div class="card"><div class="card-head"><h2>👋 Selamat datang, ' + esc(data.namaOrangTua || state.me.nama || 'Orang Tua') + '</h2></div><p style="font-size:0.9rem;">Pemantauan data anak Anda: tabungan, kehadiran, dan progres belajar.</p></div>' +
          '<div class="card"><div class="card-head"><h3>🔔 Notifikasi Email</h3><span class="badge ' + (notifOn ? 'b-ok' : 'b-warn') + '">' + (notifOn ? '📧 Aktif' : '📧 Off') + '</span></div>' +
          '<p style="font-size:0.85rem;">Terima email saat data anak Anda diperbarui (progres belajar, absensi, tabungan).</p>' +
          '<button class="btn btn-o btn-sm" data-action="toggle-my-notif" data-extra="' + (data.notifEmail || 'Aktif') + '">' + (notifOn ? '⏸️ Matikan' : '▶️ Aktifkan') + '</button></div>' +
          '<div class="card" style="margin-top:18px;"><div class="card-head"><h3>📚 Buku Pelajaran</h3><span class="badge b-info">' + buku.length + ' buku</span></div>' +
          '<p style="font-size:0.85rem;">Bahan belajar & modul untuk menemani belajar di rumah.</p>' + bukuHtml + '</div>' +
          (cards || '<div class="card"><div class="empty">Belum ada data anak tertaut ke akun ini. Hubungi admin.</div></div>');
        return;
      }
      const s = data.stats || {};
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>📊 Dashboard</h2><button class="btn btn-o btn-sm" data-action="refresh-dashboard">🔄 Refresh</button></div>' +
        '<div class="grid">' +
        '<div class="stat"><div class="n">' + (s.totalStudents || 0) + '</div><div class="l">Total Murid</div></div>' +
        '<div class="stat"><div class="n">' + (s.activeStudents || 0) + '</div><div class="l">Murid Aktif</div></div>' +
        '<div class="stat"><div class="n">' + (s.totalClasses || 0) + '</div><div class="l">Kelas</div></div>' +
        '<div class="stat"><div class="n">' + rp(s.netTotal) + '</div><div class="l">Total Saldo</div></div>' +
        '</div>' +
        '<div class="card" style="margin-top:18px;"><div class="card-head"><h3>🧾 Transaksi Terbaru</h3></div>' +
        ((data.recentTransactions || []).length ? '<table><thead><tr><th>Nama</th><th>Jenis</th><th style="text-align:right;">Jumlah</th><th>Waktu</th></tr></thead><tbody>' +
          data.recentTransactions.map(t => '<tr><td><b>' + esc(t.nama) + '</b></td><td><span class="badge ' + (t.jenis === 'Setoran' ? 'b-ok' : 'b-err') + '">' + t.jenis + '</span></td><td style="text-align:right;">' + rp(t.jumlah) + '</td><td>' + esc(t.waktu) + '</td></tr>').join('') +
          '</tbody></table>' : '<div class="empty">Belum ada transaksi.</div>') + '</div>' +
        '<div class="card"><div class="card-head"><h3>⚡ Aksi Cepat</h3></div><div style="display:flex; gap:10px; flex-wrap:wrap;">' +
        '<button class="btn btn-n btn-sm" data-action="add-student">➕ Murid</button>' +
        '<button class="btn btn-n btn-sm" data-action="add-class">➕ Kelas</button>' +
        '<button class="btn btn-g btn-sm" data-action="open-attendance">📝 Absensi</button>' +
        '<button class="btn btn-o btn-sm" data-action="open-transaction">💰 Transaksi</button></div></div>';
      state.students = data.students || [];
      state.cache.students = data.students;
    },
  };


  export const actions = {
    'refresh-dashboard': function () { invalidateCache('dashboard'); app.loadPage('dashboard'); }
  };
