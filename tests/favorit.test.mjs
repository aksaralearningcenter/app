// ==================== UJI: BUKU FAVORIT & TAUTAN BAGIKAN ====================
// Menguji src/js/landing/konten/favorit.js — bagian murninya (daftar id dan
// tautan bagikan) tidak menyentuh DOM, jadi bisa diuji langsung.
// Jalankan: npm test
import test from 'node:test';
import assert from 'node:assert/strict';

const { bacaDaftar, toggleDaftar, adaDiDaftar, tautanBuku, tautanKatalog, idDariAlamat } =
  await import('../docs/src/js/landing/konten/favorit.js');

test('bacaDaftar: tahan data rusak dan buang duplikat', () => {
  assert.deepEqual(bacaDaftar('["a","b"]'), ['a', 'b']);
  assert.deepEqual(bacaDaftar('["a","a","b"]'), ['a', 'b'], 'duplikat dibuang');
  assert.deepEqual(bacaDaftar('[" a ",""]'), ['a'], 'spasi dipangkas, kosong dibuang');
  assert.deepEqual(bacaDaftar('{"a":1}'), [], 'bukan larik → kosong');
  assert.deepEqual(bacaDaftar('[1,null,true]'), [], 'bukan string → kosong');
  assert.deepEqual(bacaDaftar('bukan json'), [], 'JSON rusak → kosong');
  assert.deepEqual(bacaDaftar(''), [], 'kosong → kosong');
  assert.deepEqual(bacaDaftar(null), []);
});

test('toggleDaftar: menandai lalu melepas, tanpa mengubah masukan', () => {
  const awal = ['a'];
  assert.deepEqual(toggleDaftar(awal, 'b'), ['a', 'b'], 'buku baru ditambahkan');
  assert.deepEqual(awal, ['a'], 'daftar masukan tidak diubah');
  assert.deepEqual(toggleDaftar(['a', 'b'], 'a'), ['b'], 'yang sudah ada dilepas');
  assert.deepEqual(toggleDaftar(['a'], 'a'), []);
  assert.deepEqual(toggleDaftar(null, 'x'), ['x'], 'masukan tak sah tetap aman');
  assert.deepEqual(toggleDaftar(['a'], '  '), ['a'], 'id kosong diabaikan');
});

test('adaDiDaftar: cek keanggotaan dengan id apa pun', () => {
  assert.equal(adaDiDaftar(['7'], 7), true, 'id angka dibandingkan sebagai teks');
  assert.equal(adaDiDaftar(['a'], 'b'), false);
  assert.equal(adaDiDaftar(null, 'a'), false);
  assert.equal(adaDiDaftar(['a'], ''), false);
});

test('tautanBuku: alamat langsung ke satu buku, parameter uji lokal tetap ikut', () => {
  assert.equal(tautanBuku('https://situs/app/', 'BK 7'), 'https://situs/app/#buku/BK%207');
  assert.equal(tautanBuku('https://situs/app/#buku', 'x'), 'https://situs/app/#buku/x',
    'hash lama diganti, tidak menumpuk');
  assert.equal(tautanBuku('http://localhost:8080/?api=http://api.test', '1'),
    'http://localhost:8080/?api=http://api.test#buku/1');
  assert.equal(tautanKatalog('https://situs/app/#buku/7'), 'https://situs/app/#buku');
});

test('idDariAlamat: membaca id buku dari alamat halaman', () => {
  assert.equal(idDariAlamat('#buku/BK-12'), 'BK-12');
  assert.equal(idDariAlamat('#/buku/BK-12'), 'BK-12', 'bentuk lama #/ juga diterima');
  assert.equal(idDariAlamat('#buku/BK%207'), 'BK 7', 'karakter khusus dikembalikan');
  assert.equal(idDariAlamat('#buku'), '', 'tanpa id → tidak membuka detail');
  assert.equal(idDariAlamat('#harga/1'), '');
  assert.equal(idDariAlamat('#ngawur'), '');
  assert.equal(idDariAlamat(''), '');
});
