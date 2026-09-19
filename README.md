# Aksara Learning Center — Frontend

Landing page dan panel admin **statis** untuk Aksara Learning Center.

Tanpa framework: HTML + CSS + modul ES. Vite hanya dipakai sebagai dev server
dan untuk build opsional (minify). **Karena itu, berkas di repo ini bisa
langsung dilayani GitHub Pages tanpa langkah build.**

Seluruh situs ada di dalam folder **`docs/`** — itulah yang dilayani GitHub Pages:

- `docs/index.html` — landing page (halaman publik)
- `docs/sites/index.html` — panel admin
- `docs/src/styles/` — `landing.css`, `admin.css`
- `docs/src/js/landing/` — modul landing (nav, konten, flipbook, galeri, chatbot, pendaftaran)
- `docs/src/js/admin/` — modul panel admin (`main.js` entry point, `auth.js`, `api.js`, `state.js`, `ui.js`, `config.js`)
- `docs/.nojekyll` — agar GitHub Pages menyajikan berkas apa adanya (tidak diproses Jekyll)

Backend (REST API) ada di repo terpisah: **`Saepul-alam/backend-nodejs`**,
dijalankan sebagai fungsi serverless di Vercel. Folder `server/` di komputer
Anda sudah punya repo git sendiri, jadi sengaja tidak diikutkan ke repo ini.

## Menjalankan di lokal

Cara paling sederhana — tidak perlu install apa pun:

```bash
cd <folder-ini>
python3 -m http.server 8080
```

Lalu buka:

- Landing: <http://localhost:8080/docs/index.html>
- Admin:   <http://localhost:8080/docs/sites/>

### Frontend + backend sekaligus (satu perintah)

Kalau folder `server/` juga ada di komputer Anda, satu perintah menjalankan
keduanya — frontend (Vite) **dan** REST API lokal:

```bash
npm install
npm run dev
```

Keluaran perintah itu sudah memberi tahu URL yang siap dipakai: panel admin
beserta parameter `?api=` yang menunjuk ke backend lokal, jadi tidak perlu
mengedit atau menambah `?api=` manual.

```text
Landing  : http://localhost:5173/
Admin    : http://localhost:5173/sites/index.html?api=http://localhost:3000/api
API      : http://localhost:3000/api  (health: http://localhost:3000/api/health)
```

Log kedua server diberi awalan `[web]` / `[api]` supaya tidak tertukar, dan
**Ctrl+C** mematikan keduanya. Port bisa diganti:

```bash
API_PORT=4000 WEB_PORT=5199 npm run dev
```

Ingin salah satu saja?

```bash
npm run dev:web    # frontend saja → http://localhost:5173
npm run dev:api    # backend lokal saja → http://localhost:3000/api
npm run build      # versi ter-minify → dist/ (opsional)
```

> ℹ️ Bila `server/` belum ada, perintah `npm run dev` tetap jalan dengan
> frontend saja dan memberi tahu bahwa folder itu berasal dari repo terpisah.
>
> ⚠️ Kalau Vite gagal start dengan pesan `Cannot find native binding` atau
> `library load disallowed by system policy`, berkas biner Vite masih bertanda
> karantina macOS (biasanya karena folder diunduh/dikirim lewat chat).
> Bersihkan dengan: `xattr -dr com.apple.quarantine node_modules`

## Menghubungkan ke backend

Secara bawaan frontend memakai API produksi:
`https://aksara-api-mocha.vercel.app/api`

Untuk mengarahkan ke backend lain (mis. server lokal), tambahkan parameter
`?api=` pada URL — tidak perlu mengedit berkas:

```
http://localhost:8080/docs/sites/?api=http://localhost:3000/api
```

`npm run dev` melakukan ini otomatis: URL panel admin yang dicetaknya sudah
membawa `?api=` ke backend lokal, sedangkan origin Vite (`http://localhost:5173`)
sudah terdaftar di `FRONTEND_URLS` pada `server/.env` sehingga CORS endpoint
privat tidak diblokir browser.

> ⚠️ Backend produksi memakai database Supabase yang **nyata**. Saat menguji di
> lokal, hindari menu Maintenance (unseed) karena bisa menghapus konten asli.

## Asesmen & ujian siswa

Menu **🧪 Asesmen** di panel admin (grup Akademik) mengatur paket ujian:
judul, instruksi, **durasi dalam menit**, nilai kelulusan (KKM), status
Draft/Aktif/Nonaktif, pengacakan soal & opsi, dan **bank soal** (pilihan ganda,
isian singkat, esai) yang bisa ditambah, diedit, dihapus, dan diurutkan.

Soal bisa diisi satu per satu atau diimpor massal: **📥 Impor Soal** menerima
unggahan `.csv`/`.xlsx`, tempel langsung dari spreadsheet, plus tombol unduh
template dan ekspor soal yang sudah ada.

Halaman siswa tidak butuh akun — cukup bagikan tautan dari tombol
**🔗 Salin Tautan Ujian**:

```
https://<situs>/ujian/?id=ASM-xxxxxxxx     # produksi (alamat bersih, tanpa .html)
http://localhost:5173/ujian/?id=ASM-xxxx&api=http://localhost:3000/api
```

Siswa mengisi nama → mengerjakan dengan **hitung mundur** → skor otomatis
(pilihan ganda & isian) langsung tampil. Esai menunggu penilaian pengajar di
panel admin: **📊 Hasil → 👁️ Detail**. Waktu resmi dihitung server, kunci
jawaban tidak pernah dikirim ke halaman siswa, dan jawaban siswa disimpan
sementara di perangkat agar tidak hilang saat refresh.

> 📌 Fitur ini butuh tabel `assessments`, `assessment_questions`,
> `assessment_attempts`, dan `assessment_answers`. Jalankan seluruh isi
> `server/schema.sql` di **Supabase → SQL Editor** (idempotent, aman diulang)
> sebelum memakai menu Asesmen.

Panel admin juga punya mode **Terang / Gelap** (tombol 🌙 di kanan atas) dan
pilihan bahasa **ID / EN** — keduanya tersimpan di perangkat, termasuk menu
yang bisa dilipat, kotak cari menu, dan sidebar geser di tablet/ponsel.

## Deploy ke GitHub Pages

Repo yang dipakai: **`aksaralearningcenter/frontend-aksara`**
(situs uji: <https://aksaralearningcenter.github.io/frontend-aksara/>).

Bila ingin memakai repo lain:

1. **Buat repo** di GitHub, **jangan** centang "Add a README".
2. **Hubungkan & kirim** dari folder ini:

   ```bash
   git init -b main
   git add -A
   git commit -m "Frontend Aksara Learning Center"
   git remote add origin https://github.com/<username>/<namarepo>.git
   git push -u origin main
   ```

3. Buka repo → **Settings** → **Pages**.
4. Bagian **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` — folder **`/docs`**
   - klik **Save**

   > Situs sengaja diletakkan di folder `docs/` karena pada beberapa akun
   > pilihan `/ (root)` tidak muncul di dropdown GitHub Pages — hanya `/docs`.
   > Semua tautan di dalam HTML bersifat relatif, jadi lokasinya tidak masalah.
5. Tunggu 1–2 menit. Situs tayang di:

   ```
   https://<username>.github.io/<namarepo>/
   ```

   Panel admin: `https://<username>.github.io/<namarepo>/sites/`

Semua path aset sudah **relatif**, jadi situs ini jalan baik di alamat proyek
(`/namarepo/`) maupun di alamat utama (`<username>.github.io/`).

### Bila tampilannya belum berubah

- Cek tab **Actions** di repo untuk melihat status deploy.
- Lakukan *hard refresh* (Ctrl/Cmd + Shift + R) — GitHub Pages punya cache
  sekitar 10 menit.
# app
# app
