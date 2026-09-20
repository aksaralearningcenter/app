// ==================== FLIPBOOK DUA HALAMAN (MODUL BERSAMA) ====================
// Mesin pembalik halaman yang dipakai bersama oleh:
//   • halaman Perpustakaan di landing (pembaca katalog), dan
//   • tombol Baca "Buku Pelajaran" di panel admin (akun Orang Tua).
//
// Modul ini hanya menangani mekanikanya (memenggal isi, menumpuk lembar,
// animasi balik, mode satu-halaman di ponsel). Pemanggil menyiapkan markup muka
// halaman lewat callback `faceFn` dan menentukan kelas lembar.
//
// PENTING — pemenggalan isi DIUKUR, bukan ditebak:
// isi teks dipecah per paragraf, lalu ditambah satu paragraf demi satu paragraf
// ke sebuah halaman uji (probe) sampai kotak halaman itu penuh. Jadi tiap
// halaman PAS dengan tingginya dan pembaca TIDAK perlu menggulir di dalam
// halaman — persis seperti membalik buku sungguhan. Pemenggalan hanya bisa
// diukur bila kotak halaman punya tinggi nyata dari CSS; kalau tidak (misal
// di lingkungan tanpa tata letak), modul jatuh ke pemenggalan cadangan
// berbasis jumlah karakter (±900 karakter per halaman).
//
// Pemakaian:
//   const flip = buatFlipbook(rootEl, {
//     leavesSel: '#reader-leaves', prevSel: '#reader-prev', nextSel: '#reader-next',
//     countSel: '#reader-count', leafClass: 'sp-leaf', kosong: 'Isi belum ada.'
//   });
//   flip.pasang();
//   flip.bangun(teksIsi, faceFn, {
//     // halaman tetap di depan & belakang isi (sampul, hak cipta, daftar pustaka…)
//     depan: [function (face, num) { return '<div class="face ' + face + '">…</div>'; }],
//     belakang: [function (face, num) { return '…'; }]
//   });

export function buatFlipbook(root, opsi) {
  opsi = opsi || {};
  const cari = function (sel) { return (root && sel) ? root.querySelector(sel) : null; };
  const leavesWrap = cari(opsi.leavesSel);
  const prevBtn = cari(opsi.prevSel);
  const nextBtn = cari(opsi.nextSel);
  const countEl = cari(opsi.countSel);
  const leafClass = opsi.leafClass || 'fl-leaf';
  const mql = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const st = { leaves: [], turned: 0, N: 0, animating: false, ponsel: 0, terakhir: null, halaman: [] };

  // Lapor status ke pemanggil (mis. untuk memusatkan buku saat masih tertutup).
  function kabari(animasi) {
    if (typeof opsi.padaUbah !== 'function') return;
    opsi.padaUbah({
      ponsel: ponsel(), animasi: !!animasi, turned: st.turned,
      halaman: ponsel() ? st.ponsel + 1 : (st.turned <= 0 ? 1 : st.turned * 2),
      total: jumlahHalaman()
    });
  }

  // ---------- Memenggal isi jadi halaman ----------
  function paragraf(teks) {
    return String(teks == null ? '' : teks).split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  // Cadangan tanpa pengukuran: ±900 karakter per halaman.
  function penggalTetap(paras) {
    const out = [];
    let buf = '';
    paras.forEach(function (p) {
      if (buf && (buf.length + p.length) > 900) { out.push(buf); buf = p; }
      else buf = buf ? buf + '\n' + p : p;
    });
    if (buf) out.push(buf);
    return out;
  }

  // Pengukuran: halaman uji disisipkan di antara lembar asli (kelasnya sama,
  // jadi aturan CSS halaman berlaku) lalu diisi baris demi baris.
  // Kembalian `null` = kotak halaman tak punya tinggi nyata → tak bisa diukur.
  function penggalTerukur(paras, faceFn) {
    const probe = document.createElement('div');
    probe.className = leafClass;
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    // display: block WAJIB: di mode satu-halaman CSS menyembunyikan lembar
    // (.ak-leaf/.sp-leaf { display: none }) — tanpa ini kotak halaman uji 0px,
    // pengukuran gagal, dan halaman tidak lagi pas.
    probe.style.display = 'block';
    leavesWrap.appendChild(probe);
    const selesai = function () { if (probe.parentNode) probe.parentNode.removeChild(probe); };

    // faceFn selalu mengembalikan SATU elemen muka halaman — elemen itulah yang
    // menggulir (overflow-y), jadi tinggi isinya dibandingkan dengan kotaknya.
    const muat = function (baris, num) {
      probe.innerHTML = faceFn(baris.join('\n'), 'front', num);
      const kotak = probe.firstElementChild;
      if (!kotak || !kotak.clientHeight) return null;
      return kotak.scrollHeight <= kotak.clientHeight + 1;
    };

    const halaman = [];
    const unit = paras.slice();
    let i = 0;
    while (i < unit.length) {
      const num = halaman.length + 1;
      // (a) Sedot paragraf utuh selama masih ada ruang.
      const baris = [];
      let j = i;
      while (j < unit.length) {
        baris.push(unit[j]);
        const ok = muat(baris, num);
        if (ok === null) { selesai(); return null; }
        if (!ok) { baris.pop(); break; }
        j++;
      }
      if (baris.length) { halaman.push(baris.join('\n')); i = j; continue; }

      // (b) Satu paragraf saja sudah lebih tinggi dari halaman → pecah per kata
      //     (mis. paragraf panjang tanpa jeda) dengan pencarian biner.
      const kata = unit[i].split(/\s+/).filter(Boolean);
      let lo = 1, hi = kata.length, n = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const ok = muat([kata.slice(0, mid).join(' ')], num);
        if (ok === null) { selesai(); return null; }
        if (ok) { n = mid; lo = mid + 1; } else hi = mid - 1;
      }
      if (!n) n = 1;                                  // jamin tetap maju
      halaman.push(kata.slice(0, n).join(' '));
      const sisa = kata.slice(n).join(' ');
      if (sisa) unit.splice(i, 1, sisa); else i++;
    }
    selesai();
    return halaman;
  }

  // Muka halaman: isi teks biasa diproses faceFn, sedangkan halaman khusus
  // (sampul, hak cipta, daftar pustaka, penutup) sudah berupa fungsi markup:
  // boleh fungsi telanjang, atau objek { label, html } supaya punya nama di
  // Daftar Isi.
  function mukaKeItem(h, face, num, faceFn) {
    if (h && typeof h === 'object' && typeof h.html === 'function') return h.html(face, num);
    if (typeof h === 'function') return h(face, num);
    return faceFn(h, face, num);
  }

  // Nama sebuah halaman untuk Daftar Isi: label halaman khusus, atau potongan
  // baris pertamanya bila halaman isi.
  function labelItem(h) {
    if (h && typeof h === 'object' && typeof h.html === 'function') return h.label || '';
    if (typeof h === 'function') return '';
    const baris = String(h || '').split(/\n/).map(function (s) { return s.trim(); })[0] || '';
    return baris.length > 58 ? baris.slice(0, 55).replace(/\s+\S*$/, '') + '…' : baris;
  }

  // Susun ulang lembar dari teks isi. `faceFn(hal, 'front'|'back', nomorHalaman)`.
  // `tambahan.depan` / `tambahan.belakang` = halaman tetap di luar isi.
  function bangun(teks, faceFn, tambahan) {
    if (!leavesWrap || typeof faceFn !== 'function') return;
    tambahan = tambahan || {};
    st.terakhir = { teks: teks, faceFn: faceFn, tambahan: tambahan };
    const paras = paragraf(teks);
    let isi = paras.length ? penggalTerukur(paras, faceFn) : null;
    if (!isi) isi = penggalTetap(paras);
    if (!isi.length) isi = [opsi.kosong || 'Isi buku ini belum tersedia.'];
    const halaman = (tambahan.depan || []).concat(isi, tambahan.belakang || []);
    if (halaman.length % 2) halaman.push('');          // jumlah genap = pasangan lembar
    st.halaman = halaman;
    st.N = halaman.length / 2;
    let html = '';
    for (let i = 0; i < st.N; i++) {
      html += '<div class="' + leafClass + '">' +
        mukaKeItem(halaman[i * 2], 'front', i * 2 + 1, faceFn) +
        mukaKeItem(halaman[i * 2 + 1], 'back', i * 2 + 2, faceFn) + '</div>';
    }
    leavesWrap.innerHTML = html;
    st.leaves = Array.prototype.slice.call(leavesWrap.querySelectorAll('.' + leafClass));
    st.turned = 0;
    st.ponsel = 0;
    st.animating = false;
    st.leaves.forEach(function (l) { l.classList.remove('flipped', 'flipping', 'm-aktif', 'm-belakang'); });
    zIndex();
    update();
    pantauGambar();
  }

  // Gambar (mis. sampul buku) baru punya tinggi SETELAH selesai dimuat, jadi
  // pengukuran bisa terlalu longgar pada percobaan pertama. Begitu gambar
  // selesai dimuat, halaman dipenggal ulang supaya tetap pas tanpa tergulir.
  // Dibatasi (perbaikanGambar) agar gambar gagal-muat tidak memicu pengulangan.
  let perbaikanGambar = 0;
  function pantauGambar() {
    if (!leavesWrap || perbaikanGambar >= 3) return;
    const gambar = leavesWrap.querySelectorAll('img');
    if (!gambar.length) return;
    let menunggu = 0;
    Array.prototype.forEach.call(gambar, function (img) {
      if (img.complete) return;
      menunggu++;
      const selesai = function () {
        img.removeEventListener('load', selesai);
        img.removeEventListener('error', selesai);
        menunggu--;
        if (menunggu) return;
        perbaikanGambar++;
        if (!st.terakhir) return;
        bangun(st.terakhir.teks, st.terakhir.faceFn, st.terakhir.tambahan);
      };
      img.addEventListener('load', selesai);
      img.addEventListener('error', selesai);
    });
  }

  // Tumpukan: lembar belum-dibalik (kanan) selalu di atas lembar terbalik (kiri).
  function zIndex() {
    st.leaves.forEach(function (leaf, k) {
      leaf.style.zIndex = String(k < st.turned ? (100 + k + 1) : (200 + (st.N - k)));
    });
  }

  function ponsel() { return mql.matches; }

  // Jumlah halaman yang benar-benar bisa dilihat (lembar × 2 untuk mode ponsel).
  function jumlahHalaman() { return st.N * 2; }

  // Nomor halaman yang ditampilkan di layar. Buku tertutup jelas hanya sampul;
  // setelah lembar dibalik, yang tampak adalah dua halaman bersebelahan
  // (belakang lembar yang dibalik + muka lembar berikutnya), jadi ditulis
  // sebagai rentang: "2–3". Rumus lama (turned × 2 + 1) meleset satu halaman
  // dan bahkan menulis "Halaman 5 dari 4" di ujung buku.
  function labelHalamanDesktop() {
    const total = jumlahHalaman();
    if (st.turned <= 0) return '1';
    const kiri = st.turned * 2;
    const kanan = kiri + 1;
    return kanan > total ? String(kiri) : kiri + '–' + kanan;
  }

  function update() {
    if (ponsel()) {
      const hal = st.ponsel;
      st.leaves.forEach(function (leaf, k) {
        const aktif = k === Math.floor(hal / 2);
        leaf.classList.toggle('m-aktif', aktif);
        leaf.classList.toggle('m-belakang', aktif && (hal % 2 === 1));
      });
      if (prevBtn) prevBtn.disabled = hal <= 0;
      if (nextBtn) nextBtn.disabled = hal >= jumlahHalaman() - 1;
      if (countEl) countEl.textContent = 'Halaman ' + (hal + 1) + ' dari ' + jumlahHalaman();
      kabari();
      return;
    }
    if (prevBtn) prevBtn.disabled = st.turned <= 0;
    if (nextBtn) nextBtn.disabled = st.turned >= st.N;
    if (countEl) countEl.textContent = 'Halaman ' + labelHalamanDesktop() + ' dari ' + jumlahHalaman();
    kabari();
  }

  function maju() {
    if (ponsel()) {
      if (st.ponsel < jumlahHalaman() - 1) { st.ponsel++; update(); }
      return;
    }
    if (st.animating || st.turned >= st.N) return;
    const leaf = st.leaves[st.turned];
    if (!leaf) return;
    st.animating = true;
    leaf.style.zIndex = '500';
    leaf.classList.add('flipping');
    leaf.classList.add('flipped');
    kabari(true);
    setTimeout(function () {
      leaf.classList.remove('flipping');
      st.turned++;
      st.animating = false;
      zIndex();
      update();
    }, 900);
  }

  function mundur() {
    if (ponsel()) {
      if (st.ponsel > 0) { st.ponsel--; update(); }
      return;
    }
    if (st.animating || st.turned <= 0) return;
    const leaf = st.leaves[st.turned - 1];
    if (!leaf) return;
    st.animating = true;
    leaf.style.zIndex = '500';
    leaf.classList.add('flipping');
    leaf.classList.remove('flipped');
    kabari(true);
    setTimeout(function () {
      leaf.classList.remove('flipping');
      st.turned--;
      st.animating = false;
      zIndex();
      update();
    }, 900);
  }

  // Lompat langsung ke halaman ke-n (1 = halaman pertama). Dipakai Daftar Isi.
  function keHalaman(n) {
    if (!st.leaves.length) return;
    const hal = Math.min(Math.max(Math.round(n) || 1, 1), jumlahHalaman());
    st.animating = false;
    if (ponsel()) { st.ponsel = hal - 1; update(); return; }
    // floor(hal / 2) lembar harus sudah dibalik supaya halaman tujuan benar-benar
    // tampak — halaman genap adalah sisi belakang lembarnya sendiri.
    st.turned = Math.min(Math.max(Math.floor(hal / 2), 0), st.N);
    st.leaves.forEach(function (leaf, k) {
      leaf.classList.remove('flipping');
      leaf.classList.toggle('flipped', k < st.turned);
    });
    zIndex();
    update();
  }

  // Susun ulang halaman dengan teks terakhir (dipakai setelah ukuran font /
  // ukuran kotak halaman berubah).
  function segarkan() {
    if (!st.terakhir) return;
    bangun(st.terakhir.teks, st.terakhir.faceFn, st.terakhir.tambahan);
  }

  // Ukuran kotak halaman berubah (rotasi ponsel / ganti mode desktop ↔ ponsel):
  // halaman perlu dipenggal ulang agar tetap pas dan tidak ikut menggulir.
  let timerUbah = null;
  function ukurUlang() {
    if (!st.terakhir) return;
    clearTimeout(timerUbah);
    timerUbah = setTimeout(segarkan, 250);
  }
  const gantiMode = function () { perbaikanGambar = 0; st.ponsel = 0; update(); ukurUlang(); };
  if (mql.addEventListener) mql.addEventListener('change', gantiMode);
  else if (mql.addListener) mql.addListener(gantiMode);
  if (window.addEventListener) window.addEventListener('resize', ukurUlang);

  // Pasang listener tombol — cukup sekali per instance. Penanda disimpan di
  // instance (bukan atribut data pada root) supaya pemanggil boleh mengganti
  // isi root lalu membuat instance baru; tombol barunya tetap ikut terpasang.
  let siapPasang = false;
  function pasang() {
    if (siapPasang) return;
    siapPasang = true;
    if (prevBtn) prevBtn.addEventListener('click', mundur);
    if (nextBtn) nextBtn.addEventListener('click', maju);
  }

  return {
    bangun: bangun, maju: maju, mundur: mundur, update: update, pasang: pasang,
    keHalaman: keHalaman, segarkan: segarkan, jumlahHalaman: jumlahHalaman,
    // Daftar isi halaman yang sedang dibangun (untuk panel Daftar Isi).
    daftarHalaman: function () {
      return st.halaman.map(function (h, i) {
        return { nomor: i + 1, label: labelItem(h), jenis: (h && typeof h === 'object' && h.html) ? 'khusus' : 'isi' };
      });
    }
  };
}
