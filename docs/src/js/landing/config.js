// ==================== KONFIGURASI ====================
// Base URL REST API backend (Vercel) — lihat server/README.md
//    Contoh: 'https://aksara-api.vercel.app/api'
// Tombol "Masuk Sistem" mengarah ke aplikasi admin di folder sites/index.html.
export const LP_API_DEFAULT = 'https://aksara-api-mocha.vercel.app/api';

// Tes lokal: buka index.html?api=http://localhost:3000/api
// Tanpa parameter itu, selalu memakai LP_API_DEFAULT (produksi).
export const LP_API_URL = (function () {
  try {
    const p = new URLSearchParams(window.location.search).get('api');
    if (p) return p.replace(/\/+$/, '');
  } catch (e) { /* abaikan */ }
  return LP_API_DEFAULT;
})();
