// ==================== KONTEN DINAMIS — KATALOG BUKU (Gaya Perbukuan) ====================
// Meniru pola portal perbukuan (SIBI): katalog dengan pencarian, filter kategori
// & jenjang, pengurutan, grid kartu buku, halaman detail (metadata daftar
// pustaka), lalu pembaca halaman + tombol unduh.
import { cTxt, cEsc, byUrutan, elById, tampilkan } from './util.js';

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
// Tombol Baca membuka buku sebagai flipbook dua halaman: lembar dibalik dengan
// tombol, geser (ponsel), atau panah keyboard. Di layar ponsel buku tampil satu
// halaman per layar seperti e-reader.
const pembaca = { aktif: false, buku: null, halaman: [], leaves: [], turned: 0, N: 0, animating: false, ponsel: 0 };
const mqlPonsel = (window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false });

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

// Satu halaman flipbook (muka lembar).
function faceHtml(hal, face, num, buku) {
  const paras = cTxt(hal).split(/\n+/).filter(Boolean)
    .map(function (p) { return '<p>' + cEsc(p) + '</p>'; }).join('');
  // Judul besar hanya di halaman pertama; halaman lain cukup kicker jenis buku.
  const kepala = (num === 1)
    ? '<h3>' + cEsc(buku.judul) + '</h3>' +
      (cTxt(buku.cover) ? '<img src="' + cEsc(buku.cover) + '" alt="' + cEsc(buku.judul) + '" style="width:100%; border-radius:8px; margin:6px 0 12px;">' : '')
    : '';
  return '<div class="face ' + face + '">' +
    '<div class="page-kicker">' + cEsc(buku.jenis || buku.deskripsi || 'Buku') + '</div>' +
    kepala + paras +
    '<div class="page-num">' + num + '</div></div>';
}

// Bangun lembar-lembar flipbook dari isi buku yang sedang dibuka.
function flipBangun() {
  const leaves = elById('reader-leaves');
  if (!leaves) return;
  let pages = pembaca.halaman.slice();
  if (!pages.length) pages = ['Isi buku ini belum diunggah. Silakan unduh berkasnya bila tersedia.'];
  if (pages.length % 2) pages.push('');          // jumlah genap = pasangan lembar
  pembaca.N = pages.length / 2;
  let html = '';
  for (let i = 0; i < pembaca.N; i++) {
    html += '<div class="sp-leaf">' +
      faceHtml(pages[i * 2], 'front', i * 2 + 1, pembaca.buku) +
      faceHtml(pages[i * 2 + 1], 'back', i * 2 + 2, pembaca.buku) + '</div>';
  }
  leaves.innerHTML = html;
  pembaca.leaves = Array.prototype.slice.call(leaves.querySelectorAll('.sp-leaf'));
  pembaca.turned = 0;
  pembaca.ponsel = 0;
  pembaca.animating = false;
  pembaca.leaves.forEach(function (l) { l.classList.remove('flipped', 'flipping', 'm-aktif', 'm-belakang'); });
  flipZ();
  flipUpdate();
}

// Tumpukan: lembar belum-dibalik (kanan) selalu di atas lembar terbalik (kiri).
function flipZ() {
  pembaca.leaves.forEach(function (leaf, k) {
    leaf.style.zIndex = String(k < pembaca.turned ? (100 + k + 1) : (200 + (pembaca.N - k)));
  });
}

function totalPonsel() { return pembaca.N * 2; }

function flipUpdate() {
  const prev = elById('reader-prev');
  const next = elById('reader-next');
  const count = elById('reader-count');
  if (mqlPonsel.matches) {
    const hal = pembaca.ponsel;
    pembaca.leaves.forEach(function (leaf, k) {
      const aktif = k === Math.floor(hal / 2);
      leaf.classList.toggle('m-aktif', aktif);
      leaf.classList.toggle('m-belakang', aktif && (hal % 2 === 1));
    });
    if (prev) prev.disabled = hal <= 0;
    if (next) next.disabled = hal >= totalPonsel() - 1;
    if (count) count.textContent = 'Halaman ' + (hal + 1) + ' / ' + totalPonsel();
    return;
  }
  if (prev) prev.disabled = pembaca.turned <= 0;
  if (next) next.disabled = pembaca.turned >= pembaca.N;
  if (count) count.textContent = 'Buku ' + (pembaca.turned + 1) + ' / ' + (pembaca.N + 1);
}

function flipMaju() {
  if (mqlPonsel.matches) {
    if (pembaca.ponsel < totalPonsel() - 1) { pembaca.ponsel++; flipUpdate(); }
    return;
  }
  if (pembaca.animating || pembaca.turned >= pembaca.N) return;
  const leaf = pembaca.leaves[pembaca.turned];
  if (!leaf) return;
  pembaca.animating = true;
  leaf.style.zIndex = '500';
  leaf.classList.add('flipping');
  leaf.classList.add('flipped');
  setTimeout(function () {
    leaf.classList.remove('flipping');
    pembaca.turned++;
    pembaca.animating = false;
    flipZ();
    flipUpdate();
  }, 900);
}

function flipMundur() {
  if (mqlPonsel.matches) {
    if (pembaca.ponsel > 0) { pembaca.ponsel--; flipUpdate(); }
    return;
  }
  if (pembaca.animating || pembaca.turned <= 0) return;
  const leaf = pembaca.leaves[pembaca.turned - 1];
  if (!leaf) return;
  pembaca.animating = true;
  leaf.style.zIndex = '500';
  leaf.classList.add('flipping');
  leaf.classList.remove('flipped');
  setTimeout(function () {
    leaf.classList.remove('flipping');
    pembaca.turned--;
    pembaca.animating = false;
    flipZ();
    flipUpdate();
  }, 900);
}

function bukaPembaca(id) {
  const b = cariBuku(id);
  if (!b) return;
  const link = cTxt(b.link);
  // Tanpa isi tapi ada tautan berkas → langsung buka berkasnya.
  if (!cTxt(b.isi).trim() && link) { window.open(link, '_blank', 'noopener'); return; }
  pembaca.aktif = true;
  pembaca.buku = b;
  pembaca.halaman = pecahHalaman(b.isi);
  const reader = elById('book-reader');
  if (!reader) return;
  // Sampul dalam flipbook menampilkan judul & jenis buku yang dibuka.
  const ct = elById('reader-cover-title');
  if (ct) ct.textContent = cTxt(b.judul).substring(0, 42) || 'AKSARA';
  const cs = elById('reader-cover-sub');
  if (cs) cs.textContent = cTxt(b.jenis) || (cTxt(b.tipe) === 'flipbook' ? 'Booklet' : 'Katalog');
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
  flipBangun();
}

function tutupPembaca() {
  const reader = elById('book-reader');
  if (!reader) return;
  pembaca.aktif = false;
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
    const prev = elById('reader-prev'); if (prev) prev.addEventListener('click', function () { flipMundur(); });
    const next = elById('reader-next'); if (next) next.addEventListener('click', function () { flipMaju(); });
    // Geser untuk membalik lembar (perangkat sentuh).
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
        if (dx < 0) flipMaju(); else flipMundur();
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
  if (document.body.dataset.bkKeys !== '1') {
    document.body.dataset.bkKeys = '1';
    document.addEventListener('keydown', function (e) {
      // Saat flipbook terbuka: panah membalik lembar, Esc menutup.
      if (pembaca.aktif) {
        if (e.key === 'Escape') { tutupPembaca(); return; }
        if (e.key === 'ArrowRight') { flipMaju(); return; }
        if (e.key === 'ArrowLeft') { flipMundur(); return; }
        return;
      }
      if (e.key !== 'Escape') return;
      const d = elById('book-detail');
      if (d && d.classList.contains('open')) tutupDetail();
    });
    // Ganti mode desktop ↔ ponsel → gambar ulang posisi halaman.
    const gantiMode = function () { if (pembaca.aktif) { pembaca.ponsel = 0; flipUpdate(); } };
    if (mqlPonsel.addEventListener) mqlPonsel.addEventListener('change', gantiMode);
    else if (mqlPonsel.addListener) mqlPonsel.addListener(gantiMode);
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
