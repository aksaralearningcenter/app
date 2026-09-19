// ==================== KONTEN DINAMIS — KURIKULUM (tab dokumentasi) ====================
import { cTxt, cEsc, elById, tampilkan } from './util.js';

export function renderKurikulum(list) {
  const wrap = elById('doc-wrap');
  if (!wrap) return;
  // Admin belum mengisi kurikulum → seksi Kurikulum disembunyikan.
  if (!list.length) { tampilkan(elById('kurikulum'), false); return; }
  tampilkan(elById('kurikulum'), true);
  const pisah = function (teks) {
    return String(teks || '').split(/\||\n/).map(function (s) { return s.trim(); }).filter(Boolean);
  };
  const tabs = list.map(function (k, i) {
    return '<button class="doc-tab' + (i === 0 ? ' active' : '') + '" data-doc="' + cEsc(k.tab) + '" role="tab">' + cEsc(k.judul) + '</button>';
  }).join('');
  const panel = list.map(function (k, i) {
    const alur = pisah(k.alur).map(function (s, j) {
      return '<li><span class="num">' + (j + 1) + '</span><span>' + cEsc(s) + '</span></li>';
    }).join('');
    const capaian = pisah(k.capaian).map(function (s) {
      return '<li><i class="fa-solid fa-circle-check"></i> ' + cEsc(s) + '</li>';
    }).join('');
    return '<div class="doc-panel' + (i === 0 ? ' active' : '') + '" id="doc-' + cEsc(k.tab) + '" role="tabpanel">' +
      '<div class="doc-head">' +
        (cTxt(k.ikon) ? '<div class="dc-icon"><i class="' + cEsc(k.ikon) + '"></i></div>' : '') +
        '<div><h3>' + cEsc(k.judul) + '</h3>' + (cTxt(k.ringkasan) ? '<p>' + cEsc(k.ringkasan) + '</p>' : '') + '</div>' +
      '</div>' +
      '<div class="doc-cols">' +
        (alur ? '<div><h4>Alur Materi</h4><ul class="syllabus">' + alur + '</ul></div>' : '') +
        (capaian ? '<div class="outcome"><h4>Capaian</h4><ul>' + capaian + '</ul></div>' : '') +
      '</div>' +
      (cTxt(k.catatan) ? '<p class="doc-note">' + cEsc(k.catatan) + '</p>' : '') +
      '</div>';
  }).join('');
  wrap.innerHTML = '<div class="doc-tabs" role="tablist">' + tabs + '</div>' + panel;
  if (window.pilihDocTab) window.pilihDocTab(list[0].tab);
}
