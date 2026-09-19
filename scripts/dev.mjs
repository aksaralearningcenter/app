#!/usr/bin/env node
// ==================== DEV ORKESTRATOR ====================
// Satu perintah untuk dua server sekaligus:
//
//   npm run dev        →  Vite (frontend, folder docs/) + REST API lokal (server/)
//   npm run dev:web    →  Vite saja
//   npm run dev:api    →  API lokal saja
//
// Sengaja tanpa dependensi tambahan (tanpa concurrently/npm-run-all): hanya
// memakai modul bawaan Node, sama seperti server/local-server.js. Port bisa
// diganti lewat env:
//
//   API_PORT=4000 WEB_PORT=5199 npm run dev
//
// URL yang dicetak sudah menyertakan ?api=... sehingga panel admin langsung
// menunjuk ke backend lokal (lihat docs/src/js/admin/config.js). Origin Vite
// (http://localhost:5173) sudah terdaftar di FRONTEND_URLS pada server/.env,
// jadi CORS endpoint privat tidak diblokir.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const API_PORT = String(process.env.API_PORT || 3000);
const WEB_PORT = String(process.env.WEB_PORT || 5173);
const API_URL = `http://localhost:${API_PORT}/api`;
const WEB_URL = `http://localhost:${WEB_PORT}`;

const pakaiWarna = process.stdout.isTTY && process.env.NO_COLOR === undefined;
const warna = (kode, teks) => (pakaiWarna ? `\x1b[${kode}m${teks}\x1b[0m` : teks);
const TAG = { api: warna('36', '[api]'), web: warna('35', '[web]') };

const proses = [];
let sedangBerhenti = false;

// Cetak keluaran anak proses baris per baris dengan awalan tag, supaya log
// kedua server tidak saling menyisip di tengah baris.
function salurkan(stream, tag, tujuan) {
  let sisa = '';
  stream.setEncoding('utf8');
  stream.on('data', (potongan) => {
    sisa += potongan;
    const baris = sisa.split('\n');
    sisa = baris.pop();
    baris.forEach((b) => tujuan.write(tag + ' ' + b + '\n'));
  });
  stream.on('end', () => {
    if (sisa) tujuan.write(tag + ' ' + sisa + '\n');
  });
}

function mulai({ nama, tag, berkas, args = [], cwd = ROOT, pakaiStdin = false }) {
  const anak = spawn(process.execPath, [berkas, ...args], {
    cwd,
    env: Object.assign({}, process.env, nama === 'api' ? { PORT: API_PORT } : {}),
    stdio: [pakaiStdin ? 'inherit' : 'ignore', 'pipe', 'pipe']
  });
  salurkan(anak.stdout, tag, process.stdout);
  salurkan(anak.stderr, tag, process.stderr);

  anak.on('error', (e) => {
    console.error(tag + ' gagal dijalankan: ' + e.message);
    berhenti(1);
  });
  anak.on('exit', (kode, sinyal) => {
    if (sedangBerhenti) return;
    console.log(tag + ' berhenti' + (kode === null ? ' (sinyal ' + sinyal + ')' : ' (kode ' + kode + ')'));
    // Salah satu mati → hentikan yang lain supaya tidak ada server menggantung.
    berhenti(kode === null ? 1 : kode);
  });

  proses.push(anak);
  return anak;
}

function berhenti(kode) {
  if (sedangBerhenti) return;
  sedangBerhenti = true;
  proses.forEach((a) => { if (a.exitCode === null) a.kill('SIGTERM'); });
  // Jaring pengaman bila ada anak yang mengabaikan SIGTERM.
  setTimeout(() => {
    proses.forEach((a) => { if (a.exitCode === null) a.kill('SIGKILL'); });
  }, 3000).unref();
  process.exit(kode || 0);
}

// Tunggu API benar-benar melayani (bukan sekadar port terbuka) lalu kabari,
// karena kegagalan koneksi Supabase paling cepat terlihat dari /api/health.
async function pantauApi() {
  const batas = Date.now() + 15000;
  while (Date.now() < batas) {
    if (sedangBerhenti) return;
    try {
      const r = await fetch(API_URL + '/health');
      const j = await r.json();
      if (j && j.success) {
        console.log(TAG.api + ' ' + warna('32', 'siap') + ' — database: ' + (j.database || 'ok'));
        return;
      }
    } catch (e) { /* server belum siap — coba lagi */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log(TAG.api + ' ' + warna('33', 'belum merespons dalam 15 detik') + ' — cek log di atas.');
}

const berkasVite = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const folderServer = path.join(ROOT, 'server');
const berkasApi = path.join(folderServer, 'local-server.js');

if (!existsSync(berkasVite)) {
  console.error('Vite belum terpasang. Jalankan dulu: npm install');
  process.exit(1);
}

console.log('');
console.log('  ' + warna('1', 'Aksara Learning Center — mode pengembangan'));
console.log('');

mulai({ nama: 'web', tag: TAG.web, berkas: berkasVite, args: ['--port', WEB_PORT], pakaiStdin: true });

if (existsSync(berkasApi)) {
  if (!existsSync(path.join(folderServer, '.env'))) {
    console.log(TAG.api + ' ' + warna('33', 'server/.env belum ada') + ' — salin dari server/.env.example dulu.');
  }
  mulai({ nama: 'api', tag: TAG.api, berkas: berkasApi, cwd: folderServer });
  pantauApi();
} else {
  console.log(TAG.api + ' ' + warna('33', 'server/local-server.js tidak ditemukan') + ' — hanya frontend yang jalan.');
  console.log(TAG.api + ' Folder server/ ada di repo terpisah: Saepul-alam/backend-nodejs');
}

console.log('');
console.log('  Landing  : ' + WEB_URL + '/');
console.log('  Admin    : ' + WEB_URL + '/sites/index.html?api=' + API_URL);
console.log('  API      : ' + API_URL + '  (health: ' + API_URL + '/health)');
console.log('  Hentikan : Ctrl+C');
console.log('');

process.on('SIGINT', () => berhenti(0));
process.on('SIGTERM', () => berhenti(0));
