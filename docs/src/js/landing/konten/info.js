// ==================== KONTEN DINAMIS — GALERI, MITRA, TESTIMONI, FAQ, KARTU ====================
import { cTxt, cEsc, elById, tampilkan } from './util.js';

// ---------- GALERI KEGIATAN ----------
// Hanya foto yang sudah punya URL gambar yang ditampilkan; bila belum ada
// satu pun, mosaik statis bawaan tetap dipakai.
export function renderGallery(list) {
  const grid = elById('gal-grid');
  if (!grid) return;
  const isi = list.filter(function (g) { return cTxt(g.gambar); });
  // Admin belum mengunggah foto → seksi Galeri disembunyikan.
  if (!isi.length) { tampilkan(elById('galeri'), false); return; }
  tampilkan(elById('galeri'), true);
  grid.innerHTML = isi.map(function (g) {
    const judul = cTxt(g.judul);
    const ket = cTxt(g.keterangan);
    const lebar = cTxt(g.ukuran) === 'wide' ? ' wide' : '';
    return '<figure class="gal-item' + lebar + '" tabindex="0" role="button" data-cap="' + cEsc(judul) + '"' +
      (ket ? ' data-ket="' + cEsc(ket) + '"' : '') + '>' +
      '<img src="' + cEsc(g.gambar) + '" alt="' + cEsc(judul) + '" loading="lazy" width="1200" height="800">' +
      '<span class="gal-zoom"><i class="fa-solid fa-expand"></i></span>' +
      '<figcaption>' + cEsc(judul) + '</figcaption></figure>';
  }).join('');
}

// ---------- LOGO MITRA ----------
export function renderPartners(list) {
  const grid = elById('pt-grid');
  if (!grid) return;
  // Admin belum menambah mitra → seksi Mitra disembunyikan.
  if (!list.length) { tampilkan(elById('mitra'), false); return; }
  tampilkan(elById('mitra'), true);
  grid.innerHTML = list.map(function (p) {
    const nama = cTxt(p.nama);
    const isi = cTxt(p.logo)
      ? '<img src="' + cEsc(p.logo) + '" alt="' + cEsc(nama) + '" loading="lazy" style="max-width:100%; max-height:54px; object-fit:contain;">'
      : '<i class="' + cEsc(p.ikon || 'fa-solid fa-handshake') + '"></i><span>' + cEsc(nama) + '</span>';
    return '<div class="pt-logo" title="' + cEsc(nama) + '">' + isi + '</div>';
  }).join('');
}

// ---------- TESTIMONI ----------
function singkatan(nama) {
  const huruf = cTxt(nama).trim().split(/\s+/).slice(0, 2)
    .map(function (k) { return k.charAt(0).toUpperCase(); }).join('');
  return huruf || '★';
}

export function renderTestimoni(list) {
  const grid = elById('testi-grid');
  if (!grid) return;
  // Admin belum menambah testimoni → seksi Testimoni disembunyikan.
  if (!list.length) { tampilkan(elById('testimoni'), false); return; }
  tampilkan(elById('testimoni'), true);
  grid.innerHTML = list.map(function (t) {
    const bintang = Math.min(5, Math.max(1, Number(t.bintang) || 5));
    return '<div class="testi">' +
      '<div class="stars">' + new Array(bintang + 1).join('★') + '</div>' +
      '<p>“' + cEsc(t.isi) + '”</p>' +
      '<div class="who"><div class="av">' + cEsc(singkatan(t.nama)) + '</div>' +
      '<div><b>' + cEsc(t.nama) + '</b><span>' + cEsc(t.peran) + '</span></div></div></div>';
  }).join('');
}

// ---------- FAQ ----------
export function renderFaq(list) {
  const box = elById('faq-list');
  if (!box) return;
  // Admin belum menambah FAQ → seksi FAQ disembunyikan.
  if (!list.length) { tampilkan(elById('faq'), false); return; }
  tampilkan(elById('faq'), true);
  box.innerHTML = list.map(function (f) {
    return '<details class="faq-item">' +
      '<summary>' + cEsc(f.pertanyaan) + '</summary>' +
      '<div class="faq-body">' + cEsc(f.jawaban).replace(/\n+/g, '<br>') + '</div>' +
      '</details>';
  }).join('');
}

// ---------- KARTU INFORMASI (layanan / alur / jenjang di Beranda) ----------
export function renderKartu(list) {
  const seksi = function (nama) { return list.filter(function (k) { return k.seksi === nama; }); };
  const sv = elById('sv-grid');
  if (sv) {
    const a = seksi('layanan');
    // Seksi tanpa data disembunyikan — sama seperti seksi konten lain.
    tampilkan(elById('layanan'), a.length > 0);
    if (a.length) sv.innerHTML = a.map(function (k) {
      return '<div class="sv-card">' +
        (cTxt(k.ikon) ? '<div class="sv-ic"><i class="' + cEsc(k.ikon) + '"></i></div>' : '') +
        '<h3>' + cEsc(k.judul) + '</h3><p>' + cEsc(k.teks) + '</p></div>';
    }).join('');
  }
  const st = elById('step-grid');
  if (st) {
    const a = seksi('alur');
    tampilkan(elById('alur'), a.length > 0);
    if (a.length) st.innerHTML = a.map(function (k, i) {
      return '<div class="step"><div class="st-no">' + (i + 1) + '</div><h3>' + cEsc(k.judul) + '</h3><p>' + cEsc(k.teks) + '</p></div>';
    }).join('');
  }
  const lv = elById('level-grid');
  if (lv) {
    const a = seksi('jenjang');
    tampilkan(elById('jenjang'), a.length > 0);
    if (a.length) lv.innerHTML = a.map(function (k) {
      return '<div class="level">' +
        (cTxt(k.ikon) ? '<div class="lv-emoji">' + cEsc(k.ikon) + '</div>' : '') +
        '<h3>' + cEsc(k.judul) + '</h3><p>' + cEsc(k.teks) + '</p>' +
        (cTxt(k.meta) ? '<div class="lv-meta">' + cEsc(k.meta) + '</div>' : '') + '</div>';
    }).join('');
  }
}
