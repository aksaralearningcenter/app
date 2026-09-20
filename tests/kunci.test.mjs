// ==================== UJI: KUNCI ANTI-KLIK-GANDA ====================
// Menguji docs/src/js/admin/kunci.js — murni + DOM-guarded (tanpa document).
// Jalankan: npm test
import test from 'node:test';
import assert from 'node:assert/strict';

const k = await import('../docs/src/js/admin/kunci.js');

const tombol = () => ({ dataset: {}, disabled: false });

test('kunciTombol: klik kedua ditolak sampai dilepas', () => {
  const b = tombol();
  assert.equal(k.kunciTombol(b), true);
  assert.equal(b.dataset.sibuk, '1');
  assert.equal(b.disabled, true);
  assert.equal(k.kunciTombol(b), false, 'klik ganda diabaikan');
  k.lepasTombol(b);
  assert.equal(b.dataset.sibuk, undefined);
  assert.equal(b.disabled, false);
  assert.equal(k.kunciTombol(b), true, 'bisa diklik lagi setelah selesai');
  k.lepasTombol(b);
});

test('kunciTombol: elemen palsu/tanpa dataset tidak meledak', () => {
  assert.equal(k.kunciTombol(null), true);
  assert.equal(k.kunciTombol({}), true);
  k.lepasTombol(null);
  k.lepasTombol({});
});

test('cobaKunciSimpan: global sekali-jalan, lepas mengembalikan', () => {
  assert.equal(k.cobaKunciSimpan(), true);
  assert.equal(k.cobaKunciSimpan(), false, 'simpan kedua ditolak');
  k.lepasKunciSimpan();
  assert.equal(k.cobaKunciSimpan(), true);
  k.lepasKunciSimpan();
});

test('sekaliTulis: janji ganda jadi satu eksekusi', async () => {
  let jalan = 0;
  const simpan = k.sekaliTulis(async () => {
    jalan++;
    await new Promise(r => setTimeout(r, 20));
    return 'ok';
  });
  const p1 = simpan();
  const p2 = simpan();
  assert.equal(p2, undefined, 'panggilan kedua diabaikan');
  assert.equal(await p1, 'ok');
  assert.equal(jalan, 1);
  const p3 = simpan();
  assert.equal(await p3, 'ok');
  assert.equal(jalan, 2, 'bisa simpan lagi setelah selesai');
});

test('sekaliTulis: fungsi sinkron & lemparan tidak mengunci selamanya', () => {
  const sync = k.sekaliTulis(() => 42);
  assert.equal(sync(), 42);
  assert.equal(sync(), 42, 'sinkron langsung lepas');
  const gagal = k.sekaliTulis(() => { throw new Error('x'); });
  assert.throws(() => gagal(), /x/);
  assert.equal(k.cobaKunciSimpan(), true, 'kunci lepas walau fungsi melempar');
  k.lepasKunciSimpan();
});
