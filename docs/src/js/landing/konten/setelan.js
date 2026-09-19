// ==================== KONTEN DINAMIS — PENGATURAN SITUS ====================
// Nilai dipakai pada elemen yang punya atribut data-set, dan nomor WhatsApp
// dipakai ulang untuk semua tautan wa.me (termasuk yang baru dirender).
import { cTxt } from './util.js';

let SETELAN = {};

export function nomorWA() { return String(SETELAN.wa_nomor || '').replace(/\D/g, ''); }

export function perbaruiNomorWA() {
  const nomor = nomorWA();
  if (!nomor) return;
  document.querySelectorAll('a[href*="wa.me/"]').forEach(function (a) {
    a.setAttribute('href', String(a.getAttribute('href')).replace(/wa\.me\/\d+/, 'wa.me/' + nomor));
  });
}

export function terapkanSetelan(s) {
  if (!s || typeof s !== 'object') return;
  SETELAN = s;
  document.querySelectorAll('[data-set]').forEach(function (el) {
    const v = s[el.getAttribute('data-set')];
    if (v === undefined || v === null || v === '') return;
    const href = el.getAttribute('href') || '';
    if (el.tagName === 'A' && href.indexOf('mailto:') === 0) el.setAttribute('href', 'mailto:' + v);
    else if (el.tagName === 'A' && href.indexOf('tel:') === 0) el.setAttribute('href', 'tel:' + String(v).replace(/[^\d+]/g, ''));
    el.textContent = v;
  });
  // Statistik beranda (angka count-up + label) dari settings admin.
  if (typeof window.pasangStatistikDari === 'function') window.pasangStatistikDari(s);
  perbaruiNomorWA();
}

export function ambilSetelan() { return SETELAN; }
