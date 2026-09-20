// ============ STATE, CACHE & SESI ============
import { $ } from './ui.js';

// Membaca profil sesi yang tersimpan di peramban. Dipakai agar saat halaman
// di-refresh panel langsung tampil (tidak berkedip ke layar login) sementara
// sesi divalidasi ulang ke server di belakang layar.
function bacaSesi() {
  try { return JSON.parse(localStorage.getItem('aksara_user') || 'null'); } catch (_e) { return null; }
}

// Satu sumber kebenaran untuk data sesi + cache halaman.
export const state = {
  token: localStorage.getItem('aksara_token') || '',
  me: bacaSesi(),
  // Mode tampil akun Guru bertautan: 'Guru' (staf) atau 'Orang Tua' (panel
  // anak). Diingat per peramban; hanya berlaku bila akunnya Guru + punya anak.
  mode: (function () { try { return localStorage.getItem('aksara_mode') || 'Guru'; } catch (_e) { return 'Guru'; } })(),
  // Halaman yang terakhir dibuka — dipulihkan saat refresh.
  currentPage: localStorage.getItem('aksara_page') || '',
  // Asesmen yang sedang dibuka di halaman detail soal. Ikut disimpan supaya
  // refresh tidak membuang konteks halaman “Soal” (daftarnya jadi kosong).
  currentAsesmen: localStorage.getItem('aksara_asesmen') || '',
  cache: {}, cacheTime: {}, students: []
};

// Peran yang dipakai tampilan & permintaan data: Guru bertautan yang memilih
// mode Orang Tua tampil sebagai Orang Tua (hanya anaknya sendiri).
export function peranTampil() {
  const me = state.me || {};
  if (me.peran === 'Guru' && me.punyaAnak && state.mode === 'Orang Tua') return 'Orang Tua';
  return me.peran || null;
}

// Ganti mode tampil (hanya berpengaruh untuk Guru bertautan).
export function setMode(mode) {
  state.mode = mode === 'Orang Tua' ? 'Orang Tua' : 'Guru';
  try { localStorage.setItem('aksara_mode', state.mode); } catch (_e) {}
}

// Apakah akun ini boleh ganti mode (Guru yang anaknya kursus di sini).
export function bisaGantiMode() {
  const me = state.me || {};
  return me.peran === 'Guru' && !!me.punyaAnak;
}

// Simpan profil sesi supaya refresh berikutnya bisa langsung menampilkan panel.
export function simpanSesi() {
  try { localStorage.setItem('aksara_user', JSON.stringify(state.me || null)); } catch (_e) {}
}

// Simpan halaman aktif (dipanggil tiap kali navigasi).
export function simpanHalaman(page) {
  state.currentPage = page || '';
  try { localStorage.setItem('aksara_page', state.currentPage); } catch (_e) {}
}

// Simpan asesmen yang sedang dikelola (id kosong = kembali ke daftar).
export function simpanAsesmen(id) {
  state.currentAsesmen = id || '';
  try { localStorage.setItem('aksara_asesmen', state.currentAsesmen); } catch (_e) {}
}

// Cache halaman dianggap masih segar selama CACHE_TTL ms. Selama segar, pindah
// halaman langsung tampil dari cache tanpa memanggil API (hemat kuota);
// setelah lewat TTL, data ditarik ulang di belakang layar.
export const CACHE_TTL = 60000;
export const REQ_TIMEOUT = 25000;

// ⚡ Targeted cache invalidation — hanya hapus cache yang terpengaruh
const INVALIDATION_MAP = {
  students: ['students', 'dashboard', 'attendance', 'progress', 'schedules', 'requests', 'orangtua'],
  classes: ['classes', 'students', 'dashboard', 'schedules', 'requests'],
  attendance: ['attendance', 'dashboard'],
  // Jadwal memengaruhi lembar absensi: sesi & daftar murid yang ditampilkan.
  // Kuota memengaruhi halaman Permintaan (sisa jatah sesi per kelas/murid).
  schedules: ['schedules', 'attendance', 'requests'],
  requests: ['requests', 'schedules'],
  savings: ['savings', 'dashboard', 'transactions'],
  transactions: ['transactions', 'dashboard', 'savings'],
  registrations: ['registrations', 'dashboard'],
  users: ['users', 'orangtua'],
  // Tautan anak mengubah panel Orang Tua (daftar anak) sekaligus halaman Users.
  orangtua: ['orangtua', 'users'],
  pricing: ['pricing'],
  news: ['news'],
  books: ['books'],
  settings: ['settings', 'reports'],
  reports: ['reports'],
  progress: ['progress', 'dashboard'],
  asesmen: ['asesmen'],
  soal: ['soal', 'asesmen'],
  hasil: ['hasil', 'asesmen']
};

export function invalidateCache(entity) {
  const keys = INVALIDATION_MAP[entity] || [entity];
  keys.forEach(k => { delete state.cache[k]; delete state.cacheTime[k]; });
}

// Bersihkan sesi di klien lalu kembalikan ke layar login.
// Dipakai api.js saat server membalas 401, dan auth.js saat logout.
// HANYA dipanggil kalau server benar-benar menolak sesi — bukan saat jaringan
// bermasalah, supaya sekadar refresh tidak melempar pengguna keluar.
export function hardLogout() {
  state.token = ''; state.me = null; state.cache = {}; state.currentPage = ''; state.currentAsesmen = '';
  state.mode = 'Guru';
  try {
    localStorage.removeItem('aksara_token');
    localStorage.removeItem('aksara_user');
    localStorage.removeItem('aksara_page');
    localStorage.removeItem('aksara_asesmen');
    localStorage.removeItem('aksara_mode');
  } catch (_e) {}
  // Kembalikan crumb & judul tab ke default.
  try {
    const crumb = document.querySelector('.tb-title .crumb');
    if (crumb) crumb.textContent = 'Aksara Learning Center · Panel Admin';
    document.title = 'Admin | Aksara Learning Center';
    const mode = document.querySelector('#btn-mode');
    if (mode) mode.style.display = 'none';
  } catch (_e) {}
  // Hapus juga penanda "ada sesi" di <html> (dipasang skrip kecil di <head>),
  // supaya layar login benar-benar tampil kembali.
  document.documentElement.classList.remove('ada-sesi');
  $('shell').classList.remove('on');
  $('login').style.display = 'flex';
}
