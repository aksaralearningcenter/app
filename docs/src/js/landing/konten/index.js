// ==================== KONTEN DINAMIS DIKELOLA ADMIN ====================
// Sumber: GET /public/content (REST). Prinsip: apa yang tampil = apa yang
// dikelola admin. Bila admin belum mengisi sebuah seksi, seksi itu
// DISEMBUNYIKAN — tidak ada lagi konten statis bawaan yang tampil.
import { LP_API_URL } from '../config.js';
import { elById } from './util.js';
import { terapkanSetelan, perbaruiNomorWA } from './setelan.js';
import { renderProgram } from './program.js';
import { renderKurikulum } from './kurikulum.js';
import { renderKartu, renderGallery, renderPartners, renderTestimoni, renderFaq } from './info.js';
import { renderPricing } from './pricing.js';
import { renderNews } from './berita.js';
import { renderBooks } from './buku.js';

// Tautan nav ke seksi yang belum diisi admin ikut disembunyikan
// agar tidak mengarah ke halaman kosong.
function perbaruiNav() {
  [{ nav: 'program', id: 'program' }, { nav: 'kurikulum', id: 'kurikulum' },
   { nav: 'harga', id: 'harga' }, { nav: 'buku', id: 'buku' }, { nav: 'berita', id: 'berita' }]
    .forEach(function (x) {
      const seksi = elById(x.id);
      const kosong = !seksi || seksi.classList.contains('is-hidden');
      document.querySelectorAll('[data-nav="' + x.nav + '"]').forEach(function (b) {
        b.classList.toggle('is-hidden', kosong);
      });
    });
}

function terapkan(res) {
  window.__lpTerakhir = res;   // dipakai modul chatbot saat diinisialisasi belakangan
  try { terapkanSetelan(res.settings); } catch (err) { console.warn('Gagal menerapkan pengaturan:', err); }
  try { renderProgram(res.program || []); } catch (err) { console.warn('Gagal render program:', err); }
  try { renderKurikulum(res.kurikulum || []); } catch (err) { console.warn('Gagal render kurikulum:', err); }
  try { renderKartu(res.kartu || []); } catch (err) { console.warn('Gagal render kartu info:', err); }
  try { renderPricing(res.pricing || []); } catch (err) { console.warn('Gagal render harga:', err); }
  try { renderNews(res.news || []); } catch (err) { console.warn('Gagal render berita:', err); }
  try { renderBooks(res.books || []); } catch (err) { console.warn('Gagal render buku:', err); }
  try { renderGallery(res.gallery || []); } catch (err) { console.warn('Gagal render galeri:', err); }
  try { renderPartners(res.partners || []); } catch (err) { console.warn('Gagal render mitra:', err); }
  try { renderTestimoni(res.testimoni || []); } catch (err) { console.warn('Gagal render testimoni:', err); }
  try { renderFaq(res.faq || []); } catch (err) { console.warn('Gagal render FAQ:', err); }
  try { perbaruiNomorWA(); } catch (err) { console.warn('Gagal menyelaraskan nomor WhatsApp:', err); }
  try { perbaruiNav(); } catch (err) { console.warn('Gagal memperbarui navigasi:', err); }
  try { if (window.siapkanChat) window.siapkanChat(res.chat || {}, res.settings || {}); } catch (err) { console.warn('Gagal menyiapkan chatbot:', err); }
}

// Muat konten publik via REST. Tanpa cache sessionStorage lagi: CORS kini
// benar sehingga panggilan langsung murah, dan perubahan admin langsung
// terlihat saat halaman dimuat ulang.
if (LP_API_URL) {
  fetch(LP_API_URL + '/public/content')
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (res) {
      if (res && res.success) terapkan(res);
      else throw new Error((res && res.message) || 'Respon tidak valid');
    })
    .catch(function (err) {
      console.warn('Konten dinamis tidak tersedia (' + (err && err.message) + ') — seksi yang belum diisi admin tetap disembunyikan.');
    });
}
