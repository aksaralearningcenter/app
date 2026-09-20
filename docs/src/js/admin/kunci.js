// ============ KUNCI ANTI-KLIK-GANDA ============
// Dipakai dispatcher terpusat (main.js) dan tombol simpan modal agar satu
// operasi tulis hanya berjalan sekali walau tombolnya diklik berkali-kali.
// Modul ini SENGAJA tanpa impor & tanpa sentuhan DOM di level atas supaya bisa
// diuji langsung dengan node --test (lihat tests/kunci.test.mjs).
'use strict';

// Kunci satu tombol selama operasinya berjalan. Balik false bila tombol sudah
// terkunci (klik ganda diabaikan). Aman untuk elemen palsu saat pengujian.
export function kunciTombol(el) {
  if (!el || !el.dataset) return true;
  if (el.dataset.sibuk === '1') return false;
  el.dataset.sibuk = '1';
  try { if ('disabled' in el) el.disabled = true; } catch (_e) { /* abaikan */ }
  return true;
}

export function lepasTombol(el) {
  if (!el || !el.dataset) return;
  try { delete el.dataset.sibuk; } catch (_e) { el.dataset.sibuk = ''; }
  try { if ('disabled' in el) el.disabled = false; } catch (_e) { /* abaikan */ }
}

// Kunci global operasi simpan modal (satu modal terbuka dalam satu waktu).
// Tombol yang memang sudah disabled sebelumnya TIDAK ikut dinyalakan lagi.
let simpanSibuk = false;
export function cobaKunciSimpan() {
  if (simpanSibuk) return false;
  simpanSibuk = true;
  kunciTombolSimpanModal(true);
  return true;
}

export function lepasKunciSimpan() {
  simpanSibuk = false;
  kunciTombolSimpanModal(false);
}

function kunciTombolSimpanModal(kunci) {
  let daftar = null;
  try { daftar = document.querySelectorAll('#modal .mf .btn'); } catch (_e) { return; }
  if (!daftar) return;
  Array.prototype.forEach.call(daftar, function (b) {
    if (!b || !b.dataset) return;
    if (kunci) {
      if (b.disabled) return;
      b.dataset.kunci = '1';
      try { b.disabled = true; } catch (_e) { /* abaikan */ }
    } else if (b.dataset.kunci) {
      try { delete b.dataset.kunci; } catch (_e) { b.dataset.kunci = ''; }
      try { b.disabled = false; } catch (_e) { /* abaikan */ }
    }
  });
}

// Bungkusan sekali-jalan untuk fungsi global di jembatan window (main.js):
// klik kedua dan seterusnya diabaikan sampai janji yang pertama selesai.
export function sekaliTulis(fn) {
  const asli = fn;
  return function () {
    if (!cobaKunciSimpan()) return undefined;
    let hasil;
    try {
      hasil = asli.apply(null, arguments);
    } catch (e) {
      lepasKunciSimpan();
      throw e;
    }
    if (hasil && typeof hasil.then === 'function') {
      hasil.then(function () { lepasKunciSimpan(); }, function () { lepasKunciSimpan(); });
    } else {
      lepasKunciSimpan();
    }
    return hasil;
  };
}
