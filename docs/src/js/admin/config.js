// ============ KONFIGURASI (WAJIB DIISI) ============
// Base URL REST API backend baru (Vercel). Ganti bila domain berubah.
export const API_DEFAULT = 'https://aksara-api-mocha.vercel.app/api';

// Tes lokal: buka sites/index.html?api=http://localhost:3000/api
// Tanpa parameter itu, selalu memakai API_DEFAULT (produksi).
// API_PARAM menyimpan nilai mentahnya (tanpa garis miring di akhir); dipakai
// ulang saat membuat tautan ujian siswa agar ujian ikut menunjuk backend yang
// sama dengan panel admin yang sedang dibuka. Bernilai '' bila tidak ada.
export const API_PARAM = (function () {
  try {
    return (new URLSearchParams(window.location.search).get('api') || '').replace(/\/+$/, '');
  } catch (e) { return ''; }
})();

export const API_URL = API_PARAM || API_DEFAULT;
