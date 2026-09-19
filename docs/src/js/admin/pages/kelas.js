// ============ HALAMAN: KELAS ============
import { state, invalidateCache } from '../state.js';
import { $, esc, rp, toast } from '../ui.js';
import { api } from '../api.js';
import { app, modal, closeModal, studentOptions } from '../helpers.js';


  export const render = {
    classes: function(list) {
      list = list || [];
      const rows = list.map(c =>
        '<tr><td><b>' + esc(c.nama) + '</b></td><td>' + esc(c.guru || '-') + '</td><td>' + esc(c.jadwal || '-') + '</td><td>' + (c.kapasitas || '-') + '</td>' +
        '<td>' + (c.biaya > 0 ? rp(c.biaya) : 'Gratis') + '</td><td><span class="badge ' + (c.status === 'Aktif' ? 'b-ok' : 'b-warn') + '">' + esc(c.status) + '</span></td>' +
        '<td style="white-space:nowrap;"><button class="btn btn-o btn-sm" data-action="edit-class" data-id="' + c.id + '">✏️</button> <button class="btn btn-d btn-sm" data-action="del-class" data-id="' + c.id + '" data-name="' + esc(c.nama) + '">🗑️</button></td></tr>').join('');
      $('page').innerHTML =
        '<div class="card-head" style="margin-bottom:16px;"><h2>🏫 Kelas (' + list.length + ')</h2><button class="btn btn-n btn-sm" data-action="add-class">➕ Tambah Kelas</button></div>' +
        '<div class="card"><div class="table-wrap"><table><thead><tr><th>Nama</th><th>Guru</th><th>Jadwal</th><th>Kapasitas</th><th>Biaya/Bulan</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    },
  };


  // ============ AKSI: KELAS ============
  function openAddClass() {
    const guruList = (state.cache.users || []).filter(u => u.peran === 'Guru' && (u.status || '').toLowerCase() === 'aktif');
    const guruOptions = '<option value="">-- Pilih Guru --</option>' +
      guruList.map(g => '<option value="' + esc(g.email) + '">' + esc(g.nama) + '</option>').join('');
    modal('➕ Tambah Kelas',
      '<div class="fg"><label>Nama Kelas *</label><input id="c-nama" placeholder="Kelas 5A"></div>' +
      '<div class="frow"><div class="fg"><label>Guru</label><select id="c-guru">' + guruOptions + '</select></div><div class="fg"><label>Jadwal</label><input id="c-jadwal" placeholder="Senin, Rabu"></div></div>' +
      '<div class="frow"><div class="fg"><label>Kapasitas</label><input type="number" id="c-kap" value="30" min="1"></div><div class="fg"><label>Biaya/Bulan (Rp)</label><input type="number" id="c-biaya" value="0" min="0"></div></div>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="saveAddClass()">💾 Simpan</button>');
  }

  async function saveAddClass() {
    const data = { nama: $('c-nama').value, guruEmail: $('c-guru').value, jadwal: $('c-jadwal').value, kapasitas: parseInt($('c-kap').value) || 30, biaya: parseInt($('c-biaya').value) || 0, status: 'Aktif' };
    if (!data.nama) { toast('Nama kelas wajib diisi.', 'err'); return; }
    try {
      const res = await api('addClass', data);
      closeModal(); toast(res.message || 'Kelas ditambahkan.', 'ok'); invalidateCache('classes'); loadPage('classes');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  function openEditClass(id) {
    const cls = (state.cache.classes || []).find(c => c.id === id);
    if (!cls) { toast('Kelas tidak ditemukan.', 'err'); return; }
    const guruList = (state.cache.users || []).filter(u => u.peran === 'Guru' && (u.status || '').toLowerCase() === 'aktif');
    const guruOptions = '<option value="">-- Pilih Guru --</option>' +
      guruList.map(g => '<option value="' + esc(g.email) + '"' + (g.email === cls.guru_email ? ' selected' : '') + '>' + esc(g.nama) + '</option>').join('');
    modal('✏️ Edit Kelas',
      '<div class="fg"><label>Nama Kelas *</label><input id="c-nama" value="' + esc(cls.nama) + '"></div>' +
      '<div class="frow"><div class="fg"><label>Guru</label><select id="c-guru">' + guruOptions + '</select></div><div class="fg"><label>Jadwal</label><input id="c-jadwal" value="' + esc(cls.jadwal || '') + '"></div></div>' +
      '<div class="frow"><div class="fg"><label>Kapasitas</label><input type="number" id="c-kap" value="' + (cls.kapasitas || 30) + '" min="1"></div><div class="fg"><label>Biaya/Bulan (Rp)</label><input type="number" id="c-biaya" value="' + (cls.biaya || 0) + '" min="0"></div></div>',
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-n btn-sm" onclick="saveEditClass(\'' + id + '\')">💾 Simpan</button>');
  }

  async function saveEditClass(id) {
    const data = { nama: $('c-nama').value, guruEmail: $('c-guru').value, jadwal: $('c-jadwal').value, kapasitas: parseInt($('c-kap').value) || 30, biaya: parseInt($('c-biaya').value) || 0 };
    if (!data.nama) { toast('Nama kelas wajib diisi.', 'err'); return; }
    try {
      const res = await api('updateClass', id, data);
      closeModal(); toast(res.message || 'Kelas diperbarui.', 'ok'); invalidateCache('classes'); loadPage('classes');
    } catch (ex) { toast(ex.message, 'err'); }
  }

  async function delClass(id, nama) {
    if (!confirm('Hapus kelas ' + nama + '?')) return;
    try { const res = await api('deleteClass', id); toast(res.message || 'Terhapus.', 'ok'); invalidateCache('classes'); loadPage('classes'); }
    catch (ex) { toast(ex.message, 'err'); }
  }

  export { saveAddClass, saveEditClass };
  export const actions = {
    'add-class': function () { openAddClass(); },
    'edit-class': function (id) { openEditClass(id); },
    'del-class': function (id, name) { delClass(id, name); }
  };
