// ============ TAMPILAN & KERANGKA PANEL ============
// Mengurus hal-hal yang berlaku untuk SELURUH panel, bukan isi halaman:
//   • mode tampilan Terang / Gelap (disimpan di localStorage)
//   • bahasa Indonesia / Inggris (kamus di i18n.js)
//   • laci menu di tablet & ponsel (sidebar geser, bukan strip di atas)
//   • grup menu yang bisa dilipat + pencarian menu
//
// Semua pilihan disimpan di localStorage, jadi bertahan lintas refresh tanpa
// perlu kolom tambahan di database.
import { $ } from './ui.js';
import { aturBahasa, bahasaAktif, terjemahkan, terjemahkanAkar } from './i18n.js';

const KUNCI_TEMA = 'aksara_tema';
const KUNCI_BAHASA = 'aksara_bahasa';
const KUNCI_MENU = 'aksara_menu_tutup';

// main.js menitipkan fungsi penyegaran label tabel (data-label pada mode kartu
// dihitung dari teks <thead>, jadi harus dihitung ulang setelah bahasa ganti).
let saatBahasaBerubah = function () {};

function baca(kunci, baku) {
  try { return localStorage.getItem(kunci) || baku; } catch (e) { return baku; }
}
function tulis(kunci, nilai) {
  try { localStorage.setItem(kunci, nilai); } catch (e) { /* localStorage diblokir */ }
}

// ============ TEMA ============
export function temaAktif() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'gelap' : 'terang';
}

export function aturTema(tema) {
  const gelap = tema === 'gelap';
  document.documentElement.setAttribute('data-theme', gelap ? 'dark' : 'light');
  tulis(KUNCI_TEMA, gelap ? 'gelap' : 'terang');
  const btn = $('btn-tema');
  if (btn) {
    btn.textContent = gelap ? '☀️' : '🌙';
    btn.title = gelap ? 'Ganti ke tema terang' : 'Ganti ke tema gelap';
    btn.setAttribute('aria-label', btn.title);
  }
  return gelap ? 'gelap' : 'terang';
}

export function pasangTema() {
  // Penanda tema sudah dipasang skrip di <head>; di sini hanya menyelaraskan
  // tombolnya dengan keadaan sebenarnya.
  const sekarang = document.documentElement.getAttribute('data-theme') === 'dark' ? 'gelap' : 'terang';
  aturTema(sekarang);
  const btn = $('btn-tema');
  if (btn) btn.addEventListener('click', function () {
    aturTema(temaAktif() === 'gelap' ? 'terang' : 'gelap');
  });
}

// ============ BAHASA ============
export function pasangBahasa() {
  aturBahasa(bahasaAktif() === 'en' ? 'en' : 'id');
  segarkanBahasa();

  const grup = $('lang-switch');
  if (grup) grup.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-bahasa]');
    if (!btn) return;
    aturBahasa(btn.dataset.bahasa);
    segarkanBahasa();
  });
}

// Ganti bahasa → terjemahkan ulang SELURUH dokumen (termasuk modal & topbar),
// lalu hitung ulang label tabel karena labelnya diambil dari teks <thead>.
export function segarkanBahasa() {
  const aktif = bahasaAktif();
  document.documentElement.setAttribute('lang', aktif === 'en' ? 'en' : 'id');
  document.querySelectorAll('#lang-switch [data-bahasa]').forEach(function (b) {
    b.classList.toggle('on', b.dataset.bahasa === aktif);
  });
  // Label tabel lama dibuang supaya dihitung ulang dalam bahasa yang baru.
  document.querySelectorAll('[data-label]').forEach(function (el) { el.removeAttribute('data-label'); });
  terjemahkanAkar(document.body);
  saatBahasaBerubah();
}

export function setelSaatBahasaBerubah(fn) { saatBahasaBerubah = fn || function () {}; }

// ============ LACI MENU (tablet & ponsel) ============
export function laciTerbuka() { return document.documentElement.classList.contains('nav-buka'); }

export function bukaLaci() {
  document.documentElement.classList.add('nav-buka');
  const btn = $('btn-nav');
  if (btn) btn.setAttribute('aria-expanded', 'true');
}

export function tutupLaci() {
  document.documentElement.classList.remove('nav-buka');
  const btn = $('btn-nav');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

export function pasangLaci() {
  const btn = $('btn-nav');
  if (btn) btn.addEventListener('click', function () { laciTerbuka() ? tutupLaci() : bukaLaci(); });

  const overlay = $('nav-overlay');
  if (overlay) overlay.addEventListener('click', tutupLaci);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && laciTerbuka()) tutupLaci();
  });

  // Geser dari tepi kiri untuk membuka, geser ke kiri untuk menutup.
  let mulaiX = null, mulaiY = null;
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    mulaiX = t.clientX; mulaiY = t.clientY;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (mulaiX === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - mulaiX;
    const dy = Math.abs(t.clientY - mulaiY);
    const dariTepi = mulaiX < 26;
    const lebar = window.innerWidth || 0;
    if (lebar > 980) { mulaiX = null; return; }
    if (dy < 60 && dx > 60 && dariTepi && !laciTerbuka()) bukaLaci();
    else if (dy < 60 && dx < -60 && laciTerbuka()) tutupLaci();
    mulaiX = null;
  }, { passive: true });
}

// ============ MENU: LIPAT & CARI ============
// Grup yang ditutup disimpan sebagai daftar nama, jadi pengguna hanya perlu
// mengaturnya sekali.
function bacaTutup() {
  try {
    const arr = JSON.parse(localStorage.getItem(KUNCI_MENU) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

function simpanTutup(arr) { tulis(KUNCI_MENU, JSON.stringify(arr)); }

export function lipatGrup(nama, tutup) {
  const grup = document.querySelector('.nav-group[data-group="' + CSS.escape(nama) + '"]');
  if (!grup) return;
  grup.classList.toggle('tutup', !!tutup);
  const daftar = bacaTutup().filter(x => x !== nama);
  if (tutup) daftar.push(nama);
  simpanTutup(daftar);
}

// Buka grup yang memuat halaman aktif (kalau tertutup), supaya menu aktif
// tidak "hilang" setelah refresh.
export function bentangkanGrupUntuk(halaman) {
  const btn = document.querySelector('#nav button[data-page="' + halaman + '"]');
  if (!btn) return;
  const grup = btn.closest('.nav-group');
  if (grup && grup.classList.contains('tutup')) {
    grup.classList.remove('tutup');
    simpanTutup(bacaTutup().filter(x => x !== grup.dataset.group));
  }
}

export function pasangMenu() {
  const tutup = bacaTutup();
  document.querySelectorAll('#nav .nav-group').forEach(function (grup) {
    if (tutup.indexOf(grup.dataset.group) !== -1) grup.classList.add('tutup');
    const kepala = grup.querySelector('[data-lipat]');
    if (kepala) kepala.addEventListener('click', function () {
      lipatGrup(grup.dataset.group, !grup.classList.contains('tutup'));
    });
  });
  pasangCariMenu();
}

function pasangCariMenu() {
  const input = $('nav-cari');
  const nav = $('nav');
  if (!input || !nav) return;
  input.addEventListener('input', function () {
    const q = input.value.trim().toLowerCase();
    nav.classList.toggle('mencari', !!q);
    let tampil = 0;
    document.querySelectorAll('#nav .nav-group').forEach(function (grup) {
      let ada = 0;
      grup.querySelectorAll('button[data-page]').forEach(function (b) {
        // data-title ikut dicari: menu “Progres” berjudul “Progres Belajar”.
        const teks = (b.textContent + ' ' + (b.dataset.title || '')).toLowerCase();
        const cocok = !q || teks.indexOf(q) !== -1;
        b.classList.toggle('tersembunyi', !cocok);
        if (cocok) ada++;
      });
      grup.classList.toggle('tersembunyi', !!q && ada === 0);
      tampil += ada;
    });
    nav.classList.toggle('cari-kosong', !!q && tampil === 0);
  });
}

export { terjemahkan };
