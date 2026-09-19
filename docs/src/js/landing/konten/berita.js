// ==================== KONTEN DINAMIS — BERITA ====================
import { cTxt, cEsc, elById, tampilkan } from './util.js';

function newsCard(n) {
  let tgl = '';
  if (n.tanggal) {
    const d = new Date(n.tanggal);
    if (!isNaN(d)) tgl = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  const thumb = cTxt(n.gambar)
    ? '<div class="news-thumb" style="background-image:url(\'' + cEsc(n.gambar) + '\')"></div>'
    : '<div class="news-thumb"></div>';
  const isi = cTxt(n.isi);
  return '<article class="news-card">' + thumb + '<div class="news-body">' +
    (tgl ? '<div class="news-date">' + cEsc(tgl) + '</div>' : '') +
    '<h3>' + cEsc(n.judul) + '</h3>' +
    '<p>' + cEsc(n.ringkasan || isi.substring(0, 150)) + '</p>' +
    (isi ? '<div class="news-full" hidden>' + cEsc(isi).replace(/\n+/g, '<br>') + '</div>' +
      '<button class="news-more" type="button">Baca selengkapnya <i class="fa-solid fa-arrow-right"></i></button>' : '') +
    '</div></article>';
}

export function renderNews(list) {
  const terbit = list.slice().sort(function (a, b) {
    return new Date(b.tanggal || 0) - new Date(a.tanggal || 0);
  });
  // Admin belum menulis berita → pratinjau & halaman berita disembunyikan.
  if (!terbit.length) {
    tampilkan(elById('berita-preview-wrap'), false);
    tampilkan(elById('berita'), false);
    return;
  }
  const preview = elById('news-preview');
  const wrap = elById('berita-preview-wrap');
  tampilkan(wrap, true);
  tampilkan(elById('berita'), true);
  if (preview) { preview.innerHTML = terbit.slice(0, 3).map(newsCard).join(''); }
  const full = elById('news-list');
  if (full) full.innerHTML = terbit.map(newsCard).join('');
}

// Tombol "Baca selengkapnya" pada kartu berita (buka/tutup isi).
document.addEventListener('click', function (e) {
  const btn = e.target.closest ? e.target.closest('.news-more') : null;
  if (!btn) return;
  const body = btn.parentNode;
  const full = body ? body.querySelector('.news-full') : null;
  if (!full) return;
  const buka = full.hasAttribute('hidden');
  if (buka) { full.removeAttribute('hidden'); btn.innerHTML = 'Tutup <i class="fa-solid fa-chevron-up"></i>'; }
  else { full.setAttribute('hidden', ''); btn.innerHTML = 'Baca selengkapnya <i class="fa-solid fa-arrow-right"></i>'; }
});
