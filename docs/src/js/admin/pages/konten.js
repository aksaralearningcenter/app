// ============ HALAMAN: KONTEN LANDING (harga, berita, buku, galeri, mitra,
//             testimoni, FAQ, program, kurikulum, kartu, situs, chatbot) ============
import { state, invalidateCache } from '../state.js';
import { $, esc, toast } from '../ui.js';
import { api, post } from '../api.js';
import { app, modal, closeModal, sorterHtml, urutkanBy } from '../helpers.js';
import { uploadField, dokumenField, badgeBerkas, pratinjauGambar, pratinjauDokumen } from './upload.js';


  export const render = {
    pricing: function(rows) {
      rows = rows || [];
      let html = '<div class="card-head" style="margin-bottom:16px;"><h2>🏷️ Harga &amp; Paket</h2><button class="btn btn-n btn-sm" data-action="add-pricing">➕ Tambah Baris</button></div>';
      html += '<p style="font-size:.78rem; margin-bottom:12px;">Kelola isi tabel harga di landing page. Tipe <b>program</b> memakai kolom Grup (kids/sd/smp/sma/academic/writing/final) + 5 kolom tabel; tipe <b>writing</b>/<b>final</b> bisa dipilih langsung (Grup boleh dikosongkan).</p>';
      Object.keys(PRICING_TIPES).forEach(function(tipe) {
        const def = PRICING_TIPES[tipe];
        const list = rows.filter(r => r.tipe === tipe).sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
        const body = list.map(r =>
          '<tr><td>' + (tipe === 'program' ? '<span class="mono">' + esc(r.grup || '-') + '</span>' : '—') + '</td>' +
          [r.c1, r.c2, r.c3, r.c4, r.c5].map(v => '<td>' + esc(v || '—') + '</td>').join('') +
          '<td>' + (r.urutan || 0) + '</td>' +
          '<td><span class="badge ' + ((r.status || 'Aktif') === 'Aktif' ? 'b-ok' : 'b-warn') + '">' + esc(r.status || 'Aktif') + '</span></td>' +
          '<td style="white-space:nowrap;"><button class="btn btn-o btn-sm" data-action="edit-pricing" data-id="' + esc(r.id) + '">✏️</button> ' +
          '<button class="btn btn-d btn-sm" data-action="del-pricing" data-id="' + esc(r.id) + '">🗑️</button></td></tr>').join('');
        html += '<div class="card"><div class="card-head"><h3>' + esc(def.label) + '</h3><span class="badge b-info">' + list.length + ' baris</span></div>' +
          '<div class="table-wrap"><table><thead><tr><th>Grup</th>' + def.cols.map(c => '<th>' + esc(c || '') + '</th>').join('') + '<th>Urutan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
          (body || '<tr><td colspan="9" style="text-align:center;">Belum ada data.</td></tr>') + '</tbody></table></div></div>';
      });
      $('page').innerHTML = html;
    },

    news: function(rows) {
      rows = rows || [];
      const cover = n => n.gambar
        ? '<span class="thumb" style="background-image:url(\'' + esc(n.gambar) + '\')"></span>'
        : '<span class="thumb" title="Cover belum diisi"><i class="fa-solid fa-image"></i></span>';
      const body = rows.map(n =>
        '<tr><td>' + cover(n) + '</td>' +
        '<td>' + (n.tanggal ? new Date(n.tanggal).toLocaleDateString('id-ID') : '-') + '</td>' +
        '<td><b>' + esc(n.judul) + '</b><div style="font-size:.75rem;">' + esc((n.ringkasan || '').substring(0, 90)) + '</div></td>' +
        '<td><span class="badge ' + ((n.status || 'Publikasi') === 'Publikasi' ? 'b-ok' : 'b-warn') + '">' + esc(n.status || 'Publikasi') + '</span></td>' +
        '<td style="white-space:nowrap;"><button class="btn btn-o btn-sm" data-action="edit-news" data-id="' + esc(n.id) + '">✏️</button> ' +
        '<button class="btn btn-d btn-sm" data-action="del-news" data-id="' + esc(n.id) + '">🗑️</button></td></tr>').join('');
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>📰 Berita</h2><button class="btn btn-n btn-sm" data-action="add-news">➕ Tulis Berita</button></div>' +
        '<p style="font-size:.78rem; margin-bottom:12px;">Cover bisa <b>diunggah langsung</b> dari modal Tulis/Edit Berita (tombol ⬆️ Unggah) — dipakai sebagai thumbnail kartu berita di landing.</p>' +
        '<div class="card"><div class="table-wrap"><table><thead><tr><th>Cover</th><th>Tanggal</th><th>Judul</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
        (body || '<tr><td colspan="5" style="text-align:center;">Belum ada berita.</td></tr>') + '</tbody></table></div></div>';
    },

    books: function(rows) {
      rows = rows || [];
      const flip = urutkanBy(rows.filter(b => b.tipe === 'flipbook'));
      const sorter = sorterHtml('books', flip, {
        judul: '📖 Urutan Halaman Flipbook',
        satuan: ' halaman',
        badge: flip.length + ' halaman · ' + Math.ceil(flip.length / 2) + ' lembar',
        atas: 'Geser kartu (drag) atau pakai tombol ↑ ↓ untuk mengubah urutan halaman booklet di landing. Urutan tersimpan otomatis — tidak perlu klik Simpan.',
        label: b => b.judul,
        sub: (b, i) => 'Lembar ' + (Math.floor(i / 2) + 1) + ' · halaman ' + (i % 2 === 0 ? 'kanan' : 'kiri') + (b.deskripsi ? ' · ' + esc(b.deskripsi) : ''),
        thumb: b => b.cover
          ? '<span class="sort-thumb" style="background-image:url(\'' + esc(b.cover) + '\')"></span>'
          : '<span class="sort-thumb"><i class="fa-solid fa-file-lines"></i></span>'
      });
      const cover = b => b.cover
        ? '<span class="thumb" style="background-image:url(\'' + esc(b.cover) + '\')"></span>'
        : '<span class="thumb" title="Cover belum diisi"><i class="fa-solid fa-file-lines"></i></span>';
      const body = rows.map(b =>
        '<tr><td>' + cover(b) + '</td>' +
        '<td><span class="badge ' + (b.tipe === 'flipbook' ? 'b-info' : 'b-warn') + '">' + esc(b.tipe || 'katalog') + '</span></td>' +
        '<td><b>' + esc(b.judul) + '</b><div style="font-size:.75rem;">' + esc((b.deskripsi || '').substring(0, 90)) + '</div></td>' +
        '<td>' + badgeBerkas(b) + '</td>' +
        '<td class="col-sm-hide">' + (b.urutan || 0) + '</td>' +
        '<td><span class="badge ' + ((b.status || 'Aktif') === 'Aktif' ? 'b-ok' : 'b-warn') + '">' + esc(b.status || 'Aktif') + '</span></td>' +
        '<td style="white-space:nowrap;"><button class="btn btn-o btn-sm" data-action="edit-book" data-id="' + esc(b.id) + '">✏️</button> ' +
        '<button class="btn btn-d btn-sm" data-action="del-book" data-id="' + esc(b.id) + '">🗑️</button></td></tr>').join('');
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>📚 Buku</h2><button class="btn btn-n btn-sm" data-action="add-book">➕ Tambah Buku</button></div>' +
        '<p style="font-size:.78rem; margin-bottom:12px;">Tipe <b>flipbook</b> = halaman buku panduan di landing (atur urutannya di kartu di atas). Tipe <b>katalog</b> = buku/modul unduhan — cover dan berkasnya (PDF/Word/Excel) bisa <b>diunggah langsung</b> dari modal Tambah/Edit Buku. Kolom <b>Link</b> menampilkan jenis berkas yang dipakai tombol “Unduh / Baca” di katalog.</p>' +
        sorter +
        '<div class="card"><div class="table-wrap"><table><thead><tr><th>Cover</th><th>Tipe</th><th>Judul</th><th>Link</th><th class="col-sm-hide">Urutan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
        (body || '<tr><td colspan="7" style="text-align:center;">Belum ada buku.</td></tr>') + '</tbody></table></div></div>';
    },

    gallery: function(rows) {
      rows = rows || [];
      const list = urutkanBy(rows);
      const thumbHtml = (g, cls) => g.gambar
        ? '<span class="' + cls + '" style="background-image:url(\'' + esc(g.gambar) + '\')"></span>'
        : '<span class="' + cls + '"><i class="fa-solid fa-image"></i></span>';
      const sorter = sorterHtml('gallery', list, {
        judul: '🖼️ Urutan Foto',
        satuan: ' foto',
        atas: 'Geser kartu (drag) atau pakai tombol ↑ ↓ untuk mengubah urutan foto pada mosaik galeri di landing.',
        label: g => g.judul,
        sub: g => (g.ukuran === 'wide' ? 'Lebar (2 kolom)' : 'Normal') + ' · ' + (g.gambar ? esc(g.keterangan || 'tanpa keterangan') : '⚠️ URL gambar belum diisi'),
        thumb: g => thumbHtml(g, 'sort-thumb')
      });
      const body = list.map(g =>
        '<tr><td>' + thumbHtml(g, 'thumb') + '</td>' +
        '<td><b>' + esc(g.judul) + '</b><div style="font-size:.75rem;">' + esc(g.keterangan || '-') + '</div></td>' +
        '<td>' + (g.ukuran === 'wide' ? '<span class="badge b-info">Lebar</span>' : 'Normal') + '</td>' +
        '<td class="col-sm-hide" style="text-align:center;">' + (g.urutan || 0) + '</td>' +
        '<td><span class="badge ' + ((g.status || 'Aktif') === 'Aktif' ? 'b-ok' : 'b-warn') + '">' + esc(g.status || 'Aktif') + '</span></td>' +
        '<td style="white-space:nowrap;"><button class="btn btn-o btn-sm" data-action="edit-gallery" data-id="' + esc(g.id) + '">✏️</button> ' +
        '<button class="btn btn-d btn-sm" data-action="del-gallery" data-id="' + esc(g.id) + '">🗑️</button></td></tr>').join('');
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>📷 Galeri Kegiatan</h2><button class="btn btn-n btn-sm" data-action="add-gallery">➕ Tambah Foto</button></div>' +
        '<p style="font-size:.78rem; margin-bottom:12px;">Isi <b>URL Gambar</b> dengan tautan foto (mis. hasil upload ke Google Drive/Imgur yang publik). Ukuran <b>Lebar</b> membuat foto memakai 2 kolom pada mosaik.</p>' +
        sorter +
        '<div class="card"><div class="table-wrap"><table><thead><tr><th>Foto</th><th>Judul</th><th>Ukuran</th><th class="col-sm-hide">Urutan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
        (body || '<tr><td colspan="6" style="text-align:center;">Belum ada foto galeri.</td></tr>') + '</tbody></table></div></div>';
    },

    partners: function(rows) {
      rows = rows || [];
      const list = urutkanBy(rows);
      const sorter = sorterHtml('partners', list, {
        judul: '🤝 Urutan Logo Mitra',
        satuan: ' mitra',
        atas: 'Geser kartu (drag) atau pakai tombol ↑ ↓ untuk mengubah urutan logo pada strip mitra di landing.',
        label: p => p.nama,
        sub: p => (p.logo ? 'Memakai logo (gambar)' : 'Memakai ikon ' + esc(p.ikon || '-')),
        thumb: p => p.logo
          ? '<span class="sort-thumb" style="background-image:url(\'' + esc(p.logo) + '\')"></span>'
          : '<span class="sort-thumb"><i class="' + esc(p.ikon || 'fa-solid fa-handshake') + '"></i></span>'
      });
      const body = list.map(p =>
        '<tr><td>' + (p.logo
          ? '<span class="thumb" style="background-image:url(\'' + esc(p.logo) + '\')"></span>'
          : '<span class="thumb"><i class="' + esc(p.ikon || 'fa-solid fa-handshake') + '"></i></span>') + '</td>' +
        '<td><b>' + esc(p.nama) + '</b><div style="font-size:.75rem;">' + (p.logo ? 'Logo gambar' : 'Ikon: ' + esc(p.ikon || '-')) + '</div></td>' +
        '<td class="col-sm-hide" style="text-align:center;">' + (p.urutan || 0) + '</td>' +
        '<td><span class="badge ' + ((p.status || 'Aktif') === 'Aktif' ? 'b-ok' : 'b-warn') + '">' + esc(p.status || 'Aktif') + '</span></td>' +
        '<td style="white-space:nowrap;"><button class="btn btn-o btn-sm" data-action="edit-partner" data-id="' + esc(p.id) + '">✏️</button> ' +
        '<button class="btn btn-d btn-sm" data-action="del-partner" data-id="' + esc(p.id) + '">🗑️</button></td></tr>').join('');
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>🤝 Mitra &amp; Logo</h2><button class="btn btn-n btn-sm" data-action="add-partner">➕ Tambah Mitra</button></div>' +
        '<p style="font-size:.78rem; margin-bottom:12px;">Isi <b>URL Logo</b> bila punya file logo; kalau kosong, tampilannya memakai <b>kelas ikon Font Awesome</b> (contoh: <span class="mono">fa-solid fa-school</span>).</p>' +
        sorter +
        '<div class="card"><div class="table-wrap"><table><thead><tr><th>Logo</th><th>Nama Mitra</th><th class="col-sm-hide">Urutan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
        (body || '<tr><td colspan="5" style="text-align:center;">Belum ada mitra.</td></tr>') + '</tbody></table></div></div>';
    },

    testimoni: function(rows) {
      rows = rows || [];
      const list = urutkanBy(rows);
      const bintang = n => '★'.repeat(Math.min(5, Math.max(1, Number(n) || 5)));
      const sorter = sorterHtml('testimoni', list, {
        judul: '⭐ Urutan Testimoni',
        satuan: ' testimoni',
        atas: 'Geser kartu (drag) atau pakai tombol ↑ ↓ untuk mengubah urutan testimoni di landing.',
        label: t => t.nama,
        sub: t => bintang(t.bintang) + ' · ' + esc((t.peran || 'Tanpa keterangan')) + ' · ' + esc((t.isi || '').substring(0, 60))
      });
      const body = list.map(t =>
        '<tr><td><b>' + esc(t.nama) + '</b><div style="font-size:.75rem;">' + esc(t.peran || '-') + '</div></td>' +
        '<td style="font-size:.8rem; max-width:420px;">' + esc((t.isi || '').substring(0, 120)) + '</td>' +
        '<td style="white-space:nowrap; color:var(--gold);">' + bintang(t.bintang) + '</td>' +
        '<td class="col-sm-hide" style="text-align:center;">' + (t.urutan || 0) + '</td>' +
        '<td><span class="badge ' + ((t.status || 'Aktif') === 'Aktif' ? 'b-ok' : 'b-warn') + '">' + esc(t.status || 'Aktif') + '</span></td>' +
        '<td style="white-space:nowrap;"><button class="btn btn-o btn-sm" data-action="edit-testimoni" data-id="' + esc(t.id) + '">✏️</button> ' +
        '<button class="btn btn-d btn-sm" data-action="del-testimoni" data-id="' + esc(t.id) + '">🗑️</button></td></tr>').join('');
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>⭐ Testimoni</h2><button class="btn btn-n btn-sm" data-action="add-testimoni">➕ Tambah Testimoni</button></div>' +
        '<p style="font-size:.78rem; margin-bottom:12px;">Testimoni tampil di halaman Beranda landing. Isi sebaiknya singkat (1–3 kalimat).</p>' +
        sorter +
        '<div class="card"><div class="table-wrap"><table><thead><tr><th>Nama</th><th>Isi</th><th>Bintang</th><th class="col-sm-hide">Urutan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
        (body || '<tr><td colspan="6" style="text-align:center;">Belum ada testimoni.</td></tr>') + '</tbody></table></div></div>';
    },

    faq: function(rows) {
      rows = rows || [];
      const list = urutkanBy(rows);
      const sorter = sorterHtml('faq', list, {
        judul: '❓ Urutan FAQ',
        satuan: ' pertanyaan',
        atas: 'Geser kartu (drag) atau pakai tombol ↑ ↓ untuk mengubah urutan pertanyaan di landing.',
        label: f => f.pertanyaan,
        sub: f => esc((f.jawaban || '').substring(0, 70))
      });
      const body = list.map(f =>
        '<tr><td><b>' + esc(f.pertanyaan) + '</b><div style="font-size:.75rem; max-width:520px;">' + esc((f.jawaban || '').substring(0, 120)) + '</div></td>' +
        '<td class="col-sm-hide" style="text-align:center;">' + (f.urutan || 0) + '</td>' +
        '<td><span class="badge ' + ((f.status || 'Aktif') === 'Aktif' ? 'b-ok' : 'b-warn') + '">' + esc(f.status || 'Aktif') + '</span></td>' +
        '<td style="white-space:nowrap;"><button class="btn btn-o btn-sm" data-action="edit-faq" data-id="' + esc(f.id) + '">✏️</button> ' +
        '<button class="btn btn-d btn-sm" data-action="del-faq" data-id="' + esc(f.id) + '">🗑️</button></td></tr>').join('');
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>❓ FAQ</h2><button class="btn btn-n btn-sm" data-action="add-faq">➕ Tambah FAQ</button></div>' +
        '<p style="font-size:.78rem; margin-bottom:12px;">Pertanyaan umum tampil sebagai accordion di Beranda landing.</p>' +
        sorter +
        '<div class="card"><div class="table-wrap"><table><thead><tr><th>Pertanyaan</th><th class="col-sm-hide">Urutan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
        (body || '<tr><td colspan="4" style="text-align:center;">Belum ada FAQ.</td></tr>') + '</tbody></table></div></div>';
    },

    program: function(rows) {
      rows = rows || [];
      const list = urutkanBy(rows);
      const sorter = sorterHtml('program', list, {
        judul: '🎓 Urutan Katalog Program',
        satuan: ' program',
        atas: 'Geser kartu (drag) atau pakai tombol ↑ ↓ untuk mengubah urutan kartu program di landing.',
        label: p => p.judul,
        sub: (p, i) => (p.grup === 'tambahan' ? 'Grup tambahan (2 kolom)' : 'Grup utama (3 kolom)') + ' · ' + esc(p.tag || 'tanpa label') +
          ' · ' + (String(p.poin || '').split('|').filter(x => x.trim()).length) + ' poin'
      });
      const body = list.map(p =>
        '<tr><td><b>' + esc(p.judul) + '</b><div style="font-size:.75rem;">' + esc((p.ringkasan || '').substring(0, 90)) + '</div></td>' +
        '<td>' + (p.ikon ? '<i class="' + esc(p.ikon) + '" style="color:var(--gold)"></i> ' : '') + '<span class="mono">' + esc(p.ikon || '-') + '</span></td>' +
        '<td><span class="badge ' + (p.grup === 'tambahan' ? 'b-warn' : 'b-info') + '">' + (p.grup === 'tambahan' ? 'tambahan' : 'utama') + '</span></td>' +
        '<td>' + esc(p.tag || '-') + '</td>' +
        '<td class="col-sm-hide" style="text-align:center;">' + (p.urutan || 0) + '</td>' +
        '<td><span class="badge ' + ((p.status || 'Aktif') === 'Aktif' ? 'b-ok' : 'b-warn') + '">' + esc(p.status || 'Aktif') + '</span></td>' +
        '<td style="white-space:nowrap;"><button class="btn btn-o btn-sm" data-action="edit-program" data-id="' + esc(p.id) + '">✏️</button> ' +
        '<button class="btn btn-d btn-sm" data-action="del-program" data-id="' + esc(p.id) + '">🗑️</button></td></tr>').join('');
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>🎓 Program</h2><button class="btn btn-n btn-sm" data-action="add-program">➕ Tambah Program</button></div>' +
        '<p style="font-size:.78rem; margin-bottom:12px;">Kartu program tampil di halaman <b>Program</b> pada landing. Poin ditulis satu per baris (atau dipisah tanda <span class="mono">|</span>).</p>' +
        sorter +
        '<div class="card"><div class="table-wrap"><table><thead><tr><th>Program</th><th>Ikon</th><th>Grup</th><th>Label</th><th class="col-sm-hide">Urutan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
        (body || '<tr><td colspan="7" style="text-align:center;">Belum ada program.</td></tr>') + '</tbody></table></div></div>';
    },

    kurikulum: function(rows) {
      rows = rows || [];
      const list = urutkanBy(rows);
      const sorter = sorterHtml('kurikulum', list, {
        judul: '📘 Urutan Tab Kurikulum',
        satuan: ' tab',
        atas: 'Geser kartu (drag) atau pakai tombol ↑ ↓ untuk mengubah urutan tab kurikulum di landing.',
        label: k => k.judul,
        sub: k => 'Tab ' + esc(k.tab) + ' · ' + String(k.alur || '').split('|').filter(x => x.trim()).length + ' alur · ' +
          String(k.capaian || '').split('|').filter(x => x.trim()).length + ' capaian'
      });
      const body = list.map(k =>
        '<tr><td><b>' + esc(k.judul) + '</b><div style="font-size:.75rem;">' + esc((k.ringkasan || '').substring(0, 90)) + '</div></td>' +
        '<td><span class="badge b-info">' + esc(k.tab) + '</span></td>' +
        '<td>' + (k.ikon ? '<i class="' + esc(k.ikon) + '" style="color:var(--gold)"></i> ' : '') + '<span class="mono">' + esc(k.ikon || '-') + '</span></td>' +
        '<td class="col-sm-hide" style="text-align:center;">' + (k.urutan || 0) + '</td>' +
        '<td><span class="badge ' + ((k.status || 'Aktif') === 'Aktif' ? 'b-ok' : 'b-warn') + '">' + esc(k.status || 'Aktif') + '</span></td>' +
        '<td style="white-space:nowrap;"><button class="btn btn-o btn-sm" data-action="edit-kurikulum" data-id="' + esc(k.id) + '">✏️</button> ' +
        '<button class="btn btn-d btn-sm" data-action="del-kurikulum" data-id="' + esc(k.id) + '">🗑️</button></td></tr>').join('');
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>📘 Kurikulum</h2><button class="btn btn-n btn-sm" data-action="add-kurikulum">➕ Tambah Kurikulum</button></div>' +
        '<p style="font-size:.78rem; margin-bottom:12px;">Satu baris = satu tab di halaman <b>Kurikulum</b> landing. Tab: <span class="mono">kids, school, academic, writing, final</span>. Alur &amp; capaian ditulis satu per baris (atau dipisah <span class="mono">|</span>).</p>' +
        sorter +
        '<div class="card"><div class="table-wrap"><table><thead><tr><th>Judul</th><th>Tab</th><th>Ikon</th><th class="col-sm-hide">Urutan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
        (body || '<tr><td colspan="6" style="text-align:center;">Belum ada kurikulum.</td></tr>') + '</tbody></table></div></div>';
    },

    kartu: function(rows) {
      rows = rows || [];
      const list = urutkanBy(rows);
      const NAMA_SEKSI = { layanan: 'Layanan & Fasilitas', alur: 'Alur Belajar', jenjang: 'Jenjang Dilayani' };
      const sorter = sorterHtml('kartu', list, {
        judul: '🗂️ Urutan Kartu Beranda',
        satuan: ' kartu',
        atas: 'Geser kartu (drag) atau pakai tombol ↑ ↓ untuk mengubah urutan kartu di Beranda landing.',
        label: k => k.judul,
        sub: k => (NAMA_SEKSI[k.seksi] || k.seksi) + ' · ' + esc((k.teks || '').substring(0, 60))
      });
      const body = list.map(k =>
        '<tr><td><b>' + esc(k.judul) + '</b><div style="font-size:.75rem; max-width:420px;">' + esc((k.teks || '').substring(0, 90)) + '</div></td>' +
        '<td><span class="badge b-info">' + esc(NAMA_SEKSI[k.seksi] || k.seksi) + '</span></td>' +
        '<td>' + esc(k.ikon || '-') + (k.meta ? '<div style="font-size:.72rem;">' + esc(k.meta) + '</div>' : '') + '</td>' +
        '<td class="col-sm-hide" style="text-align:center;">' + (k.urutan || 0) + '</td>' +
        '<td><span class="badge ' + ((k.status || 'Aktif') === 'Aktif' ? 'b-ok' : 'b-warn') + '">' + esc(k.status || 'Aktif') + '</span></td>' +
        '<td style="white-space:nowrap;"><button class="btn btn-o btn-sm" data-action="edit-kartu" data-id="' + esc(k.id) + '">✏️</button> ' +
        '<button class="btn btn-d btn-sm" data-action="del-kartu" data-id="' + esc(k.id) + '">🗑️</button></td></tr>').join('');
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>🗂️ Kartu Info Beranda</h2><button class="btn btn-n btn-sm" data-action="add-kartu">➕ Tambah Kartu</button></div>' +
        '<p style="font-size:.78rem; margin-bottom:12px;">Mengatur tiga bagian di Beranda landing: <b>Layanan &amp; Fasilitas</b>, <b>Alur Belajar</b> (penomoran otomatis), dan <b>Jenjang yang Dilayani</b>.</p>' +
        sorter +
        '<div class="card"><div class="table-wrap"><table><thead><tr><th>Judul</th><th>Seksi</th><th>Ikon / Meta</th><th class="col-sm-hide">Urutan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
        (body || '<tr><td colspan="6" style="text-align:center;">Belum ada kartu.</td></tr>') + '</tbody></table></div></div>';
    },

    situs: function(data) {
      const s = data || {};
      // Kelompokkan field → satu kartu per grup (tetap rapi walau fieldnya puluhan).
      const grupurutan = [];
      const perGrup = {};
      SETTING_FIELDS.forEach(function (f) {
        const g = f.grup || 'Lainnya';
        if (!perGrup[g]) { perGrup[g] = []; grupurutan.push(g); }
        perGrup[g].push(f);
      });
      const kartu = grupurutan.map(function (g) {
        const bidang = perGrup[g].map(function (f) {
          const nilai = (s[f.k] === undefined || s[f.k] === null) ? '' : s[f.k];
          return '<div class="fg">' +
            '<label>' + esc(f.label) + '</label>' +
            (f.pilih
              ? '<select id="set-' + f.k + '">' + f.pilih.map(function (v) { return '<option' + (v === nilai ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') + '</select>'
              : f.area
                ? '<textarea id="set-' + f.k + '" rows="3">' + esc(nilai) + '</textarea>'
                : '<input id="set-' + f.k + '" value="' + esc(nilai) + '">') +
            (f.hint ? '<p style="font-size:.7rem; opacity:.75; margin-top:6px;">' + f.hint + '</p>' : '') +
            '</div>';
        }).join('');
        const duaKolom = g === 'Halo & Hero' || g === 'Kontak & Ajakan (CTA)';
        return '<div class="card" style="margin-bottom:16px;"><h3 style="margin-bottom:12px;">' + esc(g) + '</h3>' +
          '<div class="frow">' + bidang + '</div></div>';
      }).join('');
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>⚙️ Pengaturan Situs</h2>' +
        '<button class="btn btn-o btn-sm" data-action="refresh-page" data-id="situs">🔄 Muat Ulang</button></div>' +
        '<p style="font-size:.78rem; margin-bottom:12px;">Semua teks dan kontak ini langsung tampil di landing page. <b>Nomor WhatsApp</b> dipakai untuk semua tombol “Konsultasi WhatsApp”. Kunci API chatbot diatur di menu <b>🤖 Chatbot</b>.</p>' +
        kartu +
        '<div style="margin:6px 0 26px;"><button class="btn btn-n btn-sm" data-action="save-settings">💾 Simpan Pengaturan</button></div>';
    },

    chatbot: function(cfg) {
      const c = cfg || {};
      if (!c.success) {
        $('page').innerHTML = '<div class="card"><div class="empty">⚠️ ' + esc(c.message || 'Tidak bisa memuat konfigurasi chatbot.') + '</div></div>';
        return;
      }
      const statusBadge = c.adaKunci
        ? '<span class="badge b-ok">🔑 Kunci tersimpan di server (' + esc(c.kunciInfo || '') + ')</span>'
        : '<span class="badge b-warn">⚠️ Kunci API belum diisi — chatbot tidak muncul di landing</span>';
      const statusAktif = c.aktif
        ? '<span class="badge b-ok">Chatbot Aktif</span>'
        : '<span class="badge b-warn">Chatbot Dinonaktifkan</span>';
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>🤖 Chatbot Aksara</h2>' +
        '<button class="btn btn-o btn-sm" data-action="refresh-page" data-id="chatbot">🔄 Muat Ulang</button></div>' +
        '<p style="font-size:.78rem; margin-bottom:14px;">Asisten AI di landing menjawab pertanyaan seputar Aksara (program, harga, pendaftaran) <b>dan</b> membantu materi belajar. Jawaban selalu berbasis data landing yang dikelola admin. Kunci API disimpan di <b>Script Properties server</b> — tidak pernah dikirim ke browser pengunjung.</p>' +
        '<div class="grid" style="margin-bottom:16px;">' +
          '<div class="stat"><div class="n">' + (c.adaKunci ? '✓' : '—') + '</div><div class="l">Kunci API</div></div>' +
          '<div class="stat"><div class="n">' + (c.aktif ? 'Aktif' : 'Off') + '</div><div class="l">Status Chatbot</div></div>' +
          '<div class="stat"><div class="n">' + (c.pesanHariIni || 0) + '</div><div class="l">Pesan Hari Ini (batas ' + (c.batasHari || '-') + ')</div></div>' +
          '<div class="stat"><div class="n">' + (c.batasSesi || '-') + '</div><div class="l">Maks / Sesi 10 Menit</div></div>' +
        '</div>' +
        '<div class="card" style="margin-bottom:16px;"><h3 style="margin-bottom:10px;">Kunci API Gemini</h3>' +
          '<p style="font-size:.78rem; margin-bottom:10px;">' + statusBadge + ' ' + statusAktif + ' <span style="opacity:.7;">· model ' + esc(c.model || '-') + '</span></p>' +
          '<div class="fg"><label>Kunci API Baru (kosongkan bila tidak ingin mengubah)</label>' +
          '<input type="password" id="chat-kunci" placeholder="AIza… atau AQ…" autocomplete="new-password">' +
          '<p style="font-size:.7rem; opacity:.75; margin-top:6px;">Kunci disimpan ke Script Properties dan tidak bisa dilihat kembali — cukup diperbarui bila berganti kunci.</p></div>' +
          '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">' +
            '<button class="btn btn-n btn-sm" data-action="chat-simpan-kunci">🔑 Simpan Kunci</button>' +
            (c.adaKunci ? '<button class="btn btn-d btn-sm" data-action="chat-hapus-kunci">🗑️ Hapus Kunci</button>' : '') +
          '</div></div>' +
        '<div class="card"><h3 style="margin-bottom:10px;">Teks &amp; Sapaan Chatbot</h3>' +
          '<p style="font-size:.75rem; margin-bottom:10px;">Nama, sapaan, catatan, dan chip saran pertanyaan diatur di <b>⚙️ Pengaturan Situs</b> → grup “Chatbot”. Aktif/nonaktif juga dari sana.</p></div>';
    },
  };


  // ============ KONTEN LANDING: HARGA ============
  const PRICING_TIPES = {
    program: { label: 'Paket per Program (Kids / School / Academic)', cols: ['Paket', 'Pertemuan', 'Online', 'Private', 'Catatan'] },
    writing: { label: 'Writing (paket per program)', cols: ['Paket', 'Isi', 'Harga', '', ''] },
    final: { label: 'Final Project (paket per program)', cols: ['Paket', 'Isi', 'Harga', '', ''] },
    zona: { label: 'Zona Jarak Private', cols: ['Jarak', 'Tarif / Sesi', 'Paket 8×/bulan', '', ''] },
    jenjang: { label: 'Tarif per Jenjang (per sesi)', cols: ['Jenjang', '0–3 km', '3–6 km', '6–10 km', '10–15 km'] },
    online: { label: 'Paket Online per Jenjang', cols: ['Jenjang', '4×/bulan', '8×/bulan', '12×/bulan', ''] }
  };
  const PRICING_PROGRAM_KEYS = ['kids', 'sd', 'smp', 'sma', 'academic'];

  function pricingFieldHtml(tipe) {
    const cols = (PRICING_TIPES[tipe] || PRICING_TIPES.program).cols;
    return cols.map(function(c, i) {
      if (!c) return '';
      return '<div class="fg"><label>' + esc(c) + '</label><input id="pr-c' + (i + 1) + '"></div>';
    }).join('');
  }

  function openPricingModal(row) {
    row = row || null;
    const tipe = row ? row.tipe : 'program';
    modal((row ? '✏️ Edit' : '➕ Tambah') + ' Baris Harga',
      '<div class="frow">' +
        '<div class="fg"><label>Tipe Tabel</label><select id="pr-tipe"' + (row ? ' disabled' : '') + '>' +
          Object.keys(PRICING_TIPES).map(function(k) { return '<option value="' + k + '"' + (k === tipe ? ' selected' : '') + '>' + k + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="fg"><label>Grup (program)</label><input id="pr-grup" placeholder="kids / sd / smp / sma / academic / writing / final" value="' + esc(row ? row.grup : '') + '"></div>' +
      '</div>' +
      '<div id="pr-fields">' + pricingFieldHtml(tipe) + '</div>' +
      '<div class="frow"><div class="fg"><label>Urutan</label><input type="number" id="pr-urutan" value="' + (row ? (row.urutan || 0) : 0) + '"></div>' +
      '<div class="fg"><label>Status</label><select id="pr-status"><option' + ((!row || row.status === 'Aktif') ? ' selected' : '') + '>Aktif</option><option' + (row && row.status === 'Nonaktif' ? ' selected' : '') + '>Nonaktif</option></select></div></div>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="savePricing(' + (row ? "'" + esc(row.id) + "'" : 'null') + ')">💾 Simpan</button>');
    if (row) {
      ['c1', 'c2', 'c3', 'c4', 'c5'].forEach(function(k, i) {
        const el = $('pr-c' + (i + 1));
        if (el) el.value = row[k] || '';
      });
    }
    const sel = $('pr-tipe');
    if (sel && !row) sel.addEventListener('change', function() { $('pr-fields').innerHTML = pricingFieldHtml(sel.value); });
  }

  async function savePricing(id) {
    const data = {
      tipe: $('pr-tipe').value, grup: $('pr-grup').value.trim(),
      c1: ($('pr-c1') || {}).value || '', c2: ($('pr-c2') || {}).value || '', c3: ($('pr-c3') || {}).value || '',
      c4: ($('pr-c4') || {}).value || '', c5: ($('pr-c5') || {}).value || '',
      urutan: parseInt($('pr-urutan').value, 10) || 0, status: $('pr-status').value
    };
    try {
      const res = id ? await api('updatePricing', id, data) : await api('addPricing', data);
      if (!res.success) { toast(res.message, 'err'); return; }
      closeModal(); toast(res.message || 'Tersimpan', 'ok'); invalidateCache('pricing'); loadPage('pricing');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  function editPricing(id) { const row = (state.cache.pricing || []).find(r => String(r.id) === String(id)); if (row) openPricingModal(row); }
  async function delPricing(id) {
    if (!confirm('Hapus baris harga ini?')) return;
    try { const res = await api('deletePricing', id); toast(res.message || 'Terhapus', 'ok'); invalidateCache('pricing'); loadPage('pricing'); } catch (ex) { toast(ex.message, 'err'); }
  }

  // ============ KONTEN LANDING: BERITA ============
  function openNewsModal(row) {
    row = row || {};
    const d = row.tanggal ? new Date(row.tanggal).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    modal((row.id ? '✏️ Edit' : '➕ Tulis') + ' Berita',
      '<div class="fg"><label>Judul *</label><input id="n-judul" value="' + esc(row.judul || '') + '"></div>' +
      '<div class="frow"><div class="fg"><label>Tanggal</label><input type="date" id="n-tanggal" value="' + d + '"></div>' +
      '<div class="fg"><label>Status</label><select id="n-status"><option' + ((!row.status || row.status === 'Publikasi') ? ' selected' : '') + '>Publikasi</option><option' + (row.status === 'Draft' ? ' selected' : '') + '>Draft</option></select></div></div>' +
      '<div class="fg"><label>Ringkasan</label><textarea id="n-ringkasan" rows="2">' + esc(row.ringkasan || '') + '</textarea></div>' +
      '<div class="fg"><label>Isi Berita</label><textarea id="n-isi" rows="6">' + esc(row.isi || '') + '</textarea></div>' +
      uploadField('Cover Berita (opsional)', 'n-gambar', row.gambar, 'https://... atau klik Unggah',
        'Tampil sebagai thumbnail kartu berita di Beranda &amp; halaman Berita (sebaiknya rasio 16:9).'),
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="saveNews(' + (row.id ? "'" + esc(row.id) + "'" : 'null') + ')">💾 Simpan</button>');
    pratinjauGambar('n-gambar');
  }

  async function saveNews(id) {
    const data = { judul: $('n-judul').value.trim(), tanggal: $('n-tanggal').value, ringkasan: $('n-ringkasan').value, isi: $('n-isi').value, gambar: $('n-gambar').value.trim(), status: $('n-status').value };
    if (!data.judul) { toast('Judul wajib diisi.', 'err'); return; }
    try {
      const res = id ? await api('updateNews', id, data) : await api('addNews', data);
      if (!res.success) { toast(res.message, 'err'); return; }
      closeModal(); toast(res.message || 'Tersimpan', 'ok'); invalidateCache('news'); loadPage('news');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  function editNews(id) { const row = (state.cache.news || []).find(n => String(n.id) === String(id)); if (row) openNewsModal(row); }
  async function delNews(id) {
    if (!confirm('Hapus berita ini?')) return;
    try { const res = await api('deleteNews', id); toast(res.message || 'Terhapus', 'ok'); invalidateCache('news'); loadPage('news'); } catch (ex) { toast(ex.message, 'err'); }
  }

  // ============ KONTEN LANDING: BUKU ============
  function openBookModal(row) {
    row = row || {};
    const tipe = row.tipe || 'katalog';
    modal((row.id ? '✏️ Edit' : '➕ Tambah') + ' Buku',
      '<div class="frow"><div class="fg"><label>Tipe</label><select id="b-tipe"><option value="katalog"' + (tipe === 'katalog' ? ' selected' : '') + '>Katalog (unduhan)</option><option value="flipbook"' + (tipe === 'flipbook' ? ' selected' : '') + '>Flipbook (halaman)</option></select></div>' +
      '<div class="fg"><label>Urutan (bisa juga drag di daftar)</label><input type="number" id="b-urutan" value="' + (row.urutan || 0) + '"></div></div>' +
      '<div class="fg"><label>Judul *</label><input id="b-judul" value="' + esc(row.judul || '') + '"></div>' +
      '<div class="fg"><label>Deskripsi</label><textarea id="b-deskripsi" rows="2">' + esc(row.deskripsi || '') + '</textarea></div>' +
      '<div class="fg"><label>Isi (untuk flipbook)</label><textarea id="b-isi" rows="4">' + esc(row.isi || '') + '</textarea></div>' +
      '<div class="frow">' + uploadField('Cover Buku', 'b-cover', row.cover, 'https://... atau klik Unggah',
        'Tampil sebagai cover di katalog buku (tipe katalog) atau di halaman booklet (tipe flipbook).') +
      dokumenField('URL Link / Berkas', 'b-link', row.link, 'https://... atau unggah PDF/Word/Excel',
        'Dipakai tombol “Unduh / Baca” pada kartu katalog buku — bisa PDF, Word, Excel, atau PowerPoint (maks 10 MB). Badge jenis berkasnya tampil di kolom <b>Link</b> daftar buku.', row.berkas) + '</div>' +
      '<div class="fg"><label>Status</label><select id="b-status"><option' + ((!row.status || row.status === 'Aktif') ? ' selected' : '') + '>Aktif</option><option' + (row.status === 'Nonaktif' ? ' selected' : '') + '>Nonaktif</option></select></div>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="saveBook(' + (row.id ? "'" + esc(row.id) + "'" : 'null') + ')">💾 Simpan</button>');
    pratinjauGambar('b-cover');
    pratinjauDokumen('b-link');
  }

  async function saveBook(id) {
    const data = { tipe: $('b-tipe').value, judul: $('b-judul').value.trim(), deskripsi: $('b-deskripsi').value, isi: $('b-isi').value, cover: $('b-cover').value.trim(), link: $('b-link').value.trim(), urutan: parseInt($('b-urutan').value, 10) || 0, status: $('b-status').value, berkas: ($('b-link-nama') ? $('b-link-nama').value.trim() : '') };
    if (!data.judul) { toast('Judul wajib diisi.', 'err'); return; }
    try {
      const res = id ? await api('updateBook', id, data) : await api('addBook', data);
      if (!res.success) { toast(res.message, 'err'); return; }
      closeModal(); toast(res.message || 'Tersimpan', 'ok'); invalidateCache('books'); loadPage('books');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  function editBook(id) { const row = (state.cache.books || []).find(b => String(b.id) === String(id)); if (row) openBookModal(row); }
  async function delBook(id) {
    if (!confirm('Hapus buku ini?')) return;
    try { const res = await api('deleteBook', id); toast(res.message || 'Terhapus', 'ok'); invalidateCache('books'); loadPage('books'); } catch (ex) { toast(ex.message, 'err'); }
  }

  // ============ KONTEN LANDING: GALERI ============
  function openGalleryModal(row) {
    row = row || {};
    modal((row.id ? '✏️ Edit' : '➕ Tambah') + ' Foto Galeri',
      '<div class="fg"><label>Judul / Keterangan Foto *</label><input id="g-judul" value="' + esc(row.judul || '') + '"></div>' +
      uploadField('URL Gambar', 'g-gambar', row.gambar, 'https://... atau klik Unggah') +
      '<div class="fg"><label>Teks Pendek (untuk tampilan)</label><input id="g-ket" value="' + esc(row.keterangan || '') + '" placeholder="mis. Kelas Aksara Kids"></div>' +
      '<div class="frow"><div class="fg"><label>Ukuran di Mosaik</label><select id="g-ukuran"><option value="normal"' + (!row.ukuran || row.ukuran === 'normal' ? ' selected' : '') + '>Normal (1 kolom)</option><option value="wide"' + (row.ukuran === 'wide' ? ' selected' : '') + '>Lebar (2 kolom)</option></select></div>' +
      '<div class="fg"><label>Status</label><select id="g-status"><option' + ((!row.status || row.status === 'Aktif') ? ' selected' : '') + '>Aktif</option><option' + (row.status === 'Nonaktif' ? ' selected' : '') + '>Nonaktif</option></select></div></div>' +
      '<p style="font-size:.75rem;">Urutan foto diatur lewat drag / tombol ↑ ↓ pada daftar <b>Urutan Foto</b>.</p>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="saveGallery(' + (row.id ? "'" + esc(row.id) + "'" : 'null') + ')">💾 Simpan</button>');
    pratinjauGambar('g-gambar');
  }

  async function saveGallery(id) {
    const data = {
      judul: $('g-judul').value.trim(), gambar: $('g-gambar').value.trim(), keterangan: $('g-ket').value.trim(),
      ukuran: $('g-ukuran').value, status: $('g-status').value
    };
    if (!data.judul) { toast('Judul/keterangan foto wajib diisi.', 'err'); return; }
    try {
      const res = id ? await api('updateGallery', id, data) : await api('addGallery', data);
      if (!res.success) { toast(res.message, 'err'); return; }
      closeModal(); toast(res.message || 'Tersimpan', 'ok'); invalidateCache('gallery'); loadPage('gallery');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  function editGallery(id) { const row = (state.cache.gallery || []).find(g => String(g.id) === String(id)); if (row) openGalleryModal(row); }
  async function delGallery(id) {
    if (!confirm('Hapus foto galeri ini?')) return;
    try { const res = await api('deleteGallery', id); toast(res.message || 'Terhapus', 'ok'); invalidateCache('gallery'); loadPage('gallery'); } catch (ex) { toast(ex.message, 'err'); }
  }

  // ============ KONTEN LANDING: MITRA ============
  function openPartnerModal(row) {
    row = row || {};
    modal((row.id ? '✏️ Edit' : '➕ Tambah') + ' Mitra',
      '<div class="fg"><label>Nama Mitra *</label><input id="m-nama" value="' + esc(row.nama || '') + '" placeholder="mis. SMP Mitra / Nama Sekolah"></div>' +
      uploadField('URL Logo (opsional)', 'm-logo', row.logo, 'https://... (bila kosong memakai ikon)') +
      '<div class="fg"><label>Kelas Ikon Font Awesome</label><input id="m-ikon" value="' + esc(row.ikon || 'fa-solid fa-school') + '" placeholder="fa-solid fa-school"></div>' +
      '<div class="fg"><label>Status</label><select id="m-status"><option' + ((!row.status || row.status === 'Aktif') ? ' selected' : '') + '>Aktif</option><option' + (row.status === 'Nonaktif' ? ' selected' : '') + '>Nonaktif</option></select></div>' +
      '<p style="font-size:.75rem;">Ikon dipakai bila URL logo kosong. Urutan diatur lewat drag / tombol ↑ ↓ pada daftar <b>Urutan Logo Mitra</b>.</p>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="savePartner(' + (row.id ? "'" + esc(row.id) + "'" : 'null') + ')">💾 Simpan</button>');
    pratinjauGambar('m-logo');
  }

  async function savePartner(id) {
    const data = { nama: $('m-nama').value.trim(), logo: $('m-logo').value.trim(), ikon: $('m-ikon').value.trim(), status: $('m-status').value };
    if (!data.nama) { toast('Nama mitra wajib diisi.', 'err'); return; }
    try {
      const res = id ? await api('updatePartner', id, data) : await api('addPartner', data);
      if (!res.success) { toast(res.message, 'err'); return; }
      closeModal(); toast(res.message || 'Tersimpan', 'ok'); invalidateCache('partners'); loadPage('partners');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  function editPartner(id) { const row = (state.cache.partners || []).find(p => String(p.id) === String(id)); if (row) openPartnerModal(row); }
  async function delPartner(id) {
    if (!confirm('Hapus mitra ini?')) return;
    try { const res = await api('deletePartner', id); toast(res.message || 'Terhapus', 'ok'); invalidateCache('partners'); loadPage('partners'); } catch (ex) { toast(ex.message, 'err'); }
  }

  // ============ KONTEN LANDING: TESTIMONI & FAQ ============
  function openTestimoniModal(row) {
    row = row || {};
    modal((row.id ? '✏️ Edit' : '➕ Tambah') + ' Testimoni',
      '<div class="frow"><div class="fg"><label>Nama *</label><input id="t-nama" value="' + esc(row.nama || '') + '" placeholder="mis. Sari A."></div>' +
      '<div class="fg"><label>Keterangan / Peran</label><input id="t-peran" value="' + esc(row.peran || '') + '" placeholder="mis. Orang Tua Aksara Kids"></div></div>' +
      '<div class="fg"><label>Isi Testimoni *</label><textarea id="t-isi" rows="4" placeholder="1–3 kalimat">' + esc(row.isi || '') + '</textarea></div>' +
      '<div class="frow"><div class="fg"><label>Bintang (1–5)</label><input type="number" min="1" max="5" id="t-bintang" value="' + (row.bintang || 5) + '"></div>' +
      '<div class="fg"><label>Status</label><select id="t-status"><option' + ((!row.status || row.status === 'Aktif') ? ' selected' : '') + '>Aktif</option><option' + (row.status === 'Nonaktif' ? ' selected' : '') + '>Nonaktif</option></select></div></div>' +
      '<p style="font-size:.75rem;">Urutan diatur lewat drag / tombol ↑ ↓ pada daftar <b>Urutan Testimoni</b>.</p>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="saveTestimoni(' + (row.id ? "'" + esc(row.id) + "'" : 'null') + ')">💾 Simpan</button>');
  }

  async function saveTestimoni(id) {
    const data = {
      nama: $('t-nama').value.trim(), peran: $('t-peran').value.trim(), isi: $('t-isi').value.trim(),
      bintang: parseInt($('t-bintang').value, 10) || 5, status: $('t-status').value
    };
    if (!data.nama || !data.isi) { toast('Nama dan isi testimoni wajib diisi.', 'err'); return; }
    try {
      const res = id ? await api('updateTestimoni', id, data) : await api('addTestimoni', data);
      if (!res.success) { toast(res.message, 'err'); return; }
      closeModal(); toast(res.message || 'Tersimpan', 'ok'); invalidateCache('testimoni'); loadPage('testimoni');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  function editTestimoni(id) { const row = (state.cache.testimoni || []).find(t => String(t.id) === String(id)); if (row) openTestimoniModal(row); }
  async function delTestimoni(id) {
    if (!confirm('Hapus testimoni ini?')) return;
    try { const res = await api('deleteTestimoni', id); toast(res.message || 'Terhapus', 'ok'); invalidateCache('testimoni'); loadPage('testimoni'); } catch (ex) { toast(ex.message, 'err'); }
  }

  function openFaqModal(row) {
    row = row || {};
    modal((row.id ? '✏️ Edit' : '➕ Tambah') + ' FAQ',
      '<div class="fg"><label>Pertanyaan *</label><input id="f-tanya" value="' + esc(row.pertanyaan || '') + '"></div>' +
      '<div class="fg"><label>Jawaban</label><textarea id="f-jawab" rows="5">' + esc(row.jawaban || '') + '</textarea></div>' +
      '<div class="fg"><label>Status</label><select id="f-status"><option' + ((!row.status || row.status === 'Aktif') ? ' selected' : '') + '>Aktif</option><option' + (row.status === 'Nonaktif' ? ' selected' : '') + '>Nonaktif</option></select></div>' +
      '<p style="font-size:.75rem;">Urutan diatur lewat drag / tombol ↑ ↓ pada daftar <b>Urutan FAQ</b>.</p>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="saveFaq(' + (row.id ? "'" + esc(row.id) + "'" : 'null') + ')">💾 Simpan</button>');
  }

  async function saveFaq(id) {
    const data = { pertanyaan: $('f-tanya').value.trim(), jawaban: $('f-jawab').value.trim(), status: $('f-status').value };
    if (!data.pertanyaan) { toast('Pertanyaan wajib diisi.', 'err'); return; }
    try {
      const res = id ? await api('updateFaq', id, data) : await api('addFaq', data);
      if (!res.success) { toast(res.message, 'err'); return; }
      closeModal(); toast(res.message || 'Tersimpan', 'ok'); invalidateCache('faq'); loadPage('faq');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  function editFaq(id) { const row = (state.cache.faq || []).find(f => String(f.id) === String(id)); if (row) openFaqModal(row); }
  async function delFaq(id) {
    if (!confirm('Hapus FAQ ini?')) return;
    try { const res = await api('deleteFaq', id); toast(res.message || 'Terhapus', 'ok'); invalidateCache('faq'); loadPage('faq'); } catch (ex) { toast(ex.message, 'err'); }
  }

  // ============ PROGRAM / KURIKULUM / KARTU INFO / PENGATURAN SITUS ============
  const PROGRAM_GRUP = ['utama', 'tambahan'];
  const KURIKULUM_TABS = ['kids', 'school', 'academic', 'writing', 'final'];
  const KARTU_SEKSI = ['layanan', 'alur', 'jenjang'];

  // Daftar bidang yang bisa diatur di halaman ⚙️ Pengaturan Situs — dikelompokkan
  // agar puluhan field tetap rapi. `grup` = judul kartu, `baris` = sebaran grid.
  const SETTING_FIELDS = [
    // --- HERO ---
    { k: 'hero_badge', label: 'Badge Hero', grup: 'Halo & Hero', hint: 'Teks kecil di atas judul Beranda.' },
    { k: 'hero_judul', label: 'Bagian Kedua Judul Hero', grup: 'Halo & Hero', hint: 'Bagian yang dicetak miring berwarna (setelah “Dari Dasar”).' },
    { k: 'hero_sub', label: 'Sub-judul Hero', area: true, grup: 'Halo & Hero' },
    { k: 'trust1_nilai', label: 'Statistik 1 — Angka', grup: 'Halo & Hero', kecil: true },
    { k: 'trust1_label', label: 'Statistik 1 — Keterangan', grup: 'Halo & Hero', kecil: true },
    { k: 'trust2_nilai', label: 'Statistik 2 — Angka', grup: 'Halo & Hero', kecil: true },
    { k: 'trust2_label', label: 'Statistik 2 — Keterangan', grup: 'Halo & Hero', kecil: true },
    { k: 'trust3_nilai', label: 'Statistik 3 — Angka', grup: 'Halo & Hero', kecil: true },
    { k: 'trust3_label', label: 'Statistik 3 — Keterangan', grup: 'Halo & Hero', kecil: true },
    { k: 'stat1_nilai', label: 'Pita Statistik 1 — Angka', grup: 'Halo & Hero', kecil: true, hint: 'Contoh: 500+ atau 98%. Angka murni akan dianimasikan menghitung naik.' },
    { k: 'stat1_label', label: 'Pita Statistik 1 — Keterangan', grup: 'Halo & Hero', kecil: true },
    { k: 'stat2_nilai', label: 'Pita Statistik 2 — Angka', grup: 'Halo & Hero', kecil: true },
    { k: 'stat2_label', label: 'Pita Statistik 2 — Keterangan', grup: 'Halo & Hero', kecil: true },
    { k: 'stat3_nilai', label: 'Pita Statistik 3 — Angka', grup: 'Halo & Hero', kecil: true },
    { k: 'stat3_label', label: 'Pita Statistik 3 — Keterangan', grup: 'Halo & Hero', kecil: true },
    { k: 'stat4_nilai', label: 'Pita Statistik 4 — Angka', grup: 'Halo & Hero', kecil: true },
    { k: 'stat4_label', label: 'Pita Statistik 4 — Keterangan', grup: 'Halo & Hero', kecil: true },
    // --- JUDUL SEKSI ---
    { k: 'seksi_unggulan_judul', label: 'Mengapa Aksara — Judul', grup: 'Judul & Sub-judul Seksi', area: true },
    { k: 'seksi_program_judul', label: 'Program — Judul', grup: 'Judul & Sub-judul Seksi' },
    { k: 'seksi_program_sub', label: 'Program — Sub-judul', grup: 'Judul & Sub-judul Seksi', area: true },
    { k: 'seksi_kurikulum_judul', label: 'Kurikulum — Judul', grup: 'Judul & Sub-judul Seksi' },
    { k: 'seksi_kurikulum_sub', label: 'Kurikulum — Sub-judul', grup: 'Judul & Sub-judul Seksi', area: true },
    { k: 'seksi_harga_judul', label: 'Harga — Judul', grup: 'Judul & Sub-judul Seksi' },
    { k: 'seksi_harga_sub', label: 'Harga — Sub-judul', grup: 'Judul & Sub-judul Seksi', area: true },
    { k: 'seksi_paket_judul', label: 'Paket Populer — Judul', grup: 'Judul & Sub-judul Seksi' },
    { k: 'seksi_paket_sub', label: 'Paket Populer — Sub-judul', grup: 'Judul & Sub-judul Seksi', area: true },
    { k: 'seksi_buku_judul', label: 'Buku Panduan — Judul', grup: 'Judul & Sub-judul Seksi' },
    { k: 'seksi_buku_sub', label: 'Buku Panduan — Sub-judul', grup: 'Judul & Sub-judul Seksi', area: true },
    { k: 'seksi_katalog_judul', label: 'Katalog Buku — Judul', grup: 'Judul & Sub-judul Seksi' },
    { k: 'seksi_layanan_judul', label: 'Layanan & Fasilitas — Judul', grup: 'Judul & Sub-judul Seksi' },
    { k: 'seksi_layanan_sub', label: 'Layanan & Fasilitas — Sub-judul', grup: 'Judul & Sub-judul Seksi', area: true },
    { k: 'seksi_alur_judul', label: 'Alur Belajar — Judul', grup: 'Judul & Sub-judul Seksi' },
    { k: 'seksi_alur_sub', label: 'Alur Belajar — Sub-judul', grup: 'Judul & Sub-judul Seksi', area: true },
    { k: 'seksi_jenjang_judul', label: 'Jenjang Dilayani — Judul', grup: 'Judul & Sub-judul Seksi' },
    { k: 'seksi_jenjang_sub', label: 'Jenjang Dilayani — Sub-judul', grup: 'Judul & Sub-judul Seksi', area: true },
    { k: 'seksi_galeri_judul', label: 'Galeri — Judul', grup: 'Judul & Sub-judul Seksi' },
    { k: 'seksi_galeri_sub', label: 'Galeri — Sub-judul', grup: 'Judul & Sub-judul Seksi', area: true },
    { k: 'seksi_mitra_judul', label: 'Mitra — Judul Strip', grup: 'Judul & Sub-judul Seksi' },
    { k: 'seksi_testimoni_judul', label: 'Testimoni — Judul', grup: 'Judul & Sub-judul Seksi' },
    { k: 'seksi_berita_judul', label: 'Berita Beranda — Judul', grup: 'Judul & Sub-judul Seksi' },
    { k: 'seksi_berita_page_judul', label: 'Halaman Berita — Judul', grup: 'Judul & Sub-judul Seksi' },
    { k: 'seksi_berita_page_sub', label: 'Halaman Berita — Sub-judul', grup: 'Judul & Sub-judul Seksi', area: true },
    { k: 'seksi_faq_judul', label: 'FAQ — Judul', grup: 'Judul & Sub-judul Seksi' },
    { k: 'seksi_faq_sub', label: 'FAQ — Sub-judul', grup: 'Judul & Sub-judul Seksi', area: true },
    { k: 'seksi_daftar_judul', label: 'Form Pendaftaran — Judul', grup: 'Judul & Sub-judul Seksi' },
    // --- KONTAK & CTA ---
    { k: 'wa_nomor', label: 'Nomor WhatsApp', grup: 'Kontak & Ajakan (CTA)', hint: 'Format internasional tanpa +, contoh: 62812xxxxxxx. Dipakai untuk semua tombol WhatsApp.' },
    { k: 'email', label: 'Email', grup: 'Kontak & Ajakan (CTA)' },
    { k: 'telepon', label: 'Telepon (tampilan)', grup: 'Kontak & Ajakan (CTA)' },
    { k: 'alamat', label: 'Alamat / Area Layanan', area: true, grup: 'Kontak & Ajakan (CTA)' },
    { k: 'jam_operasional', label: 'Jam Operasional', grup: 'Kontak & Ajakan (CTA)' },
    { k: 'cta_judul', label: 'Judul Ajakan (CTA)', grup: 'Kontak & Ajakan (CTA)' },
    { k: 'cta_teks', label: 'Teks Ajakan (CTA)', area: true, grup: 'Kontak & Ajakan (CTA)' },
    { k: 'footer_tagline', label: 'Tagline Footer', area: true, grup: 'Kontak & Ajakan (CTA)' },
    // --- CHATBOT ---
    { k: 'chatbot_aktif', label: 'Chatbot', grup: 'Chatbot “Tanya Aksara”', pilih: ['Aktif', 'Nonaktif'], hint: 'Nonaktif → tombol chat hilang dari landing (kunci API tetap tersimpan).' },
    { k: 'chatbot_nama', label: 'Nama Asisten', grup: 'Chatbot “Tanya Aksara”' },
    { k: 'chatbot_sapaan', label: 'Sapaan Pembuka', area: true, grup: 'Chatbot “Tanya Aksara”' },
    { k: 'chatbot_placeholder', label: 'Teks Kolom Ketik', grup: 'Chatbot “Tanya Aksara”' },
    { k: 'chatbot_catatan', label: 'Catatan Kaki Chat', area: true, grup: 'Chatbot “Tanya Aksara”' },
    { k: 'chatbot_saran', label: 'Saran Pertanyaan (pisah dengan |)', area: true, grup: 'Chatbot “Tanya Aksara”', hint: 'Maksimal 4 chip, contoh: Harga paket bulanan|Cara mendaftar' }
  ];

  const opsiSelect = (daftar, terpilih) => daftar.map(v =>
    '<option value="' + esc(v) + '"' + (v === terpilih ? ' selected' : '') + '>' + esc(v) + '</option>').join('');

  // ---------- PROGRAM ----------
  function openProgramModal(row) {
    row = row || {};
    modal((row.id ? '✏️ Edit' : '➕ Tambah') + ' Program',
      '<div class="frow">' +
        '<div class="fg"><label>Nama Program *</label><input id="pg-judul" value="' + esc(row.judul || '') + '"></div>' +
        '<div class="fg"><label>Label / Jenjang</label><input id="pg-tag" placeholder="TK – SD / SD – SMA / Mahasiswa" value="' + esc(row.tag || '') + '"></div>' +
      '</div>' +
      '<div class="frow">' +
        '<div class="fg"><label>Kelas Ikon (Font Awesome)</label><input id="pg-ikon" placeholder="fa-solid fa-book" value="' + esc(row.ikon || '') + '"></div>' +
        '<div class="fg"><label>Grup Tampilan</label><select id="pg-grup">' + opsiSelect(PROGRAM_GRUP, row.grup === 'tambahan' ? 'tambahan' : 'utama') + '</select></div>' +
      '</div>' +
      '<div class="fg"><label>Ringkasan</label><textarea id="pg-ringkasan" rows="3">' + esc(row.ringkasan || '') + '</textarea></div>' +
      '<div class="fg"><label>Poin Keunggulan</label><textarea id="pg-poin" rows="4" placeholder="Satu poin per baris">' + esc(row.poin || '') + '</textarea></div>' +
      '<div class="frow">' +
        '<div class="fg"><label>Durasi</label><input id="pg-durasi" placeholder="60 menit / sesi" value="' + esc(row.durasi || '') + '"></div>' +
        '<div class="fg"><label>Mode Kelas</label><input id="pg-mode" placeholder="Privat / kecil" value="' + esc(row.mode || '') + '"></div>' +
      '</div>' +
      '<div class="frow">' +
        '<div class="fg"><label>Urutan</label><input type="number" id="pg-urutan" value="' + (row.urutan || 0) + '"></div>' +
        '<div class="fg"><label>Status</label><select id="pg-status">' + opsiSelect(['Aktif', 'Nonaktif'], row.status || 'Aktif') + '</select></div>' +
      '</div>' +
      '<p style="font-size:.75rem;">Urutan juga bisa diubah lewat kartu drag / tombol ↑ ↓ di daftar.</p>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="saveProgram(' + (row.id ? "'" + esc(row.id) + "'" : 'null') + ')">💾 Simpan</button>');
  }

  async function saveProgram(id) {
    const data = {
      judul: $('pg-judul').value.trim(),
      tag: $('pg-tag').value.trim(),
      ikon: $('pg-ikon').value.trim(),
      grup: $('pg-grup').value,
      ringkasan: $('pg-ringkasan').value.trim(),
      poin: $('pg-poin').value.split('\n').map(s => s.trim()).filter(Boolean).join(' | '),
      durasi: $('pg-durasi').value.trim(),
      mode: $('pg-mode').value.trim(),
      urutan: Number($('pg-urutan').value) || 0,
      status: $('pg-status').value
    };
    if (!data.judul) { toast('Nama program wajib diisi.', 'err'); return; }
    try {
      const res = id ? await api('updateProgram', id, data) : await api('addProgram', data);
      if (!res.success) { toast(res.message, 'err'); return; }
      closeModal(); toast(res.message || 'Tersimpan', 'ok'); invalidateCache('program'); loadPage('program');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  function editProgram(id) { const row = (state.cache.program || []).find(p => String(p.id) === String(id)); if (row) openProgramModal(row); }
  async function delProgram(id) {
    if (!confirm('Hapus program ini?')) return;
    try { const res = await api('deleteProgram', id); toast(res.message || 'Terhapus', 'ok'); invalidateCache('program'); loadPage('program'); } catch (ex) { toast(ex.message, 'err'); }
  }

  // ---------- KURIKULUM ----------
  function openKurModal(row) {
    row = row || {};
    modal((row.id ? '✏️ Edit' : '➕ Tambah') + ' Kurikulum',
      '<div class="frow">' +
        '<div class="fg"><label>Tab</label><select id="kr-tab">' + opsiSelect(KURIKULUM_TABS, row.tab || 'kids') + '</select></div>' +
        '<div class="fg"><label>Judul *</label><input id="kr-judul" value="' + esc(row.judul || '') + '"></div>' +
      '</div>' +
      '<div class="fg"><label>Kelas Ikon (Font Awesome)</label><input id="kr-ikon" placeholder="fa-solid fa-book" value="' + esc(row.ikon || '') + '"></div>' +
      '<div class="fg"><label>Ringkasan</label><textarea id="kr-ringkasan" rows="2">' + esc(row.ringkasan || '') + '</textarea></div>' +
      '<div class="fg"><label>Alur Materi</label><textarea id="kr-alur" rows="4" placeholder="Satu tahap per baris">' + esc(row.alur || '') + '</textarea></div>' +
      '<div class="fg"><label>Capaian</label><textarea id="kr-capaian" rows="3" placeholder="Satu capaian per baris">' + esc(row.capaian || '') + '</textarea></div>' +
      '<div class="fg"><label>Catatan</label><textarea id="kr-catatan" rows="2">' + esc(row.catatan || '') + '</textarea></div>' +
      '<div class="frow">' +
        '<div class="fg"><label>Urutan</label><input type="number" id="kr-urutan" value="' + (row.urutan || 0) + '"></div>' +
        '<div class="fg"><label>Status</label><select id="kr-status">' + opsiSelect(['Aktif', 'Nonaktif'], row.status || 'Aktif') + '</select></div>' +
      '</div>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="saveKurikulum(' + (row.id ? "'" + esc(row.id) + "'" : 'null') + ')">💾 Simpan</button>');
  }

  const rapikanBaris = (teks) => String(teks || '').split('\n').map(s => s.trim()).filter(Boolean).join(' | ');

  async function saveKurikulum(id) {
    const data = {
      tab: $('kr-tab').value,
      judul: $('kr-judul').value.trim(),
      ikon: $('kr-ikon').value.trim(),
      ringkasan: $('kr-ringkasan').value.trim(),
      alur: rapikanBaris($('kr-alur').value),
      capaian: rapikanBaris($('kr-capaian').value),
      catatan: $('kr-catatan').value.trim(),
      urutan: Number($('kr-urutan').value) || 0,
      status: $('kr-status').value
    };
    if (!data.judul) { toast('Judul kurikulum wajib diisi.', 'err'); return; }
    try {
      const res = id ? await api('updateKurikulum', id, data) : await api('addKurikulum', data);
      if (!res.success) { toast(res.message, 'err'); return; }
      closeModal(); toast(res.message || 'Tersimpan', 'ok'); invalidateCache('kurikulum'); loadPage('kurikulum');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  function editKurikulum(id) { const row = (state.cache.kurikulum || []).find(k => String(k.id) === String(id)); if (row) openKurModal(row); }
  async function delKurikulum(id) {
    if (!confirm('Hapus kurikulum ini?')) return;
    try { const res = await api('deleteKurikulum', id); toast(res.message || 'Terhapus', 'ok'); invalidateCache('kurikulum'); loadPage('kurikulum'); } catch (ex) { toast(ex.message, 'err'); }
  }

  // ---------- KARTU INFO ----------
  const SEKSI_LABEL = { layanan: 'Layanan & Fasilitas', alur: 'Alur Belajar', jenjang: 'Jenjang Dilayani' };

  function openKartuModal(row) {
    row = row || {};
    const seksi = row.seksi || 'layanan';
    modal((row.id ? '✏️ Edit' : '➕ Tambah') + ' Kartu Info',
      '<div class="frow">' +
        '<div class="fg"><label>Bagian (Seksi)</label><select id="kt-seksi">' +
          KARTU_SEKSI.map(v => '<option value="' + esc(v) + '"' + (v === seksi ? ' selected' : '') + '>' + esc(SEKSI_LABEL[v]) + '</option>').join('') +
        '</select></div>' +
        '<div class="fg"><label>Judul *</label><input id="kt-judul" value="' + esc(row.judul || '') + '"></div>' +
      '</div>' +
      '<div class="fg"><label>Ikon</label><input id="kt-ikon" placeholder="fa-solid fa-laptop atau emoji 🧸" value="' + esc(row.ikon || '') + '">' +
        '<p style="font-size:.7rem; opacity:.75; margin-top:6px;">Kartu <b>Alur Belajar</b> tidak memakai ikon (nomornya otomatis) — boleh dikosongkan.</p></div>' +
      '<div class="fg"><label>Teks</label><textarea id="kt-teks" rows="3">' + esc(row.teks || '') + '</textarea></div>' +
      '<div class="fg"><label>Meta (khusus kartu jenjang)</label><input id="kt-meta" placeholder="60 menit / sesi" value="' + esc(row.meta || '') + '"></div>' +
      '<div class="frow">' +
        '<div class="fg"><label>Urutan dalam seksi</label><input type="number" id="kt-urutan" value="' + (row.urutan || 0) + '"></div>' +
        '<div class="fg"><label>Status</label><select id="kt-status">' + opsiSelect(['Aktif', 'Nonaktif'], row.status || 'Aktif') + '</select></div>' +
      '</div>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="saveKartu(' + (row.id ? "'" + esc(row.id) + "'" : 'null') + ')">💾 Simpan</button>');
  }

  async function saveKartu(id) {
    const data = {
      seksi: $('kt-seksi').value,
      judul: $('kt-judul').value.trim(),
      ikon: $('kt-ikon').value.trim(),
      teks: $('kt-teks').value.trim(),
      meta: $('kt-meta').value.trim(),
      urutan: Number($('kt-urutan').value) || 0,
      status: $('kt-status').value
    };
    if (!data.judul) { toast('Judul kartu wajib diisi.', 'err'); return; }
    try {
      const res = id ? await api('updateKartu', id, data) : await api('addKartu', data);
      if (!res.success) { toast(res.message, 'err'); return; }
      closeModal(); toast(res.message || 'Tersimpan', 'ok'); invalidateCache('kartu'); loadPage('kartu');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  function editKartu(id) { const row = (state.cache.kartu || []).find(k => String(k.id) === String(id)); if (row) openKartuModal(row); }
  async function delKartu(id) {
    if (!confirm('Hapus kartu ini?')) return;
    try { const res = await api('deleteKartu', id); toast(res.message || 'Terhapus', 'ok'); invalidateCache('kartu'); loadPage('kartu'); } catch (ex) { toast(ex.message, 'err'); }
  }

  // ---------- PENGATURAN SITUS ----------
  async function saveSettingsPage() {
    const nilai = {};
    SETTING_FIELDS.forEach(function (f) {
      const el = $('set-' + f.k);
      if (el) nilai[f.k] = el.value.trim();
    });
    if (nilai.wa_nomor) {
      nilai.wa_nomor = nilai.wa_nomor.replace(/[^\d]/g, '');
      if (nilai.wa_nomor.indexOf('0') === 0) nilai.wa_nomor = '62' + nilai.wa_nomor.substring(1);
    }
    try {
      const res = await api('saveSiteSettings', { nilai: nilai });
      if (!res || !res.success) { toast((res && res.message) || 'Gagal menyimpan.', 'err'); return; }
      toast(res.message || 'Pengaturan disimpan.', 'ok');
      invalidateCache('situs');
      state.cache.situs = nilai;        // tampilkan nilai terbaru tanpa menunggu server
      state.cacheTime.situs = Date.now();
      loadPage('situs');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  // ============ CHATBOT: SIMPAN / HAPUS KUNCI API ============
  async function simpanKunciChat() {
    const kunci = ($('chat-kunci') || {}).value || '';
    if (!kunci.trim()) { toast('Tuliskan kunci API-nya dulu ya.', 'err'); return; }
    try {
      const res = await api('saveChatApiKey', { kunci: kunci.trim() });
      if (!res || !res.success) { toast((res && res.message) || 'Gagal menyimpan kunci.', 'err'); return; }
      toast(res.message || 'Kunci API tersimpan di server.', 'ok');
      invalidateCache('chatbot'); loadPage('chatbot');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  async function hapusKunciChat() {
    if (!confirm('Hapus kunci API chatbot? Chatbot berhenti melayani sampai kunci diisi kembali.')) return;
    try {
      const res = await api('hapusChatApiKey');
      toast(res.message || 'Kunci dihapus.', res && res.success ? 'ok' : 'err');
      invalidateCache('chatbot'); loadPage('chatbot');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  // ============ PENGURUT KONTEN (DRAG & TOMBOL) ============
  // Urutan = kolom "Urutan" pada sheet Buku/Galeri/Mitra. Hanya baris yang
  // benar-benar berpindah yang ditulis (lihat reorderRows_ di Code.gs).
  const SORTER = {
    books: { fn: 'reorderBooks', tipe: 'flipbook' },
    gallery: { fn: 'reorderGallery' },
    partners: { fn: 'reorderPartners' },
    testimoni: { fn: 'reorderTestimoni' },
    faq: { fn: 'reorderFaq' },
    program: { fn: 'reorderProgram' },
    kurikulum: { fn: 'reorderKurikulum' },
    kartu: { fn: 'reorderKartu' }
  };

  function sortIds(kind) {
    const def = SORTER[kind];
    if (!def) return [];
    const rows = state.cache[kind] || [];
    const isi = def.tipe ? rows.filter(r => r.tipe === def.tipe) : rows;
    return urutkanBy(isi).map(r => r.id);
  }

  async function commitOrder(kind, ids) {
    const def = SORTER[kind];
    if (!def || !ids || !ids.length || ids.join('|') === sortIds(kind).join('|')) return;
    try {
      const res = await api(def.fn, ids);
      if (!res || !res.success) toast((res && res.message) || 'Gagal menyimpan urutan.', 'err');
      else toast(res.message || 'Urutan tersimpan.', 'ok');
    } catch (ex) { toast(ex.message, 'err'); }
    invalidateCache(kind);
    loadPage(kind);
  }

  function moveItem(kind, id, arah) {
    const ids = sortIds(kind);
    const i = ids.indexOf(id), j = i + arah;
    if (i === -1 || j < 0 || j >= ids.length) return;
    ids.splice(j, 0, ids.splice(i, 1)[0]);
    commitOrder(kind, ids);
  }

  // Drag & drop: pindahkan kartu di DOM, simpan saat dijatuhkan.
  let dragId = null;

  function clearDragMarks_() {
    const dragging = document.querySelector('.sort-item.dragging');
    if (dragging) dragging.classList.remove('dragging');
    Array.prototype.forEach.call(document.querySelectorAll('.sort-item.over'), el => el.classList.remove('over'));
  }

  function simpanUrutanDom_() {
    clearDragMarks_();
    if (!dragId) return;
    dragId = null;
    const kartu = document.querySelector('.sort-item');
    const list = kartu ? kartu.parentNode : null;
    if (!list || !list.dataset || !list.dataset.sort) return;
    const ids = Array.prototype.map.call(list.querySelectorAll('.sort-item'), el => el.dataset.id);
    commitOrder(list.dataset.sort, ids); // sukses → render ulang dari server
  }

  document.addEventListener('DOMContentLoaded', function() {
    const box = $('page');
    if (!box) return;
    box.addEventListener('dragstart', function(e) {
      const item = e.target.closest('.sort-item');
      if (!item) return;
      dragId = item.dataset.id;
      item.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', dragId); } catch (err) { /* browser lama */ }
      }
    });
    box.addEventListener('dragover', function(e) {
      const item = e.target.closest('.sort-item');
      const dragging = box.querySelector('.sort-item.dragging');
      if (!item || !dragging || item === dragging) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      const rect = item.getBoundingClientRect();
      const setelah = (e.clientY - rect.top) > rect.height / 2;
      item.parentNode.insertBefore(dragging, setelah ? item.nextSibling : item);
      Array.prototype.forEach.call(box.querySelectorAll('.sort-item.over'), el => el.classList.remove('over'));
      item.classList.add('over');
    });
    box.addEventListener('drop', function(e) { e.preventDefault(); simpanUrutanDom_(); });
    box.addEventListener('dragend', simpanUrutanDom_);
  });

  export { savePricing, saveNews, saveBook, saveGallery, savePartner, saveTestimoni,
    saveFaq, saveProgram, saveKurikulum, saveKartu };
  export const actions = {
    'add-pricing': function () { openPricingModal(null); },
    'edit-pricing': function (id) { editPricing(id); },
    'del-pricing': function (id) { delPricing(id); },
    'add-news': function () { openNewsModal(null); },
    'edit-news': function (id) { editNews(id); },
    'del-news': function (id) { delNews(id); },
    'add-book': function () { openBookModal(null); },
    'edit-book': function (id) { editBook(id); },
    'del-book': function (id) { delBook(id); },
    'add-gallery': function () { openGalleryModal(null); },
    'edit-gallery': function (id) { editGallery(id); },
    'del-gallery': function (id) { delGallery(id); },
    'add-partner': function () { openPartnerModal(null); },
    'edit-partner': function (id) { editPartner(id); },
    'del-partner': function (id) { delPartner(id); },
    'add-testimoni': function () { openTestimoniModal(null); },
    'edit-testimoni': function (id) { editTestimoni(id); },
    'del-testimoni': function (id) { delTestimoni(id); },
    'add-faq': function () { openFaqModal(null); },
    'edit-faq': function (id) { editFaq(id); },
    'del-faq': function (id) { delFaq(id); },
    'add-program': function () { openProgramModal(null); },
    'edit-program': function (id) { editProgram(id); },
    'del-program': function (id) { delProgram(id); },
    'add-kurikulum': function () { openKurModal(null); },
    'edit-kurikulum': function (id) { editKurikulum(id); },
    'del-kurikulum': function (id) { delKurikulum(id); },
    'add-kartu': function () { openKartuModal(null); },
    'edit-kartu': function (id) { editKartu(id); },
    'del-kartu': function (id) { delKartu(id); },
    'sort-up': function (id, name, extra) { moveItem(extra, id, -1); },
    'sort-down': function (id, name, extra) { moveItem(extra, id, 1); },
    'save-settings': function () { saveSettingsPage(); },
    'chat-simpan-kunci': function () { simpanKunciChat(); },
    'chat-hapus-kunci': function () { hapusKunciChat(); }
  };
