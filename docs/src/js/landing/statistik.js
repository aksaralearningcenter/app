// ==================== COUNTER ANIMATION ====================
// Angka statistik beranda dikelola admin (stat1_nilai … stat4_nilai).
// Format: angka murni → count-up + sufiks; berprefiks/teks (mis. "1-on-1") → tampil apa adanya.
let statNilai = { 1: '500+', 2: '5', 3: '98%', 4: '10+' };
let counterObserver = null;

function pasangStatistik() {
  document.querySelectorAll('.sn[data-stat]').forEach(function (el) {
    const n = el.getAttribute('data-stat');
    const teks = String(statNilai[n] || '').trim() || '0';
    const m = /^(\d+)(.*)$/.exec(teks);
    el.setAttribute('data-count', m ? m[1] : '');
    el.setAttribute('data-suffix', m ? m[2] : '');
    el.textContent = m ? '0' : teks;
    el.dataset.selesai = m ? '' : 'y';
  });
  document.querySelectorAll('[data-stat-label]').forEach(function (el) {
    el.textContent = statNilai[el.getAttribute('data-stat-label') + '_label'] || el.textContent;
  });
  // Setelah nilai berubah, daftarkan ulang agar count-up berjalan lagi
  // (elemen yang sudah dianimasikan sebelumnya sudah di-unobserve).
  if (counterObserver) {
    document.querySelectorAll('.sn[data-stat]').forEach(function (el) {
      counterObserver.unobserve(el);
      counterObserver.observe(el);
    });
  }
}
pasangStatistik();

// Dipanggil dari modul konten saat settings admin diterapkan.
window.pasangStatistikDari = function (s) {
  if (!s || typeof s !== 'object') return;
  for (let i = 1; i <= 4; i++) {
    if (s['stat' + i + '_nilai']) statNilai[i] = String(s['stat' + i + '_nilai']);
    if (s['stat' + i + '_label']) statNilai[i + '_label'] = String(s['stat' + i + '_label']);
  }
  pasangStatistik();
};

const counters = document.querySelectorAll('.sn[data-stat]');
counterObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    if (el.dataset.selesai === 'y') { counterObserver.unobserve(el); return; }
    const target = parseInt(el.getAttribute('data-count'), 10) || 0;
    const suffix = el.getAttribute('data-suffix') || '';
    const start = performance.now();
    const duration = 1400;
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    counterObserver.unobserve(el);
  });
}, { threshold: 0.5 });
counters.forEach(function (el) { counterObserver.observe(el); });
