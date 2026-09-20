// ============ HELPER BERSAMA PANEL ADMIN ============
// Modal, filter tabel, dan opsi select yang dipakai beberapa modul halaman.
// `app` = registry kecil: main.js mengisinya dengan loadPage, sehingga modul
// halaman bisa kembali ke loadPage TANPA impor melingkar ke main.js.
import { state } from './state.js';
import { $, esc, toast } from './ui.js';

export const app = {};

// ============ UNDUH CSV (dipakai beberapa halaman) ============
// Pemisah ";" + BOM supaya Excel (locale Indonesia) langsung membuka kolom dengan
// benar tanpa wizard impor. Nilai dibungkus kutip ganda bila memuat pemisah.
function unduhCSV(namaBerkas, baris) {
  const csv = baris.map(r => r.map(c => {
    const s = String(c == null ? '' : c);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(';')).join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = namaBerkas;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  toast('✅ ' + namaBerkas + ' diunduh.', 'ok');
}


  // ⚡ Debounce 150ms — tabel bisa ratusan baris; tanpa ini tiap ketikan
  // memicu operasi string pada seluruh baris.
  let filterTimer = null;
  function filterTable(inp, tbodyId) {
    const q = inp.value.toLowerCase();
    if (filterTimer) clearTimeout(filterTimer);
    filterTimer = setTimeout(function() {
      document.querySelectorAll('#' + tbodyId + ' tr').forEach(tr => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    }, 150);
  }

  // ============ MODAL HELPERS ============
  // `opsi.lebar` → modal melebar (dipakai pembaca buku dua halaman/flipbook).
  function modal(title, body, foot, opsi) {
    $('m-title').textContent = title;
    $('m-body').innerHTML = body;
    $('m-foot').innerHTML = foot || '<button class="btn btn-o btn-sm" onclick="closeModal()">Tutup</button>';
    $('modal').classList.toggle('lebar', !!(opsi && opsi.lebar));
    $('modal').classList.add('on');
    document.body.classList.add('modal-open'); // latar tidak ikut tergulir saat modal terbuka
    const mb = $('m-body');
    if (mb) mb.scrollTop = 0;
  }
  function closeModal() {
    $('modal').classList.remove('on');
    document.body.classList.remove('modal-open');
  }

  function studentOptions(sel) {
    return (state.students || []).filter(s => s.status === 'Aktif')
      .map(s => '<option value="' + s.id + '"' + (s.id === sel ? ' selected' : '') + '>' + esc(s.nama) + ' (' + esc(s.kelasNama || '-') + ')</option>').join('');
  }

  // ============ PENGURUT KONTEN (Buku · Galeri · Mitra) ============
  // Kartu bisa digeser (drag) atau dipindah dengan tombol ↑ ↓; urutan langsung tersimpan.
  function urutkanBy(list) {
    return (list || []).slice().sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
  }

  // Di perangkat sentuh, geser-lepas bertabrakan dengan gulir halaman, jadi
  // kartu tidak dibuat draggable dan pengurutan memakai tombol ↑ ↓.
  const PAKAI_SENTUH = !!(window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches);
  if (PAKAI_SENTUH) document.body.classList.add('sentuh');

  function sorterHtml(kind, items, opsi) {
    if (!items || !items.length) return '';
    opsi = opsi || {};
    const sub = opsi.sub || function () { return ''; };
    const thumb = opsi.thumb || function () { return ''; };
    const atas = PAKAI_SENTUH
      ? 'Urutan diatur dengan tombol ↑ ↓ pada tiap kartu. Perubahan langsung tersimpan otomatis.'
      : (opsi.atas || '');
    return '<div class="card"><div class="card-head"><h3>' + opsi.judul + '</h3>' +
      '<span class="badge b-info">' + (opsi.badge || (items.length + (opsi.satuan || ' item'))) + '</span></div>' +
      (atas ? '<p style="font-size:.78rem; margin-bottom:12px;">' + atas + '</p>' : '') +
      '<div class="sort-list" data-sort="' + kind + '" id="sort-' + kind + '">' +
      items.map(function (it, i) {
        return '<div class="sort-item" draggable="' + (PAKAI_SENTUH ? 'false' : 'true') + '" data-id="' + esc(it.id) + '">' +
          '<span class="sort-grip" title="' + (PAKAI_SENTUH ? 'Atur urutan dengan tombol ↑ ↓' : 'Geser untuk mengubah urutan') + '">⠿</span>' +
          '<span class="sort-no">' + (i + 1) + '</span>' + thumb(it) +
          '<span class="sort-info"><b>' + esc(opsi.label(it)) + '</b><small>' + sub(it, i) + '</small></span>' +
          '<span class="sort-acts">' +
          '<button class="btn btn-o btn-sm" data-action="sort-up" data-extra="' + kind + '" data-id="' + esc(it.id) + '"' + (i === 0 ? ' disabled' : '') + ' title="Naikkan">↑</button>' +
          '<button class="btn btn-o btn-sm" data-action="sort-down" data-extra="' + kind + '" data-id="' + esc(it.id) + '"' + (i === items.length - 1 ? ' disabled' : '') + ' title="Turunkan">↓</button>' +
          '</span></div>';
      }).join('') + '</div></div>';
  }

  export { modal, closeModal, studentOptions, filterTable, sorterHtml, urutkanBy, unduhCSV };
