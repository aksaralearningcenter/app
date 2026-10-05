// ============ HALAMAN: PANDUAN PENGGUNA ============
// Dibaca semua peran; hanya Admin yang bisa mengubah isinya.
// Isi disimpan di site_settings (kunci panduan_*) lewat POST /identitas.
import { state, peranTampil, invalidateCache } from '../state.js';
import { $, esc, toast } from '../ui.js';
import { api } from '../api.js';
import { app } from '../helpers.js';

const TAB_PANDUAN = [
  ['panduan_umum', '📘 Umum'],
  ['panduan_admin', '🛠️ Admin'],
  ['panduan_tutor', '👩‍🏫 Tutor'],
  ['panduan_ortu', '👨‍👩‍👧 Orang Tua'],
  ['panduan_murid', '🎒 Murid']
];

let tabAktif = 'panduan_umum';

function peranKeKunci(peran) {
  const p = String(peran || '');
  if (p === 'Admin' || p === 'Super Admin' || p === 'Admin Tata Usaha') return 'panduan_admin';
  if (p === 'Guru' || p === 'Guru Pengajar') return 'panduan_tutor';
  if (p === 'Orang Tua') return 'panduan_ortu';
  return 'panduan_murid';
}

function teksHtml(teks) {
  return esc(teks || 'Belum ada panduan.').replace(/\n/g, '<br>');
}

export const render = {
  panduan: function (d) {
    d = d || {};
    const panduan = d.panduan || {};
    const me = state.me || {};
    const admin = (me.peran === 'Admin' || me.peran === 'Super Admin' || me.peran === 'Admin Tata Usaha');
    const tampil = peranTampil();
    if (!admin) tabAktif = tampil === 'Orang Tua' ? 'panduan_ortu' : peranKeKunci(tampil === 'Orang Tua' ? 'Orang Tua' : me.peran);
    if (!panduan[tabAktif]) tabAktif = 'panduan_umum';

    const tabs = (admin ? TAB_PANDUAN : TAB_PANDUAN.filter(t => t[0] === 'panduan_umum' || t[0] === tabAktif))
      .map(t => '<button class="btn btn-sm ' + (tabAktif === t[0] ? 'btn-n' : 'btn-o') + '" data-action="tab-panduan" data-id="' + t[0] + '">' + t[1] + '</button>').join(' ');

    let editor = '';
    if (admin) {
      editor = '<div class="card" style="margin-top:14px;"><h3>✏️ Ubah Panduan (' + esc(tabAktif) + ')</h3>' +
        '<div class="fg"><textarea id="pdn-isi" rows="12" style="width:100%;">' + esc(panduan[tabAktif] || '') + '</textarea></div>' +
        '<button class="btn btn-n btn-sm" data-action="save-panduan" data-id="' + esc(tabAktif) + '">💾 Simpan Panduan</button></div>';
    }
    $('page').innerHTML =
      '<div class="card-head" style="margin-bottom:16px;"><h2>📖 Panduan Penggunaan</h2>' +
      '<button class="btn btn-o btn-sm" data-action="refresh-page" data-id="panduan">🔄 Muat Ulang</button></div>' +
      '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">' + tabs + '</div>' +
      '<div class="card"><div style="font-size:0.9rem; line-height:1.7;">' + teksHtml(panduan[tabAktif]) + '</div></div>' + editor;
  }
};

export const actions = {
  'tab-panduan': async (kunci) => {
    tabAktif = kunci || 'panduan_umum';
    const d = state.cache.panduan;
    if (d) render.panduan(d);
    else app.loadPage('panduan');
  },
  'save-panduan': async (kunci) => {
    const el = $('pdn-isi');
    const body = {};
    body[kunci] = el ? el.value : '';
    await api('saveIdentitas', body);
    toast('Panduan disimpan.', 'ok');
    invalidateCache('panduan');
    app.loadPage('panduan');
  }
};
