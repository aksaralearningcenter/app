// ==================== KONTEN DINAMIS — BERITA ====================
// Kartu berita + pembaca layar penuh (satu berita per layar) + rekomendasi
// berita lain di bagian bawah pembaca.
import { cTxt, cEsc, elById, tampilkan } from './util.js';

function tanggalPanjang(v) {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function newsCard(n) {
  const tgl = tanggalPanjang(n.tanggal);
  const thumb = cTxt(n.gambar)
    ? '<div class="news-thumb" style="background-image:url(\'' + cEsc(n.gambar) + '\')"></div>'
    : '<div class="news-thumb"></div>';
  const isi = cTxt(n.isi);
  const ringkas = cTxt(n.ringkasan) || isi.substring(0, 150);
  return '<article class="news-card" data-news-id="' + cEsc(n.id) + '">' + thumb + '<div class="news-body">' +
    (tgl ? '<div class="news-date">' + cEsc(tgl) + '</div>' : '') +
    '<h3>' + cEsc(n.judul) + '</h3>' +
    '<p>' + cEsc(ringkas) + '</p>' +
    (isi ? '<button class="news-more" type="button" data-news-open="' + cEsc(n.id) + '">Baca selengkapnya <i class="fa-solid fa-arrow-right"></i></button>' : '') +
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
  // Simpan daftar berita untuk pembaca layar penuh & rekomendasinya.
  window.__newsSemua = terbit;
}

// ---------- PEMBACA BERITA LAYAR PENUH ----------
// Satu berita per layar (overlay), dengan rekomendasi berita lain di bawah.
function bukaBerita(id) {
  const semua = window.__newsSemua || [];
  const berita = semua.filter(function (n) { return String(n.id) === String(id); })[0];
  if (!berita) return;

  let overlay = elById('news-reader');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'news-reader';
    overlay.innerHTML =
      '<div class="nr-backdrop"></div>' +
      '<div class="nr-dialog" role="dialog" aria-modal="true">' +
      '  <button class="nr-close" type="button" aria-label="Tutup">✕</button>' +
      '  <div class="nr-scroll">' +
      '    <div class="nr-hero" id="nr-hero"></div>' +
      '    <div class="nr-body">' +
      '      <div class="news-date" id="nr-tanggal"></div>' +
      '      <h2 id="nr-judul"></h2>' +
      '      <div class="nr-isi" id="nr-isi"></div>' +
      '    </div>' +
      '    <div class="nr-rekom">' +
      '      <h3>📌 Berita Lainnya</h3>' +
      '      <div class="news-grid" id="nr-rekom-list"></div>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(overlay);
    // CSS pembaca — disuntikkan sekali agar tidak menyentuh landing.css.
    if (!elById('news-reader-css')) {
      const st = document.createElement('style');
      st.id = 'news-reader-css';
      st.textContent =
        '#news-reader{position:fixed;inset:0;z-index:9990;display:none}' +
        '#news-reader.on{display:block}' +
        '#news-reader .nr-backdrop{position:absolute;inset:0;background:rgba(10,17,28,.72);backdrop-filter:blur(3px)}' +
        '#news-reader .nr-dialog{position:absolute;inset:24px;max-width:880px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.4);display:flex;flex-direction:column;animation:nrMasuk .25s ease}' +
        '@keyframes nrMasuk{from{transform:translateY(18px);opacity:0}to{transform:none;opacity:1}}' +
        '#news-reader .nr-close{position:absolute;top:14px;right:14px;z-index:2;width:38px;height:38px;border:0;border-radius:50%;background:rgba(16,43,78,.85);color:#fff;font-size:16px;cursor:pointer}' +
        '#news-reader .nr-close:hover{background:#B8934A}' +
        '#news-reader .nr-scroll{overflow-y:auto;height:100%}' +
        '#news-reader .nr-hero{height:min(38vh,300px);background:#1c2431 center/cover no-repeat}' +
        '#news-reader .nr-body{padding:28px 34px 8px;color:#37414f;max-width:760px;margin:0 auto}' +
        '#news-reader .nr-body h2{margin:6px 0 14px;color:#102B4E;font-size:clamp(20px,3vw,28px);line-height:1.3}' +
        '#news-reader .nr-isi{font-size:15.5px;line-height:1.85;padding-bottom:18px}' +
        '#news-reader .nr-isi p{margin:0 0 14px}' +
        '#news-reader .nr-rekom{max-width:760px;margin:0 auto;padding:6px 34px 36px;border-top:1px solid #EEF1F5}' +
        '#news-reader .nr-rekom h3{color:#102B4E;margin:22px 0 14px;font-size:17px}' +
        '#news-reader .nr-rekom .news-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}' +
        '#news-reader .nr-rekom .news-card{cursor:pointer;box-shadow:0 2px 10px rgba(16,43,78,.08)}' +
        '#news-reader .nr-rekom .news-card:hover{transform:translateY(-2px)}' +
        '#news-reader .nr-rekom .news-card .news-thumb{height:110px}' +
        '#news-reader .nr-rekom .news-card .news-body{padding:12px 14px}' +
        '#news-reader .nr-rekom .news-card h3{font-size:14px;margin:4px 0 6px}' +
        '#news-reader .nr-rekom .news-card p{font-size:12.5px;margin:0}' +
        '@media(max-width:640px){#news-reader .nr-dialog{inset:0;border-radius:0}#news-reader .nr-body,#news-reader .nr-rekom{padding-left:20px;padding-right:20px}}';
      document.head.appendChild(st);
    }
  }

  // Isi konten berita yang dipilih.
  const hero = overlay.querySelector('#nr-hero');
  hero.style.backgroundImage = cTxt(berita.gambar) ? 'url("' + cEsc(berita.gambar) + '")' : 'none';
  overlay.querySelector('#nr-tanggal').textContent = tanggalPanjang(berita.tanggal);
  overlay.querySelector('#nr-judul').textContent = cTxt(berita.judul);
  overlay.querySelector('#nr-isi').innerHTML = cTxt(berita.isi).split(/\n+/).filter(Boolean)
    .map(function (p) { return '<p>' + cEsc(p) + '</p>'; }).join('');

  // Rekomendasi: berita lain terbaru (maksimal 3), klik → ganti isi pembaca.
  const rekom = (window.__newsSemua || []).filter(function (n) {
    return String(n.id) !== String(berita.id);
  }).slice(0, 3);
  const listRekom = overlay.querySelector('#nr-rekom-list');
  listRekom.innerHTML = rekom.length
    ? rekom.map(function (n) {
        const thumb = cTxt(n.gambar)
          ? '<div class="news-thumb" style="background-image:url(\'' + cEsc(n.gambar) + '\')"></div>'
          : '<div class="news-thumb"></div>';
        return '<article class="news-card" data-news-open="' + cEsc(n.id) + '">' + thumb +
          '<div class="news-body"><h3>' + cEsc(n.judul) + '</h3><p>' +
          cEsc(cTxt(n.ringkasan) || cTxt(n.isi).substring(0, 90)) + '</p></div></article>';
      }).join('')
    : '<p style="font-size:13px;color:#8A8F98;margin:0;">Belum ada berita lain.</p>';
  listRekom.parentElement.style.display = rekom.length ? '' : 'none';

  overlay.classList.add('on');
  document.body.style.overflow = 'hidden';   // latar tidak ikut menggulir
  overlay.querySelector('.nr-scroll').scrollTop = 0;
}

function tutupBerita() {
  const overlay = elById('news-reader');
  if (!overlay) return;
  overlay.classList.remove('on');
  document.body.style.overflow = '';
}

// Satu listener untuk semua klik terkait berita:
//   • [data-news-open]  → buka pembaca layar penuh (kartu & kartu rekomendasi)
//   • .nr-close / backdrop → tutup pembaca
document.addEventListener('click', function (e) {
  const buka = e.target.closest ? e.target.closest('[data-news-open]') : null;
  if (buka) { bukaBerita(buka.getAttribute('data-news-open')); return; }
  const overlay = elById('news-reader');
  if (!overlay || !overlay.classList.contains('on')) return;
  if (e.target.closest('.nr-close') || e.target.classList.contains('nr-backdrop')) tutupBerita();
});

// Tutup dengan tombol Escape.
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') tutupBerita();
});
