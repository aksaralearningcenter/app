// ==================== KONTEN DINAMIS — PROGRAM ====================
import { cTxt, cEsc, elById, tampilkan } from './util.js';
import { nomorWA } from './setelan.js';

export function renderProgram(list) {
  const utama = list.filter(function (p) { return (p.grup || 'utama') !== 'tambahan'; });
  const tambahan = list.filter(function (p) { return p.grup === 'tambahan'; });
  const kartu = function (p) {
    const poin = String(p.poin || '').split(/\||\n/).map(function (s) { return s.trim(); })
      .filter(Boolean).map(function (s) { return '<li><i class="fa-solid fa-check"></i> ' + cEsc(s) + '</li>'; }).join('');
    const meta = (cTxt(p.durasi) || cTxt(p.mode))
      ? '<div class="p-meta">' +
        (cTxt(p.durasi) ? '<span><i class="fa-regular fa-clock"></i> ' + cEsc(p.durasi) + '</span>' : '') +
        (cTxt(p.mode) ? '<span><i class="fa-solid fa-user-group"></i> ' + cEsc(p.mode) + '</span>' : '') + '</div>'
      : '';
    const wa = 'https://wa.me/' + (nomorWA() || '6281280169806') + '?text=' + encodeURIComponent('Halo Aksara, saya ingin info tentang ' + cTxt(p.judul));
    return '<div class="p-card">' +
      (cTxt(p.ikon) ? '<div class="p-icon"><i class="' + cEsc(p.ikon) + '"></i></div>' : '') +
      (cTxt(p.tag) ? '<span class="p-tag">' + cEsc(p.tag) + '</span>' : '') +
      '<h3>' + cEsc(cTxt(p.judul)) + '</h3>' +
      (cTxt(p.ringkasan) ? '<p>' + cEsc(p.ringkasan) + '</p>' : '') +
      (poin ? '<ul>' + poin + '</ul>' : '') + meta +
      '<a class="p-link" href="' + cEsc(wa) + '" target="_blank" rel="noopener">Info Detail <i class="fa-solid fa-arrow-right"></i></a>' +
      '</div>';
  };
  const gridUtama = elById('program-utama'), gridTambahan = elById('program-tambahan');
  // Admin belum menambah program → seluruh seksi Program disembunyikan.
  if (!utama.length && !tambahan.length) { tampilkan(elById('program'), false); return; }
  tampilkan(elById('program'), true);
  if (gridUtama && utama.length) gridUtama.innerHTML = utama.map(kartu).join('');
  if (gridTambahan && tambahan.length) gridTambahan.innerHTML = tambahan.map(kartu).join('');
}
