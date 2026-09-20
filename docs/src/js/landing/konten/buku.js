// ==================== KONTEN DINAMIS — BUKU (KATALOG + DAFTAR PUSTAKA) ====================
// Dua tampilan dalam satu seksi:
//   1) Booklet flipbook  → halaman buku panduan yang dibalik seperti buku asli.
//   2) Katalog & daftar pustaka → daftar SEMUA buku/modul (judul, penulis,
//      penerbit, tahun, jenis) dengan tombol Baca & Unduh, agar pengunjung
//      bisa memilih sendiri buku mana yang ingin dibaca.
import { cTxt, cEsc, byUrutan, elById, tampilkan } from './util.js';

// Jenis berkas unduhan katalog — dibaca dari nama berkas hasil unggahan
// admin (kolom "Berkas"), atau dari ekstensi pada URL yang ditempel.
function jenisKatalog(b) {
  const peta = {
    pdf: 'PDF', doc: 'Word', docx: 'Word', xls: 'Excel', xlsx: 'Excel', ppt: 'PowerPoint', pptx: 'PowerPoint'
  };
  const ekstensi = function (teks) {
    const m = /\.([A-Za-z0-9]{2,4})(?:$|[?#])/.exec(cTxt(teks));
    return m ? m[1].toLowerCase() : '';
  };
  // Nama berkas hasil unggahan admin lebih akurat (URL Drive tanpa ekstensi).
  return peta[ekstensi(b.berkas) || ekstensi(b.link)] || '';
}

// Baris metadata gaya daftar pustaka: "Penulis · Penerbit · Tahun".
function barisPustaka(b) {
  return [b.penulis, b.penerbit, b.tahun]
    .map(cTxt).map(function (v) { return v.trim(); }).filter(Boolean).join(' · ');
}

// ---------- FLIPBOOK BOOKLET ----------
function pageFace(b, num, face) {
  const paras = cTxt(b.isi).split(/\n+/).filter(Boolean)
    .map(function (p) { return '<p>' + cEsc(p) + '</p>'; }).join('');
  const cover = cTxt(b.cover)
    ? '<img src="' + cEsc(b.cover) + '" alt="' + cEsc(b.judul) + '" style="width:100%; border-radius:8px; margin:6px 0 12px;">'
    : '';
  const unduh = cTxt(b.link)
    ? '<a class="btn btn-outline btn-sm book-dl" href="' + cEsc(b.link) + '" target="_blank" rel="noopener">' +
      '<i class="fa-solid fa-download"></i> ' + (jenisKatalog(b) ? 'Unduh ' + jenisKatalog(b) : 'Unduh berkas') + '</a>'
    : '';
  return '<div class="face ' + face + '">' +
    '<div class="page-kicker">' + cEsc(b.jenis || b.deskripsi || 'Buku') + '</div>' +
    '<h3>' + cEsc(b.judul) + '</h3>' + cover + paras + unduh +
    '<div class="page-num">' + num + '</div></div>';
}

function renderBooklet(list) {
  const flip = list.filter(function (b) { return cTxt(b.tipe) === 'flipbook'; }).sort(byUrutan);
  const leaves = elById('book-leaves');
  const shell = elById('book-shell');
  if (flip.length >= 1 && leaves) {
    if (shell) shell.style.display = '';
    const pages = flip.slice();
    if (pages.length % 2) {
      pages.push({ judul: 'Terima Kasih', jenis: 'Aksara Learning Center',
        isi: 'Terima kasih telah menjelajahi booklet Aksara Learning Center.\nDaftarkan diri Anda hari ini dan mulai perjalanan belajar bersama kami.' });
    }
    let html = '';
    for (let i = 0; i < pages.length; i += 2) {
      html += '<div class="sp-leaf">' + pageFace(pages[i], i + 1, 'front') +
        pageFace(pages[i + 1], i + 2, 'back') + '</div>';
    }
    leaves.innerHTML = html;
    if (typeof window.refreshFlipbook === 'function') window.refreshFlipbook();
  } else {
    if (leaves) leaves.innerHTML = '';
    if (shell) shell.style.display = 'none';
  }
  return flip.length > 0;
}

// ---------- PEMBACA BUKU (KATALOG) ----------
const pembaca = { aktif: false, halaman: [], index: 0, buku: null };

// Pecah teks isi buku menjadi halaman-halaman yang nyaman dibaca.
function pecahHalaman(teks) {
  const paras = cTxt(teks).split(/\n{1,}/).map(function (p) { return p.trim(); }).filter(Boolean);
  if (!paras.length) return [];
  const halaman = [];
  let buf = '';
  paras.forEach(function (p) {
    if (buf && (buf.length + p.length) > 900) { halaman.push(buf); buf = p; }
    else buf = buf ? buf + '\n' + p : p;
  });
  if (buf) halaman.push(buf);
  return halaman;
}

function tampilkanHalaman() {
  const body = elById('reader-body');
  const count = elById('reader-count');
  const prev = elById('reader-prev');
  const next = elById('reader-next');
  if (!body) return;
  const total = pembaca.halaman.length;
  if (!total) {
    body.innerHTML = '<p class="reader-kosong">Isi buku ini belum diunggah. Silakan tekan tombol unduh bila tersedia.</p>';
    if (count) count.textContent = '0 / 0';
    if (prev) prev.disabled = true;
    if (next) next.disabled = true;
    return;
  }
  const isi = pembaca.halaman[pembaca.index];
  body.innerHTML = isi.split('\n').map(function (p) { return '<p>' + cEsc(p) + '</p>'; }).join('');
  body.scrollTop = 0;
  if (count) count.textContent = (pembaca.index + 1) + ' / ' + total;
  if (prev) prev.disabled = pembaca.index <= 0;
  if (next) next.disabled = pembaca.index >= total - 1;
}

function bukaPembaca(id) {
  const b = (window.__lpBuku || []).filter(function (x) { return String(x.id) === String(id); })[0];
  if (!b) return;
  const link = cTxt(b.link);
  // Tanpa isi tapi ada tautan berkas → langsung buka berkasnya.
  if (!cTxt(b.isi).trim() && link) { window.open(link, '_blank', 'noopener'); return; }
  pembaca.aktif = true;
  pembaca.buku = b;
  pembaca.halaman = pecahHalaman(b.isi);
  pembaca.index = 0;
  const reader = elById('book-reader');
  if (!reader) return;
  const cover = elById('reader-cover');
  if (cover) cover.style.backgroundImage = cTxt(b.cover) ? 'url(' + cEsc(b.cover) + ')' : '';
  const kicker = elById('reader-kicker');
  if (kicker) kicker.textContent = cTxt(b.jenis) || (cTxt(b.tipe) === 'flipbook' ? 'Booklet' : 'Katalog');
  const judul = elById('reader-judul');
  if (judul) judul.textContent = cTxt(b.judul);
  const pustaka = elById('reader-pustaka');
  if (pustaka) pustaka.textContent = barisPustaka(b) || cTxt(b.deskripsi);
  const actions = elById('reader-actions');
  if (actions) {
    const jenis = jenisKatalog(b);
    actions.innerHTML = (link
      ? '<a class="btn btn-primary btn-sm" href="' + cEsc(link) + '" target="_blank" rel="noopener"><i class="fa-solid fa-download"></i> ' +
        (jenis ? 'Unduh ' + jenis : 'Unduh berkas') + '</a>'
      : '') +
      (cTxt(b.deskripsi) ? '<span class="reader-desc">' + cEsc(b.deskripsi) + '</span>' : '');
  }
  reader.classList.add('open');
  reader.setAttribute('aria-hidden', 'false');
  document.body.classList.add('reader-open');
  tampilkanHalaman();
}

function tutupPembaca() {
  const reader = elById('book-reader');
  if (!reader) return;
  pembaca.aktif = false;
  reader.classList.remove('open');
  reader.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('reader-open');
}

function langkah(delta) {
  if (!pembaca.aktif) return;
  const target = pembaca.index + delta;
  if (target < 0 || target >= pembaca.halaman.length) return;
  pembaca.index = target;
  tampilkanHalaman();
}

function pasangPembaca() {
  const reader = elById('book-reader');
  if (!reader || reader.dataset.siap === '1') return;
  reader.dataset.siap = '1';
  const tutup = elById('reader-close');
  if (tutup) tutup.addEventListener('click', tutupPembaca);
  const back = elById('reader-back');
  if (back) back.addEventListener('click', tutupPembaca);
  const prev = elById('reader-prev');
  if (prev) prev.addEventListener('click', function () { langkah(-1); });
  const next = elById('reader-next');
  if (next) next.addEventListener('click', function () { langkah(1); });
  document.addEventListener('keydown', function (e) {
    if (!pembaca.aktif) return;
    if (e.key === 'Escape') tutupPembaca();
    if (e.key === 'ArrowRight') langkah(1);
    if (e.key === 'ArrowLeft') langkah(-1);
  });
}

// ---------- KATALOG & DAFTAR PUSTAKA ----------
function kartuBuku(b) {
  const link = cTxt(b.link);
  const jenis = jenisKatalog(b);
  const adaIsi = !!cTxt(b.isi).trim();
  const cover = cTxt(b.cover)
    ? '<div class="book-item-cover" style="background-image:url(\'' + cEsc(b.cover) + '\')"></div>'
    : '<div class="book-item-cover kosong"><i class="fa-solid fa-book-open-reader"></i></div>';
  const badgeJenis = cTxt(b.jenis) ? '<span class="book-item-badge">' + cEsc(b.jenis) + '</span>' : '';
  const badgeTipe = '<span class="book-item-badge alt">' + (cTxt(b.tipe) === 'flipbook' ? 'Booklet' : 'Katalog') + '</span>';
  const badgeBerkas = link ? '<span class="book-item-badge file">' + cEsc(jenis || 'Berkas') + '</span>' : '';
  const baca = (adaIsi || link)
    ? '<button class="btn btn-primary btn-sm" type="button" data-baca="' + cEsc(b.id) + '"><i class="fa-solid fa-book-open"></i> Baca</button>'
    : '<span class="book-item-note">Segera hadir</span>';
  const unduh = link
    ? '<a class="btn btn-outline btn-sm" href="' + cEsc(link) + '" target="_blank" rel="noopener"><i class="fa-solid fa-download"></i> ' +
      (jenis ? 'Unduh ' + jenis : 'Unduh berkas') + '</a>'
    : '';
  return '<article class="book-item">' + cover +
    '<div class="book-item-body">' +
      '<div class="book-item-tags">' + badgeTipe + badgeJenis + badgeBerkas + '</div>' +
      '<h3>' + cEsc(b.judul) + '</h3>' +
      '<p class="book-item-pustaka">' + (barisPustaka(b) ? cEsc(barisPustaka(b)) : cEsc(b.deskripsi || '')) + '</p>' +
      '<p class="book-item-desc">' + cEsc(b.deskripsi || '') + '</p>' +
    '</div>' +
    '<div class="book-item-actions">' + baca + unduh + '</div>' +
    '</article>';
}

function renderKatalog(list) {
  const wrap = elById('book-catalog-wrap');
  const grid = elById('book-catalog');
  const semua = list.filter(function (b) { return (b.status || 'Aktif') !== 'Nonaktif'; }).sort(byUrutan);
  if (!semua.length) { if (wrap) wrap.style.display = 'none'; return false; }
  if (wrap) wrap.style.display = 'block';
  if (!grid) return true;
  grid.innerHTML = semua.map(kartuBuku).join('');
  // Event delegation: satu listener untuk semua tombol Baca.
  if (grid.dataset.siap !== '1') {
    grid.dataset.siap = '1';
    grid.addEventListener('click', function (e) {
      const tombol = e.target && e.target.closest ? e.target.closest('[data-baca]') : null;
      if (!tombol) return;
      e.preventDefault();
      bukaPembaca(tombol.getAttribute('data-baca'));
    });
  }
  return true;
}

export function renderBooks(list) {
  list = list || [];
  window.__lpBuku = list;                         // dipakai pembaca saat tombol Baca ditekan
  pasangPembaca();
  const adaBooklet = renderBooklet(list);
  const adaKatalog = renderKatalog(list);
  // Sembunyikan seluruh seksi hanya bila tidak ada buku sama sekali.
  tampilkan(elById('buku'), adaBooklet || adaKatalog);
}
