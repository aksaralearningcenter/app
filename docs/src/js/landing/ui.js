// ==================== NAV & UI (NAVIGASI HALAMAN) ====================

const PAGES = ['home', 'program', 'kurikulum', 'harga', 'buku', 'berita', 'daftar'];

// Alamat yang sedang tampil (mis. "buku" atau "buku/BK-12"). Dipakai agar
// perubahan alamat (#home, #buku, …) tidak menggambar ulang halaman yang sudah
// terbuka.
let alamatAktif = '';

// ==================== ALAMAT HALAMAN (#home, #buku, …) ====================
// Setiap halaman punya alamatnya sendiri. Tanpa ini, menekan refresh (F5) selalu
// melempar pengunjung kembali ke Beranda dan tautan halaman tidak bisa
// dibagikan. Tautan lama di navbar (href="#buku") otomatis ikut bekerja karena
// formatnya sama.
// Alamat halaman boleh membawa keterangan tambahan setelah garis miring, mis.
// "#buku/BK-12" = buku tertentu di Perpustakaan. Dipakai tautan yang dibagikan.
function dariAlamat() {
  const isi = String(location.hash || '').replace(/^#\/?/, '');
  const bagian = isi.split('/');
  const page = (bagian[0] || '').trim().toLowerCase();
  if (PAGES.indexOf(page) === -1) return null;
  const sisa = bagian.slice(1).join('/').trim();
  let extra = '';
  try { extra = decodeURIComponent(sisa); } catch (_e) { extra = sisa; }
  return { page: page, extra: extra.trim() };
}

// Tulis alamat halaman: `ganti` memakai replaceState supaya membuka tautan
// langsung (mis. …/app/#buku) tidak menumpuk riwayat; selebihnya lewat
// location.hash agar tombol maju/mundur peramban tetap berfungsi.
function tulisAlamat(page, ganti, extra) {
  const alamat = '#' + page + (extra ? '/' + encodeURIComponent(extra) : '');
  if (location.hash === alamat) return;
  try {
    if (ganti) history.replaceState(null, '', alamat);
    else location.hash = alamat;
  } catch (_e) { location.hash = alamat; }
}

// Tampilkan satu halaman saja (bukan scroll) + tandai navbar aktif.
export function goToPage(page, opsi) {
  opsi = opsi || {};
  if (PAGES.indexOf(page) === -1) page = 'home';
  const extra = String(opsi.extra || '').trim();
  alamatAktif = page + (extra ? '/' + extra : '');
  tulisAlamat(page, opsi.ganti, extra);
  document.querySelectorAll('.page-view').forEach(function (v) {
    v.classList.toggle('active', v.getAttribute('data-page') === page);
  });
  document.querySelectorAll('.nav-link[data-nav]').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-nav') === page);
  });
  // tutup menu mobile & kembali ke atas halaman
  const menu = document.getElementById('mobile-menu');
  if (menu) menu.classList.remove('open');
  const icon = document.getElementById('burger-icon');
  if (icon) { icon.classList.add('fa-bars'); icon.classList.remove('fa-xmark'); }
  window.scrollTo(0, 0);
  // Pastikan elemen .reveal di halaman aktif ikut tampil (observer
  // tidak selalu mengevaluasi ulang saat display berubah).
  requestAnimationFrame(function () {
    document.querySelectorAll('.page-view.active .reveal').forEach(function (el) {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('visible');
    });
  });
  // Keterangan tambahan pada alamat diserahkan ke modul terkait lewat event,
  // supaya modul navigasi ini tidak perlu tahu isi halaman (mis. buku).
  if (extra) {
    document.dispatchEvent(new CustomEvent('lp:buka-buku', { detail: { id: extra } }));
  }
}

// Tombol maju/mundur peramban dan tautan halaman yang dibuka langsung.
function tampilkanDariAlamat(ganti) {
  const rute = dariAlamat();
  const page = rute ? rute.page : 'home';
  const extra = rute ? rute.extra : '';
  if (page + (extra ? '/' + extra : '') === alamatAktif) return;
  goToPage(page, { ganti: !!ganti, extra: extra });
}
window.addEventListener('hashchange', function () { tampilkanDariAlamat(false); });
tampilkanDariAlamat(true);

// Delegasi: semua elemen ber-[data-nav] memicu pindah halaman.
document.addEventListener('click', function (e) {
  const el = e.target.closest ? e.target.closest('[data-nav]') : null;
  if (!el) return;
  e.preventDefault();
  goToPage(el.getAttribute('data-nav'));
});

// Dipakai oleh tombol burger di HTML (onclick="toggleMenu()").
export function toggleMenu() {
  const menu = document.getElementById('mobile-menu');
  const icon = document.getElementById('burger-icon');
  menu.classList.toggle('open');
  if (icon) {
    icon.classList.toggle('fa-bars');
    icon.classList.toggle('fa-xmark');
  }
}

window.addEventListener('scroll', function () {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// Reveal on scroll
const observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(function (el) { observer.observe(el); });

document.getElementById('year').textContent = new Date().getFullYear();

// ==================== TABEL RESPONSIF ====================
// Tabel harga punya 4–5 kolom: di layar ponsel isinya harus digeser ke samping
// (500px di ruang ~286px). Supaya tidak perlu digeser, tiap sel diberi
// data-label dari header kolomnya — CSS lalu menumpuk baris jadi kartu.
// Dipasang otomatis agar tabel mana pun (termasuk yang isinya datang dari
// konten admin) ikut terbaca di ponsel.
export function siapkanTabelResponsif(akar) {
  (akar || document).querySelectorAll('table').forEach(function (tabel) {
    const kepala = Array.prototype.map.call(tabel.querySelectorAll('thead th'), function (th) {
      return (th.textContent || '').trim();
    });
    tabel.classList.add('responsif');
    tabel.querySelectorAll('tbody tr').forEach(function (baris) {
      Array.prototype.forEach.call(baris.children, function (sel, i) {
        if (!sel.hasAttribute('data-label')) sel.setAttribute('data-label', kepala[i] || '');
      });
    });
  });
}

// Tabel juga dibangun ulang saat konten dari admin dimuat, jadi pantau perubahan
// isi halaman (bukan hanya sekali di awal).
siapkanTabelResponsif();
if (typeof MutationObserver !== 'undefined') {
  new MutationObserver(function () { siapkanTabelResponsif(); })
    .observe(document.body, { childList: true, subtree: true });
}
