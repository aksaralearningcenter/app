// ============ HALAMAN: DASHBOARD ============
import { state, invalidateCache } from '../state.js';
import { $, esc, rp } from '../ui.js';
import { app, modal } from '../helpers.js';
import { buatFlipbook } from '../../shared/flipbook.js';

  // Buku pelajaran/modul untuk akun Orang Tua (diisi ulang tiap render).
  let bukuOrangTua = [];

  // Jenis berkas unduhan dari ekstensi URL/nama berkas (PDF, Word, Excel, ...).
  function jenisBerkas(b) {
    const peta = { pdf: 'PDF', doc: 'Word', docx: 'Word', xls: 'Excel', xlsx: 'Excel', ppt: 'PowerPoint', pptx: 'PowerPoint' };
    const m = /\.([A-Za-z0-9]{2,4})(?:$|[?#])/.exec(String(b.berkas || '') + ' ' + String(b.link || ''));
    return m ? (peta[m[1].toLowerCase()] || '') : '';
  }

  // Baca buku untuk Orang Tua/murid: buku dibuka sebagai FLIPBOOK dua halaman
  // (modul bersama src/js/shared/flipbook.js — mesin yang sama dengan tombol
  // Baca di landing), jadi tidak ada lagi modal teks biasa. Bila buku hanya
  // punya berkas tanpa isi teks, tautannya langsung dibuka di tab baru.
  let flipBuku = null;      // instance flipbook modal (dibuat ulang tiap buku)
  let flipAkar = null;      // root DOM flipbook yang sedang aktif
  let papanTikSiap = false; // listener panah keyboard cukup dipasang sekali

  // Muka satu halaman buku (dipakai modul flipbook lewat callback).
  function mukaBuku(hal, face, num, b) {
    const paras = String(hal || '').split(/\n+/).map(s => s.trim()).filter(Boolean)
      .map(p => '<p>' + esc(p) + '</p>').join('');
    const kepala = num === 1
      ? '<div class="ak-kicker">' + esc(b.jenis || 'Buku Pelajaran') + '</div><h4>' + esc(b.judul) + '</h4>'
      : '';
    return '<div class="ak-face ' + face + '">' + kepala + paras + '<span class="ak-num">' + num + '</span></div>';
  }

  // Panah ←/→ membalik halaman selama modal buku terbuka (sekali pasang saja).
  function pasangPapanTik() {
    if (papanTikSiap) return;
    papanTikSiap = true;
    document.addEventListener('keydown', function (e) {
      if (!flipBuku || !flipAkar || !document.contains(flipAkar)) return;
      const bg = $('modal');
      if (!bg || !bg.classList.contains('on')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); flipBuku.maju(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); flipBuku.mundur(); }
    });
  }

  // Buka buku sebagai flipbook di dalam modal.
  function bacaBuku(id) {
    const b = bukuOrangTua.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!b) return;
    if (!String(b.isi || '').trim() && b.link) { window.open(b.link, '_blank', 'noopener'); return; }
    const meta = [b.penulis, b.penerbit, b.tahun].map(v => String(v || '').trim()).filter(Boolean).join(' · ');
    const jenis = jenisBerkas(b);
    const unduh = b.link
      ? '<a class="btn btn-o btn-sm" href="' + esc(b.link) + '" target="_blank" rel="noopener">⬇️ ' + (jenis ? 'Unduh ' + jenis : 'Unduh berkas') + '</a>'
      : '';
    const isi =
      // .flip-wrap = kolom flex: di ponsel area buku mengambil seluruh sisa
      // ruang modal, dan tinggi itu dipakai modul flipbook untuk memenggal isi
      // supaya tiap halaman pas (tanpa menggulir). Baris pustaka ikut di dalam
      // pembungkus supaya tingginya diperhitungkan (kalau di luar, modal jadi
      // sedikit tergulir).
      '<div class="flip-wrap">' +
        (meta ? '<p class="ak-pustaka">' + esc(meta) + '</p>' : '') +
        '<div class="ak-stage">' +
          '<div class="ak-base">' +
            '<div class="ak-base-page cover"><span class="ak-mark">AKSARA</span><b>' + esc(b.judul) + '</b>' +
              '<small>' + esc(b.jenis || 'Buku Pelajaran') + '</small></div>' +
            '<div class="ak-base-page right"><span class="ak-ep">AKSARA • LEARNING CENTER</span></div>' +
          '</div>' +
          '<div class="ak-spine"></div>' +
          '<div class="ak-leaves" id="bkflip-leaves"></div>' +
        '</div>' +
        // Label panjang disembunyikan di ponsel lewat CSS (.nav-teks) — tinggal
        // panahnya saja supaya baris navigasi tidak meluber di layar sempit.
        '<div class="ak-nav">' +
          '<button class="btn btn-o btn-sm" id="bkflip-prev" type="button" aria-label="Halaman sebelumnya"><span aria-hidden="true">◀</span><span class="nav-teks"> Sebelumnya</span></button>' +
          '<span class="ak-count" id="bkflip-count"></span>' +
          '<button class="btn btn-o btn-sm" id="bkflip-next" type="button" aria-label="Halaman berikutnya"><span class="nav-teks">Berikutnya </span><span aria-hidden="true">▶</span></button>' +
        '</div>' +
      '</div>';
    modal('📖 ' + b.judul, isi,
      unduh + '<button class="btn btn-o btn-sm" onclick="closeModal()">Tutup</button>', { lebar: true });
    // Root flipbook = isi modal, karena tombol ‹ › dan penghitung halaman ada
    // di luar area buku (modul mencari semua elemennya dari dalam root ini).
    const wrap = $('m-body');
    if (!wrap) return;
    flipAkar = wrap;
    flipBuku = buatFlipbook(wrap, {
      leavesSel: '#bkflip-leaves', prevSel: '#bkflip-prev', nextSel: '#bkflip-next',
      countSel: '#bkflip-count', leafClass: 'ak-leaf',
      kosong: 'Isi buku ini belum tersedia — silakan unduh berkasnya.'
    });
    flipBuku.pasang();
    flipBuku.bangun(b.isi, function (hal, face, num) { return mukaBuku(hal, face, num, b); });
    pasangPapanTik();
  }


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
        bukuOrangTua = buku;
        // Katalog & daftar pustaka untuk orang tua/murid: tiap buku bisa
        // dibaca (isi lengkap) dan diunduh bila admin menautkan berkasnya.
        const bukuHtml = buku.length
          ? '<table><thead><tr><th>Judul</th><th>Pustaka</th><th>Keterangan</th><th style="text-align:right;">Aksi</th></tr></thead><tbody>' +
            buku.map(function (b) {
              const meta = [b.penulis, b.penerbit, b.tahun].map(v => String(v || '').trim()).filter(Boolean).join(' · ');
              const jenis = jenisBerkas(b);
              const baca = (String(b.isi || '').trim() || b.link)
                ? '<button class="btn btn-n btn-sm" data-action="baca-buku" data-id="' + esc(b.id) + '">📖 Baca</button>'
                : '<span class="badge b-info">Tersedia di kelas</span>';
              const unduh = b.link
                ? ' <a class="btn btn-o btn-sm" href="' + esc(b.link) + '" target="_blank" rel="noopener">⬇️ ' + (jenis ? 'Unduh ' + jenis : 'Unduh') + '</a>'
                : '';
              return '<tr><td><b>' + esc(b.judul) + '</b>' + (b.jenis ? '<div style="font-size:.75rem;"><span class="badge b-info">' + esc(b.jenis) + '</span></div>' : '') + '</td>' +
                '<td style="font-size:.78rem;">' + esc(meta || '-') + '</td>' +
                '<td>' + esc(b.deskripsi || '-') + '</td>' +
                '<td style="text-align:right; white-space:nowrap;">' + baca + unduh + '</td></tr>';
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
    'refresh-dashboard': function () { invalidateCache('dashboard'); app.loadPage('dashboard'); },
    'baca-buku': function (id) { bacaBuku(id); }
  };
