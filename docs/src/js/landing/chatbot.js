// ==================== CHATBOT AKSARA ====================
// Pesan diteruskan ke backend (POST /public/chat); kunci API Gemini hanya ada di
// server sehingga tidak pernah bisa diambil pengunjung. Widget tidak
// diinisialisasi sebelum pengunjung membuka chat (ringan saat halaman dibuka).
import { LP_API_URL } from './config.js';

(function () {
  const root = document.getElementById('chat');
  const panel = document.getElementById('chat-panel');
  const fab = document.getElementById('chat-fab');
  const body = document.getElementById('chat-body');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const btnKirim = document.getElementById('chat-kirim');
  const saranWrap = document.getElementById('chat-saran');
  const note = document.getElementById('chat-note');
  const namaEl = document.getElementById('chat-nama');
  const fabLabel = document.getElementById('chat-fab-label');
  const btnX = document.getElementById('chat-x');
  if (!root || !panel || !fab || !body || !form || !input) return;

  let aktif = false, siap = false, terpasang = false, menunggu = false;
  let cfg = { nama: 'Tanya Aksara', sapaan: '', catatan: '', placeholder: '', saran: [] };
  let riwayat = [];
  let sesi = '';

  function idSesi() {
    try {
      let s = sessionStorage.getItem('aksara_chat_sesi');
      if (!s) {
        s = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        sessionStorage.setItem('aksara_chat_sesi', s);
      }
      return s;
    } catch (err) { return 'c' + Date.now().toString(36); }
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

  function tambah(kelas, html) {
    const d = document.createElement('div');
    d.className = 'chat-msg ' + kelas;
    d.innerHTML = html;
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
  function mintaChat(data) {
    return new Promise(function (resolve, reject) {
      const waktu = setTimeout(function () { reject(new Error('Waktu habis')); }, 30000);
      fetch(LP_API_URL + '/public/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        clearTimeout(waktu);
        return r.json();
      }).then(resolve).catch(function () {
        clearTimeout(waktu);
        reject(new Error('Gagal menghubungi asisten'));
      });
    });
  }

  function aturTinggi() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 108) + 'px';
  }

  async function tanya(teks) {
    const pesan = String(teks || '').trim();
    if (!pesan || menunggu) return;
    tambah('me', kaya(pesan));
    input.value = '';
    aturTinggi();
    menunggu = true;
    btnKirim.disabled = true;
    const tunggu = indikator();
    const mulai = Date.now();
    try {
      const res = await mintaChat({ pesan: pesan, riwayat: riwayat.slice(-8), sesi: sesi });
      // Beri jeda kecil supaya indikator "sedang menulis" tidak berkedip.
      const jeda = 380 - (Date.now() - mulai);
      if (jeda > 0) await new Promise(function (r) { setTimeout(r, jeda); });
      tunggu.remove();
      if (res && res.success && res.balasan) {
        tambah('bot', kaya(res.balasan));
        riwayat.push({ peran: 'user', teks: pesan });
        riwayat.push({ peran: 'model', teks: res.balasan });
        if (riwayat.length > 10) riwayat = riwayat.slice(-10);
        if (res.saran && res.saran.length) gambarSaran(res.saran);
      } else {
        tambah('err', kaya((res && res.message) || 'Maaf, asisten belum bisa menjawab. Coba lagi ya.'));
      }
    } catch (err) {
      tunggu.remove();
      tambah('err', kaya('Maaf, koneksi ke asisten gagal. Periksa jaringan Anda, atau hubungi tim kami lewat WhatsApp.'));
    } finally {
      menunggu = false;
      btnKirim.disabled = false;
    }
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
    if (cfg.sapaan) tambah('bot', kaya(cfg.sapaan));
    gambarSaran(cfg.saran);
    btnX.addEventListener('click', function () { buka(false); });
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
    note.textContent = cfg.catatan;
    if (!sesi) sesi = idSesi();
  };

  // Konten publik diterapkan modul konten secara asinkron, jadi status chat
  // dari data terakhir ikut disiapkan di sini bila sudah tersedia.
  if (window.__lpTerakhir) {
    try { window.siapkanChat(window.__lpTerakhir.chat || {}, window.__lpTerakhir.settings || {}); }
    catch (err) { /* abaikan */ }
  }
})();
