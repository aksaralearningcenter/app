# PLAN — Ujian v2: QR, Listening, Proktor, Akun Murid

## Ringkasan
4 fitur untuk modul ujian siswa (`/ujian/`) dan panel admin (`/sites/`):
- **A. QR** di dialog "Salin Tautan Ujian"
- **B. Soal listening** ala TOEFL (audio + pilihan ganda)
- **C. Mode pengawasan** (proktor-lite): kunci layar + auto-kumpul
- **D. Ujian terintegrasi akun murid** (Orang Tua pilih anak, riwayat ujian)

## Fitur A — QR dialog tautan ujian (frontend)
| File | Perubahan |
|---|---|
| `docs/src/js/admin/vendor/qrcode.js` (BARU) | Salin `qrcode-generator` v1.4.4 (MIT, Kazuhiko Arase) dari `/tmp/qrcode-lib.js`; pertahankan header lisensi. |
| `docs/sites/index.html` | Tambah `<script src="../src/js/admin/vendor/qrcode.js"></script>` sebelum entry app (non-module). |
| `docs/src/js/admin/pages/asesmen.js` | `salinTautanUjian()` selalu salin **dan** buka dialog; `tampilkanTautan()` render QR `qrcode(0,'M')` → `createImgTag()` di atas tautan + tombol "📋 Salin", dengan fallback jika lib tidak termuat. |

**Verifikasi**: `node --check`; render PNG QR dari URL asli; cek di browser panel admin.

## Fitur B — Soal listening ala TOEFL
**Backend (`server/`)**
| File | Perubahan |
|---|---|
| `schema.sql` | `assessment_questions`: tambah `audio_url text not null default ''` pada CREATE + `alter table assessment_questions add column if not exists audio_url text not null default '';` (idempotent). |
| `routes/assessments.js` | `JENIS` += `'listening'`; `JENIS_LABEL` += `listening: 'Listening'`; `FIELD_ALLOW_SOAL` += `'audio_url'`; `validasiSoal`: jenis listening divalidasi seperti `pg` (opsi ≥2, kunci valid) **plus** `audio_url` wajib; `soalSiswa` di `publikMulai` sertakan `audio_url`. Penilaian otomatis tercakup jalur pg. |
| `lib/upload.js` | Jenis `'audio'`: MIME `audio/mpeg`, `audio/mp4`, `audio/wav`, `audio/ogg` + ekstensi `mp3,m4a,wav,ogg`; batas 10 MB; dukung jalur tiket dan base64. |
| `api/router.js` | Tambah `POST /api/upload/audio` (mirip image/doc, dengan CORS). |

**Frontend (`docs/`)**
| File | Perubahan |
|---|---|
| `admin/pages/upload.js` | `JENIS_BERKAS.audio` (accept/uji/ekstensi, label 'Audio', tombol '⬆️ Unggah Audio'); `audioField()` dan `pratinjauAudio()` (player `<audio controls>`); export. |
| `admin/pages/asesmen.js` | `JENIS` += `{k:'listening',label:'Listening'}`; `blokJenis()` kasus `listening` = kolom `audioField` + blok pg (opsi + kunci); `saveSoal()` baca `audio_url`, wajib untuk listening; render daftar soal pakai cabang pg + player kecil; detail-hasil ikut tampil seperti pg. |
| `docs/src/js/ujian.js` | `htmlSoal()`: `jenis==='listening'` → `<audio controls src="…">` di atas opsi + radio (label "Listening"). |
| `docs/ujian/index.html` | Bump `ujian.js?v=3` → `?v=4`. |

## Fitur C — Mode pengawasan (proktor-lite)
**Aturan terpilih**: fullscreen wajib saat mulai; keluar tab/jendela / Esc-fullscreen → **layar kunci overlay**; absen **≥3 dtk sekali duduk** atau **5× total** → **auto-kumpul** (`kumpulkan(true)`); blokir copy/paste/klik-kanan/seleksi teks saat mengerjakan; tiap pelanggaran dikirim ke server.

**Backend (`server/`)**
| File | Perubahan |
|---|---|
| `schema.sql` | `assessment_attempts`: `alter table assessment_attempts add column if not exists pindah_tab integer not null default 0;` |
| `routes/assessments.js` | Endpoint publik baru `POST …/attempts/<id>/proktor` → `{pindah_tab}`; set `pindah_tab = max(sekarang, nilai)` hanya saat `status='Mengerjakan'`; kolom otomatis terbaca di hasil/detail attempt. |
| `api/router.js` | Wiring endpoint di blok public. |

**Frontend (`docs/`)**
| File | Perubahan |
|---|---|
| `docs/src/js/ujian.js` | Modul proktor: konstanta toleransi/ambang; minta fullscreen saat mulai; listener `visibilitychange`+`blur`; overlay kunci + hitung mundur; heartbeat `POST …/proktor`; auto-kumpul sampai ambang; blokir `contextmenu`, `copy/paste/cut`, seleksi teks; matikan setelah hasil tampil. |
| `docs/src/styles/ujian.css` | Style overlay `.kunci` (tutup konten, pesan + sisa waktu). |
| `docs/src/js/admin/pages/asesmen.js` | Tabel Hasil + Detail: badge `⚠️ N× pindah` bila `t.pindah_tab > 0`. |

## Fitur D — Ujian di akun murid (Orang Tua pilih anak)
**Aturan terpilih**: dropdown "Mengerjakan sebagai" **hanya untuk peran Orang Tua**; Guru/Admin tetap isian nama manual; tanpa login tetap manual; hasil tetap otomatis ke admin; tambah **riwayat ujian** di halaman Orang Tua.

**Backend (`server/`)**
| File | Perubahan |
|---|---|
| `routes/assessments.js` | `publikMulai`: terima `student_id` opsional; bila header `Authorization` ada dan peran `Orang Tua`, validasi `student_id ∈ me.anak` (tidak → 403); bila tanpa token, abaikan (tetap `''`). |
| `routes/lms.js` | `getMyChildrenData`: per anak tambah `ujian` = daftar `assessment_attempts` di mana `student_id=sid` (order `mulai desc`, limit 10) + join `assessments.judul/nilai_lulus`; item: `{id, judul, mulai, skor, status, nilai_lulus}`. |

**Frontend (`docs/`)**
| File | Perubahan |
|---|---|
| `docs/src/js/ujian.js` | Di tahap info: baca `aksara_token` (localStorage, satu origin) → `GET /auth/me`; jika `peran==='Orang Tua'` → `GET /my-children` → dropdown "Mengerjakan sebagai: [pilih anak]"; pilih → set `#nama` (readonly) + simpan `student_id` terpilih; tombol Mulai POST sertakan `student_id`. Gagal/401 → abaikan (jalur manual). |
| `admin/pages/asesmen.js` | Badge "terautentikasi" (✔) pada baris Hasil bila `student_id` terisi. |
| `admin/pages/dashboard.js` | Cabang Orang Tua: tiap kartu anak tambah tabel "📝 Ujian" (judul, tanggal, skor dengan badge lulus/belum, status). |
| `admin/api.js` | Tidak perlu ubah (`getMyChildrenData` sudah terpetakan). |

## Urutan eksekusi
1. Backend (B→C→D, satu repo): edit `schema.sql`, `routes/assessments.js`, `routes/lms.js`, `lib/upload.js`, `api/router.js`.
2. Verifikasi backend lokal: `PORT=3199 node local-server.js`; tes soal listening (CRUD + `publikMulai` memuat `audio_url`), `proktor` (set pindah_tab), `publikMulai` + `student_id` (ortu sah vs asing), `upload/audio`, `my-children` berisi `ujian`.
3. Jalankan ulang `schema.sql` di Supabase SQL Editor.
4. commit + push backend (`Saepul-alam/backend-nodejs`) → redeploy Vercel (proyek `aksara-api`).
5. Frontend (A→B→C→D): edit berkas sesuai tabel; `node --check` semua berkas JS.
6. Tes QR (render + PNG), tes halaman ujian (listening, proktor di browser, dropdown ortu), bump `?v=4`.
7. commit + push frontend (`aksaralearningcenter/frontend-aksara`, branch `main`).

## Verifikasi akhir & kriteria terima
- Admin: dialog tautan menampilkan QR; bisa disalin; soal listening dengan player muncul di daftar & detail.
- Siswa: soal listening memutar audio & bisa dijawab; keluar tab → layar kunci, auto-kumpul setelah ambang; hasil muncul di admin dengan badge pindah tab (bila ada).
- Orang Tua: buka tautan ujian terlogin → dropdown anak otomatis; hasil tampil di halaman anak (riwayat "📝 Ujian").
- Semua endpoint lama (daftar asesmen, hasil, impor CSV) tetap jalan (regresi dicek cepat).