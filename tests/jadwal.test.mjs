// ==================== UJI: JADWAL & LEMBAR ABSENSI ====================
// Menguji src/js/shared/jadwal.js — seluruhnya fungsi murni (tanpa DOM).
// Jalankan: npm test
import test from 'node:test';
import assert from 'node:assert/strict';

const j = await import('../docs/src/js/shared/jadwal.js');

test('hariDariTanggal: hari benar, tanggal mustahil ditolak', () => {
  assert.equal(j.hariDariTanggal('2026-09-20'), 'Minggu');
  assert.equal(j.hariDariTanggal('2026-09-21'), 'Senin');
  assert.equal(j.hariDariTanggal('2026-02-30'), '', '30 Februari bukan tanggal nyata');
  assert.equal(j.hariDariTanggal('2026-13-01'), '');
  assert.equal(j.hariDariTanggal('bukan tanggal'), '');
  assert.equal(j.hariDariTanggal(''), '');
});

test('geserTanggal & tanggalKeTeks bekerja lintas bulan', () => {
  assert.equal(j.geserTanggal('2026-09-01', -1), '2026-08-31');
  assert.equal(j.geserTanggal('2026-09-30', 1), '2026-10-01');
  assert.equal(j.geserTanggal('2026-09-20', 0), '2026-09-20');
  assert.equal(j.geserTanggal('', 1), '');
  assert.match(j.tanggalKeTeks('2026-09-21'), /^Senin, 21 September 2026$/);
  assert.match(j.tanggalKeTeks('2026-09-21', 'pendek'), /21 Sep 2026/);
});

test('jamRapi menerima berbagai cara penulisan jam guru', () => {
  assert.equal(j.jamRapi('15.00'), '15:00');
  assert.equal(j.jamRapi('9'), '09:00');
  assert.equal(j.jamRapi('0900'), '09:00');
  assert.equal(j.jamRapi(' 8 : 5 '), '08:05');
  assert.equal(j.jamRapi('24:00'), '');
  assert.equal(j.jamRapi('15:75'), '');
  assert.equal(j.jamRapi(''), '');
  assert.equal(j.menitDariJam('08:30'), 510);
  assert.equal(j.menitDariJam('ngawur'), -1);
  assert.equal(j.rentangJam('15.00', '16.30'), '15:00–16:30');
  assert.equal(j.rentangJam('15:00', ''), '15:00');
});

test('urutkanJadwal: Senin dulu, lalu jam, sesi tanpa jam di akhir', () => {
  const hasil = j.urutkanJadwal([
    { hari: 'Rabu', jamMulai: '16:00', kelasNama: 'B' },
    { hari: 'Senin', jamMulai: '16:00', kelasNama: 'A' },
    { hari: 'Senin', jamMulai: '08:00', kelasNama: 'C' },
    { hari: 'Minggu', jamMulai: '', kelasNama: 'D' }
  ]).map(x => x.kelasNama);
  assert.deepEqual(hasil, ['C', 'A', 'B', 'D']);
});

test('kelompokkanPerHari: hanya hari berisi, hari tak dikenal tetap tampil', () => {
  const grup = j.kelompokkanPerHari([
    { hari: 'Rabu', jamMulai: '15:00', kelasNama: 'A' },
    { hari: 'Senin', jamMulai: '15:00', kelasNama: 'B' },
    { hari: 'Hari Libur', jamMulai: '10:00', kelasNama: 'C' }
  ]);
  assert.deepEqual(grup.map(g => g.hari), ['Senin', 'Rabu', 'Lainnya']);
  assert.equal(grup[2].sesi[0].kelasNama, 'C');
  assert.deepEqual(j.kelompokkanPerHari([]), []);
});

test('ringkasJadwal & validasiJadwal: pesan form jelas dan bernilai sama dengan server', () => {
  assert.equal(j.ringkasJadwal({ hari: 'Senin', jamMulai: '15:00', jamSelesai: '16:30', mapel: 'Matematika' }), 'Senin, 15:00–16:30 · Matematika');
  assert.equal(j.validasiJadwal({ kelasId: 'K-1', hari: 'Senin', jamMulai: '15.00', jamSelesai: '16.30' }).ok, true);
  assert.match(j.validasiJadwal({ hari: 'Senin', jamMulai: '15:00' }).pesan, /Kelas/);
  assert.match(j.validasiJadwal({ kelasId: 'K-1', hari: 'Senin' }).pesan, /Jam mulai/);
  assert.match(j.validasiJadwal({ kelasId: 'K-1', hari: 'Hari Libur', jamMulai: '15:00' }).pesan, /Hari/);
  assert.match(j.validasiJadwal({ kelasId: 'K-1', hari: 'Senin', jamMulai: '15:00', jamSelesai: '14:00' }).pesan, /Jam selesai/);
  assert.equal(j.validasiJadwal({ kelasId: 'K-1', hari: 'Senin', jamMulai: '15:00', jamSelesai: '' }).ok, true, 'jam selesai opsional');
});

test('jadwalUntukMurid: sesi kelas + sesi privat, jadwal nonaktif dibuang', () => {
  const daftar = [
    { id: 'J-1', hari: 'Rabu', jamMulai: '15:00', kelasId: 'K-1', status: 'Aktif' },
    { id: 'J-2', hari: 'Senin', jamMulai: '15:00', kelasId: 'K-1', status: 'Aktif' },
    { id: 'J-3', hari: 'Senin', jamMulai: '08:00', kelasId: 'K-1', studentId: 'S-2', status: 'Aktif' },
    { id: 'J-4', hari: 'Senin', jamMulai: '09:00', kelasId: 'K-2', status: 'Aktif' },
    { id: 'J-5', hari: 'Kamis', jamMulai: '09:00', kelasId: 'K-1', status: 'Nonaktif' }
  ];
  assert.deepEqual(j.jadwalUntukMurid(daftar, { id: 'S-1', kelasId: 'K-1' }).map(x => x.id), ['J-2', 'J-1']);
  assert.deepEqual(j.jadwalUntukMurid(daftar, { id: 'S-2', kelasId: 'K-1' }).map(x => x.id), ['J-3', 'J-2', 'J-1']);
  assert.deepEqual(j.jadwalUntukMurid(daftar, null), []);
});

test('perluSusulan & masaDepan menandai absensi susulan dengan tepat', () => {
  assert.equal(j.perluSusulan('2026-09-19', '2026-09-20'), true, 'kemarin → susulan');
  assert.equal(j.perluSusulan('2026-09-20', '2026-09-20'), false, 'hari ini → bukan susulan');
  assert.equal(j.perluSusulan('2026-09-21', '2026-09-20'), false);
  assert.equal(j.perluSusulan('', '2026-09-20'), false);
  assert.equal(j.masaDepan('2026-09-21', '2026-09-20'), true);
  assert.equal(j.masaDepan('2026-09-20', '2026-09-20'), false);
});

test('hitungSesi: hitungan isian per sesi jadwal', () => {
  assert.deepEqual(j.hitungSesi({ murid: [{ status: 'Hadir' }, { status: '' }, { status: 'Izin' }] }),
    { tercatat: 2, total: 3, sisa: 1, lengkap: false });
  assert.deepEqual(j.hitungSesi({ murid: [{ status: 'Hadir' }] }), { tercatat: 1, total: 1, sisa: 0, lengkap: true });
  assert.deepEqual(j.hitungSesi({ murid: [] }), { tercatat: 0, total: 0, sisa: 0, lengkap: false });
  assert.deepEqual(j.hitungSesi(null), { tercatat: 0, total: 0, sisa: 0, lengkap: false });
  assert.deepEqual(j.belumDiabsen({ murid: [{ status: 'Hadir' }, { status: '' }] }).length, 1);
});

test('labelKuota & ringkasKuota: menyajikan sisa kuota sesi per pekan', () => {
  assert.equal(j.labelKuota({ kuota: 3, dipakai: 2 }), '2/3 sesi');
  assert.equal(j.labelKuota({ kuota: 0, dipakai: 9 }), 'tanpa batas');
  assert.equal(j.labelKuota(null), 'tanpa batas');
  assert.match(j.ringkasKuota({ kuota: 2, dipakai: 1, sisa: 1, satuan: 'murid ini' }), /Sisa 1 dari 2 sesi\/pekan/);
  assert.match(j.ringkasKuota({ kuota: 2, dipakai: 2, sisa: 0, penuh: true }), /Kuota penuh: 2 dari 2/);
  assert.match(j.ringkasKuota({ kuota: 0 }), /Belum ada batas kuota/);
  assert.match(j.ringkasKuota({ kuota: 4, dipakai: 1, sisa: 3, menunggu: 2 }), /2 pengajuan menunggu/);
  assert.equal(j.badgeKuota({ kuota: 2, penuh: true }), 'b-err');
  assert.equal(j.badgeKuota({ kuota: 2, sisa: 1 }), 'b-warn');
  assert.equal(j.badgeKuota({ kuota: 2, sisa: 2 }), 'b-ok');
  assert.equal(j.badgeKuota({ kuota: 0 }), 'b-info');
});

test('bolehProsesPermintaanLokal & bolehBatalkan: tombol yang pasti ditolak tidak tampil', () => {
  const admin = { email: 'admin@x', peran: 'Admin' };
  const guru = { email: 'guru@x', peran: 'Guru' };
  const ortu = { email: 'ortu@x', peran: 'Orang Tua' };
  const p = { kelasId: 'K-1', pemohon: 'ortu@x', status: 'Menunggu' };

  assert.equal(j.bolehProsesPermintaanLokal(p, admin, []), true);
  assert.equal(j.bolehProsesPermintaanLokal(p, guru, ['K-1']), true);
  assert.equal(j.bolehProsesPermintaanLokal(p, guru, ['K-2']), false, 'bukan kelasnya');
  assert.equal(j.bolehProsesPermintaanLokal({ ...p, pemohon: 'guru@x' }, guru, ['K-1']), false, 'permintaan sendiri');
  assert.equal(j.bolehProsesPermintaanLokal(p, ortu, ['K-1']), false, 'orang tua tidak memproses');
  assert.equal(j.bolehProsesPermintaanLokal({ ...p, status: 'Disetujui' }, admin, []), false);

  assert.equal(j.bolehBatalkan(p, ortu), true);
  assert.equal(j.bolehBatalkan(p, admin), true);
  assert.equal(j.bolehBatalkan(p, guru), false);
  assert.equal(j.bolehBatalkan({ ...p, status: 'Ditolak' }, ortu), false);
});

test('validasiPermintaan: form pengajuan jadwal dicek seperti di server', () => {
  // Pengajuan yang sah: jam dirapikan dan kolom tak dikenal dibuang.
  const ok = j.validasiPermintaan({ kelasId: 'K-1', hari: 'Senin', jamMulai: '15.00', jamSelesai: '16.30', mapel: ' Matematika ' });
  assert.equal(ok.ok, true);
  assert.equal(ok.bersih.jamMulai, '15:00');
  assert.equal(ok.bersih.jamSelesai, '16:30');
  assert.equal(ok.bersih.mapel, 'Matematika');
  assert.equal(ok.bersih.studentId, '');

  assert.match(j.validasiPermintaan({ kelasId: 'K-1', hari: 'Libur', jamMulai: '15:00' }).pesan, /Hari wajib/);
  assert.match(j.validasiPermintaan({ hari: 'Senin', jamMulai: '15:00' }).pesan, /Kelas wajib/);
  assert.match(j.validasiPermintaan({ kelasId: 'K-1', hari: 'Senin' }).pesan, /Jam mulai wajib/);
  assert.match(j.validasiPermintaan({ kelasId: 'K-1', hari: 'Senin', jamMulai: '15:00', jamSelesai: '25:00' }).pesan, /Jam selesai tidak sah/);
  assert.match(j.validasiPermintaan({ kelasId: 'K-1', hari: 'Senin', jamMulai: '15:00', jamSelesai: 'nanti' }).pesan, /Jam selesai tidak sah/);
  assert.match(j.validasiPermintaan({ kelasId: 'K-1', hari: 'Senin', jamMulai: '15:00', jamSelesai: '15:00' }).pesan, /lebih dari jam mulai/);
  assert.match(j.validasiPermintaan({ kelasId: 'K-1', hari: 'Senin', jamMulai: '15:00', catatan: 'x'.repeat(301) }).pesan, /terlalu panjang/);
  // Jam selesai boleh dikosongkan (durasi menyusul dari admin).
  assert.equal(j.validasiPermintaan({ kelasId: 'K-1', hari: 'Senin', jamMulai: '15:00' }).ok, true);
});

test('ringkasKehadiran: menghitung status dan persen hadir', () => {
  const r = j.ringkasKehadiran([{ status: 'Hadir' }, { status: 'Hadir' }, { status: 'Sakit' }, { status: 'Alpha' }, { status: 'Aneh' }]);
  assert.deepEqual([r.Hadir, r.Sakit, r.Izin, r.Alpha, r.total], [2, 1, 0, 1, 4]);
  assert.equal(r.persen, 50);
  assert.equal(j.ringkasKehadiran([]).persen, 0);
  assert.equal(j.BADGE_ABSENSI.Hadir, 'b-ok');
  assert.equal(j.BADGE_ABSENSI.Alpha, 'b-err');
});
