// ============ HALAMAN: ASISTEN AI (chatbot panel) ============
// Chatbot untuk semua peran login (Admin/Guru/Orang Tua/Murid): teks +
// lampiran foto/PDF + riwayat tersimpan privat. Token dikirim otomatis lewat
// api(), jadi tidak ada juggling localStorage seperti widget landing.
import { state, invalidateCache } from '../state.js';
import { $, esc, toast } from '../ui.js';
import { api } from '../api.js';
import { app } from '../helpers.js';

const MIME_GAMBAR = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAKS_BERKAS = 2500000;
const MAKS_SISI = 1024;

// Riwayat sesi halaman (dipegang modul; server menyimpan permanen per akun).
let riwayat = [];
let lampiran = null;
let menunggu = false;
let hariTerakhir = '';
let namaBot = 'Tanya Aksara';

function jamSingkat(waktu) {
  try {
    return new Date(waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
  } catch (_e) { return ''; }
}

function labelHari(waktu) {
  try {
    const d = new Date(waktu);
    const kini = new Date();
    const awal = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const awalKini = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate()).getTime();
    const beda = Math.round((awalKini - awal) / 86400000);
    if (beda <= 0) return 'Hari ini';
    if (beda === 1) return 'Kemarin';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (_e) { return ''; }
}

function htmlLampiran(lamp) {
  if (!lamp) return '';
  if (lamp.thumb) return '<span class="as-lamp"><img src="' + lamp.thumb + '" alt="lampiran"></span>';
  return '<span class="as-pdf">📄 ' + esc(lamp.nama || 'berkas.pdf') + '</span>';
}

function gelembung(kelas, html, opsi) {
  const o = opsi || {};
  let h = '';
  if (o.waktu) {
    const label = labelHari(o.waktu);
    if (label && label !== hariTerakhir) {
      hariTerakhir = label;
      h += '<div class="as-hari"><span>' + esc(label) + '</span></div>';
    }
  }
  h += '<div class="as-msg ' + kelas + '">' + (o.lampiran ? htmlLampiran(o.lampiran) : '') + html +
    (o.waktu ? '<time class="as-waktu">' + esc(jamSingkat(o.waktu)) + '</time>' : '') + '</div>';
  return h;
}

function gulirBawah() {
  const b = $('as-body');
  if (b) b.scrollTop = b.scrollHeight;
}

function gambarIsi() {
  const b = $('as-body');
  if (!b) return;
  b.innerHTML = riwayat.map(m =>
    gelembung(m.peran === 'model' ? 'bot' : 'me', kaya(String(m.teks || '')) +
      (m.ada_lampiran === 'Ya' ? '<div class="as-lampiran-info">📎 (lampiran tidak disimpan)</div>' : ''),
    { waktu: m.dibuat })
  ).join('') || '<div class="empty">👋 Mulai percakapan dengan ' + esc(namaBot) + ' — tanya materi, kirim foto soal, atau minta penjelasan.</div>';
  gulirBawah();
}

// Teks model → HTML aman (tebal, daftar, tautan). Cermin widget landing.
function kaya(teks) {
  const baris = String(teks == null ? '' : teks)
    .replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').split('\n');
  const keluar = [];
  let dalamDaftar = false;
  baris.forEach(b => {
    const poin = /^\s*[-•*]\s+(.*)$/.exec(b);
    if (poin) {
      if (!dalamDaftar) { keluar.push('<ul>'); dalamDaftar = true; }
      keluar.push('<li>' + poin[1] + '</li>');
    } else {
      if (dalamDaftar) { keluar.push('</ul>'); dalamDaftar = false; }
      keluar.push(b);
    }
  });
  if (dalamDaftar) keluar.push('</ul>');
  return keluar.join('\n');
}

function kompresFoto(berkas) {
  return new Promise((selesai, gagal) => {
    const url = URL.createObjectURL(berkas);
    const img = new Image();
    img.onload = () => {
      try {
        const skala = Math.min(1, MAKS_SISI / Math.max(img.width, img.height));
        const kanvas = document.createElement('canvas');
        kanvas.width = Math.max(1, Math.round(img.width * skala));
        kanvas.height = Math.max(1, Math.round(img.height * skala));
        kanvas.getContext('2d').drawImage(img, 0, 0, kanvas.width, kanvas.height);
        const dataUrl = kanvas.toDataURL('image/jpeg', 0.82);
        URL.revokeObjectURL(url);
        selesai({ mime: 'image/jpeg', data: (dataUrl.split(',')[1] || ''), thumb: dataUrl, nama: berkas.name });
      } catch (e) { URL.revokeObjectURL(url); gagal(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); gagal(new Error('gagal baca gambar')); };
    img.src = url;
  });
}

function bacaPdf(berkas) {
  return new Promise((selesai, gagal) => {
    const baca = new FileReader();
    baca.onload = () => {
      const dataUrl = String(baca.result || '');
      selesai({ mime: 'application/pdf', data: (dataUrl.split(',')[1] || ''), thumb: '', nama: berkas.name });
    };
    baca.onerror = () => gagal(new Error('gagal baca berkas'));
    baca.readAsDataURL(berkas);
  });
}

function gambarPratinjau() {
  const w = $('as-prev');
  if (!w) return;
  if (!lampiran) { w.hidden = true; w.innerHTML = ''; return; }
  w.hidden = false;
  w.innerHTML =
    (lampiran.thumb
      ? '<span class="as-thumb"><img src="' + lampiran.thumb + '" alt="pratinjau"></span>'
      : '<span class="as-pdf">📄 ' + esc(lampiran.nama || 'berkas.pdf') + '</span>') +
    '<button type="button" class="btn btn-o btn-sm" data-action="asisten-buang">✕</button>';
}

function buangLampiran() {
  lampiran = null;
  const f = $('as-file');
  if (f) f.value = '';
  gambarPratinjau();
}

async function kirimPesan(teks) {
  const pesan = String(teks || '').trim();
  if ((!pesan && !lampiran) || menunggu) return;
  const kirimLampiran = lampiran;
  const waktu = new Date().toISOString();
  const b = $('as-body');
  if (b) {
    if (b.querySelector('.empty')) b.innerHTML = '';
    b.innerHTML += gelembung('me', pesan ? kaya(pesan) : kaya('(foto/berkas)'), { waktu, lampiran: kirimLampiran });
    b.innerHTML += '<div class="as-msg bot as-menunggu" id="as-tunggu"><span class="as-titik"><span></span><span></span><span></span></span></div>';
    gulirBawah();
  }
  const ta = $('as-input');
  if (ta) { ta.value = ''; ta.style.height = 'auto'; }
  buangLampiran();
  menunggu = true;
  const btn = $('as-kirim');
  if (btn) btn.disabled = true;
  try {
    const muatan = { pesan, riwayat: riwayat.slice(-8), sesi: 'panel-' + ((state.me && state.me.email) || 'anon') };
    if (kirimLampiran) muatan.gambar = { mime: kirimLampiran.mime, data: kirimLampiran.data };
    const res = await api('publicChat', muatan);
    const t = $('as-tunggu');
    if (t) t.remove();
    if (res && res.success && res.balasan) {
      if (b) { b.innerHTML += gelembung('bot', kaya(res.balasan), { waktu: new Date().toISOString() }); gulirBawah(); }
      riwayat.push({ peran: 'user', teks: pesan || '(foto/berkas)', ada_lampiran: kirimLampiran ? 'Ya' : 'Tidak', dibuat: waktu });
      riwayat.push({ peran: 'model', teks: res.balasan, ada_lampiran: 'Tidak', dibuat: new Date().toISOString() });
      if (riwayat.length > 100) riwayat = riwayat.slice(-100);
    } else if (b) {
      b.innerHTML += gelembung('err', kaya((res && res.message) || 'Asisten belum bisa menjawab.'), { waktu: new Date().toISOString() });
      gulirBawah();
    }
  } catch (ex) {
    const t = $('as-tunggu');
    if (t) t.remove();
    if (b) { b.innerHTML += gelembung('err', kaya(ex.message || 'Koneksi gagal.'), { waktu: new Date().toISOString() }); gulirBawah(); }
  } finally {
    menunggu = false;
    if (btn) btn.disabled = false;
  }
}

export const render = {
  asisten: function (d) {
    const info = (d && d.info) || {};
    namaBot = info.nama || 'Tanya Aksara';
    riwayat = ((d && d.riwayat) || []).map(m => ({
      peran: m.peran, teks: m.teks, ada_lampiran: m.ada_lampiran, dibuat: m.dibuat
    }));
    hariTerakhir = '';
    menunggu = false;
    lampiran = null;
    $('page').innerHTML =
      '<div class="card-head" style="margin-bottom:16px;"><h2>💬 ' + esc(namaBot) + '</h2>' +
      '<div style="display:flex; gap:8px; align-items:center;">' +
      '<span class="badge b-ok"><span class="as-online"></span> Online</span>' +
      (riwayat.length ? '<button class="btn btn-o btn-sm" data-action="asisten-hapus">🗑️ Hapus riwayat</button>' : '') +
      '</div></div>' +
      '<div class="card as-kartu"><div class="as-body" id="as-body" aria-live="polite"></div>' +
      '<div class="as-prev" id="as-prev" hidden></div>' +
      '<form class="as-form" id="as-form" autocomplete="off">' +
      '<button class="btn btn-o btn-sm" id="as-lampir" type="button" aria-label="Lampirkan foto atau PDF" title="Lampirkan foto atau PDF">📎</button>' +
      '<input type="file" id="as-file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" hidden>' +
      '<textarea id="as-input" rows="1" placeholder="Tulis pertanyaan atau kirim foto soal…"></textarea>' +
      '<button class="btn btn-n btn-sm" id="as-kirim" type="submit" aria-label="Kirim pesan">➤ Kirim</button>' +
      '</form>' +
      '<p class="ab-kecil" style="margin:8px 2px 0;">Foto/berkas dikirim ke AI untuk dianalisis dan tidak disimpan.</p></div>';
    gambarIsi();
    const form = $('as-form');
    if (form) form.addEventListener('submit', e => { e.preventDefault(); kirimPesan(($('as-input') || {}).value || ''); });
    const ta = $('as-input');
    if (ta) {
      ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; });
      ta.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); kirimPesan(ta.value); }
      });
    }
    const lampir = $('as-lampir');
    if (lampir) lampir.addEventListener('click', () => { const f = $('as-file'); if (f) f.click(); });
    const fb = $('as-file');
    if (fb) fb.addEventListener('change', async () => {
      const f = fb.files && fb.files[0];
      if (!f) return;
      const mime = String(f.type || '').toLowerCase();
      const isGambar = MIME_GAMBAR.indexOf(mime) !== -1;
      if (!isGambar && mime !== 'application/pdf') { toast('Jenis berkas tidak didukung (foto atau PDF).', 'err'); fb.value = ''; return; }
      if (f.size > MAKS_BERKAS) { toast('Berkas terlalu besar (maksimal ±2,5MB).', 'err'); fb.value = ''; return; }
      try {
        lampiran = isGambar ? await kompresFoto(f) : await bacaPdf(f);
        gambarPratinjau();
      } catch (_e) {
        toast('Berkas gagal dibaca. Coba berkas lain.', 'err');
        buangLampiran();
      }
    });
  }
};

export const actions = {
  'asisten-buang': function () { buangLampiran(); },
  'asisten-hapus': async function () {
    if (!confirm('Hapus seluruh riwayat chat tersimpan Anda?')) return;
    try {
      await api('hapusRiwayatChat');
      riwayat = [];
      hariTerakhir = '';
      invalidateCache('asisten');
      app.loadPage('asisten');
    } catch (ex) { toast(ex.message, 'err'); }
  }
};
