// ==================== KONTEN DINAMIS — HARGA & PAKET ====================
// Bila admin belum mengisi tabel untuk sebuah tab, tab & panelnya disembunyikan.
// Kalau tidak ada satu pun data harga, seluruh seksi harga disembunyikan.
import { cTxt, cEsc, byUrutan, rowAttr, elById, tampilkan } from './util.js';

export function renderPricing(list) {
  const seksi = elById('harga');
  if (!list.length) { tampilkan(seksi, false); return; }
  tampilkan(seksi, true);
  const byTipe = {};
  list.forEach(function (r) { const t = cTxt(r.tipe) || 'program'; (byTipe[t] = byTipe[t] || []).push(r); });

  // Tabel paket per program (tab) — Kids/School/Academic: 4 kolom, Writing/Final: 3 kolom.
  // Admin memakai Tipe "program" + kolom Grup, atau Tipe khusus "writing"/"final".
  const barisProgram = (byTipe.program || []).concat(byTipe.writing || [], byTipe.final || []);
  const grupAktif = [];
  ['kids', 'sd', 'smp', 'sma', 'academic', 'writing', 'final'].forEach(function (grup) {
    const panel = elById('pr-' + grup);
    if (!panel) return;
    const rows = barisProgram
      .filter(function (r) { return (cTxt(r.grup) || cTxt(r.tipe)).toLowerCase() === grup; })
      .sort(byUrutan);
    if (!rows.length) { tampilkan(panel, false); return; }
    tampilkan(panel, panel.classList.contains('active'));
    grupAktif.push(grup);
    const tbody = panel.querySelector('table.price-table tbody');
    if (!tbody) return;
    const ringkas = (grup === 'writing' || grup === 'final');
    tbody.innerHTML = rows.map(function (r) {
      return ringkas
        ? '<tr' + rowAttr(r) + '><td>' + cEsc(r.c1) + '</td><td class="t-left">' + cEsc(r.c2) + '</td><td class="rp-strong">' + cEsc(r.c3) + '</td></tr>'
        : '<tr' + rowAttr(r) + '><td>' + cEsc(r.c1) + '</td><td>' + cEsc(r.c2) + '</td><td class="rp-strong">' + cEsc(r.c3) + '</td><td class="rp-strong">' + cEsc(r.c4) + '</td></tr>';
    }).join('');
    const catatan = rows.filter(function (r) { return cTxt(r.c5); }).pop();
    if (catatan) { const note = panel.querySelector('.price-note'); if (note) { note.innerHTML = cEsc(catatan.c5); note.style.display = ''; } }
    else { const note = panel.querySelector('.price-note'); if (note) note.style.display = 'none'; }
  });
  // Tab tanpa data disembunyikan; bila tab aktif bawaan kosong, aktifkan tab pertama yang ada datanya.
  document.querySelectorAll('.pr-tab').forEach(function (tab) {
    const g = tab.getAttribute('data-pr');
    tampilkan(tab, grupAktif.indexOf(g) !== -1);
  });
  const pertama = grupAktif[0];
  if (pertama && !document.querySelector('.pr-tab.active:not(.is-hidden)')) {
    document.querySelectorAll('.pr-tab').forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-pr') === pertama); });
    document.querySelectorAll('.pr-panel').forEach(function (p) { p.classList.toggle('active', p.id === 'pr-' + pertama); });
  }

  // Kartu tiga paket utama (ambil baris grup "kids").
  const kids = barisProgram.filter(function (r) { return cTxt(r.grup).toLowerCase() === 'kids'; });
  if (kids.length) {
    Array.prototype.forEach.call(document.querySelectorAll('.plan'), function (card) {
      const h3 = card.querySelector('h3');
      if (!h3) return;
      const nama = cTxt(h3.textContent).toLowerCase();
      const row = kids.filter(function (r) { return cTxt(r.c1).toLowerCase() === nama; })[0];
      if (!row) return;
      const val = card.querySelector('.plan-price .val');
      if (val && cTxt(row.c3)) val.innerHTML = cEsc(row.c3) + '<small>per bulan (TK–SD online)</small>';
      const freq = card.querySelector('.plan-freq');
      const m = cTxt(row.c2).match(/(\d+)/);
      if (freq && m) freq.textContent = m[1] + '× Pembelajaran / Bulan';
    });
  }

  // Tabel di luar tab: zona jarak, tarif per jenjang, paket online — box kosong disembunyikan.
  const isiBox = function (boxId, tipe, jumlahKolom, kolomTebal) {
    const box = elById(boxId);
    if (!box) return;
    const rows = (byTipe[tipe] || []).sort(byUrutan);
    if (!rows.length) { tampilkan(box, false); return; }
    tampilkan(box, true);
    const tbody = box.querySelector('table.price-table tbody');
    if (!tbody) return;
    tbody.innerHTML = rows.map(function (r) {
      let tds = '';
      for (let i = 1; i <= jumlahKolom; i++) {
        tds += '<td' + (kolomTebal.indexOf(i) !== -1 ? ' class="rp-strong"' : '') + '>' + cEsc(r['c' + i]) + '</td>';
      }
      return '<tr' + rowAttr(r) + '>' + tds + '</tr>';
    }).join('');
  };
  isiBox('price-zona-box', 'zona', 3, [3]);
  isiBox('price-jenjang-box', 'jenjang', 5, []);
  isiBox('price-online-box', 'online', 4, [3]);
}
