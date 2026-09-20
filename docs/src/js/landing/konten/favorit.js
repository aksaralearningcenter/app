// ==================== KONTEN DINAMIS — BUKU FAVORIT ====================
// Menyimpan buku favorit pembaca di peramban, tanpa perlu masuk akun.
//
// Berkas ini sengaja dipisah dari katalog: bagian yang murni (daftar id, tautan)
// tidak menyentuh DOM/localStorage sehingga bisa diuji langsung (lihat
// tests/favorit.test.mjs), sedangkan bagian penyimpanan hanya pembungkus tipis
// yang aman kalau localStorage diblokir (mode privat).

const KUNCI = 'aksara_buku_favorit';

// Baca daftar id dari teks JSON (isi localStorage). Tahan data rusak: apa pun
// yang bukan larik string dikembalikan sebagai daftar kosong, dan duplikat
// dibuang supaya hitungan favorit tidak pernah dobel.
export function bacaDaftar(teks) {
  try {
    const nilai = JSON.parse(teks || '[]');
    if (!Array.isArray(nilai)) return [];
    return nilai
      .filter(function (x) { return typeof x === 'string' && x.trim(); })
      .map(function (x) { return x.trim(); })
      .filter(function (x, i, a) { return a.indexOf(x) === i; });
  } catch (_e) { return []; }
}

// Tandai/lepas satu buku. Mengembalikan daftar BARU (masukan tidak diubah).
export function toggleDaftar(daftar, id) {
  const isi = Array.isArray(daftar) ? daftar.slice() : [];
  const kunci = String(id == null ? '' : id).trim();
  if (!kunci) return isi;
  const i = isi.indexOf(kunci);
  if (i === -1) isi.push(kunci); else isi.splice(i, 1);
  return isi;
}

export function adaDiDaftar(daftar, id) {
  const kunci = String(id == null ? '' : id).trim();
  return !!kunci && (Array.isArray(daftar) ? daftar : []).indexOf(kunci) !== -1;
}

// Tautan yang bisa dibagikan: membuka halaman Perpustakaan tepat di buku ini.
// Parameter lain di alamat (mis. ?api= untuk uji lokal) tetap dipertahankan.
export function tautanBuku(base, id) {
  const bersih = String(base || '').split('#')[0];
  return bersih + '#buku/' + encodeURIComponent(String(id == null ? '' : id).trim());
}

// Alamat daftar katalog (tanpa buku tertentu) — dipakai saat detail ditutup.
export function tautanKatalog(base) {
  return String(base || '').split('#')[0] + '#buku';
}

// Ambil id buku dari alamat, mis. "#buku/BK-12" → "BK-12" (selain itu '').
export function idDariAlamat(hash) {
  const isi = String(hash || '').replace(/^#\/?/, '');
  const bagian = isi.split('/');
  if ((bagian[0] || '').toLowerCase() !== 'buku') return '';
  try { return decodeURIComponent(bagian.slice(1).join('/') || '').trim(); }
  catch (_e) { return (bagian.slice(1).join('/') || '').trim(); }
}

// ---------- Penyimpanan (localStorage) ----------
export function ambilFavorit() {
  try { return bacaDaftar(localStorage.getItem(KUNCI)); } catch (_e) { return []; }
}

export function simpanFavorit(daftar) {
  try { localStorage.setItem(KUNCI, JSON.stringify(daftar || [])); } catch (_e) { /* mode privat: favorit hanya berlaku sesi ini */ }
}
