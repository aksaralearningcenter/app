// ==================== KONTEN DINAMIS — UTILITAS ====================
// Helper kecil yang dipakai semua renderer konten.

export const cTxt = function (v) { return v == null ? '' : String(v); };

export const cEsc = function (v) {
  return cTxt(v).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};

export const byUrutan = function (a, b) { return (a.urutan || 0) - (b.urutan || 0); };
export const isRegular = function (r) { return /regular/i.test(cTxt(r.c1)); };
export const rowAttr = function (r) { return isRegular(r) ? ' class="featured"' : ''; };
export const elById = function (id) { return document.getElementById(id); };
export const tampilkan = function (el, ada) { if (el) el.classList.toggle('is-hidden', !ada); };
