// ==================== KONTEN DINAMIS — KATALOG BUKU (Gaya Perbukuan) ====================
// Meniru pola portal perbukuan (SIBI): katalog dengan pencarian, filter kategori
// & jenjang, pengurutan, grid kartu buku, halaman detail (metadata daftar
// pustaka), lalu pembaca halaman + tombol unduh.
import { cTxt, cEsc, byUrutan, elById, tampilkan } from './util.js';
import { buatFlipbook } from '../../shared/flipbook.js';
import { mukaIsi, halamanSampul, halamanHakCipta, halamanPustaka, halamanPenutup,
  pasangKendali } from '../../shared/reader-buku.js';
import { toggleDaftar, adaDiDaftar, tautanBuku, tautanKatalog, idDariAlamat,
  ambilFavorit, simpanFavorit } from './favorit.js';

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

// ---------- PESAN SINGKAT (TOAST) ----------
// Umpan balik untuk aksi yang tidak mengganti halaman: menyimpan favorit,
// menyalin tautan, atau saat peramban tidak bisa membagikan sendiri.
let toastTimer = null;
function pesan(teks) {
  const el = elById('lp-toast');
  if (!el) return;
  el.textContent = teks;
  el.classList.add('tampil');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('tampil'); }, 2800);
}

// ---------- BAGIKAN ----------
// Pakai lembar berbagi bawaan perangkat (ponsel) bila ada; kalau tidak, tautan
// disalin supaya tetap bisa ditempel ke grup/WhatsApp.
function bagikan(b) {
  const alamat = tautanBuku(location.href, b.id);
  const judul = cTxt(b.judul) || 'Buku Aksara';
  if (navigator.share) {
    navigator.share({
      title: judul,
      text: 'Baca "' + judul + '" di Perpustakaan Digital Aksara Learning Center',
      url: alamat
    }).catch(function (e) {
      // Batal dibagikan bukan kegagalan — jangan paksa menyalin tautan.
      if (!e || e.name !== 'AbortError') salinTautan(alamat);
    });
    return;
  }
  salinTautan(alamat);
}

function salinTautan(alamat) {
  const beres = function () { pesan('Tautan buku disalin — siap dibagikan.'); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(alamat).then(beres, function () { pesan('Tautan: ' + alamat); });
    return;
  }
  pesan('Tautan: ' + alamat);            // peramban lama/tanpa izin: tunjukkan tautannya
}

// ---------- FAVORIT ----------
function tersimpan(id) { return adaDiDaftar(katalogState.daftar, id); }

function judulSimpan(id) { return tersimpan(id) ? 'Lepas dari favorit' : 'Simpan ke favorit'; }
function teksSimpan(id) { return tersimpan(id) ? 'Tersimpan' : 'Simpan'; }
function ikonSimpan(id) { return tersimpan(id) ? 'fa-solid fa-star' : 'fa-regular fa-star'; }

// Samakan seluruh tombol favorit yang sedang tampil: penghitung di toolbar,
// tombol di halaman detail, dan tombol di pembaca buku.
function segarkanTombolFavorit() {
  const n = katalogState.daftar.length;
  const tog = elById('book-fav');
  if (tog) {
    tog.classList.toggle('aktif', !!katalogState.favorit);
    tog.setAttribute('aria-pressed', katalogState.favorit ? 'true' : 'false');
    // Tersembunyi selama belum ada favorit (dan tidak sedang menyaringnya).
    tog.classList.toggle('is-hidden', n === 0 && !katalogState.favorit);
    const hitung = elById('book-fav-count');
    if (hitung) hitung.textContent = String(n);
  }
  [['bd-simpan', detailId], ['reader-simpan', pembaca.buku ? pembaca.buku.id : '']].forEach(function (x) {
    const t = elById(x[0]);
    if (!t) return;
    const ada = !!cTxt(x[1]).trim();
    t.classList.toggle('is-hidden', !ada);
    if (!ada) return;
    t.setAttribute('aria-pressed', tersimpan(x[1]) ? 'true' : 'false');
    t.title = judulSimpan(x[1]);
    const ikon = t.querySelector('i');
    if (ikon) ikon.className = ikonSimpan(x[1]);
    const teks = t.querySelector('.fav-teks');
    if (teks) teks.textContent = teksSimpan(x[1]);
  });
}

function toggleFavorit(id) {
  const b = cariBuku(id);
  const sebelumnya = tersimpan(id);
  katalogState.daftar = toggleDaftar(katalogState.daftar, id);
  simpanFavorit(katalogState.daftar);
  pesan((sebelumnya ? 'Dilepas dari favorit: ' : 'Disimpan ke favorit: ') + (b ? cTxt(b.judul) : ''));
  terapkanKatalog();          // sekalian menyegarkan tombol & penghitung favorit
}

// ---------- PEMBACA BUKU (FLIPBOOK) ----------
// Tombol Baca membuka buku sebagai flipbook dua halaman lewat modul bersama
// ../../shared/flipbook.js. Susunannya mengikuti urutan buku cetak: sampul →
// halaman hak cipta → isi → daftar pustaka → penutup. Lembar dibalik dengan
// tombol panah, klik halaman, geser (ponsel), atau panah keyboard; di layar
// ponsel buku tampil satu halaman per layar.
const pembaca = { aktif: false, buku: null, depan: 0 };
let flip = null;
let kendali = null;     // tombol −/+, Daftar Isi, layar penuh (modul bersama)
// Buku yang sedang dibuka di halaman detail (dipakai tombol favorit di sana).
let detailId = '';

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
        if (kendali) kendali.padaUbah(s);      // halaman berpindah → tutup Daftar Isi
      }
    });
    flip.pasang();
    // Kendali pembaca (tulisan −/+, Daftar Isi, layar penuh, klik halaman) dari
    // modul bersama — sama persis dengan pembaca di panel admin.
    // Kendali dicari dari SELURUH panel, bukan hanya area buku: bilah atas
    // (Simpan/Bagikan/Layar Penuh) dan baris kontrol (ukuran tulisan, Daftar Isi)
    // berada di luar wadah buku.
    kendali = pasangKendali(elById('reader-panel'), flip, {
      kecilSel: '#reader-kecil', besarSel: '#reader-besar',
      tombolDaftarSel: '#reader-daftar', panelDaftarSel: '#reader-toc',
      tutupDaftarSel: '#reader-toc-tutup', listDaftarSel: '#reader-toc-list',
      stageSel: '#reader-spread', panelSel: '#reader-panel', skalaSel: '#reader-panel',
      layarSel: '#reader-full', ikonLayarSel: '#reader-full-ikon', teksLayarSel: '#reader-full-teks',
      // Tombol "Kembali ke katalog" di halaman penutup menutup buku.
      tutupSel: '[data-tutup]', padaTutup: tutupPembaca,
      leafClass: 'sp-leaf'
    });
  }
  return flip;
}

// Halaman isi & halaman khusus (sampul, hak cipta, daftar pustaka, penutup),
// Daftar Isi, serta kendali pembaca datang dari modul bersama
// ../../shared/reader-buku.js — sama dengan pembaca di panel admin.

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
      '<button class="rd-btn" id="reader-simpan" type="button" aria-pressed="false"><i class="fa-regular fa-star"></i> <span class="fav-teks">Simpan</span></button>' +
      '<button class="rd-btn" id="reader-bagikan" type="button"><i class="fa-solid fa-share-nodes"></i> <span>Bagikan</span></button>' +
      '<button class="rd-btn" id="reader-full" type="button"><i class="fa-solid fa-expand" id="reader-full-ikon"></i> <span id="reader-full-teks">Layar Penuh</span></button>';
    const simp = elById('reader-simpan');
    if (simp && simp.dataset.siap !== '1') {
      simp.dataset.siap = '1';
      simp.addEventListener('click', function () { if (pembaca.buku) toggleFavorit(pembaca.buku.id); });
    }
    const bag = elById('reader-bagikan');
    if (bag && bag.dataset.siap !== '1') {
      bag.dataset.siap = '1';
      bag.addEventListener('click', function () { if (pembaca.buku) bagikan(pembaca.buku); });
    }
  }  // Sampul & hak cipta di depan, daftar pustaka & penutup di belakang.
  // `jumlahDepan` = banyaknya halaman pembuka (dipakai sebagai offset nomor
  // halaman: pembuka bernomor Romawi, isi buku mulai dari 1).
  const jumlahDepan = 2;
  const depan = [halamanSampul(b), halamanHakCipta(b, { depan: jumlahDepan })];
  const belakang = [
    halamanPustaka(b, { depan: jumlahDepan }),
    halamanPenutup(b, {
      depan: jumlahDepan,
      aksiHtml: (link
        ? '<a class="btn btn-primary btn-sm" href="' + cEsc(link) + '" target="_blank" rel="noopener"><i class="fa-solid fa-download"></i> Unduh berkas</a>'
        : '') +
      '<button class="btn btn-outline btn-sm" type="button" data-tutup="1"><i class="fa-solid fa-list-ul"></i> Kembali ke katalog</button>'
    })
  ];
  pembaca.depan = jumlahDepan;
  reader.classList.add('open');
  reader.setAttribute('aria-hidden', 'false');
  document.body.classList.add('reader-open');
  // Instance dibuat lebih dulu supaya kendali (ukuran tulisan & Daftar Isi)
  // sudah siap sebelum halaman pertama diukur.
  const flip = flipInstance();
  if (kendali) { kendali.tutupDaftarIsi(); kendali.terapkanZoom(); }
  flip.bangun(b.isi, function (hal, face, num) {
    return mukaIsi(hal, face, num, b, { depan: pembaca.depan });
  }, { depan: depan, belakang: belakang });
  if (kendali) kendali.isiDaftarIsi(pembaca.depan);
  segarkanTombolFavorit();      // tombol Simpan/Bagikan menyesuaikan buku yang dibuka
}

function tutupPembaca() {
  const reader = elById('book-reader');
  if (!reader) return;
  pembaca.aktif = false;
  if (kendali) kendali.tutupDaftarIsi();
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
  detailId = cTxt(b.id);
  const aksi = elById('bd-actions');
  if (aksi) {
    aksi.innerHTML =
      ((adaIsi || b.link)
        ? '<button class="btn btn-primary btn-sm" type="button" data-baca="' + cEsc(b.id) + '"><i class="fa-solid fa-book-open"></i> Baca Sekarang</button>'
        : '') +
      (b.link
        ? '<a class="btn btn-outline btn-sm" href="' + cEsc(b.link) + '" target="_blank" rel="noopener"><i class="fa-solid fa-download"></i> ' +
          (jenis ? 'Unduh ' + jenis : 'Unduh berkas') + '</a>'
        : '') +
      '<button class="btn btn-outline btn-sm" id="bd-simpan" type="button" aria-pressed="false"><i class="fa-regular fa-star"></i> <span class="fav-teks">Simpan</span></button>' +
      '<button class="btn btn-outline btn-sm" id="bd-bagikan" type="button"><i class="fa-solid fa-share-nodes"></i> Bagikan</button>';
  }
  // Tautan buku yang dibuka jadi punya alamatnya sendiri, mis. …/#buku/BK-12,
  // sehingga bisa dibagikan dan tetap terbuka setelah di-refresh.
  try { history.replaceState(null, '', tautanBuku(location.href, b.id)); } catch (_e) { /* abaikan */ }
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
  detailId = '';
  d.classList.remove('open');
  d.setAttribute('aria-hidden', 'true');
  if (!pembaca.aktif) document.body.classList.remove('reader-open');
  // Kembalikan alamat ke daftar katalog supaya refresh tidak membuka detail lagi.
  try { history.replaceState(null, '', tautanKatalog(location.href)); } catch (_e) { /* abaikan */ }
}

// Cari buku dari daftar yang sedang dimuat (aman untuk id apa pun).
function cariBuku(id) {
  return (katalogState.semua || []).filter(function (x) { return String(x.id) === String(id); })[0];
}

// ---------- KATALOG: PENCARIAN, FILTER, URUT ----------
const katalogState = {
  semua: [], jenis: 'Semua', jenjang: 'Semua', cari: '', urut: 'urutan',
  // Buku favorit pembaca (tersimpan di peramban) + apakah sedang menyaringnya.
  daftar: ambilFavorit(), favorit: false
};

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
  if (katalogState.favorit) {
    list = list.filter(function (b) { return tersimpan(b.id); });
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
  // Tombol simpan menempel di sampul: bisa dijangkau tanpa membuka detail.
  const simpan = '<button class="bk-save" type="button" data-simpan="' + cEsc(b.id) + '" aria-pressed="' +
    (tersimpan(b.id) ? 'true' : 'false') + '" title="' + cEsc(judulSimpan(b.id)) + '" aria-label="' +
    cEsc(judulSimpan(b.id) + ': ' + cTxt(b.judul)) + '"><i class="' + ikonSimpan(b.id) + '"></i></button>';
  const unduh = link
    ? '<a class="btn btn-outline btn-sm" href="' + cEsc(link) + '" target="_blank" rel="noopener"><i class="fa-solid fa-download"></i> Unduh</a>'
    : '';
  const bagikanBtn = '<button class="bk-share" type="button" data-bagikan="' + cEsc(b.id) +
    '" title="Bagikan buku ini" aria-label="Bagikan ' + cEsc(b.judul) + '"><i class="fa-solid fa-share-nodes"></i></button>';
  return '<article class="bk-card" data-detail="' + cEsc(b.id) + '" tabindex="0" role="button" aria-label="Detail buku ' + cEsc(b.judul) + '">' +
    '<div class="bk-cover-wrap">' + cover + simpan + '</div>' +
    '<div class="bk-info">' + badges +
      '<h3>' + cEsc(b.judul) + '</h3>' +
      '<p class="bk-pustaka">' + (barisPustaka(b) ? cEsc(barisPustaka(b)) : cEsc(b.deskripsi || '')) + '</p>' +
      '<p class="bk-desc">' + cEsc(b.deskripsi || '') + '</p>' +
    '</div>' +
    '<div class="bk-actions">' + baca + unduh + bagikanBtn + '<span class="bk-detail-link">Detail <i class="fa-solid fa-arrow-right"></i></span></div>' +
    '</article>';
}

function terapkanKatalog() {
  const list = katalogTersaring();
  const grid = elById('book-catalog');
  const kosong = elById('book-empty');
  const count = elById('book-count');
  if (grid) grid.innerHTML = list.map(kartuBuku).join('');
  if (kosong) {
    const ada = list.length > 0;
    kosong.classList.toggle('is-hidden', ada);
    if (!ada) {
      const teks = kosong.querySelector('p');
      if (teks) {
        teks.textContent = (katalogState.favorit && !katalogState.cari.trim())
          ? 'Belum ada buku favorit. Tekan ikon bintang pada buku untuk menyimpannya di sini.'
          : 'Buku tidak ditemukan. Coba kata kunci atau kategori lain.';
      }
    }
  }
  if (count) {
    count.textContent = list.length + ' buku' +
      (katalogState.favorit ? ' · ★ favorit' : '') +
      (katalogState.jenis !== 'Semua' ? ' · ' + katalogState.jenis : '') +
      (katalogState.jenjang !== 'Semua' ? ' · ' + katalogState.jenjang : '') +
      (katalogState.cari.trim() ? ' · pencarian "' + katalogState.cari.trim() + '"' : '');
  }
  segarkanTombolFavorit();
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
      // Simpan favorit & bagikan tidak boleh ikut membuka detail buku.
      const simpan = e.target.closest ? e.target.closest('[data-simpan]') : null;
      if (simpan) { e.preventDefault(); e.stopPropagation(); toggleFavorit(simpan.getAttribute('data-simpan')); return; }
      const bagikanBtn = e.target.closest ? e.target.closest('[data-bagikan]') : null;
      if (bagikanBtn) {
        e.preventDefault(); e.stopPropagation();
        const b = cariBuku(bagikanBtn.getAttribute('data-bagikan'));
        if (b) bagikan(b);
        return;
      }
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
  const fav = elById('book-fav');
  if (fav && fav.dataset.siap !== '1') {
    fav.dataset.siap = '1';
    fav.addEventListener('click', function () {
      katalogState.favorit = !katalogState.favorit;
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
    // Ukuran tulisan, Daftar Isi (termasuk lompat ke halaman), klik halaman untuk
    // membalik, dan tombol layar penuh ditangani modul bersama reader-buku.js.
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
      if (baca) { e.preventDefault(); bukaPembaca(baca.getAttribute('data-baca')); return; }
      const simpan = e.target.closest ? e.target.closest('#bd-simpan') : null;
      if (simpan) { e.preventDefault(); if (detailId) toggleFavorit(detailId); return; }
      const bagikanBtn = e.target.closest ? e.target.closest('#bd-bagikan') : null;
      if (bagikanBtn) { e.preventDefault(); const b = cariBuku(detailId); if (b) bagikan(b); }
    });
  }
  // Tautan yang dibagikan (…#buku/<id>) meminta halaman Perpustakaan membuka
  // detail satu buku. Dipisah lewat event supaya modul navigasi tetap umum.
  if (document.body.dataset.bkAlamat !== '1') {
    document.body.dataset.bkAlamat = '1';
    document.addEventListener('lp:buka-buku', function (e) {
      bukaBukuDariAlamat(e.detail && e.detail.id);
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

// Buka detail satu buku dari alamat. Kalau data katalog belum turun, id-nya
// diingat dulu dan dibuka begitu daftarnya siap.
function bukaBukuDariAlamat(id) {
  const kunci = cTxt(id).trim();
  if (!kunci) return;
  if (!katalogState.semua.length) { katalogState.bukaId = kunci; return; }
  if (cariBuku(kunci)) bukaDetail(kunci);
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
    // Buka buku dari tautan yang dibagikan (…#buku/<id>) setelah daftarnya siap.
    const idAwal = katalogState.bukaId || idDariAlamat(location.hash);
    katalogState.bukaId = '';
    if (idAwal) bukaBukuDariAlamat(idAwal);
  }
  // Sembunyikan seluruh seksi bila admin belum menambahkan buku sama sekali.
  tampilkan(elById('buku'), adaKatalog);
}
