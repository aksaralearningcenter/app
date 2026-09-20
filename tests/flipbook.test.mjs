// ==================== UJI: MESIN FLIPBOOK BERSAMA ====================
// Menguji src/js/shared/flipbook.js — mesin pembalik halaman yang dipakai dua
// tempat: pembaca buku di landing dan tombol Baca di panel Orang Tua.
// Karena modulnya menyentuh DOM, dipakai DOM tiruan minimal (tanpa dependensi)
// dengan model tinggi sederhana: 40 karakter per baris, 20px per baris.
// Jalankan: npm test
import test from 'node:test';
import assert from 'node:assert/strict';

// ---------- Model tinggi DOM tiruan ----------
const KARAKTER_PER_BARIS = 40;
const PIKSEL_PER_BARIS = 20;
const TINGGI_HALAMAN = 200;                                   // → 10 baris = 400 karakter
let ponsel = false;

global.window = {
  matchMedia: () => ({ get matches() { return ponsel; }, addEventListener() {} }),
  addEventListener() {}
};
global.document = { createElement: (tag) => fakeEl(tag) };

function tinggiDari(html) {
  // Penanda HTML tidak ikut dihitung — yang menentukan tinggi hanyalah teksnya.
  return Math.ceil(String(html).replace(/<[^>]*>/g, '').length / KARAKTER_PER_BARIS) * PIKSEL_PER_BARIS;
}

function fakeEl(tag) {
  const el = {
    tag: tag || 'div', _html: '', children: [], parentNode: null, classes: new Set(),
    dataset: {}, style: {}, listeners: {}, textContent: '', disabled: false,
    classList: {
      add(...c) { c.forEach(x => el.classes.add(x)); },
      remove(...c) { c.forEach(x => el.classes.delete(x)); },
      toggle(c, on) { const v = on === undefined ? !el.classes.has(c) : !!on; if (v) el.classes.add(c); else el.classes.delete(c); return v; },
      contains(c) { return el.classes.has(c); }
    },
    addEventListener(t, fn) { (el.listeners[t] = el.listeners[t] || []).push(fn); },
    // Elemen yang disisipkan ke area halaman mewarisi tinggi kotak halaman —
    // sama seperti probe milik modul yang mengikuti aturan CSS halaman.
    appendChild(c) { c.parentNode = el; if (el._halaman) c._halaman = true; el.children.push(c); return c; },
    removeChild(c) { el.children = el.children.filter(x => x !== c); c.parentNode = null; return c; },
    klik() { (el.listeners.click || []).forEach(fn => fn()); }
  };
  Object.defineProperty(el, 'innerHTML', {
    get: () => el._html,
    set: (v) => {
      el._html = v;
      // Elemen pertama di dalam HTML dianggap muka halaman: tinggi kotaknya
      // nyata (kalau `dukungUkur`) dan tinggi isinya dihitung dari teksnya.
      el._first = /^\s*<[a-z]/.test(v) ? fakeEl('div', { halaman: el._halaman, html: v }) : null;
    }
  });
  el._halaman = !!(arguments[1] && arguments[1].halaman);
  if (arguments[1] && typeof arguments[1].html === 'string') el._html = arguments[1].html;
  Object.defineProperty(el, 'firstElementChild', { get: () => el._first || null });
  Object.defineProperty(el, 'clientHeight', { get: () => (el._halaman ? TINGGI_HALAMAN : 0) });
  Object.defineProperty(el, 'scrollHeight', { get: () => tinggiDari(el._html) });
  return el;
}

// Root tiruan: leaves + tombol ‹ › + penghitung halaman.
// `dukungUkur: true` → kotak halaman punya tinggi nyata (jalur pemenggalan
// terukur); `false` → seperti tanpa CSS tata letak (jalur cadangan).
function buatRoot(dukungUkur) {
  // Area halaman: anak yang disisipkan ke sini (termasuk probe modul) mewarisi
  // tinggi kotak halaman, seperti aturan CSS halaman di browser sungguhan.
  const leaves = fakeEl('div', { halaman: !!dukungUkur });
  leaves.querySelectorAll = function (sel) {
    const cls = sel.replace(/^\./, '');
    // Elemen lembar dipakai ulang selama isinya sama, supaya kelas
    // (m-aktif / m-belakang) yang dipasang modul tetap bisa diperiksa.
    if (leaves._cacheFor === leaves._html) return leaves._cache;
    const n = (leaves._html.match(new RegExp('class="' + cls + '"', 'g')) || []).length;
    leaves._cache = Array.from({ length: n }, () => fakeEl('div'));
    leaves._cacheFor = leaves._html;
    return leaves._cache;
  };
  const prev = fakeEl('button'), next = fakeEl('button'), count = fakeEl('span');
  const map = { '#leaves': leaves, '#prev': prev, '#next': next, '#count': count };
  return { root: { querySelector: sel => map[sel] || null }, leaves, prev, next, count };
}

const OPSI = { leavesSel: '#leaves', prevSel: '#prev', nextSel: '#next', countSel: '#count', leafClass: 'ak-leaf' };
const muka = (hal, face, num) => '<div class="ak-face ' + face + '">' + (hal || '') + '</div>';
const potong = n => 'x'.repeat(n);
const TEKS = [potong(400), potong(400), potong(400), potong(400), potong(400)].join('\n');
const tunggu = ms => new Promise(r => setTimeout(r, ms));

// Impor setelah DOM tiruan siap (modul membaca window/document saat dipakai).
const { buatFlipbook } = await import('../docs/src/js/shared/flipbook.js');

// Ambil teks tiap halaman dari HTML lembar yang dihasilkan modul.
function teksHalaman(html) {
  const hasil = [];
  const re = /<div class="ak-face [a-z]+">([\s\S]*?)<\/div>/g;
  let m;
  while ((m = re.exec(html))) hasil.push(m[1]);
  return hasil;
}

// ---------- Pemenggalan TERUKUR: halaman harus PAS, tanpa gulir ----------
test('terukur: tiap halaman pas tinggi kotak (tanpa perlu digulir)', () => {
  ponsel = false;
  const { root, leaves, count } = buatRoot(true);
  buatFlipbook(root, OPSI).bangun(TEKS, muka);

  const halaman = teksHalaman(leaves._html).filter(t => t !== '');
  assert.equal(halaman.length, 5, 'satu paragraf 400 karakter mengisi satu halaman penuh');
  halaman.forEach((t, i) => {
    assert.ok(tinggiDari(t) <= TINGGI_HALAMAN, 'halaman ' + (i + 1) + ' tidak melebihi tinggi kotak');
  });
  assert.equal(halaman.join('\n'), TEKS, 'seluruh isi tetap ada, tidak ada yang hilang/dobel');
  assert.equal(count.textContent, 'Halaman 1 dari 6', '5 halaman → 6 (genap) → 3 lembar');
});

test('terukur: paragraf raksasa dipecah per kata, tanpa bagian hilang', () => {
  ponsel = false;
  const { root, leaves } = buatRoot(true);
  const teks = Array.from({ length: 200 }, () => 'aaaa').join(' ');   // 999 karakter, satu paragraf
  buatFlipbook(root, OPSI).bangun(teks, muka);

  const halaman = teksHalaman(leaves._html).filter(t => t !== '');
  assert.ok(halaman.length > 1, 'paragraf panjang harus dipecah ke beberapa halaman');
  halaman.forEach((t, i) => {
    assert.ok(tinggiDari(t) <= TINGGI_HALAMAN, 'halaman ' + (i + 1) + ' tetap muat');
  });
  assert.equal(halaman.join(' ').replace(/\s+/g, ' ').trim(), teks.replace(/\s+/g, ' ').trim());
});

// ---------- Jalur cadangan (kotak halaman tanpa tinggi nyata) ----------
test('cadangan: tanpa tinggi kotak, isi dipecah per ±900 karakter', () => {
  ponsel = false;
  const { root, leaves, count } = buatRoot(false);
  buatFlipbook(root, OPSI).bangun(TEKS, muka);
  assert.equal(teksHalaman(leaves._html).filter(t => t !== '').length, 3);
  assert.equal(count.textContent, 'Halaman 1 dari 4');
});

test('desktop: halaman bisa dibalik dan berhenti di ujung', async () => {
  ponsel = false;
  const { root, leaves, prev, next, count } = buatRoot(false);
  const flip = buatFlipbook(root, OPSI);
  flip.pasang();
  flip.bangun(TEKS, muka);

  assert.equal(leaves._html.split('class="ak-leaf"').length - 1, 2, 'jumlah lembar');
  assert.equal(leaves._html.split('class="ak-face').length - 1, 4, 'muka halaman terisi');
  assert.equal(prev.disabled, true, 'mundur mati di halaman pertama');
  assert.equal(next.disabled, false);

  next.klik();
  await tunggu(1000);
  assert.equal(count.textContent, 'Halaman 2–3 dari 4', 'yang tampak = dua halaman bersebelahan');
  assert.equal(prev.disabled, false);

  next.klik();
  await tunggu(1000);
  assert.equal(next.disabled, true, 'maju mati di lembar terakhir');
  assert.equal(count.textContent, 'Halaman 4 dari 4', 'di ujung buku halaman kanan tak ada');

  next.klik();                       // melewati akhir → tidak berubah
  await tunggu(950);
  assert.equal(count.textContent, 'Halaman 4 dari 4');

  prev.klik();
  await tunggu(1000);
  assert.equal(count.textContent, 'Halaman 2–3 dari 4');
});

test('buku tanpa isi: halaman placeholder tetap satu lembar', () => {
  ponsel = false;
  const { root, leaves, count } = buatRoot(true);
  buatFlipbook(root, OPSI).bangun('   ', muka);
  assert.ok(leaves._html.includes('belum tersedia'));
  assert.equal(count.textContent, 'Halaman 1 dari 2');
});

// ---------- Halaman khusus (sampul, hak cipta, daftar pustaka, penutup) ----------
test('halaman khusus: ikut tersusun dan punya nama di Daftar Isi', () => {
  ponsel = false;
  const { root, leaves } = buatRoot(true);
  const flip = buatFlipbook(root, OPSI);
  const khusus = (label, teks) => ({ label: label, html: (face) => '<div class="ak-face ' + face + '">' + teks + '</div>' });
  flip.bangun(TEKS, muka, { depan: [khusus('Sampul', 'S')], belakang: [khusus('Penutup', 'P')] });

  const hal = flip.daftarHalaman();
  assert.equal(hal[0].label, 'Sampul', 'sampul jadi halaman pertama');
  assert.equal(hal[0].jenis, 'khusus');
  assert.equal(hal[1].jenis, 'isi', 'sisanya halaman isi biasa');
  assert.ok(hal[1].label.endsWith('…'), 'halaman isi diberi cuplikan baris pertamanya');
  const iPenutup = hal.map((h) => h.label).indexOf('Penutup');
  assert.ok(iPenutup > 0, 'penutup ada di daftar halaman');
  assert.equal(hal[iPenutup].jenis, 'khusus');
  assert.equal(hal.length % 2, 0, 'jumlah halaman selalu genap (pasangan lembar)');
  assert.ok(leaves._html.includes('>S<'), 'halaman sampul benar-benar tergambar');
});

// ---------- Laporan status (dipakai memusatkan buku & menutup Daftar Isi) ----------
test('padaUbah: melaporkan status lembar — tertutup, sedang dibalik, lalu terbuka', async () => {
  ponsel = false;
  const { root, next } = buatRoot(false);
  const catat = [];
  const flip = buatFlipbook(root, Object.assign({}, OPSI, { padaUbah: (s) => catat.push(s) }));
  flip.pasang();
  flip.bangun(TEKS, muka);

  assert.ok(catat.length > 0, 'membangun buku memicu laporan status');
  assert.equal(catat[catat.length - 1].turned, 0, 'awalnya buku masih tertutup');
  assert.equal(catat[catat.length - 1].ponsel, false);

  next.klik();
  assert.equal(catat[catat.length - 1].animasi, true, 'laporan dikirim segera saat lembar mulai dibalik');
  await tunggu(1000);
  assert.equal(catat[catat.length - 1].turned, 1, 'setelah animasi selesai buku terbuka');
});

// ---------- Lompat halaman (Daftar Isi) ----------
test('keHalaman: lompat langsung ke halaman tertentu', () => {
  ponsel = false;
  const { root, count, prev, next } = buatRoot(false);
  const flip = buatFlipbook(root, OPSI);
  flip.pasang();
  flip.bangun(TEKS, muka);

  flip.keHalaman(3);
  assert.equal(count.textContent, 'Halaman 2–3 dari 4', 'halaman 3 tampak di sisi kanan');
  assert.equal(prev.disabled, false);

  flip.keHalaman(4);
  assert.equal(count.textContent, 'Halaman 4 dari 4', 'halaman terakhir butuh dua lembar terbalik');
  assert.equal(next.disabled, true);

  flip.keHalaman(1);
  assert.equal(count.textContent, 'Halaman 1 dari 4');
  assert.equal(prev.disabled, true);
});

test('ponsel: satu halaman per layar', () => {
  ponsel = true;
  const { root, leaves, prev, next, count } = buatRoot(false);
  const flip = buatFlipbook(root, OPSI);
  flip.pasang();
  flip.bangun(TEKS, muka);

  assert.equal(count.textContent, 'Halaman 1 dari 4');
  assert.equal(leaves.querySelectorAll('.ak-leaf')[0].classes.has('m-aktif'), true);

  next.klik();
  assert.equal(count.textContent, 'Halaman 2 dari 4');
  assert.equal(leaves.querySelectorAll('.ak-leaf')[0].classes.has('m-belakang'), true);

  prev.klik();
  assert.equal(count.textContent, 'Halaman 1 dari 4');
  assert.equal(prev.disabled, true);
  ponsel = false;
});
