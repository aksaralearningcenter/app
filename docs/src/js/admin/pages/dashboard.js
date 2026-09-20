// ============ HALAMAN: DASHBOARD ============
import { state, invalidateCache } from '../state.js';
import { $, esc, rp } from '../ui.js';
import { app, modal } from '../helpers.js';
import { buatFlipbook } from '../../shared/flipbook.js';
import { mukaIsi, halamanSampul, halamanHakCipta, halamanPustaka, halamanPenutup,
  pasangKendali } from '../../shared/reader-buku.js';
import { BADGE_PERMINTAAN, labelKuota, badgeKuota, ringkasKuota } from '../../shared/jadwal.js';

  // Buku pelajaran/modul untuk akun Orang Tua (diisi ulang tiap render).
  let bukuOrangTua = [];
  // Anak yang sedang dipilih di tab (diingat selama sesi panel).
  let anakAktif = '';

  // Jenis berkas unduhan dari ekstensi URL/nama berkas (PDF, Word, Excel, ...).
  function jenisBerkas(b) {
    const peta = { pdf: 'PDF', doc: 'Word', docx: 'Word', xls: 'Excel', xlsx: 'Excel', ppt: 'PowerPoint', pptx: 'PowerPoint' };
    const m = /\.([A-Za-z0-9]{2,4})(?:$|[?#])/.exec(String(b.berkas || '') + ' ' + String(b.link || ''));
    return m ? (peta[m[1].toLowerCase()] || '') : '';
  }

  // Baca buku untuk Orang Tua/murid: buku dibuka sebagai FLIPBOOK dua halaman
  // memakai mesin & halaman bersama (src/js/shared/flipbook.js untuk pembalik
  // halaman, src/js/shared/reader-buku.js untuk isi halaman, Daftar Isi, dan
  // kendali pembaca) — pembacanya sama persis dengan tombol Baca di halaman
  // Perpustakaan landing: sampul → hak cipta → isi → daftar pustaka → penutup.
  // Bila buku hanya punya berkas tanpa isi teks, tautannya langsung dibuka.
  let flipBuku = null;      // instance flipbook modal (dibuat ulang tiap buku)
  let kendaliBuku = null;   // kendali bersama (ukuran tulisan, Daftar Isi, layar penuh)
  let flipAkar = null;      // root DOM flipbook yang sedang aktif
  let papanTikSiap = false; // listener panah keyboard cukup dipasang sekali

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
      // supaya tiap halaman pas (tanpa menggulir). Baris alat (pustaka + kendali)
      // ikut di dalam pembungkus supaya tingginya diperhitungkan.
      // Kelas "buku" = gaya halaman buku bersama (src/styles/buku.css), sama
      // dengan pembaca di halaman Perpustakaan landing.
      '<div class="flip-wrap buku" id="bkflip">' +
        '<div class="ak-bar">' +
          '<p class="ak-pustaka">' + esc(meta || b.jenis || 'Buku Pelajaran') + '</p>' +
          '<div class="ak-tools">' +
            '<span class="ak-count" id="bkflip-count"></span>' +
            '<button class="ak-ikon" id="bkflip-kecil" type="button" aria-label="Perkecil ukuran tulisan"><i class="fa-solid fa-magnifying-glass-minus"></i></button>' +
            '<button class="ak-ikon" id="bkflip-besar" type="button" aria-label="Perbesar ukuran tulisan"><i class="fa-solid fa-magnifying-glass-plus"></i></button>' +
            '<button class="ak-ikon" id="bkflip-daftar" type="button" aria-expanded="false" aria-controls="bkflip-toc"><i class="fa-solid fa-list-ul"></i> <span>Daftar Isi</span></button>' +
            '<button class="ak-ikon" id="bkflip-full" type="button"><i class="fa-solid fa-expand" id="bkflip-full-ikon"></i> <span id="bkflip-full-teks">Layar Penuh</span></button>' +
          '</div>' +
        '</div>' +
        '<div class="ak-stage" id="bkflip-stage">' +
          '<div class="ak-base">' +
            '<div class="ak-base-page cover"><span class="ak-mark">AKSARA</span><b>' + esc(b.judul) + '</b>' +
              '<small>' + esc(b.jenis || 'Buku Pelajaran') + '</small></div>' +
            '<div class="ak-base-page right"><span class="ak-ep">AKSARA • LEARNING CENTER</span></div>' +
          '</div>' +
          '<div class="ak-spine"></div>' +
          '<div class="ak-leaves" id="bkflip-leaves"></div>' +
          '<button class="ak-panah kiri" id="bkflip-prev" type="button" aria-label="Halaman sebelumnya"><i class="fa-solid fa-chevron-left"></i></button>' +
          '<button class="ak-panah kanan" id="bkflip-next" type="button" aria-label="Halaman berikutnya"><i class="fa-solid fa-chevron-right"></i></button>' +
          // Panel Daftar Isi (gaya & isinya dari buku.css + reader-buku.js).
          '<div class="toc-panel" id="bkflip-toc" aria-hidden="true">' +
            '<div class="toc-head"><b><i class="fa-solid fa-list-ul"></i> Daftar Isi</b>' +
              '<button class="toc-tutup" id="bkflip-toc-tutup" type="button" aria-label="Tutup daftar isi"><i class="fa-solid fa-xmark"></i></button></div>' +
            '<ol class="toc-list" id="bkflip-toc-list"></ol>' +
          '</div>' +
        '</div>' +
      '</div>';
    modal('📖 ' + b.judul, isi,
      unduh + '<button class="btn btn-o btn-sm" onclick="closeModal()">Tutup</button>', { lebar: true });
    // Root flipbook = isi modal, karena tombol panah dan penghitung halaman ada
    // di luar area buku (modul mencari semua elemennya dari dalam root ini).
    const wrap = $('m-body');
    if (!wrap) return;
    flipAkar = wrap;
    flipBuku = buatFlipbook(wrap, {
      leavesSel: '#bkflip-leaves', prevSel: '#bkflip-prev', nextSel: '#bkflip-next',
      countSel: '#bkflip-count', leafClass: 'ak-leaf',
      kosong: 'Isi buku ini belum tersedia — silakan unduh berkasnya.',
      // Halaman berpindah → Daftar Isi ditutup supaya halaman tujuannya terlihat
      // (perilaku yang sama dengan pembaca di landing).
      padaUbah: function () { if (kendaliBuku) kendaliBuku.padaUbah(); }
    });
    flipBuku.pasang();
    // Sampul & hak cipta di depan, daftar pustaka & penutup di belakang —
    // urutan yang sama dengan pembaca di landing.
    const jumlahDepan = 2;
    const depan = [
      halamanSampul(b, { jenisDefault: 'Buku Pelajaran' }),
      halamanHakCipta(b, { depan: jumlahDepan })
    ];
    const belakang = [
      halamanPustaka(b, { depan: jumlahDepan }),
      halamanPenutup(b, {
        depan: jumlahDepan,
        teks: 'Terima kasih telah membaca <b>' + esc(b.judul) + '</b>. Bahan belajar lainnya dibagikan lewat panel ini.',
        aksiHtml: '<button class="btn btn-o btn-sm" type="button" onclick="closeModal()"><i class="fa-solid fa-list-ul"></i> Tutup buku</button>'
      })
    ];
    flipBuku.bangun(b.isi, function (hal, face, num) {
      return mukaIsi(hal, face, num, b, { depan: jumlahDepan });
    }, { depan: depan, belakang: belakang });
    kendaliBuku = pasangKendali(wrap, flipBuku, {
      kecilSel: '#bkflip-kecil', besarSel: '#bkflip-besar',
      tombolDaftarSel: '#bkflip-daftar', panelDaftarSel: '#bkflip-toc',
      tutupDaftarSel: '#bkflip-toc-tutup', listDaftarSel: '#bkflip-toc-list',
      stageSel: '#bkflip-stage', panelSel: '#bkflip', skalaSel: '#bkflip',
      layarSel: '#bkflip-full', ikonLayarSel: '#bkflip-full-ikon', teksLayarSel: '#bkflip-full-teks',
      leafClass: 'ak-leaf'
    });
    kendaliBuku.isiDaftarIsi(jumlahDepan);
    pasangPapanTik();
  }


  // Panel NON-STAF — Orang Tua (banyak anak) dan Murid (dirinya sendiri).
  // Tampilan profesional: pemilih anak (tab) → ringkasan KPI → rincian per
  // kategori dalam akordeon (semua tertutup) → buku khusus berbentuk kartu.
  // Hanya buku yang DITUGASKAN guru/admin untuk anak itu yang tampil.
  function kartuAnak(c) {
    const abs = (c.absensi || []);
    const hadir = abs.filter(a => a.status === 'Hadir').length;
    const persen = abs.length ? Math.round(hadir / abs.length * 100) : 0;
    const nilaiAngka = (c.progres || []).map(p => Number(p.nilai)).filter(n => !isNaN(n));
    const rata = nilaiAngka.length ? Math.round(nilaiAngka.reduce((a, b) => a + b, 0) / nilaiAngka.length) : null;
    const sesi = (c.jadwal || []).length;
    const tx = (c.transaksi || []).slice(0, 5).map(t =>
      '<tr><td>' + new Date(t.tanggal).toLocaleDateString('id-ID') + '</td><td><span class="badge ' + (t.jenis === 'Setoran' ? 'b-ok' : 'b-warn') + '">' + t.jenis + '</span></td><td style="text-align:right;">' + rp(t.jumlah) + '</td></tr>').join('');
    const ab = abs.slice(-7).reverse().map(a =>
      '<tr><td>' + new Date(a.tanggal).toLocaleDateString('id-ID') + '</td><td><span class="badge ' + (a.status === 'Hadir' ? 'b-ok' : (a.status === 'Alpha' ? 'b-err' : 'b-warn')) + '">' + a.status + '</span></td></tr>').join('');
    const pr = (c.progres || []).slice(0, 5).map(p =>
      '<tr><td>' + new Date(p.tanggal).toLocaleDateString('id-ID') + '</td><td>' + esc(p.mapel) + '</td><td>' + esc(p.topik) + '</td><td style="text-align:right;"><b>' + (p.nilai === '' || p.nilai == null ? '-' : p.nilai) + '</b></td></tr>').join('');
    const jadwalAnak = (c.jadwal || []);
    const kuotaAnak = c.kuota || null;
    const pg = (c.permintaan || []).map(p =>
      '<tr><td>' + (p.dibuat ? new Date(p.dibuat).toLocaleDateString('id-ID') : '-') + '</td>' +
      '<td>' + esc([p.hari, p.jam, p.mapel].filter(Boolean).join(' · ')) + '</td>' +
      '<td><span class="badge ' + (BADGE_PERMINTAAN[p.status] || 'b-info') + '">' + esc(p.status) + '</span>' +
        (p.jawaban ? '<div class="ab-kecil">' + esc(p.jawaban) + '</div>' : '') + '</td></tr>').join('');
    const jd = jadwalAnak.map(j =>
      '<tr><td><b>' + esc(j.hari) + '</b></td><td class="mono">' + esc(j.jam || '-') + '</td>' +
      '<td>' + esc(j.mapel || '-') + '</td>' +
      '<td>' + (j.privat ? '<span class="badge b-warn">privat</span>' : '') + '</td></tr>').join('');
    const uj = (c.ujian || []).map(u => {
      const lulus = u.nilai_lulus != null ? (Number(u.skor) >= Number(u.nilai_lulus)) : null;
      const cls = lulus === null ? 'b-info' : (lulus ? 'b-ok' : 'b-warn');
      const label = u.status === 'Selesai' ? (lulus === null ? 'Selesai' : (lulus ? '✔ Lulus' : '✔ Tuntas')) : (u.status === 'Mengerjakan' ? '⏳ Dikerjakan' : u.status || '-');
      const ekstra = Number(u.pindah_tab) > 0 ? ' <span class="badge b-warn" title="Meninggalkan halaman ujian ' + Number(u.pindah_tab) + '×">⚠️' + Number(u.pindah_tab) + '×</span>' : '';
      return '<tr><td>' + esc(u.judul) + '</td><td>' + (u.mulai ? new Date(u.mulai).toLocaleDateString('id-ID') : '-') + '</td><td style="text-align:right;"><b>' + (u.skor || 0) + '</b></td><td><span class="badge ' + cls + '">' + label + '</span>' + ekstra + '</td></tr>';
    }).join('');
    const seksi = (ikon, judul, isi) =>
      '<details class="ortu-sec"><summary><span>' + ikon + ' ' + judul + '</span><span class="ortu-caret">▾</span></summary><div class="ortu-sec-isi">' + isi + '</div></details>';
    const buku = (c.buku || []);
    const bukuHtml = buku.length
      ? '<div class="ortu-books">' + buku.map(function (b) {
        const meta = [b.penulis, b.penerbit, b.tahun].map(v => String(v || '').trim()).filter(Boolean).join(' · ');
        const jenis = jenisBerkas(b);
        const baca = (String(b.isi || '').trim() || b.link)
          ? '<button class="btn btn-n btn-sm" data-action="baca-buku" data-id="' + esc(b.id) + '">📖 Baca</button>'
          : '';
        const unduh = b.link
          ? ' <a class="btn btn-o btn-sm" href="' + esc(b.link) + '" target="_blank" rel="noopener">⬇️ ' + (jenis ? 'Unduh ' + jenis : 'Unduh') + '</a>'
          : '';
        const sampul = b.cover
          ? '<div class="ortu-book-cover" style="background-image:url(\'' + esc(b.cover) + '\')"></div>'
          : '<div class="ortu-book-cover kosong"><i class="fa-solid fa-book-open"></i></div>';
        return '<div class="ortu-book">' + sampul +
          '<div class="ortu-book-info"><b>' + esc(b.judul) + '</b>' +
          (b.tugas ? '<div class="ab-kecil">🎯 ' + esc(b.tugas) + '</div>' : '') +
          (meta ? '<div class="ab-kecil">' + esc(meta) + '</div>' : '') +
          '<div class="ortu-book-aksi">' + (baca + unduh || '<span class="ab-kecil">Tersedia di kelas</span>') + '</div></div></div>';
      }).join('') + '</div>'
      : '<div class="empty">Belum ada buku khusus untuk ' + esc(c.nama) + '.</div>';
    return '<div class="card ortu-head"><div class="card-head"><h3>👨‍🎓 ' + esc(c.nama) + ' — ' + esc(c.kelas) + '</h3><span class="badge b-ok">' + rp(c.saldo) + '</span></div>' +
      '<div class="ortu-kpi">' +
      '<div class="stat"><div class="n">' + persen + '%</div><div class="l">Kehadiran</div></div>' +
      '<div class="stat"><div class="n">' + rp(c.saldo) + '</div><div class="l">Tabungan</div></div>' +
      '<div class="stat"><div class="n">' + (rata === null ? '–' : rata) + '</div><div class="l">Rata-rata Nilai</div></div>' +
      '<div class="stat"><div class="n">' + sesi + '</div><div class="l">Sesi / Pekan</div></div>' +
      '</div></div>' +
      seksi('🗓️', 'Jadwal Belajar' + (jadwalAnak.length ? ' · ' + jadwalAnak.length + ' sesi' : ''),
        jd ? '<div class="table-wrap"><table><tbody>' + jd + '</tbody></table></div>' : '<div class="empty">Belum ada jadwal.</div>') +
      seksi('📝', 'Kehadiran' + (abs.length ? ' · ' + persen + '%' : ''),
        ab ? '<div class="table-wrap"><table><tbody>' + ab + '</tbody></table></div>' : '<div class="empty">Belum ada catatan.</div>') +
      seksi('💰', 'Tabungan · ' + rp(c.saldo),
        tx ? '<div class="table-wrap"><table><tbody>' + tx + '</tbody></table></div>' : '<div class="empty">Belum ada transaksi.</div>') +
      seksi('📈', 'Progres Belajar' + (rata === null ? '' : ' · rata-rata ' + rata),
        pr ? '<div class="table-wrap"><table><tbody>' + pr + '</tbody></table></div>' : '<div class="empty">Belum ada catatan.</div>') +
      seksi('📩', 'Pengajuan Jadwal',
        '<div class="ab-kecil" style="margin-bottom:8px;">Kuota: <span class="badge ' + badgeKuota(kuotaAnak) + '">' +
          esc(labelKuota(kuotaAnak)) + '</span> ' + esc(ringkasKuota(kuotaAnak)) + '</div>' +
        (pg ? '<div class="table-wrap"><table><thead><tr><th>Diajukan</th><th>Sesi</th><th>Status</th></tr></thead><tbody>' + pg + '</tbody></table></div>'
            : '<p class="ab-kecil" style="margin:0 0 8px;">Belum ada pengajuan jadwal.</p>') +
        '<div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">' +
          '<button class="btn btn-n btn-sm" data-action="add-request">📩 Ajukan Jadwal</button>' +
          '<button class="btn btn-o btn-sm" data-action="lihat-requests">🗂️ Kuota &amp; Riwayat</button>' +
        '</div>') +
      seksi('📚', 'Ujian' + ((c.ujian || []).length ? ' · ' + (c.ujian || []).length + ' riwayat' : ''),
        uj ? '<div class="table-wrap"><table><thead><tr><th>Ujian</th><th>Tanggal</th><th style="text-align:right;">Skor</th><th>Status</th></tr></thead><tbody>' + uj + '</tbody></table></div>' : '<div class="empty">Belum ada riwayat ujian.</div>') +
      '<div class="card"><div class="card-head"><h3>📖 Buku Khusus</h3><span class="badge b-info">' + buku.length + ' buku</span></div>' +
      '<p style="font-size:0.85rem;">Bahan belajar yang ditugaskan guru/admin khusus untuk ' + esc(c.nama) + '.</p>' + bukuHtml + '</div>';
  }

  function renderNonStaf(data) {
    const sendiri = !Array.isArray(data.children);      // peran Murid
    const daftar = sendiri ? (data.murid ? [data.murid] : []) : data.children;
    // Indeks buku untuk tombol Baca (dari semua anak + daftar umum versi lama).
    const peta = {};
    daftar.forEach(c => (c.buku || []).forEach(b => { peta[String(b.id)] = b; }));
    (data.buku || []).forEach(b => { if (!peta[String(b.id)]) peta[String(b.id)] = b; });
    bukuOrangTua = Object.keys(peta).map(k => peta[k]);
    // Tab anak: ingat pilihan selama sesi; anak baru/hilang → kembali ke pertama.
    if (!daftar.some(c => String(c.studentId) === String(anakAktif))) anakAktif = daftar.length ? String(daftar[0].studentId) : '';
    const anak = daftar.filter(c => String(c.studentId) === String(anakAktif))[0] || null;
    const tabs = (!sendiri && daftar.length > 1)
      ? '<div class="ortu-tabs" role="tablist">' + daftar.map(c =>
        '<button type="button" role="tab" aria-selected="' + (String(c.studentId) === String(anakAktif)) + '" class="ortu-tab' + (String(c.studentId) === String(anakAktif) ? ' on' : '') + '" data-action="pilih-anak" data-id="' + esc(c.studentId) + '">👨‍🎓 ' + esc(c.nama) + '</button>').join('') + '</div>'
      : '';
    const notifOn = (data.notifEmail || 'Aktif') === 'Aktif';
    const sapaan = sendiri
      ? '<div class="card"><div class="card-head"><h2>👋 Halo, ' + esc((data.murid && data.murid.nama) || state.me.nama || 'Murid') + '</h2>' +
        '<span class="badge b-info">🎒 ' + esc((data.murid && data.murid.kelas) || data.namaMurid || 'Murid') + '</span></div>' +
        '<p style="font-size:0.9rem;">Ringkasan belajar Anda: jadwal, kehadiran, tabungan, progres, dan riwayat ujian.</p>' +
        '<div class="ortu-notif"><span>🔔 Notifikasi email ' + (notifOn ? 'aktif' : 'mati') + ' — kabari saat data diperbarui.</span>' +
        '<button class="btn btn-o btn-sm" data-action="toggle-my-notif" data-extra="' + (data.notifEmail || 'Aktif') + '">' + (notifOn ? '⏸️ Matikan' : '▶️ Aktifkan') + '</button></div></div>'
      : '<div class="card"><div class="card-head"><h2>👋 Selamat datang, ' + esc(data.namaOrangTua || state.me.nama || 'Orang Tua') + '</h2></div>' +
        '<p style="font-size:0.9rem;">Pemantauan data anak Anda: tabungan, kehadiran, dan progres belajar.</p>' +
        '<div class="ortu-notif"><span>🔔 Notifikasi email ' + (notifOn ? 'aktif' : 'mati') + ' — kabari saat data anak diperbarui.</span>' +
        '<button class="btn btn-o btn-sm" data-action="toggle-my-notif" data-extra="' + (data.notifEmail || 'Aktif') + '">' + (notifOn ? '⏸️ Matikan' : '▶️ Aktifkan') + '</button></div></div>';
    $('page').innerHTML = sapaan + tabs +
      (anak ? kartuAnak(anak) : (sendiri
        ? '<div class="card"><div class="empty">' + esc(data.pesan || 'Akun ini belum ditautkan ke data murid mana pun. Hubungi admin sekolah.') + '</div></div>'
        : '<div class="card"><div class="empty">Belum ada data anak tertaut ke akun ini. Hubungi admin.</div></div>'));
  }

  export const render = {
    dashboard: function(data) {
      // Orang Tua (children[]) & Murid (murid) sama-sama memakai panel non-staf.
      if (Array.isArray(data.children) || Object.prototype.hasOwnProperty.call(data, 'murid')) return renderNonStaf(data);
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
    'baca-buku': function (id) { bacaBuku(id); },
    'pilih-anak': function (id) { anakAktif = String(id || ''); if (state.cache.dashboard) renderNonStaf(state.cache.dashboard); }
  };
