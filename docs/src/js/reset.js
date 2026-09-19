// ============ HALAMAN RESET PASSWORD ============
// Dibuka dari tautan di email "Lupa Password": /sites/reset.html?token=...
// Alur: verifikasi token → isi password baru → kirim. Token sekali pakai &
// berlaku 30 menit (ditegakkan di server, halaman ini hanya menampilkannya).
import { API_URL } from './admin/config.js';

const el = (id) => document.getElementById(id);
const token = (new URLSearchParams(window.location.search).get('token') || '').trim();

function pesan(teks, jenis) {
  const m = el('msg');
  m.textContent = teks;
  m.className = 'msg ' + (jenis || 'info');
}

function tampilkan(id, ada) {
  el(id).style.display = ada ? '' : 'none';
}

async function kirim(path, body) {
  const r = await fetch(API_URL + '/auth/' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  const teks = await r.text();
  let data;
  try { data = teks ? JSON.parse(teks) : {}; } catch { throw new Error('Respon server tidak valid.'); }
  if (!r.ok && !(data && data.message)) throw new Error('Server error (HTTP ' + r.status + ').');
  return data;
}

async function mulai() {
  if (!token) {
    tampilkan('verifikasi', false);
    pesan('Tautan tidak lengkap. Buka tautan langsung dari email yang kami kirim.', 'err');
    return;
  }
  try {
    const res = await kirim('reset-password/verify', { token });
    if (res && res.valid) {
      el('verif-teks').textContent = '';
      tampilkan('verifikasi', false);
      tampilkan('form', true);
      el('akun').innerHTML = 'Akun: <b>' + (res.email || '') + '</b>' + (res.nama ? ' · ' + res.nama : '');
      el('pw1').focus();
    } else {
      tampilkan('verifikasi', false);
      pesan((res && res.message) || 'Tautan tidak valid atau kedaluwarsa.', 'err');
    }
  } catch (e) {
    tampilkan('verifikasi', false);
    pesan('Gagal memeriksa tautan: ' + e.message, 'err');
  }
}

el('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw1 = el('pw1').value;
  const pw2 = el('pw2').value;
  if (pw1.length < 6) { pesan('Password baru minimal 6 karakter.', 'err'); return; }
  if (pw1 !== pw2) { pesan('Kedua password tidak sama. Ulangi dengan hati-hati.', 'err'); return; }

  const btn = el('simpan');
  btn.disabled = true;
  btn.textContent = '⏳ Menyimpan…';
  try {
    const res = await kirim('reset-password', { token, password: pw1 });
    if (res && res.success) {
      tampilkan('form', false);
      pesan('', 'info'); el('msg').className = 'msg';
      tampilkan('sukses', true);
    } else {
      pesan((res && res.message) || 'Gagal menyimpan password.', 'err');
      btn.disabled = false; btn.textContent = '🔐 Simpan Password Baru';
    }
  } catch (err) {
    pesan('Gagal menyimpan: ' + err.message, 'err');
    btn.disabled = false; btn.textContent = '🔐 Simpan Password Baru';
  }
});

mulai();
