// ==================== KONFIGURASI VITE ====================
// Frontend statis Aksara: dua entry point (landing + panel admin).
//   npm run dev    → server pengembangan + hot reload
//   npm run build  → hasil siap deploy ke folder dist/
//
// base './' (relatif) supaya hasil build jalan di mana saja: root domain
// (aksaralearningcenter.github.io) maupun URL proyek
// (saepul-alam.github.io/namarepo/) — dengan base '/', asetnya akan 404 di
// alamat proyek karena browser mencarinya di root domain.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const berkas = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  base: './',
  // Situs yang dipublikasikan ada di folder docs/ (dipilih sebagai sumber
  // GitHub Pages). Struktur di dalamnya: docs/index.html = landing,
  // docs/sites/index.html = panel admin, docs/src = CSS & JS.
  root: 'docs',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        landing: berkas('docs/index.html'),
        admin: berkas('docs/sites/index.html'),
        // Halaman ujian siswa (dibuka lewat tautan bersih /ujian/?id=ASM-...).
        ujian: berkas('docs/ujian/index.html')
      }
    }
  },
  server: {
    port: 5173,
    open: false
  }
});
