// ============ HALAMAN: TERPADU (modul, identitas, entitas) ============
import { invalidateCache } from '../state.js';
import { $, esc, toast } from '../ui.js';
import { api } from '../api.js';
import { app } from '../helpers.js';

const MODUL_LABEL = {
  lms: 'LMS & Materi', cbt: 'Ujian Online (CBT)', absensi: 'Absensi Digital',
  spmb: 'Pendaftaran Baru (SPMB)', perpus: 'Perpustakaan / Modul',
  keuangan: 'Keuangan & Biaya Paket', tabungan: 'Tabungan & Dompet',
  payroll_honor: 'Honor Tutor', bk_bimbingan: 'Bimbingan Belajar',
  bk_disiplin: 'BK Disiplin (sekolah)', kantin: 'E-Kantin (sekolah)',
  payroll_formal: 'Payroll Formal (sekolah)', ekskul: 'Ekstrakurikuler',
  notif_wa: 'WhatsApp & Broadcast', cms: 'Website & CMS', kts: 'Kartu Peserta + QR'
};

const GRUP_ENTITAS = [
  { judul: '💰 Keuangan Sekolah', items: [['pos_biaya', 'Pos Biaya'], ['tagihan', 'Tagihan'], ['pembayaran', 'Pembayaran'], ['arus_kas', 'Arus Kas']] },
  { judul: '🍱 Kantin (mode sekolah)', items: [['kantin_stand', 'Stand'], ['kantin_menu', 'Menu'], ['kantin_pesanan', 'Pesanan'], ['kantin_withdraw', 'Withdraw']] },
  { judul: '💼 Payroll & Honor', items: [['payroll_komponen', 'Komponen'], ['payroll_template', 'Template'], ['payroll_pinjaman', 'Pinjaman/Kasbon'], ['payroll_slip', 'Slip Gaji']] },
  { judul: '🤝 BK & Konseling', items: [['bk_konseling', 'Konseling'], ['bk_minat', 'Minat Bakat'], ['bk_pelanggaran', 'Pelanggaran'], ['bk_sp', 'Surat Peringatan']] },
  { judul: '📚 Akademik & LMS', items: [['periode_belajar', 'Periode'], ['nilai_akademik', 'Nilai'], ['lms_materi', 'Materi'], ['lms_tugas', 'Tugas'], ['lms_kumpul', 'Pengumpulan'], ['perpus_pinjam', 'Pinjam Buku']] },
  { judul: '📣 Operasional', items: [['spmb_gelombang', 'Gelombang SPMB'], ['ekskul', 'Ekskul'], ['agenda', 'Agenda'], ['pengumuman', 'Pengumuman'], ['notifikasi', 'Notifikasi'], ['wa_antrean', 'Antrean WA'], ['absensi_scan', 'Scan Absensi']] }
];

export const render = {
  modul: function (d) {
    d = d || {};
    const rows = d.modul || [];
    const cards = rows.map(m =>
      '<div class="card" style="padding:12px;"><b>' + esc(MODUL_LABEL[m.kunci] || m.kunci) + '</b>' +
      '<div style="margin:8px 0;"><span class="badge ' + (String(m.aktif) === 'Aktif' ? 'b-ok' : 'b-warn') + '">' + esc(m.aktif) + '</span></div>' +
      '<div style="font-size:0.78rem; margin-bottom:8px;">' + esc(m.keterangan || '') + '</div>' +
      '<button class="btn btn-o btn-sm" data-action="toggle-modul" data-id="' + esc(m.kunci) + '" data-extra="' + esc(m.aktif) + '">' +
      (String(m.aktif) === 'Aktif' ? '⏸️ Nonaktifkan' : '▶️ Aktifkan') + '</button></div>'
    ).join('');
    $('page').innerHTML =
      '<div class="card-head" style="margin-bottom:16px;"><h2>🧩 Modul Aplikasi</h2>' +
      '<button class="btn btn-o btn-sm" data-action="refresh-page" data-id="modul">🔄 Muat Ulang</button></div>' +
      '<p style="font-size:0.85rem; margin-bottom:12px;">Matikan modul sekolah (Kantin, BK Disiplin, Payroll Formal) selama masih lembaga kursus. Perubahan tercatat di riwayat.</p>' +
      '<div class="grid">' + (cards || '<div class="card">Belum ada data modul. Jalankan MIGRASI-modul-terpadu.sql</div>') + '</div>' +
      '<div class="card" style="margin-top:16px;"><h3>🕘 Riwayat Perubahan</h3><div style="font-size:0.8rem;">' +
      ((d.riwayat || []).slice(0, 20).map(r => esc(r.waktu) + ' — ' + esc(r.kunci) + ': ' + esc(r.dari) + ' → ' + esc(r.ke) + ' (' + esc(r.pengubah) + ')').join('<br>') || 'Belum ada.') + '</div></div>';
  },

  identitas: function (d) {
    const v = (d && d.identitas) || {};
    const inp = (k, label) => '<div class="fg"><label>' + label + '</label><input id="idt-' + k + '" value="' + esc(v[k] || '') + '"></div>';
    $('page').innerHTML =
      '<div class="card-head" style="margin-bottom:16px;"><h2>🏫 Identitas Lembaga</h2></div>' +
      '<div class="card"><div class="fg"><label>Mode Lembaga</label><select id="idt-mode_lembaga"><option value="kursus"' + (v.mode_lembaga !== 'sekolah' ? ' selected' : '') + '>kursus (Lembaga Kursus)</option><option value="sekolah"' + (v.mode_lembaga === 'sekolah' ? ' selected' : '') + '>sekolah (Sekolah Formal)</option></select></div>' +
      inp('nama_lembaga', 'Nama Lembaga') + inp('nama_pimpinan', 'Pimpinan Lembaga') +
      '<div class="grid">' + inp('label_murid', 'Sebutan Peserta (Murid)') + inp('label_tutor', 'Sebutan Pengajar (Tutor)') + inp('label_program', 'Sebutan Program/Jurusan') + inp('label_biaya', 'Sebutan Biaya (Biaya Paket/SPP)') + inp('label_rapor', 'Sebutan Rapor') + inp('label_pimpinan', 'Sebutan Pimpinan') + '</div>' +
      '<button class="btn btn-n btn-sm" data-action="save-identitas">💾 Simpan</button></div>' +
      '<div class="card" style="margin-top:16px;"><h3>🩺 Diagnostik Server Ujian</h3><p style="font-size:0.82rem;">Cek memori & kapasitas sebelum ujian massal.</p><button class="btn btn-o btn-sm" data-action="cek-diagnostik">🧪 Cek Sekarang</button><div id="dg-hasil" style="margin-top:10px; font-size:0.85rem;"></div></div>';
  },

  terpadu: function () {
    const grup = GRUP_ENTITAS.map(g =>
      '<div class="card"><h3 style="margin-bottom:10px;">' + g.judul + '</h3>' +
      g.items.map(it => '<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #eee;"><span>' + it[1] + ' <span class="mono" style="font-size:0.75rem;">(' + it[0] + ')</span></span><button class="btn btn-o btn-sm" data-action="buka-entitas" data-id="' + it[0] + '">Buka</button></div>').join('') + '</div>'
    ).join('');
    $('page').innerHTML =
      '<div class="card-head" style="margin-bottom:16px;"><h2>🧮 Data Terpadu</h2></div>' +
      '<div class="card" style="margin-bottom:14px;"><h3>💳 Bayar Tagihan (Kasir)</h3><div style="display:flex; gap:8px; flex-wrap:wrap;"><input id="byr-tagihan" placeholder="ID Tagihan (TGH-...)" style="flex:2; min-width:180px;"><input id="byr-jumlah" type="number" placeholder="Nominal" style="flex:1; min-width:120px;"><select id="byr-metode"><option>Tunai</option><option>Transfer Bank</option><option>Potong Saldo</option></select><button class="btn btn-n btn-sm" data-action="bayar-tagihan">💰 Bayar</button></div></div>' +
      '<div class="grid">' + grup + '</div>' +
      '<div id="entitas-hasil"></div>';
  }
};

async function muatEntitas(nama) {
  const box = $('entitas-hasil');
  if (box) box.innerHTML = '<div class="card">⏳ Memuat ' + esc(nama) + '...</div>';
  try {
    const rows = await api('getTerpadu', nama);
    const list = Array.isArray(rows) ? rows : [];
    const baris = list.slice(0, 50).map(r => '<tr><td class="mono">' + esc(r.id || r.student_id || '-') + '</td><td>' + esc(r.nama || r.judul || r.mapel || r.pos || r.status || '-') + '</td><td>' + esc(r.status || r.aktif || '-') + '</td><td><button class="btn btn-d btn-sm" data-action="hapus-entitas" data-id="' + esc(nama) + '" data-extra="' + esc(r.id || r.student_id || '') + '">Hapus</button></td></tr>').join('');
    if (box) box.innerHTML = '<div class="card" style="margin-top:14px;"><h3>📦 ' + esc(nama) + ' (' + list.length + ')</h3><div class="table-wrap"><table><thead><tr><th>ID</th><th>Nama/Judul</th><th>Status</th><th></th></tr></thead><tbody>' + (baris || '<tr><td colspan="4" style="text-align:center;">Kosong.</td></tr>') + '</tbody></table></div><p style="font-size:0.78rem;">Tambah via API/CSV massal; form rinci menyusul per modul. Template impor spreadsheet tersedia di menu Asesmen.</p></div>';
  } catch (e) {
    if (box) box.innerHTML = '<div class="card">⚠️ ' + esc(e.message) + '</div>';
  }
}

export const actions = {
  'toggle-modul': async (kunci, _n, aktif) => {
    const ke = String(aktif) === 'Aktif' ? 'Nonaktif' : 'Aktif';
    if (!confirm('Ubah modul ' + kunci + ' → ' + ke + '?')) return;
    await api('setModul', kunci, ke);
    toast('Modul ' + kunci + ' → ' + ke, 'ok');
    invalidateCache('modul');
    app.loadPage('modul');
  },
  'save-identitas': async () => {
    const keys = ['mode_lembaga', 'nama_lembaga', 'nama_pimpinan', 'label_murid', 'label_tutor', 'label_program', 'label_biaya', 'label_rapor', 'label_pimpinan'];
    const body = {};
    keys.forEach(k => { const el = $('idt-' + k); if (el) body[k] = el.value; });
    await api('saveIdentitas', body);
    toast('Identitas disimpan.', 'ok');
    invalidateCache('identitas');
  },
  'cek-diagnostik': async () => {
    const box = $('dg-hasil');
    if (box) box.textContent = '⏳ Mengecek...';
    try {
      const r = await api('diagnostikUjian');
      if (box) box.innerHTML = 'Memori: <b>' + esc(String((r.info || {}).memMB)) + ' MB</b> · Uptime: ' + esc(String((r.info || {}).uptimeDetik)) + ' dtk · Estimasi serentak: <b>' + esc(String((r.info || {}).saranKapasitas)) + ' siswa</b><br><span style="font-size:0.8rem;">' + esc((r.info || {}).catatan || '') + '</span>';
    } catch (e) {
      if (box) box.textContent = '⚠️ ' + e.message;
    }
  },
  'buka-entitas': async (nama) => { await muatEntitas(nama); },
  'hapus-entitas': async (nama, _n, id) => {
    if (!confirm('Hapus ' + nama + ' / ' + id + '?')) return;
    await api('deleteTerpadu', nama, id);
    toast('Dihapus.', 'ok');
    await muatEntitas(nama);
  },
  'bayar-tagihan': async () => {
    const tagihanId = ($('byr-tagihan') || {}).value || '';
    const jumlah = Number(($('byr-jumlah') || {}).value || 0);
    const metode = ($('byr-metode') || {}).value || 'Tunai';
    if (!tagihanId || !(jumlah > 0)) { toast('Isi ID tagihan & nominal.', 'err'); return; }
    const r = await api('bayarTagihan', { tagihan_id: tagihanId, jumlah, metode });
    toast(r.message || 'Pembayaran dicatat.', 'ok');
  }
};
