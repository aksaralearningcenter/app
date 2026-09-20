// ==================== FLIPBOOK (BUKU DUA HALAMAN) ====================
// Model buku sungguhan: tiap "lembar" punya muka depan (halaman kanan)
// dan muka belakang (halaman kiri). Membalik lembar = berpindah spread.
(function () {
  const flipbook = document.getElementById('flipbook');
  if (!flipbook) return;
  let leaves = [];                // diisi ulang oleh refresh() (konten bisa dari admin)
  const prevBtn = document.getElementById('book-prev');
  const nextBtn = document.getElementById('book-next');
  const progress = document.getElementById('book-progress');
  const dotsWrap = document.getElementById('book-dots');
  let N = 0;                      // jumlah lembar (2 halaman per lembar)
  let STATES = 0;                 // jumlah spread
  let turned = 0;                 // lembar yang sudah dibalik
  let animating = false;

  // MODE PONSEL (≤700px): buku dua-halaman-lanskap menyebabkan halaman
  // terpotong & tumpang tindih di layar sempit. Di ponsel buku ditampilkan
  // SATU HALAMAN per layar (seperti e-reader): navigasi melangkah per
  // halaman, muka depan/belakang lembar ditampilkan bergantian.
  const mqlPonsel = window.matchMedia('(max-width: 700px)');
  let pPonsel = 0;                // halaman aktif mode ponsel (0 .. 2N-1)
  function totalPonsel() { return N * 2; }

  // Tumpukan: lembar belum-dibalik (kanan) selalu di atas lembar terbalik (kiri).
  function applyZ() {
    leaves.forEach(function (leaf, k) {
      leaf.style.zIndex = String(k < turned ? (100 + k + 1) : (200 + (N - k)));
    });
  }

  function buildDots() {
    dotsWrap.innerHTML = '';
    const jumlah = mqlPonsel.matches ? totalPonsel() : STATES;
    for (let i = 0; i < jumlah; i++) {
      const d = document.createElement('button');
      d.className = 'book-dot';
      d.setAttribute('aria-label', 'Tampilan ' + (i + 1));
      d.addEventListener('click', function () { goTo(i); });
      dotsWrap.appendChild(d);
    }
  }

  function update() {
    if (mqlPonsel.matches) { terapkanPonsel(); return; }
    prevBtn.disabled = turned <= 0;
    nextBtn.disabled = turned >= N;
    progress.textContent = 'Buku ' + (turned + 1) + ' / ' + STATES;
    Array.prototype.forEach.call(dotsWrap.children, function (d, i) {
      d.classList.toggle('active', i === turned);
    });
  }

  function flipForward() {
    if (mqlPonsel.matches) {
      if (pPonsel < totalPonsel() - 1) { pPonsel++; terapkanPonsel(); }
      return;
    }
    if (animating || turned >= N) return;
    animating = true;
    const leaf = leaves[turned];
    leaf.style.zIndex = '500';       // lembar yang berputar tampil paling atas
    leaf.classList.add('flipping');
    leaf.classList.add('flipped');   // putar ke kiri → muka belakang jadi halaman kiri
    setTimeout(function () {
      leaf.classList.remove('flipping');
      turned++;
      animating = false;
      applyZ();
      update();
    }, 950);
  }

  function flipBackward() {
    if (mqlPonsel.matches) {
      if (pPonsel > 0) { pPonsel--; terapkanPonsel(); }
      return;
    }
    if (animating || turned <= 0) return;
    animating = true;
    const leaf = leaves[turned - 1];
    leaf.style.zIndex = '500';
    leaf.classList.add('flipping');
    leaf.classList.remove('flipped'); //.putar balik dari kiri ke kanan
    setTimeout(function () {
      leaf.classList.remove('flipping');
      turned--;
      animating = false;
      applyZ();
      update();
    }, 950);
  }

  // Terapkan posisi halaman mode ponsel: hanya lembar aktif yang tampil,
  // dengan muka depan (halaman ganjil) atau muka belakang (halaman genap).
  function terapkanPonsel() {
    const hal = Math.min(Math.max(pPonsel, 0), Math.max(totalPonsel() - 1, 0));
    leaves.forEach(function (leaf, k) {
      const aktif = k === Math.floor(hal / 2);
      leaf.classList.toggle('m-aktif', aktif);
      leaf.classList.toggle('m-belakang', aktif && (hal % 2 === 1));
    });
    prevBtn.disabled = hal <= 0;
    nextBtn.disabled = hal >= totalPonsel() - 1;
    progress.textContent = 'Halaman ' + (hal + 1) + ' / ' + totalPonsel();
    Array.prototype.forEach.call(dotsWrap.children, function (d, i) {
      d.classList.toggle('active', i === hal);
    });
  }

  // Pindah posisi tanpa animasi (dipakai lompat jauh & saat ganti mode tampilan).
  function langsungKe(target) {
    if (mqlPonsel.matches) {
      pPonsel = Math.min(Math.max(target, 0), Math.max(totalPonsel() - 1, 0));
      terapkanPonsel();
      return;
    }
    leaves.forEach(function (leaf, k) { leaf.classList.toggle('flipped', k < target); });
    turned = target;
    applyZ();
    update();
  }

  function goTo(target) {
    if (mqlPonsel.matches) { langsungKe(target); return; }   // target = indeks halaman
    if (animating || target === turned) return;
    if (Math.abs(target - turned) === 1) {
      target > turned ? flipForward() : flipBackward();
      return;
    }
    langsungKe(target);
  }

  // Bangun ulang buku dari markup terkini (dipakai setelah konten admin dimuat).
  function refresh() {
    leaves = Array.prototype.slice.call(flipbook.querySelectorAll('.sp-leaf'));
    N = leaves.length;
    STATES = N + 1;
    turned = 0;
    pPonsel = 0;
    animating = false;
    leaves.forEach(function (leaf) { leaf.classList.remove('flipped', 'flipping'); });
    applyZ();
    buildDots();
    update();
  }

  prevBtn.addEventListener('click', flipBackward);
  nextBtn.addEventListener('click', flipForward);
  document.addEventListener('keydown', function (e) {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    // Panah hanya membalik buku saat halaman Buku benar-benar tampil.
    const halBuku = document.getElementById('buku');
    if (!halBuku || !halBuku.classList.contains('active')) return;
    if (e.key === 'ArrowRight') flipForward();
    if (e.key === 'ArrowLeft') flipBackward();
  });

  // ---------- Tampilan penuh: buku mengisi seluruh jendela ----------
  // Memakai Fullscreen API bila tersedia; kalau tidak (mis. iOS Safari),
  // overlay CSS di Shell tetap memberi pengalaman yang sama.
  const shell = document.getElementById('book-shell');
  const fullBtn = document.getElementById('book-full');
  function penuh(on) {
    if (!shell) return;
    const posisi = mqlPonsel.matches ? pPonsel : turned;   // jangan kehilangan posisi halaman
    shell.classList.toggle('fs', on);
    document.body.classList.toggle('book-fs', on);
    if (fullBtn) {
      fullBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      fullBtn.innerHTML = on
        ? '<i class="fa-solid fa-compress"></i> Keluar Tampilan Penuh'
        : '<i class="fa-solid fa-expand"></i> Tampilan Penuh';
    }
    try {
      if (on) {
        if (shell.requestFullscreen && !document.fullscreenElement) {
          const p = shell.requestFullscreen();
          if (p && p.catch) p.catch(function () { /* diabaikan: overlay sudah penuh */ });
        }
      } else if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      }
    } catch (_e) { /* Fullscreen API tidak tersedia */ }
    refresh();
    if (posisi || mqlPonsel.matches) langsungKe(posisi);   // posisi halaman tetap
  }
  if (fullBtn) fullBtn.addEventListener('click', function () { penuh(!shell.classList.contains('fs')); });
  document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement && shell && shell.classList.contains('fs')) penuh(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && shell && shell.classList.contains('fs')) penuh(false);
  });

  // ---------- Geser untuk membalik lembar (perangkat sentuh) ----------
  let sentuhX = 0, sentuhY = 0;
  flipbook.addEventListener('touchstart', function (e) {
    const t = (e.touches || [])[0];
    if (!t) return;
    sentuhX = t.clientX; sentuhY = t.clientY;
  }, { passive: true });
  flipbook.addEventListener('touchend', function (e) {
    const t = (e.changedTouches || [])[0];
    if (!t || !sentuhX) return;
    const dx = t.clientX - sentuhX, dy = t.clientY - sentuhY;
    sentuhX = 0;
    // Hanya geser horizontal yang jelas (supaya gulir vertikal tetap nyaman).
    if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) flipForward(); else flipBackward();
  }, { passive: true });

  // Ganti mode desktop ↔ ponsel: bangun ulang buku dari awal.
  if (mqlPonsel.addEventListener) {
    mqlPonsel.addEventListener('change', function () { pPonsel = 0; refresh(); });
  } else if (mqlPonsel.addListener) {
    mqlPonsel.addListener(function () { pPonsel = 0; refresh(); });
  }

  refresh();
  // Dipakai modul konten setelah buku dirender ulang dari data admin.
  window.refreshFlipbook = refresh;
})();
