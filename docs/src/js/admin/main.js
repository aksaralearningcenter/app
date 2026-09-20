// ============ ENTRY POINT PANEL ADMIN ============
// Panel admin dipecah per domain (lihat folder pages/). Berkas ini merangkai
// semuanya: navigasi & gate, prefetch, loadPage, event delegation, boot,
// dan jembatan global untuk atribut inline.
import { state, CACHE_TTL, invalidateCache, simpanHalaman, peranTampil, setMode, bisaGantiMode } from './state.js';
import { $, esc, toast, skeletonHtml, siapkanTabelResponsif } from './ui.js';
import { terjemahkan, terjemahkanAkar } from './i18n.js';
import { pasangTema, pasangBahasa, pasangLaci, pasangMenu, tutupLaci,
  bentangkanGrupUntuk, setelSaatBahasaBerubah } from './tampilan.js';
import { API_URL } from './config.js';
import { api } from './api.js';
import { boot, doLogin, doLogout, forgotPass, setAppContext } from './auth.js';
import { app, closeModal, filterTable } from './helpers.js';
import { kunciTombol, lepasTombol, sekaliTulis } from './kunci.js';
import { render as renderDashboard, actions as actionsDashboard } from './pages/dashboard.js';
import { render as renderMurid, actions as actionsMurid,
  openAddProgress, openAddProgressFor, loadProgressStudent, saveProgress,
  saveAddStudent, saveEditStudent, saveAttendance, saveTransaction, txFillSavings,
  muatAbsensi, muatRiwayatAbsensi, absenTanggal, absenKelas } from './pages/murid.js';
import { render as renderKelas, actions as actionsKelas, saveAddClass, saveEditClass } from './pages/kelas.js';
import { render as renderJadwal, actions as actionsJadwal,
  saveSchedule, jadwalKelasBerubah, saringJadwal, bukaFormJadwal } from './pages/jadwal.js';
import { render as renderPermintaan, actions as actionsPermintaan,
  bukaFormPermintaan, savePermintaan, prosesPermintaanSekarang, permintaanKelasBerubah,
  permintaanKuotaBerubah, saveKuotaKelas, saveKuotaMurid, saringPermintaan } from './pages/permintaan.js';
import { render as renderUsers, actions as actionsUsers, openChangePass, saveChangePass, saveAddUser } from './pages/users.js';
import { render as renderAnak, actions as actionsAnak, saringAkunAnak } from './pages/anak.js';
import { render as renderKonten, actions as actionsKonten,
  savePricing, saveNews, saveBook, saveGallery, savePartner, saveTestimoni,
  saveFaq, saveProgram, saveKurikulum, saveKartu } from './pages/konten.js';
import { render as renderAsesmen, actions as actionsAsesmen, saveAsesmen, saveSoal,
  jenisSoalBerubah, imporSoalSekarang, unduhTemplateSoal, simpanNilaiEsai } from './pages/asesmen.js';
import { render as renderLaporan, actions as actionsLaporan, genReport, getLhLimit } from './pages/laporan.js';
import { pilihBerkas, pratinjauGambar, pratinjauDokumen, unggahBerkas } from './pages/upload.js';

// Modul halaman kembali ke loadPage lewat registry ini (diisi sekali di sini).
app.loadPage = function (p) { return loadPage(p); };


// ============ EVENT DELEGATION ============
// Satu listener untuk semua klik di #page — ganti ratusan inline onclick.
document.addEventListener('DOMContentLoaded', function() {
  $('page').addEventListener('click', function(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id || '';
    const name = btn.dataset.name || '';
    const extra = btn.dataset.extra || '';
    // Tombolnya ikut dikirim (argumen ke-4) supaya aksi bisa menyentuh baris yang
    // diklik — mis. menyorot status absensi tanpa menggambar ulang halaman.
    handleAction(action, id, name, extra, btn);
  });
});

const ACTIONS = Object.assign({}, actionsDashboard, actionsMurid, actionsKelas,
  actionsJadwal, actionsPermintaan, actionsUsers, actionsAnak, actionsKonten, actionsAsesmen, actionsLaporan);

// Renderer seluruh halaman, dirangkai dari modul per domain.
const RENDER = Object.assign({}, renderDashboard, renderMurid, renderKelas,
  renderJadwal, renderPermintaan, renderUsers, renderAnak, renderKonten, renderAsesmen, renderLaporan);

function handleAction(action, id, name, extra, el) {
  if (action === 'refresh-page') { invalidateCache(id); app.loadPage(id); return; }
  const fn = ACTIONS[action];
  if (!fn) return;
  // Anti-klik-ganda: abaikan bila aksi yang sama masih berjalan di tombol ini.
  // Handler sinkron (buka modal, pindah tab) tidak mengembalikan janji → bebas.
  if (!kunciTombol(el)) return;
  let hasil;
  try {
    hasil = fn(id, name, extra, el);
  } catch (e) {
    lepasTombol(el);
    throw e;
  }
  if (hasil && typeof hasil.then === 'function') {
    hasil.then(function () { lepasTombol(el); }, function () { lepasTombol(el); });
  } else {
    lepasTombol(el);
  }
}


// ============ NAV & GATE ============

  // ============ NAV & GATE ============
  // Catatan: state.currentPage TIDAK di-set paksa di sini. Nilainya sudah diisi
  // state.js dari halaman terakhir yang dibuka (localStorage), supaya me-refresh
  // melanjutkan halaman yang sama — bukan selalu kembali ke dashboard.
  document.querySelectorAll('#nav button[data-page]').forEach(b => {
    b.addEventListener('click', () => {
      loadPage(b.dataset.page);
      tutupLaci();   // di ponsel menu berbentuk laci: pilih menu → laci menutup
    });
  });

  function applyGate() {
    // Peran tampil (mode ganda Guru/Orang Tua) menentukan menu yang terlihat.
    const peran = peranTampil();
    // Halaman yang datanya memang Admin saja. 'reports', 'loginhistory', dan
    // 'settings' ikut di sini karena isinya memakai pengaturan situs, riwayat
    // login, dan token WhatsApp — sebelumnya menunya tampil untuk Guru tetapi
    // halamannya selalu gagal dengan "Hanya Admin yang bisa melakukan aksi ini".
    const adminOnly = ['users', 'orangtua', 'registrations', 'pricing', 'news', 'books', 'gallery', 'partners', 'testimoni', 'faq', 'program', 'kurikulum', 'kartu', 'situs', 'chatbot', 'maintenance', 'reports', 'loginhistory', 'settings'];
    // Orang Tua & Murid bukan staf: keduanya hanya punya dua halaman — data
    // mereka sendiri + pengajuan/riwayat jadwal.
    const nonStaf = peran === 'Orang Tua' || peran === 'Murid';
    document.querySelectorAll('#nav button').forEach(b => {
      const p = b.dataset.page;
      if (nonStaf) b.style.display = (p === 'dashboard' || p === 'requests') ? '' : 'none';
      else if (peran !== 'Admin') b.style.display = adminOnly.includes(p) ? 'none' : '';
      else b.style.display = '';
    });
    // Sembunyikan judul grup yang seluruh menunya tidak tersedia untuk peran ini.
    document.querySelectorAll('#nav .nav-group').forEach(g => {
      const tombol = Array.prototype.slice.call(g.querySelectorAll('button'));
      const ada = tombol.some(b => b.style.display !== 'none');
      g.style.display = ada ? '' : 'none';
    });
  }

  // ============ ALAMAT HALAMAN (#/murid, #/dashboard, …) ============
  // Panel ini satu berkas HTML. Tanpa alamat, refresh (F5) selalu kembali ke
  // Dashboard dan halaman tidak bisa di-bookmark. Dengan rute hash, alamat ikut
  // berubah saat berpindah halaman dan refresh membuka halaman yang sama.
  function dariAlamat() {
    const h = String(location.hash || '').replace(/^#\/?/, '').trim();
    return (h && RENDER[h]) ? h : '';
  }

  // `ganti` memakai replaceState (dipakai saat boot) supaya membuka tautan
  // langsung tidak menumpuk riwayat; navigasi biasa lewat location.hash agar
  // tombol maju/mundur peramban berfungsi.
  function tulisAlamat(page, ganti) {
    const alamat = '#/' + page;
    if (location.hash === alamat) return;
    // Saat panel baru dimuat (alamat belum punya hash) alamat ditulis dengan
    // replaceState supaya tidak menambah riwayat — tombol “mundur” tetap keluar
    // dari panel, bukan memutar ulang halaman di dalamnya.
    const gantikan = ganti || !location.hash;
    try {
      if (gantikan) history.replaceState(null, '', alamat);
      else location.hash = alamat;
    } catch (_e) { location.hash = alamat; }
  }

  // Halaman yang tidak punya menu sendiri tetap menyorot menu induknya
  // (mis. halaman “soal” masih bagian dari menu Asesmen).
  const NAV_INDUK = { soal: 'asesmen', hasil: 'asesmen' };

  function setActiveNav(page) {
    simpanHalaman(page);   // diingat agar refresh kembali ke halaman ini
    tulisAlamat(page);     // …sekaligus dicatat di alamat halaman
    const menu = NAV_INDUK[page] || page;
    let tombolAktif = null;
    document.querySelectorAll('#nav button[data-page]').forEach(b => {
      const aktif = b.dataset.page === menu;
      b.classList.toggle('active', aktif);
      if (aktif) {
        tombolAktif = b;
        const judul = document.getElementById('pg-title');
        // Judul halaman ikut bahasa aktif (data-title berisi teks Indonesia).
        if (judul) judul.textContent = terjemahkan(b.dataset.title || b.textContent.trim());
      }
    });
    // Menu aktif harus terlihat: buka grupnya bila tertutup, lalu geser daftar
    // menu bila isinya lebih panjang dari tinggi yang tersedia.
    bentangkanGrupUntuk(menu);
    const nav = $('nav');
    if (tombolAktif && nav && nav.scrollHeight > nav.clientHeight + 4) {
      try {
        tombolAktif.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } catch (_e) {
        tombolAktif.scrollIntoView(false);
      }
    }
  }

  // Menuliskan identitas pengguna di panel (dipakai boot() dan saat gagal muat).
  // Crumb & judul tab mengikuti peran TAMPIL (mode ganda Guru/Orang Tua).
  const NAMA_PANEL = { 'Admin': 'Panel Admin', 'Guru': 'Panel Guru', 'Orang Tua': 'Panel Orang Tua', 'Murid': 'Panel Murid' };
  function pasangIdentitas(me) {
    if (!me) return;
    const tampil = (me.peran === 'Guru' && me.punyaAnak && state.mode === 'Orang Tua') ? 'Orang Tua' : me.peran;
    const panel = NAMA_PANEL[tampil] || 'Panel Admin';
    $('who-label').textContent = '👤 ' + (me.nama || me.email) + ' · ' + me.peran +
      (tampil !== me.peran ? ' (mode ' + tampil + ')' : '');
    const crumb = document.querySelector('.tb-title .crumb');
    if (crumb) crumb.textContent = terjemahkan('Aksara Learning Center · ' + panel);
    document.title = terjemahkan(tampil + ' | Aksara Learning Center');
    pasangTombolMode();
  }

  // Tombol ganti mode (hanya untuk Guru yang anaknya kursus di sini).
  function pasangTombolMode() {
    let t = $('btn-mode');
    if (!bisaGantiMode()) { if (t) t.style.display = 'none'; return; }
    if (!t) return;
    t.style.display = '';
    const ortu = state.mode === 'Orang Tua';
    t.textContent = ortu ? '👨‍👩‍👧 Mode: Orang Tua' : '👩‍🏫 Mode: Guru';
    t.title = ortu ? 'Beralih ke tampilan Guru' : 'Beralih ke tampilan Orang Tua';
  }

  function gantiMode() {
    if (!bisaGantiMode()) return;
    setMode(state.mode === 'Orang Tua' ? 'Guru' : 'Orang Tua');
    invalidateCache('dashboard');
    invalidateCache('requests');
    pasangIdentitas(state.me);
    applyGate();
    const p = state.currentPage;
    if (p === 'dashboard' || p === 'requests') loadPage(p);
    else toast('Beralih ke mode ' + state.mode + '.', 'ok');
  }

  // Halaman yang dibuka saat pertama tampil: lanjutkan halaman terakhir, asalkan
  // halaman itu memang ada dan menunya tidak disembunyikan untuk peran ini.
  function halamanAwal() {
    // Alamat halaman menang atas halaman terakhir (localStorage): tautan
    // …/sites/#/murid harus membuka Data Murid walau sesi terakhir di Dashboard.
    const p = dariAlamat() || state.currentPage;
    if (!p || !RENDER[p]) return 'dashboard';
    const tombol = document.querySelector('#nav button[data-page="' + p + '"]');
    if (tombol && tombol.offsetParent === null) return 'dashboard';   // tidak berhak / tidak ada
    return p;
  }

  // Tombol maju/mundur peramban: pindah halaman tanpa memuat ulang berkas.
  // Diabaikan sebelum masuk (layar login) dan saat halaman sudah tampil.
  window.addEventListener('hashchange', function () {
    const p = dariAlamat();
    if (!p || p === state.currentPage) return;
    const shell = $('shell');
    if (!shell || !shell.classList.contains('on')) return;
    loadPage(p);
  });

  // Server tidak bisa dihubungi saat refresh. Sesi TIDAK dibuang — panel tetap
  // tampil dengan identitas terakhir dan tombol untuk mencoba lagi.
  function tampilkanGagalMuat(pesan, coba) {
    $('login').style.display = 'none';
    $('shell').classList.add('on');
    applyGate();
    if (state.me) pasangIdentitas(state.me);
    $('page').innerHTML =
      '<div class="card"><div class="empty">⚠️ ' + esc(pesan) +
      '<br><br><button class="btn btn-n btn-sm" id="btn-coba-lagi">🔄 Coba Lagi</button></div></div>';
    const tombol = $('btn-coba-lagi');
    if (tombol) tombol.addEventListener('click', function () {
      $('page').innerHTML = skeletonHtml();
      coba();
    });
  }

// ============ PREFETCH (stale-while-revalidate antar halaman) ============

  // ============ PREFETCH (stale-while-revalidate antar halaman) ============
  // Setelah data inti masuk cache, halaman lain yang berbagi sumber diambil
  // di belakang → navigasi terasa instan tanpa menunggu klik user.
  const PREFETCH_MAP = {
    students: ['classes'],
    savings: ['transactions'],
    classes: ['students']
  };
  let prefetching = {};
  function prefetch(pages) {
    (pages || []).forEach(p => {
      if (state.cache[p] || prefetching[p]) return;
      // Catatan: halaman Absensi tidak ikut di-prefetch — isinya bergantung pada
      // tanggal & kelas yang sedang dipilih guru (lembar absensi), bukan satu
      // daftar tetap.
      const loaders = {
        students: 'getStudents', classes: 'getClasses',
        savings: 'getSavingsAccounts', transactions: 'getAllTransactions'
      };
      if (!loaders[p]) return;
      prefetching[p] = true;
      api(loaders[p]).then(d => { state.cache[p] = d; state.cacheTime[p] = Date.now(); delete prefetching[p]; })
                      .catch(() => { delete prefetching[p]; });
    });
  }

  async function loadPage(page) {
    // Halaman detail soal butuh asesmen yang dipilih. Kalau konteksnya hilang
    // (mis. localStorage dibersihkan), kembali ke daftar asesmen.
    if ((page === 'soal' || page === 'hasil') && !state.currentAsesmen) page = 'asesmen';
    setActiveNav(page);
    const el = $('page');
    const cached = state.cache[page];
    const segar = cached && (Date.now() - (state.cacheTime[page] || 0) < CACHE_TTL);
    // Tampilkan cache lebih dulu (instan), tanpa menunggu jaringan.
    if (cached) RENDER[page](cached);
    else el.innerHTML = skeletonHtml();
    if (segar) return;   // masih segar → tidak perlu memanggil API lagi
    try {
      let data;
      if (page === 'dashboard') {
        // Tiga wajah dashboard: Orang Tua (anak-anaknya), Murid (dirinya sendiri),
        // dan staf (ringkasan sekolah). Mode ganda Guru/Ortu mengikuti tampilan.
        const tampil = peranTampil();
        if (tampil === 'Orang Tua') data = await api('getMyChildrenData');
        else if (tampil === 'Murid') data = await api('getMyStudent');
        else data = await api('getDashboardData');
      } else if (page === 'students') data = await api('getStudents');
      else if (page === 'classes') data = await api('getClasses');
      // Halaman Absensi memuat LEMBAR ABSENSI (sesi jadwal hari itu + catatan
      // yang sudah ada) untuk tanggal & kelas yang sedang dipilih guru.
      else if (page === 'attendance') data = await api('getAttendanceSheet', absenTanggal(), absenKelas());
      else if (page === 'schedules') data = await api('getSchedules');
      // Permintaan jadwal + kuota sesi (kelas & murid).
      else if (page === 'requests') {
        data = await api('getScheduleRequests');
        // Mode ortu butuh daftar anak untuk formulir: pastikan cache dashboard
        // memegang respons my-children (bukan dashboard staf).
        if (peranTampil() === 'Orang Tua' && !((state.cache.dashboard || {}).children)) {
          try {
            const anak = await api('getMyChildrenData');
            state.cache.dashboard = anak;
            state.cacheTime.dashboard = Date.now();
          } catch (_e) { /* formulir tetap jalan dari data permintaan */ }
        }
      }
      else if (page === 'savings') data = await api('getSavingsAccounts');
      else if (page === 'transactions') data = await api('getAllTransactions', 200);
      else if (page === 'users') data = await api('getUsers');
      // Akun Orang Tua + anak tertaut (menu “Akun & Anak”).
      else if (page === 'orangtua') data = await api('getUserChildren');
      else if (page === 'pricing') data = await api('getPricingData');
      else if (page === 'news') data = await api('getNews');
      else if (page === 'books') data = await api('getBooks');
      else if (page === 'gallery') data = await api('getGallery');
      else if (page === 'partners') data = await api('getPartners');
      else if (page === 'testimoni') data = await api('getTestimoni');
      else if (page === 'faq') data = await api('getFaq');
      else if (page === 'program') data = await api('getProgram');
      else if (page === 'kurikulum') data = await api('getKurikulum');
      else if (page === 'kartu') data = await api('getKartu');
      else if (page === 'situs') data = await api('getSiteSettings');
      else if (page === 'chatbot') data = await api('getChatConfig');
      else if (page === 'maintenance') data = await api('getMaintenanceInfo');
      else if (page === 'registrations') data = await api('getRegistrations');
      else if (page === 'asesmen') data = await api('getAssesmen');
      else if (page === 'soal') data = await api('getAsesmenDetail', state.currentAsesmen);
      else if (page === 'hasil') data = await api('getHasilAssesmen', state.currentAsesmen);
      else if (page === 'progress') data = {};
      else if (page === 'reports') data = await api('getReportSettings');
      else if (page === 'stats') data = await api('getStatsData');
      else if (page === 'activitylog') data = await api('getActivityLog', 200);
      else if (page === 'loginhistory') { const res = await api('getLoginHistory', getLhLimit()); data = res.data || []; }
      else if (page === 'settings') data = await api('getWhatsAppSettings');
      state.cache[page] = data;
      state.cacheTime[page] = Date.now();
      RENDER[page](data);
      prefetch(PREFETCH_MAP[page]); // manfaatkan waktu senggang utk halaman berikutnya
    } catch (ex) {
      el.innerHTML = '<div class="card"><div class="empty">⚠️ ' + esc(ex.message) + '<br><br><button class="btn btn-o btn-sm" onclick="loadPage(\'' + page + '\')">🔄 Coba Lagi</button></div></div>';
    }
  }  // ============ BAHASA & TABEL RESPONSIF ============

  // ============ BAHASA & TABEL RESPONSIF ============
  // Setiap kali isi halaman/modal berubah (render halaman, ganti baris tabel,
  // dsb.) dua hal dirapikan:
  //   1. terjemahan teks ke bahasa aktif,
  //   2. data-label tabel dari header kolomnya (mode kartu di ponsel).
  // URUTANNYA PENTING: label menyalin teks <thead>, jadi harus dihitung
  // setelah teksnya diterjemahkan.
  //
  // Aman dari pengulangan tak berujung: penerjemahan mengubah *teks* simpul
  // (characterData), sedangkan pengamat ini hanya menonton childList — jadi
  // perubahan tadi tidak memicu dirinya sendiri.
  (function () {
    const halaman = $('page');
    const modal = $('modal');
    if (typeof MutationObserver === 'undefined') return;
    const segarkan = function (akar) {
      terjemahkanAkar(akar);
      siapkanTabelResponsif(akar);
    };
    [halaman, modal].forEach(function (akar) {
      if (!akar) return;
      new MutationObserver(function () { segarkan(akar); }).observe(akar, { childList: true, subtree: true });
      segarkan(akar);
    });
  })();

  // Saat bahasa diganti, label tabel lama (sudah terhapus oleh tampilan.js)
  // dihitung ulang dalam bahasa yang baru.
  setelSaatBahasaBerubah(function () { siapkanTabelResponsif($('page')); });

// ============ BOOT ============

  // ============ BOOT ============

  // Modul auth butuh navigasi & renderer halaman yang tinggal di berkas ini.
  // Disuntikkan (bukan diimpor) agar tidak terjadi impor melingkar
  // main.js ↔ auth.js.
  setAppContext({
    applyGate, setActiveNav, prefetch, loadPage,
    RENDER, PREFETCH_MAP,
    pasangIdentitas, halamanAwal, tampilkanGagalMuat
  });

  // Tema, bahasa, laci menu, dan lipatan menu dipasang lebih dulu supaya
  // layar login pun sudah memakai tampilan & bahasa pilihan pengguna.
  pasangTema();
  pasangBahasa();
  pasangLaci();
  pasangMenu();

  if (state.token && API_URL) {
    boot();
  } else if (!API_URL) {
    // Konfigurasi belum diisi — tampilkan petunjuk di layar login
    document.querySelector('.login-body').insertAdjacentHTML('afterbegin',
      '<div style="background:#FFF6E5; border:1px solid #EAD9B0; color:#9A7334; padding:12px 14px; border-radius:9px; font-size:0.82rem; margin-bottom:16px;">⚠️ <b>Belum dikonfigurasi.</b> Isi <code>API_URL</code> di file ini dengan URL web app Apps Script (lihat README).</div>');
  }

  // ==================== JEMBATAN GLOBAL UNTUK ATRIBUT INLINE ====================
  // Berkas ini dijalankan sebagai ES module, sehingga deklarasi `function` di
  // sini TIDAK lagi otomatis menjadi global (beda dengan <script> biasa).
  // Panel admin memakai 62 atribut onclick/oninput/onchange/onsubmit, jadi nama
  // fungsi yang dipanggil dari atribut inline itu harus didaftarkan ke window.
  // Daftar ini lengkap — menambah handler inline baru berarti menambah namanya
  // di sini juga.
  // Semua operasi tulis lewat atribut inline dikunci sekali-jalan
  // (anti-klik-ganda). Pengecualian: closeModal, filter/saring tampilan murni,
  // dan pratinjau/unggah yang mengatur kuncinya sendiri.
  Object.assign(window, {
    closeModal, doLogin, doLogout, filterTable, loadProgressStudent,
    forgotPass: sekaliTulis(forgotPass),
    genReport: sekaliTulis(genReport), gantiMode,
    imporSoalSekarang: sekaliTulis(imporSoalSekarang), jenisSoalBerubah,
    simpanNilaiEsai: sekaliTulis(simpanNilaiEsai), unduhTemplateSoal,
    loadPage: sekaliTulis(loadPage), openAddProgress, openAddProgressFor, openChangePass,
    saveAsesmen: sekaliTulis(saveAsesmen), saveSoal: sekaliTulis(saveSoal),
    pilihBerkas, pratinjauDokumen, pratinjauGambar,
    saveAddClass: sekaliTulis(saveAddClass), saveAddStudent: sekaliTulis(saveAddStudent),
    saveAddUser: sekaliTulis(saveAddUser), saveAttendance: sekaliTulis(saveAttendance),
    saveBook: sekaliTulis(saveBook), saveChangePass: sekaliTulis(saveChangePass),
    saveEditClass: sekaliTulis(saveEditClass),
    saveEditStudent: sekaliTulis(saveEditStudent), saveFaq: sekaliTulis(saveFaq),
    saveGallery: sekaliTulis(saveGallery), saveKartu: sekaliTulis(saveKartu),
    saveKurikulum: sekaliTulis(saveKurikulum), saveNews: sekaliTulis(saveNews),
    savePartner: sekaliTulis(savePartner), savePricing: sekaliTulis(savePricing),
    saveProgram: sekaliTulis(saveProgram), saveProgress: sekaliTulis(saveProgress),
    saveTestimoni: sekaliTulis(saveTestimoni),
    saveTransaction: sekaliTulis(saveTransaction), txFillSavings, unggahBerkas,
    // Jadwal & absensi (termasuk atribut inline di dalam modal).
    bukaFormJadwal, jadwalKelasBerubah, muatAbsensi, muatRiwayatAbsensi,
    saringJadwal, saveSchedule: sekaliTulis(saveSchedule),
    // Permintaan jadwal & kuota (form pengajuan, proses, dan kuota).
    bukaFormPermintaan, permintaanKelasBerubah, permintaanKuotaBerubah,
    prosesPermintaanSekarang: sekaliTulis(prosesPermintaanSekarang),
    saringPermintaan,
    saveKuotaKelas: sekaliTulis(saveKuotaKelas), saveKuotaMurid: sekaliTulis(saveKuotaMurid),
    savePermintaan: sekaliTulis(savePermintaan),
    // Akun Orang Tua ↔ anak (pencarian di halaman Akun & Anak).
    saringAkunAnak
  });
