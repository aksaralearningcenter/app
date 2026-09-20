// ============ AUTH: LOGIN, LOGOUT & BOOTSTRAP SESI ============
import { $, toast, skeletonHtml } from './ui.js';
import { state, hardLogout, simpanSesi } from './state.js';
import { post } from './api.js';

// Bagian aplikasi yang hanya ada di main.js (nav, renderer halaman, prefetch).
// Disuntikkan lewat setAppContext agar modul ini tidak perlu mengimpor main.js
// dan tidak terjadi impor melingkar.
let app = null;
export function setAppContext(konteks) { app = konteks; }

export async function doLogin(e) {
  e.preventDefault();
  const btn = $('lg-btn'), err = $('login-err');
  btn.disabled = true; btn.textContent = '⏳ Memproses...';
  err.style.display = 'none';
  try {
    const res = await post('login', { login: $('lg-user').value.trim(), password: $('lg-pass').value });
    if (res && res.success && res.token) {
      state.token = res.token;
      localStorage.setItem('aksara_token', res.token);
      await boot();
    } else {
      err.textContent = (res && res.message) || 'Login gagal.';
      err.style.display = 'block';
    }
  } catch (ex) {
    // Pesan dari api.js sudah spesifik (koneksi / batas waktu / respon rusak),
    // jadi tampilkan apa adanya — tanpa awalan "Koneksi gagal" yang menyesatkan
    // saat penyebabnya sebenarnya bukan koneksi.
    err.textContent = ex.message;
    err.style.display = 'block';
  }
  btn.disabled = false; btn.textContent = '🔐 Masuk';
}

export function forgotPass() {
  const login = prompt('Tuliskan username atau email akun Anda.\nAdmin akan mengirim password baru ke email Anda.');
  if (!login) return;
  post('forgot-password', { login: login.trim() }).then(res => {
    toast((res && res.message) || 'Permintaan terkirim.', (res && res.success) ? 'ok' : 'err');
  }).catch(e => toast((e && e.message) || 'Koneksi gagal.', 'err'));
}

export async function doLogout() {
  try { await post('logout', { token: state.token }); } catch (_e) {}
  hardLogout();
}

// Dipanggil setelah login berhasil dan saat halaman dimuat dengan token tersimpan.
export async function boot() {
  // 1. Tampilkan panel lebih dulu dari sesi yang tersimpan. Ini yang membuat
  //    me-refresh halaman tidak lagi berkedip ke layar login.
  if (state.me) {
    document.documentElement.classList.add('ada-sesi');
    $('login').style.display = 'none';
    $('shell').classList.add('on');
    app.pasangIdentitas(state.me);
    app.applyGate(state.me.peran);
    if (!$('page').innerHTML.trim()) $('page').innerHTML = skeletonHtml();
  }

  // 2. Validasi sesi ke server.
  let me;
  try {
    me = await post('me', { token: state.token });
  } catch (e) {
    // Sesi ditolak server: api.js sudah memanggil hardLogout() (token dikosongkan),
    // jadi memang harus kembali ke layar login.
    if (!state.token) { hardLogout(); return; }
    // Selain itu (jaringan terputus, server lambat, Vercel cold start) sesi masih
    // sah — JANGAN dibuang. Cukup tawarkan coba lagi.
    app.tampilkanGagalMuat(e.message, boot);
    return;
  }
  if (!me || !me.success) { hardLogout(); return; }

  state.me = me;
  simpanSesi();                       // agar refresh berikutnya instan
  $('login').style.display = 'none';
  $('shell').classList.add('on');
  app.pasangIdentitas(me);
  $('btn-cp').style.display = '';
  app.applyGate(me.peran);

  // Lanjutkan di halaman yang terakhir dibuka (bukan selalu dashboard).
  const startPage = app.halamanAwal();
  $('page').innerHTML = skeletonHtml();

  // ⚡ Satu round-trip untuk semua data inti (STAF): /dashboard/batch memuat
  // dashboard + murid + kelas + absensi + users, lalu dashboard dirender
  // langsung dari batch — tanpa panggilan kedua.
  // Orang Tua memakai /my-children dan Murid memakai /my-student; keduanya
  // BUKAN staf, jadi tidak boleh menempuh jalur batch ini (dulu peran Murid
  // ikut ke sini dan dashboard-nya kosong).
  if (me.peran !== 'Orang Tua' && me.peran !== 'Murid') {
    try {
      const batch = await post('call', { fn: 'getBatchStartupData' });
      if (batch && batch.dashboard) {
        const kini = Date.now();
        state.cache.dashboard = batch.dashboard;
        state.cache.students = batch.students || [];
        state.cache.classes = batch.classes || [];
        state.cache.users = batch.users || [];
        // Catatan: cache 'attendance' TIDAK diisi dari batch. Halaman Absensi
        // memuat LEMBAR ABSENSI (sesi jadwal + catatan) untuk tanggal tertentu,
        // jadi bentuk datanya berbeda dari ringkasan absensi hari ini.
        ['dashboard', 'students', 'classes', 'users'].forEach(k => { state.cacheTime[k] = kini; });
        if (startPage === 'dashboard') {
          app.setActiveNav('dashboard');
          app.RENDER.dashboard(batch.dashboard);
          app.prefetch(app.PREFETCH_MAP.dashboard);
          return;
        }
      }
    } catch (_e) { /* gagal batch → fallback ke loadPage biasa */ }
  }
  await app.loadPage(startPage);
}
