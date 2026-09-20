// ==================== PEMBACA BUKU (HALAMAN & KENDALI BERSAMA) ====================
// Isi halaman buku, penomoran, Daftar Isi, dan kendali pembaca (perkecil/perbesar
// tulisan, layar penuh, klik halaman untuk membalik) ditulis SEKALI di sini agar
// pembaca di dua tempat terasa sama:
//   • halaman Perpustakaan di landing, dan
//   • tombol Baca “Buku Pelajaran” di panel admin (akun Orang Tua).
//
// Susunan halaman mengikuti buku cetak: sampul → hak cipta → isi → daftar
// pustaka → penutup. Gaya visualnya ada di src/styles/buku.css (kelas `buku`).
//
// Pemakaian (landing):
//   const kendali = pasangKendali(akar, flip, { kecilSel: '#reader-kecil', … });
//   flip.bangun(b.isi, function (hal, face, num) { return mukaIsi(hal, face, num, b, { depan: 2 }); }, {
//     depan: [halamanSampul(b), halamanHakCipta(b)],
//     belakang: [halamanPustaka(b), halamanPenutup(b)]
//   });

// Skala tulisan halaman yang bisa dipilih tombol −/+.
export const ZOOM = [0.85, 1, 1.15, 1.3, 1.5];

// Angka Romawi untuk halaman pembuka (sampul = i, hak cipta = ii, …).
export function romawi(n) {
  const peta = [[10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
  let s = '', x = Math.max(1, Math.round(n) || 1);
  peta.forEach(function (p) { while (x >= p[0]) { s += p[1]; x -= p[0]; } });
  return s;
}

// Nomor halaman yang tampil: halaman pembuka pakai angka Romawi, isi buku mulai
// dari 1 supaya penomoran terasa seperti buku cetak.
export function nomorHalaman(n, depan) {
  return n <= (depan || 0) ? romawi(n) : String(n - (depan || 0));
}

// Satu halaman isi buku (muka lembar).
export function mukaIsi(hal, face, num, buku, opsi) {
  const depan = (opsi && opsi.depan) || 0;
  const paras = String(hal == null ? '' : hal).split(/\n+/)
    .map(function (s) { return s.trim(); }).filter(Boolean);
  const isi = paras.map(function (p, i) {
    // Drop cap hanya di halaman pertama isi, bukan di setiap halaman.
    const awal = (num === depan + 1 && i === 0) ? ' class="p-awal"' : '';
    return '<p' + awal + '>' + esc(p) + '</p>';
  }).join('');
  return '<div class="face ' + face + '">' + isi +
    '<div class="page-num">' + esc(nomorHalaman(num, depan)) + '</div></div>';
}

// --- Halaman khusus di luar isi ---
export function halamanSampul(b, opsi) {
  const merek = (opsi && opsi.merek) || 'Aksara Learning Center';
  const jenis = txt(b.jenis) || (opsi && opsi.jenisDefault) || 'Koleksi Aksara';
  return {
    label: 'Sampul',
    html: function (face) {
      return '<div class="face ' + face + ' cover"><div class="lp-cover">' +
        '<span class="lp-kicker">' + esc(jenis) + (txt(b.jenjang) ? ' · ' + esc(b.jenjang) : '') + '</span>' +
        (txt(b.cover)
          ? '<img class="lp-cover-img" src="' + esc(b.cover) + '" alt="Sampul ' + esc(b.judul) + '">'
          : '<div class="lp-garis"></div>') +
        '<h2>' + esc(txt(b.judul) || 'Tanpa Judul') + '</h2>' +
        '<div class="lp-garis"></div>' +
        '<div class="lp-bawah">' +
          (txt(b.penulis) ? '<span class="lp-penulis">' + esc(b.penulis) + '</span>' : '') +
          '<span class="lp-merek">' + esc(merek) + '</span>' +
        '</div>' +
      '</div></div>';
    }
  };
}

export function halamanHakCipta(b, opsi) {
  const merek = (opsi && opsi.merek) || 'Aksara Learning Center';
  const baris = [['Judul', b.judul], ['Penulis', b.penulis], ['Penerbit', b.penerbit],
    ['Tahun', b.tahun], ['Jenis', b.jenis], ['Jenjang', b.jenjang]];
  const ada = baris.filter(function (r) { return txt(r[1]).trim(); });
  return {
    label: 'Hak Cipta',
    html: function (face, num) {
      return '<div class="face ' + face + '"><div class="lp-copy">' +
        '<span class="lp-mark">AKSARA</span><div class="lp-garis"></div>' +
        '<p>' + esc(txt(b.judul)) + '<br>Edisi digital — ' + esc(merek) + '</p>' +
        (ada.length
          ? '<dl>' + ada.map(function (r) {
              return '<div class="lp-row"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
            }).join('') + '</dl>'
          : '') +
        '<p style="margin-top:14px">Buku ini disediakan untuk keperluan pembelajaran. ' +
          'Mohon tidak memperbanyak atau memperjualbelikannya tanpa izin.</p>' +
        '<div class="page-num">' + esc(nomorHalaman(num, opsi && opsi.depan)) + '</div>' +
      '</div></div>';
    }
  };
}

export function halamanPustaka(b, opsi) {
  const merek = (opsi && opsi.merek) || 'Aksara Learning Center';
  const tahun = txt(b.tahun).trim();
  const sitasi = txt(b.penulis).trim()
    ? esc(b.penulis) + (tahun ? '. (' + esc(tahun) + ')' : '') + '. <em>' + esc(b.judul) + '</em>' +
      (txt(b.penerbit).trim() ? '. ' + esc(b.penerbit) : '') + '.'
    : '';
  return {
    label: 'Daftar Pustaka',
    html: function (face, num) {
      const isi = [];
      if (sitasi) isi.push(sitasi);
      isi.push('<span class="lp-sitasi">' + esc(merek) + '. (' + esc(tahun || new Date().getFullYear()) +
        '). <em>' + esc(txt(b.judul)) + '</em> [Buku digital]. ' + esc(merek) + '.</span>');
      if (txt(b.jenjang).trim()) {
        isi.push('<span class="lp-sitasi">Jenjang: ' + esc(b.jenjang) +
          (txt(b.jenis).trim() ? ' · Jenis: ' + esc(b.jenis) : '') + '.</span>');
      }
      return '<div class="face ' + face + '">' +
        '<h3 class="lp-judul">Daftar Pustaka</h3>' +
        '<ul class="lp-daftar">' + isi.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
        '<div class="page-num">' + esc(nomorHalaman(num, opsi && opsi.depan)) + '</div></div>';
    }
  };
}

export function halamanPenutup(b, opsi) {
  return {
    label: (opsi && opsi.label) || 'Penutup',
    html: function (face, num) {
      return '<div class="face ' + face + '"><div class="lp"><div class="lp-akhir">' +
        '<i class="fa-solid fa-circle-info lp-ikon"></i>' +
        '<h4>' + esc((opsi && opsi.judul) || 'Akhir dari buku ini') + '</h4>' +
        '<p>' + ((opsi && opsi.teks) || ('Terima kasih telah membaca <b>' + esc(txt(b.judul)) +
          '</b>. Koleksi lainnya tersedia di Perpustakaan Digital Aksara Learning Center.')) + '</p>' +
        '<div class="lp-aksi">' + ((opsi && opsi.aksiHtml) || '') + '</div>' +
      '</div></div>' +
      '<div class="page-num">' + esc(nomorHalaman(num, opsi && opsi.depan)) + '</div></div>';
    }
  };
}

// Daftar Isi dari halaman yang benar-benar dibuat mesin flipbook, jadi nomornya
// selalu cocok walau jumlah halaman berubah karena ukuran layar.
export function daftarIsiHtml(halaman, depan) {
  if (!halaman || !halaman.length) return '<li class="toc-kosong">Belum ada halaman.</li>';
  return halaman.map(function (h) {
    const label = txt(h.label).trim() || ('Halaman ' + h.nomor);
    return '<li' + (h.jenis === 'khusus' ? ' class="khusus"' : '') + '>' +
      '<button type="button" data-hal="' + h.nomor + '">' +
      '<span class="toc-teks">' + esc(label) + '</span>' +
      '<span class="toc-hal">' + esc(nomorHalaman(h.nomor, depan)) + '</span></button></li>';
  }).join('');
}

// ---------- Kendali pembaca ----------
// Memasang tombol −/+, Daftar Isi, layar penuh, dan klik-halaman-untuk-membalik.
// Semua selektor opsional: yang tidak dikirim berarti tidak dipakai di halaman itu.
export function pasangKendali(akar, flip, opsi) {
  opsi = opsi || {};
  const cari = function (sel) { return (akar && sel) ? akar.querySelector(sel) : null; };
  const kecil = cari(opsi.kecilSel);
  const besar = cari(opsi.besarSel);
  const tombolDaftar = cari(opsi.tombolDaftarSel);
  const panelDaftar = cari(opsi.panelDaftarSel);
  const tutupDaftar = cari(opsi.tutupDaftarSel);
  const listDaftar = cari(opsi.listDaftarSel);
  const stage = cari(opsi.stageSel);
  const panel = cari(opsi.panelSel);
  const skala = cari(opsi.skalaSel) || akar;
  const depan = opsi.depan || 0;
  const st = { zoom: 1 };

  function terapkanZoom() {
    if (skala) skala.style.setProperty('--buku-skala', String(st.zoom));
    flip.segarkan();               // halaman dipenggal ulang sesuai ukuran tulisan baru
  }

  function ubahZoom(naik) {
    const i = ZOOM.indexOf(st.zoom);
    const kini = i === -1 ? ZOOM.indexOf(1) : i;
    const berikut = Math.min(Math.max(kini + (naik ? 1 : -1), 0), ZOOM.length - 1);
    if (ZOOM[berikut] === st.zoom) return;
    st.zoom = ZOOM[berikut];
    terapkanZoom();
  }

  function daftarTerbuka() { return !!(panelDaftar && panelDaftar.classList.contains('terbuka')); }

  function tutupDaftarIsi() {
    if (panelDaftar) { panelDaftar.classList.remove('terbuka'); panelDaftar.setAttribute('aria-hidden', 'true'); }
    if (tombolDaftar) tombolDaftar.setAttribute('aria-expanded', 'false');
  }

  function bukaDaftarIsi() {
    if (!panelDaftar) return;
    if (panelDaftar.classList.contains('terbuka')) { tutupDaftarIsi(); return; }
    panelDaftar.classList.add('terbuka');
    panelDaftar.setAttribute('aria-hidden', 'false');
    if (tombolDaftar) tombolDaftar.setAttribute('aria-expanded', 'true');
  }

  function layarPenuh() {
    const sasaran = panel || akar;
    if (!sasaran) return;
    const aktif = document.fullscreenElement || document.webkitFullscreenElement;
    if (!aktif) {
      const pinta = sasaran.requestFullscreen || sasaran.webkitRequestFullscreen;
      if (pinta) pinta.call(sasaran);
    } else {
      const keluar = document.exitFullscreen || document.webkitExitFullscreen;
      if (keluar) keluar.call(document);
    }
  }

  // Label/ikon dibaca ulang saat dipakai (bukan di-cache): tombol aksi di bilah
  // atas dibuat ulang setiap buku dibuka, jadi referensi lama akan basi.
  function segarkanLayarPenuh() {
    const aktif = !!(document.fullscreenElement || document.webkitFullscreenElement);
    const teksLayar = cari(opsi.teksLayarSel);
    const ikonLayar = cari(opsi.ikonLayarSel);
    if (teksLayar) teksLayar.textContent = aktif ? 'Keluar Layar Penuh' : 'Layar Penuh';
    if (ikonLayar) ikonLayar.className = aktif ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
  }

  if (kecil) kecil.addEventListener('click', function () { ubahZoom(false); });
  if (besar) besar.addEventListener('click', function () { ubahZoom(true); });
  if (tombolDaftar) tombolDaftar.addEventListener('click', bukaDaftarIsi);
  if (tutupDaftar) tutupDaftar.addEventListener('click', tutupDaftarIsi);
  // Tombol layar penuh diambil lewat delegation supaya tetap bekerja walau
  // tombolnya dibuat ulang setiap buku dibuka.
  if (panel && opsi.layarSel) {
    panel.addEventListener('click', function (e) {
      const b = e.target.closest ? e.target.closest(opsi.layarSel) : null;
      if (b) { e.preventDefault(); layarPenuh(); }
    });
  }
  if (listDaftar) {
    listDaftar.addEventListener('click', function (e) {
      const btn = e.target.closest ? e.target.closest('[data-hal]') : null;
      if (!btn) return;
      listDaftar.querySelectorAll('button').forEach(function (x) { x.classList.remove('aktif'); });
      btn.classList.add('aktif');
      flip.keHalaman(parseInt(btn.getAttribute('data-hal'), 10) || 1);
    });
  }
  // Klik halaman = membalik buku seperti versi cetaknya: halaman yang sudah
  // dibalik dibuka kembali (mundur), sisanya dibalik ke depan (maju).
  if (stage) {
    stage.addEventListener('click', function (e) {
      // Tombol khusus di dalam halaman (mis. “Kembali ke katalog” di penutup).
      const tutupBtn = (opsi.tutupSel && e.target.closest) ? e.target.closest(opsi.tutupSel) : null;
      if (tutupBtn) {
        e.preventDefault();
        if (typeof opsi.padaTutup === 'function') opsi.padaTutup();
        return;
      }
      if (e.target.closest && e.target.closest('a, button')) return;
      const leaf = e.target.closest ? e.target.closest('.' + (opsi.leafClass || 'sp-leaf')) : null;
      if (!leaf) return;
      if (leaf.classList.contains('flipped')) flip.mundur(); else flip.maju();
    });
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('fullscreenchange', segarkanLayarPenuh);
  }

  // Isi panel Daftar Isi (dipanggil pemanggil setelah flip.bangun()). Jumlah
  // halaman pembuka bisa berbeda per buku, jadi `depanBaru` boleh dikirim.
  function isiDaftarIsi(depanBaru) {
    if (!listDaftar) return;
    listDaftar.innerHTML = daftarIsiHtml(flip.daftarHalaman(), depanBaru == null ? depan : depanBaru);
  }

  return {
    ubahZoom: ubahZoom, terapkanZoom: terapkanZoom, zoom: function () { return st.zoom; },
    bukaDaftarIsi: bukaDaftarIsi, tutupDaftarIsi: tutupDaftarIsi, daftarTerbuka: daftarTerbuka,
    layarPenuh: layarPenuh, isiDaftarIsi: isiDaftarIsi,
    // Dipanggil pemanggil dari padaUbah modul flipbook: Daftar Isi ditutup begitu
    // halaman berpindah supaya pembaca langsung melihat halaman tujuannya.
    padaUbah: function () { if (daftarTerbuka()) tutupDaftarIsi(); }
  };
}

// ---------- Utilitas kecil ----------
function txt(v) { return v == null ? '' : String(v); }

function esc(v) {
  return txt(v).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
