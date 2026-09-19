// ==================== GALERI KEGIATAN (LIGHTBOX) ====================
// Klik foto → tampil ukuran penuh; navigasi lewat tombol, panah keyboard,
// atau Esc untuk menutup. Tanpa dependensi eksternal.
// Memakai event delegation agar tetap bekerja setelah galeri dirender ulang
// dari data admin (GET /public/content).
(function () {
  const lb = document.getElementById('lb');
  const lbImg = document.getElementById('lb-img');
  const lbCap = document.getElementById('lb-cap');
  if (!lb || !lbImg) return;
  let idx = 0;

  function daftarItem() {
    return Array.prototype.slice.call(document.querySelectorAll('.gal-item'));
  }

  function tampilkan(i) {
    const items = daftarItem();
    if (!items.length) return;
    idx = (i + items.length) % items.length;
    const fig = items[idx];
    const gambar = fig.querySelector('img');
    if (!gambar) return;
    // Pakai versi resolusi lebih besar bila tersedia (varian srcset terakhir).
    const srcset = gambar.getAttribute('srcset') || '';
    const besar = srcset.split(',').map(function (s) { return s.trim().split(' ')[0]; }).filter(Boolean).pop();
    lbImg.src = besar || gambar.getAttribute('src') || '';
    lbImg.alt = gambar.getAttribute('alt') || '';
    lbCap.textContent = fig.getAttribute('data-cap') || gambar.getAttribute('alt') || '';
  }

  function buka(fig) {
    const items = daftarItem();
    const pos = items.indexOf(fig);
    if (pos === -1) return;
    tampilkan(pos);
    lb.classList.add('on');
    document.body.style.overflow = 'hidden';
  }

  function tutup() { lb.classList.remove('on'); document.body.style.overflow = ''; }

  // Klik pada foto mana pun (termasuk yang baru dirender) membuka lightbox.
  document.addEventListener('click', function (e) {
    const fig = e.target.closest ? e.target.closest('.gal-item') : null;
    if (fig) buka(fig);
  });
  document.addEventListener('keydown', function (e) {
    const fig = e.target.closest ? e.target.closest('.gal-item') : null;
    if (fig && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); buka(fig); return; }
    if (!lb.classList.contains('on')) return;
    if (e.key === 'Escape') tutup();
    if (e.key === 'ArrowRight') tampilkan(idx + 1);
    if (e.key === 'ArrowLeft') tampilkan(idx - 1);
  });

  const btnX = document.getElementById('lb-x');
  const btnPrev = document.getElementById('lb-prev');
  const btnNext = document.getElementById('lb-next');
  if (btnX) btnX.addEventListener('click', tutup);
  if (btnPrev) btnPrev.addEventListener('click', function () { tampilkan(idx - 1); });
  if (btnNext) btnNext.addEventListener('click', function () { tampilkan(idx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) tutup(); });
})();
