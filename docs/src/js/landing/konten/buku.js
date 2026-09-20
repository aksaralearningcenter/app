// ==================== KONTEN DINAMIS — BUKU (FLIPBOOK + KATALOG) ====================
import { cTxt, cEsc, byUrutan, elById, tampilkan } from './util.js';

// Jenis berkas unduhan katalog — dibaca dari nama berkas hasil unggahan
// admin (kolom "Berkas"), atau dari ekstensi pada URL yang ditempel.
// DIPAKAI JUGA oleh halaman flipbook: katalog kini dikonversi menjadi
// flipbook, jadi tombol unduh tampil di halaman bukunya sendiri.
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

function pageFace(b, num, face) {
  const paras = cTxt(b.isi).split(/\n+/).filter(Boolean)
    .map(function (p) { return '<p>' + cEsc(p) + '</p>'; }).join('');
  const cover = cTxt(b.cover)
    ? '<img src="' + cEsc(b.cover) + '" alt="' + cEsc(b.judul) + '" style="width:100%; border-radius:8px; margin:6px 0 12px;">'
    : '';
  // Tombol unduh bila buku punya berkas/link (katalog yang dijadikan flipbook).
  const unduh = cTxt(b.link)
    ? '<a class="btn btn-outline btn-sm book-dl" href="' + cEsc(b.link) + '" target="_blank" rel="noopener">' +
      '<i class="fa-solid fa-download"></i> ' + (jenisKatalog(b) ? 'Unduh ' + jenisKatalog(b) : 'Unduh berkas') + '</a>'
    : '';
  return '<div class="face ' + face + '">' +
    '<div class="page-kicker">' + cEsc(b.deskripsi || 'Buku') + '</div>' +
    '<h3>' + cEsc(b.judul) + '</h3>' + cover + paras + unduh +
    '<div class="page-num">' + num + '</div></div>';
}

export function renderBooks(list) {
  // Flipbook: tiap buku = 1 halaman; buku disusun jadi lembar 2 sisi.
  const flip = list.filter(function (b) { return cTxt(b.tipe) === 'flipbook'; }).sort(byUrutan);
  const katalog0 = list.filter(function (b) { return cTxt(b.tipe) !== 'flipbook'; }).sort(byUrutan);
  // Admin belum menambah buku apa pun → seluruh seksi Buku disembunyikan.
  if (!flip.length && !katalog0.length) { tampilkan(elById('buku'), false); return; }
  tampilkan(elById('buku'), true);
  const leaves = elById('book-leaves');
  const shell = elById('book-shell');
  if (flip.length >= 1 && leaves) {
    // SATU booklet pun tetap tampil (sebelumnya syaratnya >= 2, sehingga
    // booklet tunggal tidak pernah muncul sama sekali).
    if (shell) shell.style.display = '';
    const pages = flip.slice();
    if (pages.length % 2) {
      pages.push({ judul: 'Terima Kasih', deskripsi: 'Aksara Learning Center',
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
    // Tak ada booklet → jangan tampilkan buku kosong (mis. saat hanya ada katalog).
    if (leaves) leaves.innerHTML = '';
    if (shell) shell.style.display = 'none';
  }

  // Katalog tidak lagi dirender sebagai grid unduhan — semua buku kini
  // tampil sebagai flipbook (dikonversi di database). Grid unduhan tetap
  // disiapkan untuk masa depan bila admin menambah katalog lagi.
  const katalog = katalog0.filter(function (b) { return cTxt(b.tipe) === 'katalog'; });
  const wrap = elById('book-catalog-wrap');
  const grid = elById('book-catalog');
  if (wrap && !katalog.length) wrap.classList.add('is-hidden');
  if (katalog.length && wrap && grid) {
    grid.innerHTML = katalog.map(function (b) {
      const cover = cTxt(b.cover)
        ? '<div class="bookcat-cover" style="background-image:url(\'' + cEsc(b.cover) + '\'); color:transparent;"><span style="visibility:hidden;">A</span></div>'
        : '<div class="bookcat-cover"><i class="fa-solid fa-book"></i></div>';
      const jenisBerkas = jenisKatalog(b);
      const link = cTxt(b.link)
        ? '<a class="btn btn-outline btn-sm" href="' + cEsc(b.link) + '" target="_blank" rel="noopener">' +
          (jenisBerkas ? 'Buka ' + jenisBerkas : 'Unduh / Baca') + '</a>'
        : '<button class="btn btn-outline btn-sm" type="button" data-nav="daftar">Info Program</button>';
      return '<article class="bookcat-card">' + cover + '<div class="bookcat-body"><h3>' + cEsc(b.judul) + '</h3>' +
        '<p>' + cEsc(b.deskripsi) + '</p>' + link + '</div></article>';
    }).join('');
    wrap.style.display = 'block';
  }
}
