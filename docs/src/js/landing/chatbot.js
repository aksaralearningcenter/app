// ==================== CHATBOT AKSARA ====================
// Pesan diteruskan ke backend (POST /public/chat); kunci API Gemini hanya ada di
// server sehingga tidak pernah bisa diambil pengunjung. Widget tidak
// diinisialisasi sebelum pengunjung membuka chat (ringan saat halaman dibuka).
//
// Chat teks bebas untuk umum. Lampiran foto/PDF + riwayat tersimpan khusus
// akun login (token panel satu origin): tombol 📎 dan 🗑 hanya tampil bila ada
// token; server menolak lampiran anonim (401).
import { LP_API_URL } from './config.js';

(function () {
  const root = document.getElementById('chat');
  const panel = document.getElementById('chat-panel');
  const fab = document.getElementById('chat-fab');
  const body = document.getElementById('chat-body');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const btnKirim = document.getElementById('chat-kirim');
  const btnLampirkan = document.getElementById('chat-lampir');
  const inputBerkas = document.getElementById('chat-file');
  const prevLampiran = document.getElementById('chat-prev');
  const btnHapusRiwayat = document.getElementById('chat-hapus');
  const saranWrap = document.getElementById('chat-saran');
  const note = document.getElementById('chat-note');
  const namaEl = document.getElementById('chat-nama');
  const fabLabel = document.getElementById('chat-fab-label');
  const btnX = document.getElementById('chat-x');
  if (!root || !panel || !fab || !body || !form || !input) return;

  const MIME_GAMBAR = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const MAKS_BERKAS = 2500000;   // 2,5MB mentah (di bawah batas body server)
  const MAKS_SISI = 1024;        // foto dikompresi ke sisi terpanjang ini

  let aktif = false, siap = false, terpasang = false, menunggu = false;
  let cfg = { nama: 'Tanya Aksara', sapaan: '', catatan: '', placeholder: '', saran: [] };
  let riwayat = [];
  let sesi = '';
  let lampiran = null;           // { mime, data(base64), nama, thumb? }

  // Token panel (satu origin) — tanpa ini fitur lampiran & riwayat mati.
  function tokenLogin() {
    try { return localStorage.getItem('aksara_token') || ''; } catch (_e) { return ''; }
  }

  // Keberadaan token belum tentu sah (bisa kedaluwarsa). Verifikasi ke server
  // sekali saat widget dibuka; token basi dibuang agar tombol 📎 tidak muncul
  // untuk pengunjung yang sebenarnya sudah logout.
  let loginOk = false;
  async function cekLogin() {
    const t = tokenLogin();
    if (!t) return false;
    try {
      const r = await fetch(LP_API_URL + '/auth/me', { headers: { Authorization: 'Bearer ' + t } });
      const j = await r.json();
      if (j && j.success) return true;
    } catch (_e) { /* abaikan */ }
    try { localStorage.removeItem('aksara_token'); } catch (_e2) { /* abaikan */ }
    return false;
  }

  function idSesi() {
    try {
      let s = sessionStorage.getItem('aksara_chat_sesi');
      if (!s) {
        s = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        sessionStorage.setItem('aksara_chat_sesi', s);
      }
      return s;
    } catch (_err) { return 'c' + Date.now().toString(36); }
  }

  function teksAman(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  // Tautan internal (wa.me/email) supaya pengunjung bisa langsung menghubungi tim.
  function tautkan(teks) {
    return teks.replace(/(https?:\/\/[^\s<]+)|(\bwa\.me\/[0-9]+)|([\w.+-]+@[\w-]+\.[\w.]+)/g, function (m) {
      const href = m.indexOf('http') === 0 ? m : (m.indexOf('@') !== -1 ? 'mailto:' + m : 'https://' + m);
      return '<a href="' + href + '" target="_blank" rel="noopener">' + m + '</a>';
    });
  }

  // Teks dari model → HTML aman (tebal, daftar poin, tautan).
  function kaya(teks) {
    const baris = teksAman(teks).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').split('\n');
    const keluar = [];
    let dalamDaftar = false;
    baris.forEach(function (b) {
      const poin = /^\s*[-•*]\s+(.*)$/.exec(b);
      if (poin) {
        if (!dalamDaftar) { keluar.push('<ul>'); dalamDaftar = true; }
        keluar.push('<li>' + tautkan(poin[1]) + '</li>');
      } else {
        if (dalamDaftar) { keluar.push('</ul>'); dalamDaftar = false; }
        keluar.push(tautkan(b));
      }
    });
    if (dalamDaftar) keluar.push('</ul>');
    return keluar.join('\n');
  }

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

  let hariTerakhir = '';
  function pemisahHari(waktu) {
    const label = labelHari(waktu);
    if (!label || label === hariTerakhir) return;
    hariTerakhir = label;
    const d = document.createElement('div');
    d.className = 'chat-hari';
    d.innerHTML = '<span>' + teksAman(label) + '</span>';
    body.appendChild(d);
  }

  function htmlLampiran(lamp) {
    if (!lamp) return '';
    if (lamp.thumb) {
      return '<span class="chat-thumb"><img src="' + lamp.thumb + '" alt="lampiran"></span>';
    }
    return '<span class="chat-pdf">📄 ' + teksAman(lamp.nama || 'berkas.pdf') + '</span>';
  }

  function tambah(kelas, html, opsi) {
    const o = opsi || {};
    if (o.waktu) pemisahHari(o.waktu);
    const d = document.createElement('div');
    d.className = 'chat-msg ' + kelas;
    d.innerHTML = (o.lampiran ? htmlLampiran(o.lampiran) : '') + html +
      (o.waktu ? '<time class="chat-waktu">' + teksAman(jamSingkat(o.waktu)) + '</time>' : '');
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
    return d;
  }

  function indikator() {
    const d = document.createElement('div');
    d.className = 'chat-msg bot';
    d.innerHTML = '<span class="chat-typing"><span></span><span></span><span></span></span>';
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
    return d;
  }

  function gambarSaran(list) {
    saranWrap.innerHTML = '';
    (list || []).slice(0, 4).forEach(function (t) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = t;
      b.addEventListener('click', function () { tanya(t); });
      saranWrap.appendChild(b);
    });
  }

  // Kirim pesan ke asisten via REST (POST /public/chat) — kunci API tetap di server.
  // Bila login, token ikut dikirim (syarat lampiran + pencatat riwayat).
  function mintaChat(data) {
    return new Promise(function (resolve, reject) {
      const waktu = setTimeout(function () { reject(new Error('Waktu habis')); }, 45000);
      const kepala = { 'Content-Type': 'application/json' };
      const token = tokenLogin();
      if (token) kepala.Authorization = 'Bearer ' + token;
      fetch(LP_API_URL + '/public/chat', {
        method: 'POST',
        headers: kepala,
        body: JSON.stringify(data)
      }).then(function (r) {
        clearTimeout(waktu);
        return r.json().then(function (j) { return { status: r.status, badan: j }; });
      }).then(function (x) {
        if (x.status === 401) reject(new Error((x.badan && x.badan.message) || 'Masuk dulu untuk memakai fitur ini.'));
        else resolve(x.badan);
      }).catch(function (e) {
        clearTimeout(waktu);
        reject(e instanceof Error ? e : new Error('Gagal menghubungi asisten'));
      });
    });
  }

  function muatRiwayatServer() {
    const token = tokenLogin();
    if (!token) return Promise.resolve([]);
    return fetch(LP_API_URL + '/chat/riwayat', {
      headers: { Authorization: 'Bearer ' + token }
    }).then(function (r) { return r.json(); }).then(function (j) {
      return (j && j.success && j.riwayat) || [];
    }).catch(function () { return []; });
  }

  function aturTinggi() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 108) + 'px';
  }

  // Kompresi foto di klien (canvas → JPEG sisi ≤1024px) supaya muat di body.
  function kompresFoto(berkas) {
    return new Promise(function (selesai, gagal) {
      const url = URL.createObjectURL(berkas);
      const img = new Image();
      img.onload = function () {
        try {
          const skala = Math.min(1, MAKS_SISI / Math.max(img.width, img.height));
          const kanvas = document.createElement('canvas');
          kanvas.width = Math.max(1, Math.round(img.width * skala));
          kanvas.height = Math.max(1, Math.round(img.height * skala));
          kanvas.getContext('2d').drawImage(img, 0, 0, kanvas.width, kanvas.height);
          const dataUrl = kanvas.toDataURL('image/jpeg', 0.82);
          URL.revokeObjectURL(url);
          selesai({ mime: 'image/jpeg', data: dataUrl.split(',')[1] || '', thumb: dataUrl, nama: berkas.name });
        } catch (e) { URL.revokeObjectURL(url); gagal(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); gagal(new Error('gagal baca gambar')); };
      img.src = url;
    });
  }

  function bacaPdf(berkas) {
    return new Promise(function (selesai, gagal) {
      const baca = new FileReader();
      baca.onload = function () {
        const dataUrl = String(baca.result || '');
        selesai({ mime: 'application/pdf', data: dataUrl.split(',')[1] || '', thumb: '', nama: berkas.name });
      };
      baca.onerror = function () { gagal(new Error('gagal baca berkas')); };
      baca.readAsDataURL(berkas);
    });
  }

  function gambarPratinjau() {
    if (!lampiran || !prevLampiran) return;
    prevLampiran.hidden = false;
    prevLampiran.innerHTML =
      (lampiran.thumb
        ? '<span class="chat-thumb kecil"><img src="' + lampiran.thumb + '" alt="pratinjau"></span>'
        : '<span class="chat-pdf kecil">📄 ' + teksAman(lampiran.nama || 'berkas.pdf') + '</span>') +
      '<button type="button" id="chat-prev-x" aria-label="Hapus lampiran">✕</button>';
    const x = document.getElementById('chat-prev-x');
    if (x) x.addEventListener('click', buangLampiran);
  }

  function buangLampiran() {
    lampiran = null;
    if (inputBerkas) inputBerkas.value = '';
    if (prevLampiran) { prevLampiran.hidden = true; prevLampiran.innerHTML = ''; }
  }

  async function pilihBerkas() {
    if (!loginOk) { tambah('err', kaya('Masuk dulu lewat panel untuk mengirim foto/berkas.')); return; }
    if (inputBerkas) inputBerkas.click();
  }

  async function berkasDipilih() {
    const f = inputBerkas && inputBerkas.files && inputBerkas.files[0];
    if (!f) return;
    const mime = String(f.type || '').toLowerCase();
    const isGambar = MIME_GAMBAR.indexOf(mime) !== -1;
    if (!isGambar && mime !== 'application/pdf') { tambah('err', kaya('Jenis berkas tidak didukung (foto atau PDF).')); buangLampiran(); return; }
    if (f.size > MAKS_BERKAS) { tambah('err', kaya('Berkas terlalu besar (maksimal ±2,5MB).')); buangLampiran(); return; }
    try {
      lampiran = isGambar ? await kompresFoto(f) : await bacaPdf(f);
      gambarPratinjau();
    } catch (_e) {
      tambah('err', kaya('Berkas gagal dibaca. Coba berkas lain.'));
      buangLampiran();
    }
  }

  async function tanya(teks) {
    const pesan = String(teks || '').trim();
    const adaLampiran = !!lampiran;
    if ((!pesan && !adaLampiran) || menunggu) return;
    const kirimLampiran = lampiran;
    const waktu = new Date().toISOString();
    tambah('me', pesan ? kaya(pesan) : kaya('(foto/berkas)'), { waktu: waktu, lampiran: kirimLampiran });
    input.value = '';
    buangLampiran();
    aturTinggi();
    menunggu = true;
    btnKirim.disabled = true;
    const tunggu = indikator();
    const mulai = Date.now();
    try {
      const muatan = { pesan: pesan, riwayat: riwayat.slice(-8), sesi: sesi };
      if (kirimLampiran) muatan.gambar = { mime: kirimLampiran.mime, data: kirimLampiran.data };
      const res = await mintaChat(muatan);
      // Beri jeda kecil supaya indikator "sedang menulis" tidak berkedip.
      const jeda = 380 - (Date.now() - mulai);
      if (jeda > 0) await new Promise(function (r) { setTimeout(r, jeda); });
      tunggu.remove();
      if (res && res.success && res.balasan) {
        tambah('bot', kaya(res.balasan), { waktu: new Date().toISOString() });
        riwayat.push({ peran: 'user', teks: pesan || '(foto/berkas)' });
        riwayat.push({ peran: 'model', teks: res.balasan });
        if (riwayat.length > 10) riwayat = riwayat.slice(-10);
        if (res.saran && res.saran.length) gambarSaran(res.saran);
      } else {
        tambah('err', kaya((res && res.message) || 'Maaf, asisten belum bisa menjawab. Coba lagi ya.'), { waktu: new Date().toISOString() });
      }
    } catch (e) {
      tunggu.remove();
      tambah('err', kaya((e && e.message) || 'Maaf, koneksi ke asisten gagal. Periksa jaringan Anda, atau hubungi tim kami lewat WhatsApp.'), { waktu: new Date().toISOString() });
    } finally {
      menunggu = false;
      btnKirim.disabled = false;
    }
  }

  async function hapusRiwayatTersimpan() {
    if (!tokenLogin()) return;
    if (!confirm('Hapus seluruh riwayat chat tersimpan Anda?')) return;
    try {
      await fetch(LP_API_URL + '/chat/riwayat', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + tokenLogin() }
      });
    } catch (_e) { /* abaikan — bersihkan tampilan saja */ }
    body.innerHTML = '';
    hariTerakhir = '';
    riwayat = [];
    if (btnHapusRiwayat) btnHapusRiwayat.hidden = true;
    tambah('bot', kaya('Riwayat dihapus. Silakan mulai percakapan baru. 👋'), { waktu: new Date().toISOString() });
  }

  function buka(on) {
    panel.hidden = false;                 // dilepas sekali saja agar transisi berjalan
    panel.classList.toggle('on', on);
    document.body.classList.toggle('chat-open', on);
    fab.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (on) setTimeout(function () { input.focus(); }, 80);
  }

  // Pemasangan penanganan baru dilakukan saat chat pertama kali dibuka.
  function sambungkan() {
    terpasang = true;
    if (cfg.sapaan) tambah('bot', kaya(cfg.sapaan), { waktu: new Date().toISOString() });
    gambarSaran(cfg.saran);
    btnX.addEventListener('click', function () { buka(false); });
    if (btnLampirkan) btnLampirkan.addEventListener('click', pilihBerkas);
    if (inputBerkas) inputBerkas.addEventListener('change', berkasDipilih);
    if (btnHapusRiwayat) btnHapusRiwayat.addEventListener('click', hapusRiwayatTersimpan);
    // Verifikasi login dulu: tombol 📎 + riwayat hanya untuk sesi yang sah.
    cekLogin().then(function (ok) {
      loginOk = ok;
      if (!ok) return;
      if (btnLampirkan) btnLampirkan.hidden = false;
      muatRiwayatServer().then(function (daftar) {
        if (!daftar.length) return;
        if (btnHapusRiwayat) btnHapusRiwayat.hidden = false;
        daftar.forEach(function (m) {
          tambah(m.peran === 'model' ? 'bot' : 'me',
            kaya(String(m.teks || '')) + (m.ada_lampiran === 'Ya' ? '<div class="chat-lampiran-info">📎 (lampiran tidak disimpan)</div>' : ''),
            { waktu: m.dibuat });
          riwayat.push({ peran: m.peran === 'model' ? 'model' : 'user', teks: String(m.teks || '').substring(0, 700) });
        });
        if (riwayat.length > 10) riwayat = riwayat.slice(-10);
      });
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); tanya(input.value); });
    input.addEventListener('input', aturTinggi);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); tanya(input.value); }
      else if (e.key === 'Escape') { buka(false); }
    });
  }

  fab.addEventListener('click', function () {
    if (!terpasang) { sambungkan(); buka(true); return; }
    buka(!panel.classList.contains('on'));
  });

  window.siapkanChat = function (status, setelan) {
    const st = status || {};
    const s = setelan || {};
    cfg = {
      nama: s.chatbot_nama || 'Tanya Aksara',
      sapaan: s.chatbot_sapaan || '',
      catatan: s.chatbot_catatan || '',
      placeholder: s.chatbot_placeholder || '',
      saran: String(s.chatbot_saran || '').split('|').map(function (x) { return x.trim(); }).filter(Boolean)
    };
    aktif = st.aktif !== false;
    siap = !!st.siap;
    if (!aktif || !siap) { root.hidden = true; return; }  // belum siap → tidak tampil
    root.hidden = false;
    namaEl.textContent = cfg.nama;
    fabLabel.textContent = cfg.nama;
    fab.setAttribute('aria-label', 'Buka ' + cfg.nama);
    input.placeholder = cfg.placeholder || 'Tulis pertanyaan Anda…';
    note.textContent = (cfg.catatan ? cfg.catatan + ' ' : '') + 'Foto/berkas hanya untuk akun login & tidak disimpan.';
    if (!sesi) sesi = idSesi();
  };

  // Konten publik diterapkan modul konten secara asinkron, jadi status chat
  // dari data terakhir ikut disiapkan di sini bila sudah tersedia.
  if (window.__lpTerakhir) {
    try { window.siapkanChat(window.__lpTerakhir.chat || {}, window.__lpTerakhir.settings || {}); }
    catch (_err) { /* abaikan */ }
  }
})();
