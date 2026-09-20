// ============ HALAMAN: ASESMEN (bank soal + pengaturan waktu) ============
// Dua tampilan dalam satu modul:
//   • asesmen → daftar paket ujian (judul, durasi menit, jumlah soal, status)
//   • soal    → detail satu paket: atur urutan, tambah/edit/hapus soal
// Soal punya tiga jenis: pilihan ganda (kunci A–F), isian singkat (beberapa
// jawaban diterima), dan esai (dinilai manual oleh pengajar).
import { state, invalidateCache, simpanAsesmen } from '../state.js';
import { $, esc, toast } from '../ui.js';
import { api } from '../api.js';
import { app, modal, closeModal } from '../helpers.js';
import { API_PARAM } from '../config.js';
import { audioField } from './upload.js';

const JENIS = [
  { k: 'pg', label: 'Pilihan Ganda', badge: 'b-info' },
  { k: 'listening', label: 'Listening', badge: 'b-info' },
  { k: 'isian', label: 'Isian Singkat', badge: 'b-warn' },
  { k: 'esai', label: 'Esai', badge: 'b-ok' }
];
const MAKS_OPSI = 6;

const jenisInfo = k => JENIS.filter(j => j.k === k)[0] || { k: k, label: k, badge: 'b-warn' };
const huruf = i => String.fromCharCode(65 + i);
// "A | B" atau "satu per baris" → array bersih (sama dengan sisi server).
const pisah = v => String(v == null ? '' : v).split(/[|\n]/).map(s => s.trim()).filter(Boolean);
const dariBaris = v => String(v == null ? '' : v).split('\n').map(s => s.trim()).filter(Boolean);

export const render = {
  asesmen: function(list) {
    list = list || [];
    const totalSoal = list.reduce((n, a) => n + (a.soal || 0), 0);
    const aktif = list.filter(a => (a.status || 'Draft') === 'Aktif').length;
    const rows = list.map(function(a) {
      const status = a.status || 'Draft';
      const cls = status === 'Aktif' ? 'b-ok' : (status === 'Nonaktif' ? 'b-err' : 'b-warn');
      const acak = (a.acak_soal === 'Ya' || a.acak_opsi === 'Ya');
      return '<tr>' +
        '<td><b>' + esc(a.judul) + '</b>' + (a.deskripsi ? '<div style="font-size:.75rem;">' + esc(a.deskripsi.substring(0, 90)) + '</div>' : '') + '</td>' +
        '<td>⏱️ ' + (a.durasi_menit || 0) + ' menit</td>' +
        '<td><b>' + (a.soal || 0) + '</b> soal<div style="font-size:.75rem;">' + (a.pg || 0) + ' PG · ' + (a.listening || 0) + ' listening · ' + (a.isian || 0) + ' isian · ' + (a.esai || 0) + ' esai</div></td>' +
        '<td>' + (a.bobot || 0) + ' bobot<div style="font-size:.75rem;">KKM ' + (a.nilai_lulus || 0) + '</div></td>' +
        '<td><span class="badge ' + cls + '">' + esc(status) + '</span>' + (acak ? ' <span class="badge b-info" title="Soal/opsi diacak">🔀</span>' : '') + '</td>' +
        '<td style="white-space:nowrap;">' +
          '<button class="btn btn-n btn-sm" data-action="open-soal" data-id="' + esc(a.id) + '">📝 Soal</button> ' +
          '<button class="btn btn-o btn-sm" data-action="edit-asesmen" data-id="' + esc(a.id) + '">✏️</button> ' +
          '<button class="btn btn-d btn-sm" data-action="del-asesmen" data-id="' + esc(a.id) + '" data-name="' + esc(a.judul) + '">🗑️</button>' +
        '</td></tr>';
    }).join('');
    $('page').innerHTML =
      '<div class="card-head" style="margin-bottom:16px;"><h2>🧪 Asesmen (' + list.length + ')</h2>' +
      '<button class="btn btn-n btn-sm" data-action="add-asesmen">➕ Buat Asesmen</button></div>' +
      '<p style="font-size:.78rem; margin-bottom:12px;">Tiap asesmen punya <b>batas waktu (menit)</b>, nilai kelulusan, dan bank soalnya sendiri. Buka tombol <b>📝 Soal</b> untuk menambah / mengedit / menghapus soal dan mengatur urutannya.</p>' +
      '<div class="grid" style="margin-bottom:16px;">' +
        '<div class="stat"><div class="n">' + list.length + '</div><div class="l">Total Asesmen</div></div>' +
        '<div class="stat"><div class="n">' + aktif + '</div><div class="l">Status Aktif</div></div>' +
        '<div class="stat"><div class="n">' + totalSoal + '</div><div class="l">Soal Tersimpan</div></div>' +
      '</div>' +
      '<div class="card"><div class="table-wrap"><table><thead><tr><th>Judul</th><th>Waktu</th><th>Soal</th><th>Bobot &amp; KKM</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="6" style="text-align:center;">Belum ada asesmen. Klik <b>➕ Buat Asesmen</b> untuk memulai.</td></tr>') +
      '</tbody></table></div></div>';
  },

  // Hasil pengerjaan siswa. Dipakai pengajar untuk melihat skor otomatis
  // (pilihan ganda & isian) sekaligus menilai soal esai secara manual.
  hasil: function(data) {
    data = data || {};
    const a = data.assessment;
    if (!a) {
      $('page').innerHTML = '<div class="card"><div class="empty">Asesmen tidak ditemukan. <button class="btn btn-o btn-sm" data-action="kembali-asesmen" style="margin-top:12px;">⬅️ Kembali ke daftar</button></div></div>';
      return;
    }
    const attempts = data.attempts || [];
    const r = data.ringkas || {};
    const kkm = Number(a.nilai_lulus || 0);
    const baris = attempts.map(function (t) {
      const skor = Number(t.skor || 0);
      const selesai = t.status !== 'Mengerjakan';
      const cls = !selesai ? 'b-warn' : (skor >= kkm ? 'b-ok' : 'b-err');
      return '<tr>' +
        '<td data-no-i18n><b>' + esc(t.nama) + '</b>' + (t.lewat_waktu === 'Ya' ? ' <span class="badge b-warn" title="Dikumpulkan setelah batas waktu">⏰</span>' : '') + ' ' +
          (Number(t.pindah_tab) > 0 ? '<span class="badge b-warn" title="Siswa keluar tab/jendela saat mengerjakan">⚠️ ' + Number(t.pindah_tab) + '× pindah</span>' : '') + ' ' +
          (t.student_id ? '<span class="badge b-ok" title="Dikerjakan lewat akun orang tua (data otomatis)">✔ akun</span>' : '') + ' ' +
        '</td>' +
        '<td>' + (t.mulai ? new Date(t.mulai).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-') + '</td>' +
        '<td><span class="badge ' + cls + '">' + (selesai ? skor : '—') + '</span></td>' +
        '<td>' + (t.benar || 0) + ' / ' + (t.salah || 0) + ' / ' + (t.kosong || 0) + '</td>' +
        // Badge "N esai" = masih menunggu dinilai, jadi hanya untuk status
        // Terkumpul. Tanpa syarat ini, pengerjaan yang sudah dinilai tetap
        // terbaca seolah esainya belum diperiksa — padahal kolom Status sudah
        // menulis "Dinilai" dan ringkasan "Perlu Dinilai" tak menghitungnya.
        '<td>' + (t.status === 'Terkumpul' && Number(t.perlu_nilai || 0) > 0 ? '<span class="badge b-info">' + t.perlu_nilai + ' esai</span>' : '—') + '</td>' +
        '<td><span class="badge ' + (t.status === 'Dinilai' ? 'b-ok' : (t.status === 'Terkumpul' ? 'b-info' : 'b-warn')) + '">' + esc(t.status) + '</span></td>' +
        '<td style="white-space:nowrap;"><button class="btn btn-o btn-sm" data-action="detail-hasil" data-id="' + esc(t.id) + '">👁️ Detail</button></td>' +
      '</tr>';
    }).join('');
    $('page').innerHTML =
      '<div class="card-head" style="margin-bottom:16px;"><h2>📊 Hasil: ' + esc(a.judul) + '</h2>' +
        '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
          '<button class="btn btn-o btn-sm" data-action="buka-soal" data-id="' + esc(a.id) + '">📝 Soal</button>' +
          '<button class="btn btn-o btn-sm" data-action="refresh-page" data-id="hasil">🔄 Muat Ulang</button>' +
        '</div></div>' +
      '<p style="font-size:.78rem; margin-bottom:12px;">Skor dihitung otomatis dari jawaban pilihan ganda &amp; isian. Soal <b>esai</b> menunggu penilaian Anda — buka <b>👁️ Detail</b> untuk menilai. Nilai kelulusan asesmen ini <b>' + kkm + '</b>.</p>' +
      '<div class="grid" style="margin-bottom:16px;">' +
        '<div class="stat"><div class="n">' + (r.jumlah || 0) + '</div><div class="l">Total Pengerjaan</div></div>' +
        '<div class="stat"><div class="n">' + (r.selesai || 0) + '</div><div class="l">Sudah Mengumpulkan</div></div>' +
        '<div class="stat"><div class="n">' + (r.rata_rata || 0) + '</div><div class="l">Rata-rata Skor</div></div>' +
        '<div class="stat"><div class="n">' + (r.tertinggi || 0) + '</div><div class="l">Skor Tertinggi</div></div>' +
        '<div class="stat"><div class="n">' + (r.perlu_nilai || 0) + '</div><div class="l">Perlu Dinilai</div></div>' +
      '</div>' +
      '<div class="card"><div class="table-wrap"><table><thead><tr><th>Nama</th><th>Waktu</th><th>Skor</th><th>Benar / Salah / Kosong</th><th>Esai</th><th>Status</th><th></th></tr></thead><tbody>' +
      (baris || '<tr><td colspan="7" style="text-align:center;">Belum ada siswa yang mengerjakan. Bagikan tautan ujian dari halaman soal.</td></tr>') +
      '</tbody></table></div></div>';
  },

  soal: function(data) {
    data = data || {};
    const a = data.assessment;
    if (!a) {
      $('page').innerHTML = '<div class="card"><div class="empty">Asesmen tidak ditemukan. <button class="btn btn-o btn-sm" data-action="kembali-asesmen" style="margin-top:12px;">⬅️ Kembali ke daftar</button></div></div>';
      return;
    }
    const soal = data.soal || [];
    const totalBobot = soal.reduce((n, s) => n + (Number(s.bobot) || 0), 0);

    const isiSoal = soal.map(function(s, i) {
      const info = jenisInfo(s.jenis);
      const opsi = pisah(s.opsi);
      const kunci = String(s.jawaban || '').toUpperCase();
      let rincian = '';
      if (s.jenis === 'pg' || s.jenis === 'listening') {
        // Listening menampilkan pemutar audio di atas pilihan jawabannya.
        rincian = (s.jenis === 'listening' && s.audio_url
          ? '<p class="soal-meta">🔊 <audio controls preload="none" src="' + esc(s.audio_url) + '" style="max-width:100%; vertical-align:middle;"></audio></p>'
          : '') +
          '<ul class="soal-opsi">' + opsi.map(function(t, j) {
          const benar = huruf(j) === kunci;
          return '<li class="' + (benar ? 'benar' : '') + '">' + huruf(j) + '. ' + esc(t) + (benar ? ' ✔' : '') + '</li>';
        }).join('') + '</ul>';
      } else if (s.jenis === 'isian') {
        rincian = '<p class="soal-meta">Jawaban diterima: <b>' + esc(pisah(s.jawaban).join(' / ') || '-') + '</b></p>';
      } else {
        rincian = '<p class="soal-meta">Esai — dinilai manual oleh pengajar.</p>';
      }
      // data-no-i18n: isi soal adalah DATA pengguna — jangan diterjemahkan
      // mesin bahasa, walau kebetulan sama dengan label antarmuka.
      return '<div class="soal-item" data-no-i18n>' +
        '<div class="soal-head">' +
          '<span class="soal-no">' + (i + 1) + '</span>' +
          '<span class="badge ' + info.badge + '">' + esc(info.label) + '</span>' +
          '<span class="badge b-warn">' + (s.bobot || 1) + ' bobot</span>' +
          '<span class="soal-acts">' +
            '<button class="btn btn-o btn-sm" data-action="soal-up" data-id="' + esc(s.id) + '"' + (i === 0 ? ' disabled' : '') + ' title="Naikkan">↑</button>' +
            '<button class="btn btn-o btn-sm" data-action="soal-down" data-id="' + esc(s.id) + '"' + (i === soal.length - 1 ? ' disabled' : '') + ' title="Turunkan">↓</button>' +
            '<button class="btn btn-o btn-sm" data-action="edit-soal" data-id="' + esc(s.id) + '">✏️</button>' +
            '<button class="btn btn-d btn-sm" data-action="del-soal" data-id="' + esc(s.id) + '">🗑️</button>' +
          '</span>' +
        '</div>' +
        '<div class="soal-tanya">' + esc(s.pertanyaan) + '</div>' +
        rincian +
        (s.pembahasan ? '<p class="soal-meta">💡 Pembahasan: ' + esc(s.pembahasan) + '</p>' : '') +
      '</div>';
    }).join('');

    const sB = (a.status || 'Draft') === 'Aktif' ? 'b-ok' : ((a.status || 'Draft') === 'Nonaktif' ? 'b-err' : 'b-warn');
    $('page').innerHTML =
      '<div class="card-head" style="margin-bottom:16px;">' +
        '<h2>📝 ' + esc(a.judul) + '</h2>' +
        '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
          '<button class="btn btn-o btn-sm" data-action="kembali-asesmen">⬅️ Daftar Asesmen</button>' +
          '<button class="btn btn-o btn-sm" data-action="lihat-hasil" data-id="' + esc(a.id) + '">📊 Hasil</button>' +
          '<button class="btn btn-o btn-sm" data-action="salin-tautan" data-id="' + esc(a.id) + '">🔗 Salin Tautan Ujian</button>' +
          '<button class="btn btn-o btn-sm" data-action="ekspor-soal">⬆️ Ekspor CSV</button>' +
          '<button class="btn btn-o btn-sm" data-action="impor-soal">📥 Impor Soal</button>' +
          '<button class="btn btn-n btn-sm" data-action="add-soal">➕ Tambah Soal</button>' +
        '</div>' +
      '</div>' +
      '<div class="grid" style="margin-bottom:16px;">' +
        '<div class="stat"><div class="n">' + (a.durasi_menit || 0) + '</div><div class="l">Menit Waktu Ujian</div></div>' +
        '<div class="stat"><div class="n">' + soal.length + '</div><div class="l">Soal</div></div>' +
        '<div class="stat"><div class="n">' + totalBobot + '</div><div class="l">Total Bobot</div></div>' +
        '<div class="stat"><div class="n">' + (a.nilai_lulus || 0) + '</div><div class="l">Nilai Lulus</div></div>' +
      '</div>' +
      '<div class="card" style="margin-bottom:16px;"><div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">' +
        '<span class="badge ' + sB + '">' + esc(a.status || 'Draft') + '</span>' +
        '<span class="badge b-info">Acak soal: ' + esc(a.acak_soal || 'Tidak') + '</span>' +
        '<span class="badge b-info">Acak opsi: ' + esc(a.acak_opsi || 'Tidak') + '</span>' +
        (a.diubah ? '<span class="soal-meta">Terakhir diubah ' + new Date(a.diubah).toLocaleString('id-ID') + '</span>' : '') +
        '<span style="margin-left:auto;"><button class="btn btn-o btn-sm" data-action="edit-asesmen" data-id="' + esc(a.id) + '">⚙️ Atur Waktu &amp; Status</button></span>' +
      '</div>' + (a.deskripsi ? '<p style="font-size:.8rem; margin-top:10px;">' + esc(a.deskripsi) + '</p>' : '') + '</div>' +
      '<div class="soal-list">' + (isiSoal || '<div class="card"><div class="empty">Belum ada soal. Klik <b>➕ Tambah Soal</b> atau <b>📥 Impor Soal</b> untuk mengisi banyak sekaligus dari CSV/Excel.</div></div>') + '</div>';
  }
};

// ============ MODAL: ASESMEN (judul, waktu, status) ============
function pilihanOpsi(nilai, list) {
  const v = nilai == null || nilai === '' ? list[0] : String(nilai);
  return list.map(x => '<option value="' + esc(x) + '"' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
}

function openAsesmenModal(row) {
  row = row || {};
  modal((row.id ? '✏️ Atur' : '➕ Buat') + ' Asesmen',
    '<div class="fg"><label>Judul Asesmen *</label><input id="a-judul" value="' + esc(row.judul || '') + '" placeholder="Ulangan Harian — Penjumlahan Bersusun"></div>' +
    '<div class="fg"><label>Deskripsi / Instruksi</label><textarea id="a-desk" rows="3" placeholder="Petunjuk singkat untuk pengajar">' + esc(row.deskripsi || '') + '</textarea></div>' +
    '<div class="frow">' +
      '<div class="fg"><label>Durasi (menit) *</label><input type="number" id="a-durasi" min="1" max="600" value="' + (row.durasi_menit || 30) + '"></div>' +
      '<div class="fg"><label>Nilai Kelulusan (KKM)</label><input type="number" id="a-kkm" min="0" max="100" value="' + (row.nilai_lulus == null ? 70 : row.nilai_lulus) + '"></div>' +
    '</div>' +
    '<div class="frow">' +
      '<div class="fg"><label>Acak Urutan Soal</label><select id="a-acak-soal">' + pilihanOpsi(row.acak_soal, ['Tidak', 'Ya']) + '</select></div>' +
      '<div class="fg"><label>Acak Opsi Jawaban</label><select id="a-acak-opsi">' + pilihanOpsi(row.acak_opsi, ['Tidak', 'Ya']) + '</select></div>' +
    '</div>' +
    '<div class="fg"><label>Status</label><select id="a-status">' + pilihanOpsi(row.status, ['Draft', 'Aktif', 'Nonaktif']) + '</select></div>' +
    '<p style="font-size:.75rem;">Durasi 1–600 menit. Status <b>Draft</b> = masih disusun, <b>Aktif</b> = siap dipakai, <b>Nonaktif</b> = disimpan tapi ditutup.</p>',
    '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button>' +
    '<button class="btn btn-n btn-sm" onclick="saveAsesmen(' + (row.id ? "'" + esc(row.id) + "'" : 'null') + ')">💾 Simpan</button>');
}

async function saveAsesmen(id) {
  const data = {
    judul: $('a-judul').value.trim(),
    deskripsi: $('a-desk').value.trim(),
    durasi_menit: parseInt($('a-durasi').value, 10),
    nilai_lulus: parseInt($('a-kkm').value, 10),
    acak_soal: $('a-acak-soal').value,
    acak_opsi: $('a-acak-opsi').value,
    status: $('a-status').value
  };
  if (!data.judul) { toast('Judul asesmen wajib diisi.', 'err'); return; }
  if (!(data.durasi_menit >= 1 && data.durasi_menit <= 600)) { toast('Durasi harus 1 sampai 600 menit.', 'err'); return; }
  if (!(data.nilai_lulus >= 0 && data.nilai_lulus <= 100)) { toast('Nilai kelulusan harus 0 sampai 100.', 'err'); return; }
  try {
    const res = id ? await api('updateAssesmen', id, data) : await api('addAssesmen', data);
    if (!res.success) { toast(res.message, 'err'); return; }
    closeModal();
    toast(res.message || 'Tersimpan.', 'ok');
    // Bila sedang membuka detail asesmen ini, header detail ikut disegarkan.
    if (id && state.currentPage === 'soal' && state.currentAsesmen === id) {
      invalidateCache('soal');
      app.loadPage('soal');
    } else {
      invalidateCache('asesmen');
      app.loadPage('asesmen');
    }
  } catch (ex) { toast(ex.message, 'err'); }
}

function editAsesmen(id) {
  const dariDaftar = (state.cache.asesmen || []).filter(a => String(a.id) === String(id))[0];
  const detail = state.cache.soal && state.cache.soal.assessment;
  const row = dariDaftar || (detail && String(detail.id) === String(id) ? detail : null);
  if (!row) { toast('Data asesmen tidak ditemukan. Muat ulang halaman.', 'err'); return; }
  openAsesmenModal(row);
}

async function delAsesmen(id, nama) {
  if (!confirm('Hapus asesmen "' + nama + '"? Semua soalnya ikut terhapus dan tidak bisa dikembalikan.')) return;
  try {
    const res = await api('deleteAssesmen', id);
    toast(res.message || 'Asesmen dihapus.', 'ok');
    if (state.currentAsesmen === id) simpanAsesmen('');
    invalidateCache('asesmen');
    invalidateCache('soal');
    app.loadPage('asesmen');
  } catch (ex) { toast(ex.message, 'err'); }
}

function openSoalList(id) {
  if (!id) return;
  simpanAsesmen(id);
  invalidateCache('soal');   // buang detail asesmen lain yang mungkin masih tercache
  app.loadPage('soal');
}

// ============ MODAL: SOAL ============
// Blok isian bergantung jenis soal. Dipisah agar bisa digambar ulang saat
// dropdown Jenis Soal diganti tanpa menutup modal.
function blokJenis(row) {
  const jenis = row.jenis || 'pg';
  if (jenis === 'pg' || jenis === 'listening') {
    const opsi = pisah(row.opsi);
    const kunci = String(row.jawaban || 'A').trim().toUpperCase();
    // Jumlah pilihan kunci minimal 4 (A–D), mengikuti jumlah opsi yang ada.
    const jumlah = Math.max(opsi.length, kunci.length === 1 ? kunci.charCodeAt(0) - 64 : 0, 4);
    let pilih = '';
    for (let i = 0; i < jumlah; i++) {
      pilih += '<option value="' + huruf(i) + '"' + (huruf(i) === kunci ? ' selected' : '') + '>' + huruf(i) + '</option>';
    }
    const blok = '<div class="fg"><label>Opsi Jawaban (satu per baris) *</label>' +
        '<textarea id="s-opsi" rows="4" placeholder="Contoh:&#10;12&#10;13&#10;14&#10;15">' + esc(opsi.join('\n')) + '</textarea>' +
        '<small style="font-size:.72rem; opacity:.8;">Baris pertama = opsi A, kedua = B, dan seterusnya (maksimal ' + MAKS_OPSI + ').</small></div>' +
      '<div class="fg"><label>Kunci Jawaban *</label><select id="s-kunci">' + pilih + '</select></div>';
    if (jenis === 'pg') return blok;
    // Listening (TOEFL): rekaman audio wajib di atas pilihan jawaban.
    return audioField('Audio Soal (rekaman bacaan/pertanyaan) *', 's-audio', row.audio_url || '', 'Unggah MP3/M4A/WAV/OGG atau tempel URL') +
      '<p style="font-size:.78rem; opacity:.85; margin-bottom:10px;">Siswa mendengarkan audio, lalu memilih jawaban A–D. Disarankan durasi 30–60 detik.</p>' + blok;
  }
  if (jenis === 'isian') {
    return '<div class="fg"><label>Jawaban yang Diterima (satu per baris) *</label>' +
      '<textarea id="s-jawab-isian" rows="3" placeholder="Contoh:&#10;12&#10;dua belas">' + esc(pisah(row.jawaban).join('\n')) + '</textarea>' +
      '<small style="font-size:.72rem; opacity:.8;">Isi beberapa varian ejaan bila perlu — jawaban dianggap benar jika sama dengan salah satunya.</small></div>';
  }
  return '<p style="font-size:.78rem; margin-bottom:14px;">Soal esai tidak memakai kunci otomatis: jawaban siswa dikumpulkan untuk dinilai manual oleh pengajar.</p>';
}

function jenisSoalBerubah() {
  const jenis = $('s-jenis').value;
  // Bawa teks yang sudah diketik saat berpindah jenis supaya tidak hilang.
  const opsi = $('s-opsi') ? $('s-opsi').value : '';
  const kunci = $('s-kunci') ? $('s-kunci').value : '';
  const isian = $('s-jawab-isian') ? $('s-jawab-isian').value : '';
  const audioUrl = $('s-audio') ? $('s-audio').value : '';
  $('s-isi-jenis').innerHTML = blokJenis({ jenis: jenis, opsi: opsi, jawaban: jenis === 'isian' ? isian : kunci, audio_url: audioUrl });
}

function openSoalModal(row) {
  row = row || {};
  const detail = state.cache.soal || {};
  const judulAsesmen = (detail.assessment && detail.assessment.judul) || 'Asesmen';
  modal((row.id ? '✏️ Edit' : '➕ Tambah') + ' Soal',
    '<p style="font-size:.75rem; margin-bottom:12px;">Untuk asesmen: <b>' + esc(judulAsesmen) + '</b></p>' +
    '<div class="fg"><label>Jenis Soal</label><select id="s-jenis" onchange="jenisSoalBerubah()">' +
      JENIS.map(j => '<option value="' + j.k + '"' + ((row.jenis || 'pg') === j.k ? ' selected' : '') + '>' + j.label + '</option>').join('') +
    '</select></div>' +
    '<div class="fg"><label>Pertanyaan *</label><textarea id="s-tanya" rows="3" placeholder="Tulis pertanyaan di sini">' + esc(row.pertanyaan || '') + '</textarea></div>' +
    '<div id="s-isi-jenis">' + blokJenis(row) + '</div>' +
    '<div class="frow">' +
      '<div class="fg"><label>Bobot Nilai</label><input type="number" id="s-bobot" min="1" max="100" value="' + (row.bobot || 1) + '"></div>' +
      '<div class="fg"><label>Pembahasan (opsional)</label><input id="s-bahas" value="' + esc(row.pembahasan || '') + '" placeholder="Kunci singkat untuk pengajar"></div>' +
    '</div>',
    '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button>' +
    '<button class="btn btn-n btn-sm" onclick="saveSoal(' + (row.id ? "'" + esc(row.id) + "'" : 'null') + ')">💾 Simpan</button>');
}

async function saveSoal(id) {
  const jenis = $('s-jenis').value;
  const data = {
    jenis: jenis,
    pertanyaan: $('s-tanya').value.trim(),
    bobot: parseInt($('s-bobot').value, 10) || 1,
    pembahasan: $('s-bahas').value.trim(),
    opsi: '',
    jawaban: '',
    audio_url: $('s-audio') ? $('s-audio').value.trim() : ''
  };
  if (!data.pertanyaan) { toast('Pertanyaan wajib diisi.', 'err'); return; }
  if (jenis === 'pg' || jenis === 'listening') {
    const opsi = dariBaris($('s-opsi').value);
    if (opsi.length < 2) { toast('Isi minimal 2 opsi jawaban (satu per baris).', 'err'); return; }
    data.opsi = opsi.join(' | ');
    data.jawaban = $('s-kunci').value;
    if (jenis === 'listening' && !data.audio_url) { toast('Soal listening wajib memuat berkas audio.', 'err'); return; }
  } else if (jenis === 'isian') {
    const jawab = dariBaris($('s-jawab-isian').value);
    if (!jawab.length) { toast('Isi minimal satu jawaban benar.', 'err'); return; }
    data.jawaban = jawab.join(' | ');
  }
  if (!state.currentAsesmen) { toast('Asesmen tidak dikenal. Buka ulang dari daftar asesmen.', 'err'); return; }
  try {
    const res = id ? await api('updateSoal', state.currentAsesmen, id, data) : await api('addSoal', state.currentAsesmen, data);
    if (!res.success) { toast(res.message, 'err'); return; }
    closeModal();
    toast(res.message || 'Soal tersimpan.', 'ok');
    invalidateCache('soal');
    app.loadPage('soal');
  } catch (ex) { toast(ex.message, 'err'); }
}

// ============ TAUTAN UJIAN & HASIL ============
// Tautan yang dibagikan pengajar ke siswa: halaman publik /ujian/ (tanpa .html).
// Panel admin ada di /sites/, jadi '../ujian/' mengarah ke akar situs.
// Tautan bersih tanpa ".html": ../ujian/ → /ujian/?id=ASM-xxxx (folder berisi
// index.html, pola yang sama dengan ../sites/ untuk panel admin).
function tautanUjian(id) {
  try {
    const u = new URL('../ujian/', window.location.href);
    u.searchParams.set('id', id);
    // Bila panel dibuka dengan ?api=... (mis. saat menguji di lokal), tautan
    // ujian mewarisi backend yang sama — kalau tidak, siswa akan menembak
    // API produksi sementara gurunya menguji di server lokal.
    if (API_PARAM) u.searchParams.set('api', API_PARAM);
    return u.href;
  } catch (_e) {
    return '../ujian/?id=' + encodeURIComponent(id) + (API_PARAM ? '&api=' + encodeURIComponent(API_PARAM) : '');
  }
}

function salinTautanUjian(id) {
  const tautan = tautanUjian(id);
  // Salin diam-diam bila bisa, DAN selalu tampilkan dialog berisi QR + tautan
  // (biar siswa yang kesulitan mengetik cukup memindai kodenya).
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(tautan).then(function () { toast('Tautan ujian disalin. Kirim ke siswa lewat WhatsApp/kelas.', 'ok'); }).catch(function () { /* dibiarkan tampil di dialog */ });
  }
  tampilkanTautan(tautan);
}

// Tampilkan tautan + KODE QR (dibuat on-device, tanpa layanan pihak ketiga).
// Bila library QR tidak termuat (mis. cache lama), dialog tetap berguna.
function tampilkanTautan(tautan) {
  let kodeQR = '';
  if (window.qrcode) {
    try {
      const qr = window.qrcode(0, 'M'); // 0 = ukuran otomatis; M = toleransi sedang
      qr.addData(tautan);
      qr.make();
      kodeQR = qr.createImgTag(4, 10);
    } catch (e) {
      console.warn('QR gagal dibuat:', e);
    }
  }
  modal('🔗 Tautan Ujian Siswa',
    (kodeQR ? '<div style="text-align:center; margin-bottom:12px; background:#fff; padding:10px; border-radius:10px; display:inline-block; box-sizing:border-box;">' + kodeQR + '</div>' : '') +
    '<p style="font-size:.8rem; margin-bottom:10px;">Bagikan ini ke siswa — bisa dipindai kode QR-nya atau disalin tautannya. Hanya berfungsi bila status asesmen <b>Aktif</b>.</p>' +
    '<div class="fg" style="margin-bottom:6px;"><input id="lnk-ujian" value="' + esc(tautan) + '" readonly></div>' +
    '<p style="font-size:.75rem;">Aktifkan status asesmen lebih dulu supaya siswa bisa membukanya.</p>',
    '<button class="btn btn-o btn-sm" id="lnk-salin">📋 Salin</button>' +
    '<button class="btn btn-n btn-sm" onclick="closeModal()">Tutup</button>');
  const inp = $('lnk-ujian');
  if (inp) { inp.focus(); inp.select(); }
  const salinBtn = $('lnk-salin');
  if (salinBtn) salinBtn.addEventListener('click', function () {
    const salin = function () { toast('Tautan ujian disalin.', 'ok'); };
    const jatuh = function () { if (inp) { inp.select(); try { document.execCommand('copy'); } catch (_e) {} } salin(); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tautan).then(salin).catch(jatuh);
    } else { jatuh(); }
  });
}

function bukaHasil(id) {
  if (!id) return;
  simpanAsesmen(id);
  invalidateCache('hasil');
  app.loadPage('hasil');
}

async function bukaDetailHasil(attemptId) {
  try {
    const d = await api('getDetailHasil', attemptId);
    const t = d.attempt || {};
    const rincian = (d.rincian || []).map(function (x, i) {
      const cls = x.benar === 'Ya' ? 'b-ok' : (x.benar === 'Tidak' ? 'b-err' : 'b-warn');
      const kunci = x.jenis === 'esai' ? '—' : (x.jenis === 'pg' && x.opsi && x.kunci ? (x.kunci + '. ' + x.opsi[String(x.kunci).toUpperCase().charCodeAt(0) - 65]) : x.kunci) || '—';
      return '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td><span class="badge ' + jenisInfo(x.jenis).badge + '">' + esc(jenisInfo(x.jenis).label) + '</span></td>' +
        '<td data-no-i18n>' + esc((x.pertanyaan || '').substring(0, 90)) +
          (x.jenis === 'listening' && x.audio_url ? '<br><audio controls preload="none" src="' + esc(x.audio_url) + '" style="max-width:200px; margin-top:6px;"></audio>' : '') + '</td>' +
        '<td data-no-i18n>' + esc(x.jawaban || '(kosong)') + '</td>' +
        '<td data-no-i18n>' + esc(kunci) + '</td>' +
        '<td><span class="badge ' + cls + '">' + esc(x.benar) + '</span></td>' +
      '</tr>';
    }).join('');

    const perlu = Number(t.perlu_nilai || 0);
    const maksEsai = Number(t.bobot_esai || 0);
    const bagianNilai = perlu > 0
      ? '<div class="fg" style="margin-top:14px;"><label>Nilai Esai (0 – ' + maksEsai + ' bobot)</label>' +
        '<input type="number" id="nh-esai" min="0" max="' + maksEsai + '" value="' + (Number(t.bobot_esai_dinilai) || 0) + '">' +
        '<small style="font-size:.72rem; opacity:.8;">Isi total bobot yang diperoleh dari ' + perlu + ' soal esai. Skor akhir dihitung ulang otomatis.</small></div>' +
        '<button class="btn btn-n btn-sm" style="margin-top:10px;" onclick="simpanNilaiEsai(\'' + esc(attemptId) + '\')">💾 Simpan Nilai Esai</button>'
      : '<p style="font-size:.78rem; margin-top:12px;">Asesmen ini tidak punya soal esai — skor sudah final.</p>';

    modal('👁️ Jawaban: ' + (t.nama || ''),
      '<p style="font-size:.78rem; margin-bottom:12px;"><b>' + esc(t.nama || '') + '</b> · mulai ' + (t.mulai ? new Date(t.mulai).toLocaleString('id-ID') : '-') +
        ' · skor saat ini <b>' + (t.skor || 0) + '</b>' + (t.lewat_waktu === 'Ya' ? ' · ⏰ lewat batas waktu' : '') +
        (Number(t.pindah_tab) > 0 ? ' · ⚠️ ' + Number(t.pindah_tab) + '× pindah tab' : '') +
        (t.student_id ? ' · ✔ dari akun orang tua' : '') + '</p>' +
      '<div class="table-wrap" style="max-height:340px; overflow-y:auto;"><table><thead><tr><th>No</th><th>Jenis</th><th>Pertanyaan</th><th>Jawaban Siswa</th><th>Kunci</th><th>Hasil</th></tr></thead><tbody>' +
      (rincian || '<tr><td colspan="6" style="text-align:center;">Tidak ada jawaban tercatat.</td></tr>') + '</tbody></table></div>' +
      bagianNilai,
      '<button class="btn btn-o btn-sm" onclick="closeModal()">Tutup</button>');
  } catch (ex) { toast(ex.message, 'err'); }
}

async function simpanNilaiEsai(attemptId) {
  const inp = $('nh-esai');
  if (!inp) return;
  try {
    const res = await api('nilaiEsai', attemptId, { bobot_esai_dinilai: parseInt(inp.value, 10) || 0 });
    if (!res.success) { toast(res.message, 'err'); return; }
    closeModal();
    toast(res.message || 'Nilai disimpan.', 'ok');
    invalidateCache('hasil');
    app.loadPage('hasil');
  } catch (ex) { toast(ex.message, 'err'); }
}

function editSoal(id) {
  const soal = (state.cache.soal && state.cache.soal.soal) || [];
  const row = soal.filter(s => String(s.id) === String(id))[0];
  if (!row) { toast('Soal tidak ditemukan. Muat ulang halaman.', 'err'); return; }
  openSoalModal(row);
}

async function delSoal(id) {
  if (!confirm('Hapus soal ini?')) return;
  try {
    const res = await api('deleteSoal', state.currentAsesmen, id);
    toast(res.message || 'Soal dihapus.', 'ok');
    invalidateCache('soal');
    app.loadPage('soal');
  } catch (ex) { toast(ex.message, 'err'); }
}

// Pindahkan satu soal satu langkah ke atas/bawah, lalu simpan urutan barunya
// sekaligus (satu panggilan reorder untuk seluruh daftar).
async function pindahSoal(id, arah) {
  const soal = (state.cache.soal && state.cache.soal.soal) || [];
  const ids = soal.map(s => s.id);
  const dari = ids.indexOf(id);
  const ke = dari + arah;
  if (dari === -1 || ke < 0 || ke >= ids.length) return;
  ids.splice(ke, 0, ids.splice(dari, 1)[0]);
  try {
    const res = await api('reorderSoal', state.currentAsesmen, ids);
    if (res && res.success === false) { toast(res.message, 'err'); return; }
    invalidateCache('soal');
    app.loadPage('soal');
  } catch (ex) { toast(ex.message, 'err'); }
}

// ============ IMPOR MASSAL (CSV / Excel) ============
// Alur: berkas/tempelan → petakan kolom → pratinjau + validasi → kirim hanya
// baris yang sah ke server (/questions/bulk). Pratinjau sengaja ditampilkan
// lebih dulu supaya guru bisa melihat pemetaan kolomnya benar sebelum data
// masuk — kesalahan pemetaan pada 100 soal sulit dibatalkan satu per satu.

const IMPOR_MAKS = 300;
const TEMPLATE_HEADER = 'jenis,pertanyaan,opsi,jawaban,bobot,pembahasan';
const TEMPLATE_CONTOH = [
  'pg,"Berapa hasil 6 x 2?","10|11|12|13",C,2,"Hafalan perkalian dasar"',
  'isian,"Ibu kota Indonesia?",,Jakarta|DKI Jakarta,1,""',
  'esai,"Jelaskan proses fotosintesis.",,,3,"Dinilai manual oleh pengajar"'
].join('\n');

// Nama kolom yang diterima (Indonesia & Inggris, spasi/huruf besar bebas).
const ALIAS_KOLOM = {
  jenis: ['jenis', 'tipe', 'type', 'jenissoal', 'jenis soal', 'bentuk'],
  pertanyaan: ['pertanyaan', 'soal', 'question', 'teks', 'isi'],
  opsi: ['opsi', 'pilihan', 'options', 'option', 'jawabanpg'],
  jawaban: ['jawaban', 'kunci', 'kuncijawaban', 'answer', 'key'],
  bobot: ['bobot', 'nilai', 'skor', 'weight', 'poin'],
  pembahasan: ['pembahasan', 'penjelasan', 'explanation', 'catatan']
};

function normJudulKolom(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[_*:]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Pemecah CSV sederhana tapi taat RFC 4180: menghormati tanda kutip, kutip
// ganda yang di-escape, dan baris di dalam sel. Pemisah dideteksi otomatis
// (koma, titik koma, atau tab) supaya hasil "Save As CSV" dari Excel berbagai
// lokal bisa langsung dipakai.
function pisahCSV(teks) {
  const isi = String(teks || '').replace(/^\uFEFF/, '');
  const barisMentah = isi.split(/\r\n|\n|\r/);
  const contoh = barisMentah.slice(0, 5).join('\n');
  const hitung = (c) => (contoh.split(c).length - 1);
  const pemisah = hitung('\t') > hitung(';') && hitung('\t') > hitung(',') ? '\t' : (hitung(';') > hitung(',') ? ';' : ',');

  const baris = [];
  let sel = '', kolom = [], dalamKutip = false;
  for (let i = 0; i < isi.length; i++) {
    const c = isi[i];
    if (dalamKutip) {
      if (c === '"') {
        if (isi[i + 1] === '"') { sel += '"'; i++; } else { dalamKutip = false; }
      } else { sel += c; }
    } else if (c === '"') {
      dalamKutip = true;
    } else if (c === pemisah) {
      kolom.push(sel); sel = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && isi[i + 1] === '\n') i++;
      kolom.push(sel); sel = '';
      baris.push(kolom); kolom = [];
    } else { sel += c; }
  }
  kolom.push(sel);
  baris.push(kolom);
  return baris.filter(b => b.some(x => String(x).trim() !== ''));
}

function normalJenis(v) {
  const s = String(v == null ? '' : v).toLowerCase().trim();
  if (!s) return 'pg';
  if (/esai|essay|uraian|menulis/.test(s)) return 'esai';
  if (/isian|singkat|short|pendek/.test(s)) return 'isian';
  if (/pg|pilihan|ganda|multiple|choice/.test(s)) return 'pg';
  // Angka 1/2/3 sering dipakai sebagai penanda jenis di Excel.
  if (s === '1') return 'pg';
  if (s === '2') return 'isian';
  if (s === '3') return 'esai';
  return 'pg';
}

// Ubah matriks sel → daftar soal. Baris pertama dianggap header bila salah satu
// selnya cocok dengan alias kolom; kalau tidak, kolom dibaca berurutan.
function petakanBaris(matrik) {
  if (!matrik.length) return [];
  const kepala = matrik[0].map(normJudulKolom);
  const posisi = {};
  let adaHeader = false;
  Object.keys(ALIAS_KOLOM).forEach(function (kunci) {
    const i = kepala.findIndex(function (h) { return ALIAS_KOLOM[kunci].indexOf(h) !== -1 || h.replace(/ /g, '') === kunci; });
    if (i !== -1) { posisi[kunci] = i; adaHeader = true; }
  });
  // Kolom opsi terpisah (opsi a, opsi b, ...) — lazim dibuat di Excel.
  const kolomOpsiTerpisah = [];
  kepala.forEach(function (h, i) { if (/^opsi ?[a-f]$/.test(h)) kolomOpsiTerpisah.push(i); });
  if (kolomOpsiTerpisah.length) adaHeader = true;

  if (!adaHeader) {
    // Tanpa header: urutan baku jenis, pertanyaan, opsi, jawaban, bobot, pembahasan
    posisi.jenis = 0; posisi.pertanyaan = 1; posisi.opsi = 2; posisi.jawaban = 3; posisi.bobot = 4; posisi.pembahasan = 5;
  }
  const mulai = adaHeader ? 1 : 0;

  return matrik.slice(mulai).map(function (b, i) {
    const ambil = (k) => (posisi[k] === undefined ? '' : String(b[posisi[k]] == null ? '' : b[posisi[k]]).trim());
    let opsi = ambil('opsi');
    if (!opsi && kolomOpsiTerpisah.length) opsi = kolomOpsiTerpisah.map(c => String(b[c] == null ? '' : b[c]).trim()).filter(Boolean).join('|');
    return {
      baris: i + (adaHeader ? 2 : 1),
      soal: {
        jenis: normalJenis(ambil('jenis')),
        pertanyaan: ambil('pertanyaan'),
        opsi: opsi,
        jawaban: ambil('jawaban'),
        bobot: ambil('bobot') || 1,
        pembahasan: ambil('pembahasan')
      }
    };
  });
}

// Pemeriksaan awal di browser (cerminan aturan server) supaya guru melihat
// masalahnya SEBELUM menekan Impor.
function periksaBaris(s) {
  if (!s.pertanyaan) return 'Pertanyaan kosong.';
  if (s.jenis === 'pg') {
    const opsi = pisah(s.opsi);
    if (opsi.length < 2) return 'Pilihan ganda minimal 2 opsi (pisahkan dengan | ).';
    const kunci = String(s.jawaban || '').trim();
    let posisi = -1;
    if (/^\d+$/.test(kunci)) posisi = parseInt(kunci, 10) - 1;                 // "1" → A
    else if (kunci) posisi = kunci.toUpperCase().charCodeAt(0) - 65;           // "C" → 2
    if (!(posisi >= 0 && posisi < opsi.length)) return 'Kunci jawaban harus A–' + huruf(opsi.length - 1) + ' atau nomor 1–' + opsi.length + '.';
    s.opsi = opsi.join(' | ');
    s.jawaban = huruf(posisi);
  } else if (s.jenis === 'isian') {
    const jw = pisah(s.jawaban);
    if (!jw.length) return 'Isian singkat butuh minimal satu jawaban benar.';
    s.opsi = ''; s.jawaban = jw.join(' | ');
  } else {
    s.opsi = ''; s.jawaban = '';
  }
  const bobot = parseInt(s.bobot, 10);
  if (!(bobot >= 1 && bobot <= 100)) s.bobot = 1;
  return '';
}

function kelasPratinjauBaris(hasil) {
  return hasil.pesan ? 'imp-bad' : 'imp-ok';
}

function gambarPratinjau() {
  const semua = state.imporBaris || [];
  const sah = semua.filter(x => !x.pesan);
  const baris = semua.map(function (x) {
    return '<tr class="' + kelasPratinjauBaris(x) + '"><td>' + x.baris + '</td>' +
      '<td><span class="badge ' + jenisInfo(x.soal.jenis).badge + '">' + esc(jenisInfo(x.soal.jenis).label) + '</span></td>' +
      '<td data-no-i18n>' + esc((x.soal.pertanyaan || '').substring(0, 70)) + '</td>' +
      '<td>' + (x.pesan ? '⚠️ ' + esc(x.pesan) : '✅ siap') + '</td></tr>';
  }).join('');
  const wadah = $('imp-pratinjau');
  if (wadah) {
    wadah.innerHTML = semua.length
      ? '<p style="font-size:.8rem; margin-bottom:8px;"><b>' + sah.length + '</b> baris siap diimpor' + (semua.length - sah.length ? ', <b>' + (semua.length - sah.length) + '</b> dilewati.' : '.') + '</p>' +
        '<div class="table-wrap" style="max-height:260px; overflow-y:auto;"><table><thead><tr><th>Baris</th><th>Jenis</th><th>Pertanyaan</th><th>Status</th></tr></thead><tbody>' + baris + '</tbody></table></div>'
      : '';
  }
  const tombol = $('imp-tombol');
  if (tombol) {
    tombol.disabled = sah.length === 0;
    tombol.textContent = sah.length ? ('💾 Impor ' + sah.length + ' Soal') : '💾 Impor Soal';
  }
  return sah;
}

// Terima teks (CSV) atau matriks (Excel) → susun pratinjau.
function siapkanPratinjau(matrikAtauTeks) {
  let matrik;
  if (Array.isArray(matrikAtauTeks)) matrik = matrikAtauTeks;
  else matrik = pisahCSV(matrikAtauTeks);

  if (matrik.length > IMPOR_MAKS + 1) {
    toast('Maksimal ' + IMPOR_MAKS + ' soal sekali impor. Berkas ini berisi ' + (matrik.length - 1) + ' baris data.', 'err');
  }
  const dipetakan = petakanBaris(matrik.slice(0, IMPOR_MAKS + 1));
  state.imporBaris = dipetakan.map(function (x) {
    return { baris: x.baris, pesan: periksaBaris(x.soal), soal: x.soal };
  });
  gambarPratinjau();
}

function bacaBerkasImpor(berkas) {
  const nama = String(berkas.name || '').toLowerCase();
  const excel = /\.xlsx?$/.test(nama);
  if (excel) {
    muatXlsx().then(function (XLSX) {
      const pembaca = new FileReader();
      pembaca.onload = function () {
        try {
          const buku = XLSX.read(new Uint8Array(pembaca.result), { type: 'array' });
          const lembar = buku.Sheets[buku.SheetNames[0]];
          const matrik = XLSX.utils.sheet_to_json(lembar, { header: 1, blankrows: false, defval: '' });
          siapkanPratinjau(matrik);
        } catch (e) {
          toast('Berkas Excel gagal dibaca: ' + e.message, 'err');
        }
      };
      pembaca.onerror = function () { toast('Berkas gagal dibaca.', 'err'); };
      pembaca.readAsArrayBuffer(berkas);
    }).catch(function (e) { toast(e.message, 'err'); });
    return;
  }
  const pembaca = new FileReader();
  pembaca.onload = function () { siapkanPratinjau(String(pembaca.result || '')); };
  pembaca.onerror = function () { toast('Berkas gagal dibaca.', 'err'); };
  pembaca.readAsText(berkas);
}

// Pustaka Excel (SheetJS) dimuat HANYA saat ada berkas .xlsx dipilih, supaya
// panel tetap ringan dan tetap bisa dipakai saat offline untuk CSV/tempel.
let pustakaXlsx = null;
function muatXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (pustakaXlsx) return pustakaXlsx;
  const SUMBER = [
    'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'
  ];
  pustakaXlsx = new Promise(function (selesai, gagal) {
    let i = 0;
    const coba = function () {
      if (i >= SUMBER.length) { gagal(new Error('Gagal memuat pustaka Excel. Periksa koneksi internet, atau simpan berkas sebagai CSV lalu impor lagi.')); return; }
      const s = document.createElement('script');
      s.src = SUMBER[i++];
      s.onload = function () { window.XLSX ? selesai(window.XLSX) : coba(); };
      s.onerror = coba;
      document.head.appendChild(s);
    };
    coba();
  });
  return pustakaXlsx;
}

function unduhBerkas(nama, isi) {
  // BOM (﻿) penting: tanpa itu Excel di Windows membaca CSV sebagai
  // ANSI dan huruf beraksen jadi rusak.
  const blob = new Blob(['\uFEFF' + isi], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nama;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
}

function selCSV(v) {
  const s = String(v == null ? '' : v);
  return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function unduhTemplateSoal() {
  unduhBerkas('template-soal-asesmen.csv', TEMPLATE_HEADER + '\n' + TEMPLATE_CONTOH);
  toast('Template diunduh — buka dengan Excel lalu ganti isinya.', 'ok');
}

function eksporSoal() {
  const detail = state.cache.soal || {};
  const soal = detail.soal || [];
  if (!soal.length) { toast('Belum ada soal untuk diekspor.', 'err'); return; }
  const judul = (detail.assessment && detail.assessment.judul) || 'asesmen';
  const isi = [TEMPLATE_HEADER].concat(soal.map(function (s) {
    return [s.jenis, s.pertanyaan, s.opsi, s.jawaban, s.bobot, s.pembahasan].map(selCSV).join(',');
  })).join('\n');
  unduhBerkas('soal-' + judul.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40) + '.csv', isi);
  toast(soal.length + ' soal diekspor ke CSV.', 'ok');
}

function bukaImporSoal() {
  state.imporBaris = [];
  modal('📥 Impor Soal Massal',
    '<p style="font-size:.78rem; margin-bottom:14px;">Isi banyak soal sekaligus dari <b>Excel/CSV</b>. Kolom yang dikenali: <b>jenis</b> (pg / isian / esai), <b>pertanyaan</b>, <b>opsi</b> (pisahkan dengan <b>|</b> untuk pilihan ganda), <b>jawaban</b> (kunci <b>A/B/C</b> atau nomor <b>1/2/3</b>), <b>bobot</b>, <b>pembahasan</b>. Baris pertama bebas: boleh header, boleh langsung data.</p>' +
    '<div class="fg"><label>1. Unggah Berkas (.csv / .xlsx)</label><input type="file" id="imp-berkas" accept=".csv,.txt,.tsv,.xlsx,.xls"></div>' +
    '<div class="fg"><label>2. Atau Tempel dari Excel</label><textarea id="imp-teks" rows="5" placeholder="Salin sel dari Excel (Ctrl+C) lalu tempel di sini (Ctrl+V)"></textarea>' +
      '<small style="font-size:.72rem; opacity:.8;">Menempel hasil salinan Excel otomatis terbaca — pemisah antar kolom (Tab) dikenali.</small></div>' +
    '<div id="imp-pratinjau"></div>',
    '<button class="btn btn-o btn-sm" onclick="unduhTemplateSoal()">⬇️ Template</button>' +
    '<button class="btn btn-o btn-sm" onclick="closeModal()">Batal</button>' +
    '<button class="btn btn-n btn-sm" id="imp-tombol" onclick="imporSoalSekarang()" disabled>💾 Impor Soal</button>');

  const berkas = $('imp-berkas');
  if (berkas) berkas.addEventListener('change', function () {
    if (berkas.files && berkas.files[0]) bacaBerkasImpor(berkas.files[0]);
  });
  const teks = $('imp-teks');
  if (teks) teks.addEventListener('input', function () {
    // Menempel isi Excel selalu memakai Tab; itu penanda paling andal bahwa
    // pengguna memang menempel, bukan mengetik manual.
    if (teks.value.trim()) siapkanPratinjau(teks.value);
    else { state.imporBaris = []; gambarPratinjau(); }
  });
}

async function imporSoalSekarang() {
  const sah = (state.imporBaris || []).filter(x => !x.pesan).map(x => x.soal);
  if (!sah.length) { toast('Belum ada baris yang siap diimpor.', 'err'); return; }
  const tombol = $('imp-tombol');
  if (tombol) { tombol.disabled = true; tombol.textContent = '⏳ Mengimpor…'; }
  try {
    const res = await api('bulkSoal', state.currentAsesmen, sah);
    if (!res.success) { toast(res.message, 'err'); if (tombol) { tombol.disabled = false; tombol.textContent = '💾 Impor Soal'; } return; }
    closeModal();
    toast(res.message || 'Impor selesai.', 'ok');
    if (res.ditolak && res.ditolak.length) {
      // Rincian baris yang ditolak server ditampilkan sekali lagi agar guru tahu
      // apa yang perlu diperbaiki di berkasnya.
      modal('⚠️ Sebagian Baris Dilewati',
        '<p style="font-size:.82rem; margin-bottom:12px;"><b>' + res.diterima + ' soal</b> berhasil diimpor. Baris berikut dilewati server:</p>' +
        '<div class="table-wrap"><table><thead><tr><th>Baris</th><th>Alasan</th></tr></thead><tbody>' +
        res.ditolak.map(d => '<tr><td>' + d.baris + '</td><td>' + esc(d.pesan) + '</td></tr>').join('') +
        '</tbody></table></div>',
        '<button class="btn btn-n btn-sm" onclick="closeModal()">Mengerti</button>');
    }
    state.imporBaris = [];
    invalidateCache('soal');
    app.loadPage('soal');
  } catch (ex) {
    toast(ex.message, 'err');
    if (tombol) { tombol.disabled = false; tombol.textContent = '💾 Impor Soal'; }
  }
}

export { openAsesmenModal, saveAsesmen, openSoalModal, saveSoal, jenisSoalBerubah,
  bukaImporSoal, imporSoalSekarang, unduhTemplateSoal, eksporSoal,
  bukaHasil, simpanNilaiEsai, salinTautanUjian };

// Kait uji untuk fungsi murni impor (dipakai harness di luar aplikasi).
export const imporUji = { periksaBaris, petakanBaris, pisahCSV, normalJenis, TEMPLATE_HEADER, TEMPLATE_CONTOH };

export const actions = {
  'add-asesmen': function () { openAsesmenModal(null); },
  'edit-asesmen': function (id) { editAsesmen(id); },
  'del-asesmen': function (id, name) { delAsesmen(id, name); },
  'open-soal': function (id) { openSoalList(id); },
  'kembali-asesmen': function () { app.loadPage('asesmen'); },
  'add-soal': function () { openSoalModal(null); },
  'edit-soal': function (id) { editSoal(id); },
  'del-soal': function (id) { delSoal(id); },
  'soal-up': function (id) { pindahSoal(id, -1); },
  'soal-down': function (id) { pindahSoal(id, 1); },
  'impor-soal': function () { bukaImporSoal(); },
  'ekspor-soal': function () { eksporSoal(); },
  'lihat-hasil': function (id) { bukaHasil(id); },
  'salin-tautan': function (id) { salinTautanUjian(id); },
  'buka-soal': function (id) { openSoalList(id); },
  'detail-hasil': function (id) { bukaDetailHasil(id); }
};
