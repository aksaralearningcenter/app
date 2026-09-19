// ==================== TAB: KURIKULUM & HARGA ====================

// ---------- KURIKULUM TABS ----------
// Pakai event delegation agar tetap bekerja setelah panelnya dirender ulang
// dari data admin (kelola dari menu 📘 Kurikulum).
window.pilihDocTab = function (key) {
  document.querySelectorAll('.doc-tab').forEach(function (t) {
    t.classList.toggle('active', t.getAttribute('data-doc') === key);
  });
  document.querySelectorAll('.doc-panel').forEach(function (p) {
    p.classList.toggle('active', p.id === 'doc-' + key);
  });
};

(function () {
  const wrap = document.getElementById('doc-wrap');
  if (!wrap) return;
  wrap.addEventListener('click', function (e) {
    const tab = e.target.closest ? e.target.closest('.doc-tab') : null;
    if (tab) window.pilihDocTab(tab.getAttribute('data-doc'));
  });
})();

// ---------- TAB HARGA / PAKET ----------
(function () {
  const tabs = document.querySelectorAll('.pr-tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      const key = tab.getAttribute('data-pr');
      tabs.forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.pr-panel').forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      const panel = document.getElementById('pr-' + key);
      if (panel) panel.classList.add('active');
    });
  });
})();
