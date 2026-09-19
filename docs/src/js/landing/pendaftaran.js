// ==================== FORM PENDAFTARAN ====================
import { LP_API_URL } from './config.js';

// Key idempotensi: klik dobel / retry memakai key sama → server membalas hasil asli tanpa simpan ulang.
let regIdemKey = 'lp' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

// Dipakai oleh <form onsubmit="submitRegistration(event)"> di HTML.
export function submitRegistration(e) {
  e.preventDefault();
  const msg = document.getElementById('reg-msg');
  const btn = document.getElementById('reg-btn');
  if (btn.disabled) return;

  const data = {
    idemKey: regIdemKey,
    nama: document.getElementById('reg-nama').value,
    tanggalLahir: document.getElementById('reg-lahir').value,
    program: document.getElementById('reg-program').value,
    namaOrangTua: document.getElementById('reg-ortu').value,
    noHP: document.getElementById('reg-hp').value,
    email: document.getElementById('reg-email').value.trim(),
    catatan: document.getElementById('reg-catatan').value
  };

  if (!data.email || data.email.indexOf('@') === -1) {
    msg.className = 'form-msg error';
    msg.textContent = '⚠️ Email wajib diisi — akun pantau orang tua akan dibuat dengan email ini.';
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Mengirim...';
  // Sembunyikan pesan lama cukup lewat class: .form-msg = display:none,
  // sedangkan .form-msg.error/.success = display:block (lihat landing.css).
  // JANGAN set style.display inline di sini — inline style mengalahkan class,
  // sehingga pesan hasil pendaftaran tidak akan pernah tampil.
  msg.className = 'form-msg';

  const finishOk = function (m) {
    msg.className = 'form-msg success';
    msg.textContent = '✅ ' + m;
    document.getElementById('reg-form').reset();
    regIdemKey = 'lp' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  };
  const finishErr = function (m) {
    msg.className = 'form-msg error';
    msg.textContent = '⚠️ ' + m;
  };
  const finishReset = function () { btn.disabled = false; btn.textContent = '📨 Kirim Pendaftaran'; };

  if (!LP_API_URL) {
    finishReset();
    finishErr('Konfigurasi belum lengkap — isi LP_API_URL dengan URL REST API (lihat server/README.md). Sementara, hubungi kami via WhatsApp.');
    return;
  }

  // POST JSON ke REST API (/public/registrations). CORS sudah ditangani backend.
  fetch(LP_API_URL + '/public/registrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(function (r) {
      // Baca JSON walau status 4xx: backend memakai 400 untuk pesan validasi
      // (mis. "Nomor HP/WA tidak valid") yang perlu tampil ke pengunjung.
      return r.json()['catch'](function () { return null; }).then(function (body) {
        if (body) return body;
        return { success: false, message: 'Server error (HTTP ' + r.status + '). Coba lagi.' };
      });
    })
    .then(function (res) {
      finishReset();
      if (res && res.success) { finishOk((res && res.message) || 'Pendaftaran berhasil!'); }
      else { finishErr((res && res.message) || 'Pendaftaran gagal. Coba lagi.'); }
    })
    .catch(function () {
      finishReset();
      finishErr('Koneksi lambat. Coba lagi atau hubungi kami via WhatsApp.');
    });
}
