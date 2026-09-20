// ==================== KONTEN DINAMIS — KATALOG BUKU (Gaya Perbukuan) ====================
// Meniru pola portal perbukuan (SIBI): katalog dengan pencarian, filter kategori
// & jenjang, pengurutan, grid kartu buku, halaman detail (metadata daftar
// pustaka), lalu pembaca halaman + tombol unduh.
import { cTxt, cEsc, byUrutan, elById, tampilkan } from './util.js';
import { buatFlipbook } from '../../shared/flipbook.js';

// Jenis berkas unduhan dari nama berkas hasil unggahan admin (kolom "Berkas"),
// atau dari ekstensi pada URL yang ditempel.
function jenisKatalog(b) {
  const peta = {
    pdf: 'PDF', doc: 'Word', docx: 'Word', xls: 'Excel', xlsx: 'Excel', ppt: 'PowerPoint', pptx: 'PowerPoint'
  };
  const ekstensi = function (teks) {
    const m = /\.([A-Za-z0-9]{2,4})(?:$|[?#])/.exec(cTxt(teks));
    return m ? m[1].toLowerCase() : '';
  };
  return peta[ekstensi(b.berkas) || ekstensi(b.link)] || '';
}

// Baris metadata gaya daftar pustaka: "Penulis · Penerbit · Tahun".
function barisPustaka(b) {
  return [b.penulis, b.penerbit, b.tahun]
    .map(cTxt).map(function (v) { return v.trim(); }).filter(Boolean).join(' · ');
}

// ---------- PEMBACA BUKU (FLIPBOOK) ----------
// Tombol Baca membuka buku sebagai flipbook dua halaman lewat modul bersama
// ../../shared/flipbook.js. Susunannya mengikuti urutan buku cetak: sampul →
// halaman hak cipta → isi → daftar pustaka → penutup. Lembar dibalik dengan
// tombol panah, klik halaman, geser (ponsel), atau panah keyboard; di layar
// ponsel buku tampil satu halaman per layar.
const pembaca = { aktif: false, buku: null, depan: 0, zoom: 1 };
let flip = null;
const ZOOM = [0.85, 1, 1.15, 1.3, 1.5];

// Angka Romawi untuk halaman pembuka (sampul = i, hak cipta = ii, …).
function romawi(n) {
  const peta = [[10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
  let s = '', x = Math.max(1, Math.round(n) || 1);
  peta.forEach(function (p) { while (x >= p[0]) { s += p[1]; x -= p[0]; } });
  return s;
}

// Nomor halaman yang tampil: halaman pembuka pakai angka Romawi, isi buku mulai
// dari 1 supaya penomoran terasa seperti buku cetak.
function nomorTampil(n) {
  return n <= pembaca.depan ? romawi(n) : String(n - pembaca.depan);
}

// Instance flipbook untuk overlay pembaca (dibuat sekali, dipakai ulang).
// `padaUbah` menjaga buku tetap terpusat selama masih tertutup (hanya sampul
// yang tampak) dan menutup Daftar Isi begitu halaman berpindah.
function flipInstance() {
  if (!flip) {
    flip = buatFlipbook(elById('book-reader'), {
      leavesSel: '#reader-leaves', prevSel: '#reader-prev',
      nextSel: '#reader-next', countSel: '#reader-count', leafClass: 'sp-leaf',
      kosong: 'Isi buku ini belum diunggah. Silakan unduh berkasnya bila tersedia.',
      padaUbah: function (s) {
        const spread = elById('reader-spread');
        if (spread) spread.classList.toggle('terbuka', !!s.ponsel || s.turned > 0);
        if (tocBuka()) tutupToc();
      }
    });
    flip.pasang();
  }
  return flip;
}

// Satu halaman isi buku (muka lembar).
function faceHtml(hal, face, num) {
  const paras = cTxt(hal).split(/\n+/).map(function (p) { return p.trim(); }).filter(Boolean);
  const isi = paras.map(function (p, i) {
    // Drop cap hanya di halaman pertama isi, bukan di setiap halaman.
    const awal = (num === pembaca.depan + 1 && i === 0) ? ' class="p-awal"' : '';
    return '<p' + awal + '>' + cEsc(p) + '</p>';
  }).join('');
  return '<div class="face ' + face + '">' + isi +
    '<div class="page-num">' + cEsc(nomorTampil(num)) + '</div></div>';
}

// --- Halaman khusus di luar isi ---
function halSampul(b) {
  return {
    label: 'Sampul',
    html: function (face) {
      return '<div class="face ' + face + ' cover"><div class="lp-cover">' +
        '<span class="lp-kicker">' + cEsc(cTxt(b.jenis) || 'Koleksi Aksara') + (cTxt(b.jenjang) ? ' · ' + cEsc(b.jenjang) : '') + '</span>' +
        (cTxt(b.cover)
          ? '<img class="lp-cover-img" src="' + cEsc(b.cover) + '" alt="Sampul ' + cEsc(b.judul) + '">'
          : '<div class="lp-garis"></div>') +
        '<h2>' + cEsc(cTxt(b.judul) || 'Tanpa Judul') + '</h2>' +
        '<div class="lp-garis"></div>' +
        '<div class="lp-bawah">' +
          (cTxt(b.penulis) ? '<span class="lp-penulis">' + cEsc(b.penulis) + '</span>' : '') +
          '<span class="lp-merek">Aksara Learning Center</span>' +
        '</div>' +
      '</div></div>';
    }
  };
}

function halHakCipta(b) {
  const baris = [['Judul', b.judul], ['Penulis', b.penulis], ['Penerbit', b.penerbit],
    ['Tahun', b.tahun], ['Jenis', b.jenis], ['Jenjang', b.jenjang]];
  const ada = baris.filter(function (r) { return cTxt(r[1]).trim(); });
  return {
    label: 'Hak Cipta',
    html: function (face, num) {
      return '<div class="face ' + face + '"><div class="lp-copy">' +
        '<span class="lp-mark">AKSARA</span><div class="lp-garis"></div>' +
        '<p>' + cEsc(cTxt(b.judul)) + '<br>Edisi digital — Aksara Learning Center</p>' +
        (ada.length
          ? '<dl>' + ada.map(function (r) {
              return '<div class="lp-row"><dt>' + cEsc(r[0]) + '</dt><dd>' + cEsc(r[1]) + '</dd></div>';
            }).join('') + '</dl>'
          : '') +
        '<p style="margin-top:14px">Buku ini disediakan untuk keperluan pembelajaran. ' +
          'Mohon tidak memperbanyak atau memperjualbelikannya tanpa izin.</p>' +
        '<div class="page-num">' + cEsc(nomorTampil(num)) + '</div>' +
      '</div></div>';
    }
  };
}

function halPustaka(b) {
  const tahun = cTxt(b.tahun).trim();
  const sitasi = cTxt(b.penulis).trim()
    ? cEsc(b.penulis) + (tahun ? '. (' + cEsc(tahun) + ')' : '') + '. <em>' + cEsc(b.judul) + '</em>' +
      (cTxt(b.penerbit).trim() ? '. ' + cEsc(b.penerbit) : '') + '.'
    : '';
  return {
    label: 'Daftar Pustaka',
    html: function (face, num) {
      const isi = [];
      if (sitasi) isi.push(sitasi);
      isi.push('<span class="lp-sitasi">Aksara Learning Center. (' + cEsc(tahun || new Date().getFullYear()) +
        '). <em>' + cEsc(cTxt(b.judul)) + '</em> [Buku digital]. Aksara Learning Center.</span>');
      if (cTxt(b.jenjang).trim()) isi.push('<span class="lp-sitasi">Jenjang: ' + cEsc(b.jenjang) +
        (cTxt(b.jenis).trim() ? ' · Jenis: ' + cEsc(b.jenis) : '') + '.</span>');
      return '<div class="face ' + face + '">' +
        '<h3 class="lp-judul">Daftar Pustaka</h3>' +
        '<ul class="lp-daftar">' + isi.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
        '<div class="page-num">' + cEsc(nomorTampil(num)) + '</div></div>';
    }
  };
}

function halPenutup(b) {
  const link = cTxt(b.link);
  return {
    label: 'Penutup',
    html: function (face, num) {
      return '<div class="face ' + face + '"><div class="lp"><div class="lp-akhir">' +
        '<i class="fa-solid fa-circle-info lp-ikon"></i>' +
        '<h4>Akhir dari buku ini</h4>' +
        '<p>Terima kasih telah membaca <b>' + cEsc(cTxt(b.judul)) + '</b>. ' +
          'Koleksi lainnya tersedia di Perpustakaan Digital Aksara Learning Center.</p>' +
        '<div class="lp-aksi">' +
          (link ? '<a class="btn btn-primary btn-sm" href="' + cEsc(link) + '" target="_blank" rel="noopener"><i class="fa-solid fa-download"></i> Unduh berkas</a>' : '') +
          '<button class="btn btn-outline btn-sm" type="button" data-tutup="1"><i class="fa-solid fa-list-ul"></i> Kembali ke katalog</button>' +
        '</div>' +
      '</div></div>' +
      '<div class="page-num">' + cEsc(nomorTampil(num)) + '</div></div>';
    }
  };
}

// --- Panel Daftar Isi ---
function tocBuka() {
  const toc = elById('reader-toc');
  return !!(toc && toc.classList.contains('terbuka'));
}

function tutupToc() {
  const toc = elById('reader-toc');
  const btn = elById('reader-daftar');
  if (toc) { toc.classList.remove('terbuka'); toc.setAttribute('aria-hidden', 'true'); }
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function bukaToc() {
  const toc = elById('reader-toc');
  const btn = elById('reader-daftar');
  if (!toc) return;
  if (toc.classList.contains('terbuka')) { tutupToc(); return; }
  toc.classList.add('terbuka');
  toc.setAttribute('aria-hidden', 'false');
  if (btn) btn.setAttribute('aria-expanded', 'true');
}

// Daftar Isi disusun dari halaman yang benar-benar dibuat mesin flipbook, jadi
// nomornya selalu cocok walau jumlah halaman berubah karena ukuran layar.
function renderToc() {
  const list = elById('reader-toc-list');
  if (!list) return;
  const halaman = flipInstance().daftarHalaman();
  if (!halaman.length) { list.innerHTML = '<li class="rd-toc-kosong">Belum ada halaman.</li>'; return; }
  list.innerHTML = halaman.map(function (h) {
    const label = cTxt(h.label).trim() || ('Halaman ' + h.nomor);
    return '<li' + (h.jenis === 'khusus' ? ' class="khusus"' : '') + '>' +
      '<button type="button" data-hal="' + h.nomor + '">' +
      '<span class="toc-teks">' + cEsc(label) + '</span>' +
      '<span class="toc-hal">' + cEsc(nomorTampil(h.nomor)) + '</span></button></li>';
  }).join('');
}

// --- Ukuran tulisan & layar penuh ---
function terapkanZoom() {
  const panel = elById('reader-panel');
  if (panel) panel.style.setProperty('--rd-skala', String(pembaca.zoom));
  flipInstance().segarkan();
}

function ubahZoom(naik) {
  const i = ZOOM.indexOf(pembaca.zoom);
  const kini = i === -1 ? ZOOM.indexOf(1) : i;
  const berikut = Math.min(Math.max(kini + (naik ? 1 : -1), 0), ZOOM.length - 1);
  if (ZOOM[berikut] === pembaca.zoom) return;
  pembaca.zoom = ZOOM[berikut];
  terapkanZoom();
}

function layarPenuh() {
  const panel = elById('reader-panel');
  if (!panel) return;
  const aktif = document.fullscreenElement || document.webkitFullscreenElement;
  if (!aktif) {
    const pinta = panel.requestFullscreen || panel.webkitRequestFullscreen;
    if (pinta) pinta.call(panel);
  } else {
    const keluar = document.exitFullscreen || document.webkitExitFullscreen;
    if (keluar) keluar.call(document);
  }
}

function bukaPembaca(id) {
  const b = cariBuku(id);
  if (!b) return;
  const link = cTxt(b.link);
  // Tanpa isi tapi ada tautan berkas → langsung buka berkasnya.
  if (!cTxt(b.isi).trim() && link) { window.open(link, '_blank', 'noopener'); return; }
  const reader = elById('book-reader');
  if (!reader) return;
  pembaca.aktif = true;
  pembaca.buku = b;
  const judul = elById('reader-judul');
  if (judul) judul.textContent = cTxt(b.judul);
  const penulis = elById('reader-penulis');
  if (penulis) penulis.textContent = cTxt(b.penulis).trim() || barisPustaka(b) || 'Aksara Learning Center';
  const jenis = jenisKatalog(b);
  const actions = elById('reader-actions');
  if (actions) {
    actions.innerHTML =
      (link
        ? '<a class="rd-btn utama" href="' + cEsc(link) + '" target="_blank" rel="noopener"><i class="fa-solid fa-download"></i> <span>' +
          (jenis ? 'Unduh ' + jenis : 'Unduh') + '</span></a>'
        : '') +
      '<button class="rd-btn" id="reader-full" type="button"><i class="fa-solid fa-expand" id="reader-full-ikon"></i> <span id="reader-full-teks">Layar Penuh</span></button>';
    const full = elById('reader-full');
    if (full && full.dataset.siap !== '1') {
      full.dataset.siap = '1';
      full.addEventListener('click', layarPenuh);
    }
  }
  // Sampul & hak cipta di depan, daftar pustaka & penutup di belakang.
  const depan = [halSampul(b), halHakCipta(b)];
  const belakang = [halPustaka(b), halPenutup(b)];
  pembaca.depan = depan.length;
  terapkanZoom();
  reader.classList.add('open');
  reader.setAttribute('aria-hidden', 'false');
  document.body.classList.add('reader-open');
  tutupToc();
  flipInstance().bangun(b.isi, faceHtml, { depan: depan, belakang: belakang });
  renderToc();
}

function tutupPembaca() {
  const reader = elById('book-reader');
  if (!reader) return;
  pembaca.aktif = false;
  tutupToc();
  reader.classList.remove('open');
  reader.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('reader-open');
}

// ---------- DETAIL BUKU ----------
function bukaDetail(id) {
  const b = cariBuku(id);
  const d = elById('book-detail');
  if (!b || !d) return;
  const cover = elById('bd-cover');
  if (cover) {
    cover.style.backgroundImage = cTxt(b.cover) ? 'url(' + cEsc(b.cover) + ')' : '';
    cover.classList.toggle('kosong', !cTxt(b.cover));
  }
  const badge = elById('bd-badge');
  if (badge) badge.textContent = cTxt(b.jenis) || (cTxt(b.tipe) === 'flipbook' ? 'Booklet' : 'Katalog');
  const judul = elById('bd-judul');
  if (judul) judul.textContent = cTxt(b.judul);
  const jenis = jenisKatalog(b);
  const adaIsi = !!cTxt(b.isi).trim();
  const aksi = elById('bd-actions');
  if (aksi) {
    aksi.innerHTML =
      ((adaIsi || b.link)
        ? '<button class="btn btn-primary btn-sm" type="button" data-baca="' + cEsc(b.id) + '"><i class="fa-solid fa-book-open"></i> Baca Sekarang</button>'
        : '') +
      (b.link
        ? '<a class="btn btn-outline btn-sm" href="' + cEsc(b.link) + '" target="_blank" rel="noopener"><i class="fa-solid fa-download"></i> ' +
          (jenis ? 'Unduh ' + jenis : 'Unduh berkas') + '</a>'
        : '');
  }
  const meta = elById('bd-meta');
  if (meta) {
    const baris = [
      ['Judul', b.judul],
      ['Penulis', b.penulis],
      ['Penerbit', b.penerbit],
      ['Tahun', b.tahun],
      ['Jenis', b.jenis],
      ['Jenjang', b.jenjang],
      ['Format', jenis || (cTxt(b.tipe) === 'flipbook' ? 'Buku digital (booklet)' : 'Buku digital')],
      ['Ketersediaan', b.link ? 'Bisa dibaca & diunduh' : 'Hanya bisa dibaca di situs']
    ];
    meta.innerHTML = baris
      .filter(function (x) { return cTxt(x[1]).trim(); })
      .map(function (x) { return '<div class="bd-meta-row"><dt>' + cEsc(x[0]) + '</dt><dd>' + cEsc(x[1]) + '</dd></div>'; })
      .join('');
  }
  const desc = elById('bd-desc');
  if (desc) desc.textContent = cTxt(b.deskripsi);
  d.classList.add('open');
  d.setAttribute('aria-hidden', 'false');
  document.body.classList.add('reader-open');
}

function tutupDetail() {
  const d = elById('book-detail');
  if (!d) return;
  d.classList.remove('open');
  d.setAttribute('aria-hidden', 'true');
  if (!pembaca.aktif) document.body.classList.remove('reader-open');
}

// Cari buku dari daftar yang sedang dimuat (aman untuk id apa pun).
function cariBuku(id) {
  return (katalogState.semua || []).filter(function (x) { return String(x.id) === String(id); })[0];
}

// ---------- KATALOG: PENCARIAN, FILTER, URUT ----------
const katalogState = { semua: [], jenis: 'Semua', jenjang: 'Semua', cari: '', urut: 'urutan' };

// Ambil daftar nilai unik sebuah kolom metadata (untuk chip filter).
function nilaiUnik(kolom) {
  const set = [];
  katalogState.semua.forEach(function (b) {
    const v = cTxt(b[kolom]).trim();
    if (v && set.indexOf(v) === -1) set.push(v);
  });
  return set.sort(function (a, b) { return a.localeCompare(b, 'id'); });
}

function chipsHtml(values, aktif, attr) {
  return ['Semua'].concat(values).map(function (j) {
    return '<button type="button" class="bk-chip' + (j === aktif ? ' aktif' : '') + '" ' + attr + '="' + cEsc(j) + '">' + cEsc(j) + '</button>';
  }).join('');
}

function renderChips() {
  const wrap = elById('book-chips');
  if (wrap) wrap.innerHTML = chipsHtml(nilaiUnik('jenis'), katalogState.jenis, 'data-jenis');
  // Baris jenjang hanya tampil bila admin sudah mengisi kolom jenjang.
  const jenjang = nilaiUnik('jenjang');
  const wrapJ = elById('book-jenjang-wrap');
  const chipsJ = elById('book-jenjang');
  if (wrapJ) wrapJ.classList.toggle('is-hidden', !jenjang.length);
  if (chipsJ) chipsJ.innerHTML = jenjang.length ? chipsHtml(jenjang, katalogState.jenjang, 'data-jenjang') : '';
}

// Statistik ringkas pada banner hero.
function perbaruiStatHero() {
  const isi = function (id, nilai) { const el = elById(id); if (el) el.textContent = String(nilai); };
  isi('bk-stat-buku', katalogState.semua.length);
  isi('bk-stat-kategori', nilaiUnik('jenis').length);
  isi('bk-stat-unduh', katalogState.semua.filter(function (b) { return cTxt(b.link).trim(); }).length);
}

function katalogTersaring() {
  const q = katalogState.cari.trim().toLowerCase();
  let list = katalogState.semua.slice();
  if (katalogState.jenis !== 'Semua') {
    list = list.filter(function (b) { return cTxt(b.jenis).trim() === katalogState.jenis; });
  }
  if (katalogState.jenjang !== 'Semua') {
    list = list.filter(function (b) { return cTxt(b.jenjang).trim() === katalogState.jenjang; });
  }
  if (q) {
    list = list.filter(function (b) {
      const teks = [b.judul, b.penulis, b.penerbit, b.tahun, b.jenis, b.jenjang, b.deskripsi].map(cTxt).join(' ').toLowerCase();
      return teks.indexOf(q) !== -1;
    });
  }
  if (katalogState.urut === 'judul') {
    list.sort(function (a, b) { return cTxt(a.judul).localeCompare(cTxt(b.judul), 'id'); });
  } else if (katalogState.urut === 'tahun') {
    list.sort(function (a, b) { return (parseInt(cTxt(b.tahun), 10) || 0) - (parseInt(cTxt(a.tahun), 10) || 0); });
  } else {
    list.sort(byUrutan);
  }
  return list;
}

function kartuBuku(b) {
  const link = cTxt(b.link);
  const jenis = jenisKatalog(b);
  const adaIsi = !!cTxt(b.isi).trim();
  const cover = cTxt(b.cover)
    ? '<div class="bk-cover" style="background-image:url(\'' + cEsc(b.cover) + '\')"></div>'
    : '<div class="bk-cover kosong"><i class="fa-solid fa-book-open-reader"></i></div>';
  const badges = '<div class="bk-tags">' +
    (cTxt(b.jenis) ? '<span class="bk-tag">' + cEsc(b.jenis) + '</span>' : '') +
    (cTxt(b.jenjang) ? '<span class="bk-tag level">' + cEsc(b.jenjang) + '</span>' : '') +
    '<span class="bk-tag alt">' + (cTxt(b.tipe) === 'flipbook' ? 'Booklet' : 'Katalog') + '</span>' +
    (link ? '<span class="bk-tag file">' + cEsc(jenis || 'Berkas') + '</span>' : '') +
    '</div>';
  const baca = (adaIsi || link)
    ? '<button class="btn btn-primary btn-sm" type="button" data-baca="' + cEsc(b.id) + '"><i class="fa-solid fa-book-open"></i> Baca</button>'
    : '';
  const unduh = link
    ? '<a class="btn btn-outline btn-sm" href="' + cEsc(link) + '" target="_blank" rel="noopener"><i class="fa-solid fa-download"></i> Unduh</a>'
    : '';
  return '<article class="bk-card" data-detail="' + cEsc(b.id) + '" tabindex="0" role="button" aria-label="Detail buku ' + cEsc(b.judul) + '">' +
    cover +
    '<div class="bk-info">' + badges +
      '<h3>' + cEsc(b.judul) + '</h3>' +
      '<p class="bk-pustaka">' + (barisPustaka(b) ? cEsc(barisPustaka(b)) : cEsc(b.deskripsi || '')) + '</p>' +
      '<p class="bk-desc">' + cEsc(b.deskripsi || '') + '</p>' +
    '</div>' +
    '<div class="bk-actions">' + baca + unduh + '<span class="bk-detail-link">Detail <i class="fa-solid fa-arrow-right"></i></span></div>' +
    '</article>';
}

function terapkanKatalog() {
  const list = katalogTersaring();
  const grid = elById('book-catalog');
  const kosong = elById('book-empty');
  const count = elById('book-count');
  if (grid) grid.innerHTML = list.map(kartuBuku).join('');
  if (kosong) kosong.classList.toggle('is-hidden', list.length > 0);
  if (count) {
    count.textContent = list.length + ' buku' +
      (katalogState.jenis !== 'Semua' ? ' · ' + katalogState.jenis : '') +
      (katalogState.jenjang !== 'Semua' ? ' · ' + katalogState.jenjang : '') +
      (katalogState.cari.trim() ? ' · pencarian "' + katalogState.cari.trim() + '"' : '');
  }
}

// Event delegation: satu listener untuk kartu, tombol Baca, chip, dan Detail.
function pasangKatalog() {
  const grid = elById('book-catalog');
  const chips = elById('book-chips');
  const chipsJ = elById('book-jenjang');
  const q = elById('book-q');
  const sort = elById('book-sort');
  if (grid && grid.dataset.siap !== '1') {
    grid.dataset.siap = '1';
    grid.addEventListener('click', function (e) {
      const baca = e.target.closest ? e.target.closest('[data-baca]') : null;
      if (baca) { e.preventDefault(); e.stopPropagation(); bukaPembaca(baca.getAttribute('data-baca')); return; }
      if (e.target.closest('a')) return;                       // tombol unduh → biarkan
      const kartu = e.target.closest('[data-detail]');
      if (kartu) { e.preventDefault(); bukaDetail(kartu.getAttribute('data-detail')); }
    });
    grid.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const kartu = e.target.closest ? e.target.closest('[data-detail]') : null;
      if (kartu) { e.preventDefault(); bukaDetail(kartu.getAttribute('data-detail')); }
    });
  }
  if (chips && chips.dataset.siap !== '1') {
    chips.dataset.siap = '1';
    chips.addEventListener('click', function (e) {
      const c = e.target.closest ? e.target.closest('[data-jenis]') : null;
      if (!c) return;
      katalogState.jenis = c.getAttribute('data-jenis');
      renderChips();
      terapkanKatalog();
    });
  }
  if (chipsJ && chipsJ.dataset.siap !== '1') {
    chipsJ.dataset.siap = '1';
    chipsJ.addEventListener('click', function (e) {
      const c = e.target.closest ? e.target.closest('[data-jenjang]') : null;
      if (!c) return;
      katalogState.jenjang = c.getAttribute('data-jenjang');
      renderChips();
      terapkanKatalog();
    });
  }
  if (q && q.dataset.siap !== '1') {
    q.dataset.siap = '1';
    q.addEventListener('input', function () { katalogState.cari = q.value || ''; terapkanKatalog(); });
  }
  if (sort && sort.dataset.siap !== '1') {
    sort.dataset.siap = '1';
    sort.addEventListener('change', function () { katalogState.urut = sort.value; terapkanKatalog(); });
  }
}

function pasangOverlay() {
  const reader = elById('book-reader');
  if (reader && reader.dataset.siap !== '1') {
    reader.dataset.siap = '1';
    const t = elById('reader-close'); if (t) t.addEventListener('click', tutupPembaca);
    const back = elById('reader-back'); if (back) back.addEventListener('click', tutupPembaca);
    // Ukuran tulisan, Daftar Isi, dan lompat ke halaman dari Daftar Isi.
    const kecil = elById('reader-kecil'); if (kecil) kecil.addEventListener('click', function () { ubahZoom(false); });
    const besar = elById('reader-besar'); if (besar) besar.addEventListener('click', function () { ubahZoom(true); });
    const daftar = elById('reader-daftar'); if (daftar) daftar.addEventListener('click', bukaToc);
    const tocTutup = elById('reader-toc-tutup'); if (tocTutup) tocTutup.addEventListener('click', tutupToc);
    const tocList = elById('reader-toc-list');
    if (tocList) {
      tocList.addEventListener('click', function (e) {
        const btn = e.target.closest ? e.target.closest('[data-hal]') : null;
        if (!btn) return;
        const n = parseInt(btn.getAttribute('data-hal'), 10) || 1;
        tocList.querySelectorAll('button').forEach(function (x) { x.classList.remove('aktif'); });
        btn.classList.add('aktif');
        flipInstance().keHalaman(n);
      });
    }
    // Klik halaman = membalik buku, seperti versi cetaknya: halaman yang sudah
    // dibalik dibuka kembali (mundur), sisanya dibalik ke depan (maju).
    const leaves = elById('reader-leaves');
    if (leaves) {
      leaves.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('[data-tutup]')) { tutupPembaca(); return; }
        if (e.target.closest && e.target.closest('a, button')) return;
        const leaf = e.target.closest ? e.target.closest('.sp-leaf') : null;
        if (!leaf) return;
        if (leaf.classList.contains('flipped')) flipInstance().mundur();
        else flipInstance().maju();
      });
    }
    // Geser untuk membalik lembar (perangkat sentuh). Tombol prev/next sudah
    // ditangani modul flipbook bersama (flip.pasang()).
    const spread = elById('reader-spread');
    if (spread) {
      let x0 = 0, y0 = 0;
      spread.addEventListener('touchstart', function (e) {
        const t = (e.touches || [])[0]; if (t) { x0 = t.clientX; y0 = t.clientY; }
      }, { passive: true });
      spread.addEventListener('touchend', function (e) {
        const t = (e.changedTouches || [])[0]; if (!t || !x0) return;
        const dx = t.clientX - x0, dy = t.clientY - y0;
        x0 = 0;
        if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy)) return;
        if (dx < 0) flipInstance().maju(); else flipInstance().mundur();
      }, { passive: true });
    }
  }
  const detail = elById('book-detail');
  if (detail && detail.dataset.siap !== '1') {
    detail.dataset.siap = '1';
    const t = elById('bd-close'); if (t) t.addEventListener('click', tutupDetail);
    const back = elById('bd-back'); if (back) back.addEventListener('click', tutupDetail);
    const aksi = elById('bd-actions');
    if (aksi) aksi.addEventListener('click', function (e) {
      const baca = e.target.closest ? e.target.closest('[data-baca]') : null;
      if (baca) { e.preventDefault(); bukaPembaca(baca.getAttribute('data-baca')); }
    });
  }
  // Label tombol layar penuh ikut berubah saat mode layar penuh dinyalakan.
  if (document.body.dataset.rdFull !== '1') {
    document.body.dataset.rdFull = '1';
    document.addEventListener('fullscreenchange', function () {
      const aktif = !!document.fullscreenElement;
      const teks = elById('reader-full-teks');
      const ikon = elById('reader-full-ikon');
      if (teks) teks.textContent = aktif ? 'Keluar Layar Penuh' : 'Layar Penuh';
      if (ikon) ikon.className = aktif ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
    });
  }
  if (document.body.dataset.bkKeys !== '1') {
    document.body.dataset.bkKeys = '1';
    document.addEventListener('keydown', function (e) {
      // Saat flipbook terbuka: panah membalik lembar, Esc menutup.
      if (pembaca.aktif) {
        if (e.key === 'Escape') { tutupPembaca(); return; }
        if (e.key === 'ArrowRight') { flipInstance().maju(); return; }
        if (e.key === 'ArrowLeft') { flipInstance().mundur(); return; }
        return;
      }
      if (e.key !== 'Escape') return;
      const d = elById('book-detail');
      if (d && d.classList.contains('open')) tutupDetail();
    });
  }
}

export function renderBooks(list) {
  list = list || [];
  katalogState.semua = list.filter(function (b) { return (b.status || 'Aktif') !== 'Nonaktif'; });
  pasangOverlay();
  const wrap = elById('book-catalog-wrap');
  const adaKatalog = katalogState.semua.length > 0;
  if (wrap) wrap.style.display = adaKatalog ? 'block' : 'none';
  if (adaKatalog) {
    pasangKatalog();
    renderChips();
    perbaruiStatHero();
    terapkanKatalog();
  }
  // Sembunyikan seluruh seksi bila admin belum menambahkan buku sama sekali.
  tampilkan(elById('buku'), adaKatalog);
}
