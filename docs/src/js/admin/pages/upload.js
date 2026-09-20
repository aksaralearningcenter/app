// ============ UNGGAH BERKAS KE SUPABASE STORAGE ============
// Kolom unggah gambar/PDF untuk modal konten: validasi, pratinjau, seret-lepas.
// Jalur utama: minta tiket (signed URL) ke server → PUT file LANGSUNG ke
// Supabase dari browser. File besar (sampai 10 MB) tidak melewati server API,
// sehingga tidak kena batas body ±4,5 MB Vercel.
// Jalur cadangan: base64 lewat server (uploadImage/uploadDoc) untuk file kecil
// bila tiket gagal diterbitkan (mis. versi backend lama).
import { $, esc, toast } from '../ui.js';
import { api } from '../api.js';


  // ============ UNGGAH BERKAS ============
  // Admin tidak perlu menempel URL manual: pilih berkas → diunggah ke bucket
  // "konten" di Supabase → kolom URL terisi otomatis.
  // Batas 10 MB untuk semua jenis (gambar & dokumen) — selaras dengan backend.
  const MAX_UNGGAH_MB = 10;

  const JENIS_BERKAS = {
    gambar: {
      jenis: 'gambar', fn: 'uploadImage',
      uji: /^image\//,
      ekstensi: /\.(jpe?g|png|gif|webp|avif|svg)$/i,
      tolak: 'Hanya berkas gambar yang bisa diunggah.',
      batas: function () { return 'Ukuran berkas maksimal ' + MAX_UNGGAH_MB + ' MB.'; },
      tombol: '⬆️ Unggah', label: 'Gambar', pratinjau: function (id) { pratinjauGambar(id); }
    },
    dokumen: {
      jenis: 'dokumen', fn: 'uploadDoc',
      accept: 'application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx',
      // MIME resmi dokumen. Sebagian browser mengirim application/octet-stream
      // untuk berkas Word/Excel, jadi ekstensinya juga diterima (aturan.ekstensi).
      uji: /^(application\/pdf|application\/msword|application\/vnd\.(ms-excel|ms-powerpoint|openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)))$/,
      ekstensi: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i,
      tolak: 'Hanya berkas PDF, Word, Excel, atau PowerPoint yang bisa diunggah.',
      batas: function () { return 'Ukuran berkas maksimal ' + MAX_UNGGAH_MB + ' MB.'; },
      tombol: '⬆️ Unggah Berkas', label: 'Dokumen', pratinjau: function (id, nama) { pratinjauDokumen(id, nama); }
    },
    audio: {
      jenis: 'audio', fn: 'uploadAudio',
      accept: 'audio/mpeg,audio/mp4,audio/wav,audio/ogg,.mp3,.m4a,.wav,.ogg,.webm',
      uji: /^audio\//,
      ekstensi: /\.(mp3|m4a|wav|ogg|webm)$/i,
      tolak: 'Hanya berkas audio (MP3/M4A/WAV/OGG) yang bisa diunggah.',
      batas: function () { return 'Ukuran berkas maksimal ' + MAX_UNGGAH_MB + ' MB.'; },
      tombol: '⬆️ Unggah Audio', label: 'Audio', pratinjau: function (id, nama) { pratinjauAudio(id, nama); }
    }
  };

  function uploadField(label, id, value, placeholder, hint) {
    return '<div class="fg" data-unggah="gambar"><label>' + label + '</label>' +
      '<div class="up-row">' +
      '<input id="' + id + '" value="' + esc(value || '') + '" placeholder="' + (placeholder || 'https://... atau unggah berkas') + '" oninput="pratinjauGambar(\'' + id + '\')">' +
      '<button class="btn btn-o btn-sm" type="button" onclick="pilihBerkas(\'' + id + '\')" title="Unggah dari perangkat">' + JENIS_BERKAS.gambar.tombol + '</button>' +
      '</div>' +
      '<input type="file" id="' + id + '-file" accept="image/*" class="up-file" onchange="unggahBerkas(this, \'' + id + '\')">' +
      '<div class="up-preview" id="' + id + '-prev"></div>' +
      '<p class="up-hint">' + (hint ? hint + ' ' : '') +
      'Otomatis tersimpan ke Supabase Storage (bucket <b>konten</b>), maksimal ' + MAX_UNGGAH_MB + ' MB — bisa juga seret berkas ke area pratinjau.</p></div>';
  }

  /**
   * Kolom berkas (PDF/Word/Excel/PowerPoint) untuk kolom "URL Link / Berkas"
   * pada Buku. `nama` = nama berkas asli (mis. modul-aksara.xlsx) yang disimpan
   * di input tersembunyi untuk mengenali jenis berkasnya di daftar.
   */
  function dokumenField(label, id, value, placeholder, hint, nama) {
    return '<div class="fg" data-unggah="dokumen"><label>' + label + '</label>' +
      '<div class="up-row">' +
      '<input id="' + id + '" value="' + esc(value || '') + '" placeholder="' + (placeholder || 'https://... atau unggah berkas') + '" oninput="pratinjauDokumen(\'' + id + '\')">' +
      '<button class="btn btn-o btn-sm" type="button" onclick="pilihBerkas(\'' + id + '\')" title="Unggah berkas dari perangkat">' + JENIS_BERKAS.dokumen.tombol + '</button>' +
      '</div>' +
      '<input type="file" id="' + id + '-file" accept="' + JENIS_BERKAS.dokumen.accept + '" class="up-file" onchange="unggahBerkas(this, \'' + id + '\', null, \'dokumen\')">' +
      '<input type="hidden" id="' + id + '-nama" value="' + esc(nama || '') + '">' +
      '<div class="up-preview" id="' + id + '-prev"></div>' +
      '<p class="up-hint">' + (hint ? hint + ' ' : '') +
      'Berkas tersimpan ke Supabase Storage (bucket <b>konten</b>), maksimal ' + MAX_UNGGAH_MB + ' MB — bisa juga seret berkas ke area pratinjau.</p></div>';
  }

  function pilihBerkas(id) { const f = $(id + '-file'); if (f) f.click(); }

  /**
   * Kolom berkas audio untuk soal listening: input URL + tombol unggah + player
   * pratinjau. Memakai jalur unggah yang sama (tiket / base64) dengan jenis audio.
   */
  function audioField(label, id, value, placeholder, hint) {
    return '<div class="fg" data-unggah="audio"><label>' + label + '</label>' +
      '<div class="up-row">' +
      '<input id="' + id + '" value="' + esc(value || '') + '" placeholder="' + (placeholder || 'https://... atau unggah berkas audio') + '" oninput="pratinjauAudio(\'' + id + '\')">' +
      '<button class="btn btn-o btn-sm" type="button" onclick="pilihBerkas(\'' + id + '\')" title="Unggah berkas audio dari perangkat">' + JENIS_BERKAS.audio.tombol + '</button>' +
      '</div>' +
      '<input type="file" id="' + id + '-file" accept="' + JENIS_BERKAS.audio.accept + '" class="up-file" onchange="unggahBerkas(this, \'' + id + '\', null, \'audio\')">' +
      '<div class="up-preview" id="' + id + '-prev"></div>' +
      '<p class="up-hint">' + (hint ? hint + ' ' : '') +
      'Berkas audio tersimpan ke Supabase Storage (bucket <b>konten</b>), maksimal ' + MAX_UNGGAH_MB + ' MB — bisa juga seret berkas ke area pratinjau.</p></div>';
  }

  // Seret & lepas berkas gambar ke area pratinjau — memakai jalur unggah yang sama
  // (jadi validasi ukuran/jenis dan keadaan "sedang mengunggah" tetap berlaku).
  function zonaDrop_(target) {
    return target && target.closest ? target.closest('.up-preview') : null;
  }
  document.addEventListener('dragover', function (e) {
    const zona = zonaDrop_(e.target);
    if (!zona) return;
    e.preventDefault();
    zona.classList.add('over');
  });
  document.addEventListener('dragleave', function (e) {
    const zona = zonaDrop_(e.target);
    if (zona) zona.classList.remove('over');
  });
  document.addEventListener('drop', function (e) {
    const zona = zonaDrop_(e.target);
    if (!zona) return;
    e.preventDefault();
    zona.classList.remove('over');
    const targetId = String(zona.id).replace(/-prev$/, '');
    const asli = $(targetId + '-file');
    if (!asli) return;
    // Jenis mengikuti kolomnya (gambar vs PDF) agar validasi & pratinjaunya tepat.
    const jenis = zona.closest('[data-unggah]') ? zona.closest('[data-unggah]').dataset.unggah : 'gambar';
    unggahBerkas({ files: e.dataTransfer.files, value: '' }, targetId, asli, jenis);
  });

  function pratinjauGambar(id) {
    const prev = $(id + '-prev'), inp = $(id);
    if (!prev || !inp) return;
    const url = inp.value.trim();
    prev.innerHTML = url ? '<img src="' + esc(url) + '" alt="Pratinjau gambar">' : '';
  }

  // Ikon & warna mengikuti jenis berkasnya agar mudah dikenali di modal.
  const IKON_DOKUMEN = {
    pdf: ['fa-file-pdf', '#C0392B'], doc: ['fa-file-word', '#2B579A'], docx: ['fa-file-word', '#2B579A'],
    xls: ['fa-file-excel', '#1E7145'], xlsx: ['fa-file-excel', '#1E7145'],
    ppt: ['fa-file-powerpoint', '#D24726'], pptx: ['fa-file-powerpoint', '#D24726']
  };

  function ikonDokumen(nama) {
    const m = /\.([A-Za-z0-9]{2,4})$/.exec(String(nama || '').trim());
    return IKON_DOKUMEN[m ? m[1].toLowerCase() : ''] || ['fa-file-lines', 'var(--gold)'];
  }

  // Label & warna badge jenis berkas pada kolom Link daftar Buku.
  const LABEL_DOKUMEN = {
    pdf: 'PDF', doc: 'Word', docx: 'Word', xls: 'Excel', xlsx: 'Excel', ppt: 'PowerPoint', pptx: 'PowerPoint'
  };
  const KELAS_DOKUMEN = {
    pdf: 'b-pdf', doc: 'b-word', docx: 'b-word', xls: 'b-xls', xlsx: 'b-xls', ppt: 'b-ppt', pptx: 'b-ppt'
  };

  /**
   * Ekstensi berkas: dari nama hasil unggahan (paling akurat), atau dari nama
   * berkas pada URL yang ditempel admin (mis. ".../modul-aksara.pdf").
   */
  function ekstensiBerkas(nama, url) {
    const mn = /\.([A-Za-z0-9]{2,4})(?:$|[?#])/.exec(String(nama || '').trim());
    if (mn) return mn[1].toLowerCase();
    const mu = /\/([^\/?#]+)\.([A-Za-z0-9]{2,4})(?:$|[?#])/.exec(String(url || ''));
    return mu ? mu[2].toLowerCase() : '';
  }

  /** Kolom Link pada daftar Buku: badge jenis berkas + nama berkasnya. */
  function badgeBerkas(b) {
    const link = String(b.link || '').trim();
    if (!link) return '<span class="badge b-warn" title="Belum ada berkas atau tautan">Belum ada</span>';
    const nama = String(b.berkas || '').trim();
    const ext = ekstensiBerkas(nama, link);
    const ikon = ikonDokumen(ext ? 'berkas.' + ext : nama);
    return '<a class="dok-link" href="' + esc(link) + '" target="_blank" rel="noopener" title="' + esc(nama || link) + '">' +
      '<span class="badge ' + (KELAS_DOKUMEN[ext] || 'b-info') + '">' +
      '<i class="fa-solid ' + ikon[0] + '"></i> ' + esc(LABEL_DOKUMEN[ext] || 'Tautan') + '</span>' +
      (nama ? '<span class="dok-nama">' + esc(nama) + '</span>' : '') + '</a>';
  }

  /**
   * Nama berkas asli disimpan di input tersembunyi `<id>-nama`. URL Storage tidak
   * selalu menyimpan ekstensi, jadi tanpa ini jenis berkasnya tidak bisa
   * dikenali lagi saat daftar Buku dirender.
   */
  function simpanNamaBerkas_(id, url, nama) {
    const simpan = $(id + '-nama');
    if (!simpan) return '';
    if (nama) { simpan.value = nama; return nama; }
    if (!url) { simpan.value = ''; return ''; }
    const extUrl = ekstensiBerkas('', url);
    // Tebak dari URL saat kolom nama masih kosong, atau saat admin menempel
    // tautan dengan jenis berbeda dari berkas yang diunggah sebelumnya.
    if (!simpan.value || (extUrl && extUrl !== ekstensiBerkas(simpan.value, ''))) {
      const m = /\/([^\/?#]+\.(?:pdf|docx?|xlsx?|pptx?))(?:$|[?#])/i.exec(url);
      simpan.value = m ? m[1] : '';
    }
    return simpan.value;
  }

  function pratinjauDokumen(id, nama) {
    const prev = $(id + '-prev'), inp = $(id);
    if (!prev || !inp) return;
    const url = inp.value.trim();
    const pakai = simpanNamaBerkas_(id, url, nama);
    if (!url) { prev.innerHTML = ''; return; }
    const ikon = ikonDokumen(pakai || url);
    prev.innerHTML = '<a class="up-doc" href="' + esc(url) + '" target="_blank" rel="noopener">' +
      '<i class="fa-solid ' + ikon[0] + '" style="color:' + ikon[1] + '"></i> ' + esc(pakai || 'Buka berkas') + '</a>';
  }

  // Pratinjau berkas audio: pemutar langsung di modal (audio soal listening).
  function pratinjauAudio(id, nama) {
    const prev = $(id + '-prev'), inp = $(id);
    if (!prev || !inp) return;
    const url = inp.value.trim();
    if (!url) { prev.innerHTML = ''; return; }
    prev.innerHTML = '<div class="up-audio"><audio controls preload="none" src="' + esc(url) + '"></audio>' +
      (nama ? '<p class="up-hint">' + esc(nama) + '</p>' : '') +
      '<p class="up-hint">🔊 Putar untuk memastikan audio terdengar benar.</p></div>';
  }

  // Selama berkas diunggah, tombol Simpan dinonaktifkan supaya form tidak
  // tersimpan dengan URL gambar yang masih kosong (pengalaman di ponsel).
  function setUnggahSibuk(sibuk) {
    const foot = $('m-foot');
    if (foot) {
      Array.prototype.forEach.call(foot.querySelectorAll('button'), function (b) {
        if (sibuk) { if (!b.disabled) b.dataset.sibuk = '1'; b.disabled = true; }
        else if (b.dataset.sibuk === '1') { b.disabled = false; delete b.dataset.sibuk; }
      });
    }
    document.body.classList.toggle('uploading', !!sibuk);
  }

  // ---------- Jalur 1: signed upload URL (file tidak melewati server API) ----------
  async function unggahLangsung(file, aturan) {
    const tiket = await api('requestUploadTicket', {
      jenis: aturan.jenis, nama: file.name, ukuran: file.size, mime: file.type
    });
    if (!tiket || !tiket.success) throw new Error((tiket && tiket.message) || 'Gagal menyiapkan unggahan.');

    // PUT langsung ke Supabase Storage — token ada di query URL.
    const put = await fetch(tiket.url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    });
    if (!put.ok) {
      let pesan = 'Storage menolak unggahan (HTTP ' + put.status + ').';
      try { const t = await put.text(); if (t) pesan += ' ' + t.slice(0, 140); } catch (_e) { /* abaikan */ }
      throw new Error(pesan);
    }
    // Beri tahu server (log aktivitas saja — tidak menggagalkan unggahan).
    try { await api('confirmUploadTicket', { ok: true, path: tiket.path, nama: file.name }); } catch (_e) { /* abaikan */ }
    return { url: tiket.url.split('?')[0], path: tiket.path };
  }

  // ---------- Jalur 2 (fallback): base64 lewat server API ----------
  async function unggahViaServer(file, aturan) {
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('Berkas gagal dibaca.'));
      r.readAsDataURL(file);
    });
    const res = await api(aturan.fn, { nama: file.name, dataUrl: dataUrl });
    if (!res || !res.success) throw new Error((res && res.message) || 'Gagal mengunggah.');
    return { url: res.url, path: res.path };
  }

  async function unggahBerkas(input, targetId, elemenAsli, jenis) {
    const aturan = JENIS_BERKAS[jenis] || JENIS_BERKAS.gambar;
    const file = input.files && input.files[0];
    input.value = ''; // agar berkas yang sama bisa dipilih lagi
    if (!file) return;
    const namaSah = aturan.ekstensi ? aturan.ekstensi.test(file.name || '') : false;
    if (!aturan.uji.test(file.type) && !namaSah) { toast(aturan.tolak, 'err'); return; }
    if (file.size > MAX_UNGGAH_MB * 1024 * 1024) { toast(aturan.batas(), 'err'); return; }

    // Tombol milik kolom unggah ini sendiri (bukan kolom lain di modal yang sama).
    // `elemenAsli` diisi saat berkas datang dari seret-lepas (DataTransfer tidak
    // bisa ditugaskan ke input.files di semua browser).
    const sumber = elemenAsli || input;
    const row = sumber.previousElementSibling && sumber.previousElementSibling.classList &&
      sumber.previousElementSibling.classList.contains('up-row') ? sumber.previousElementSibling : null;
    const btn = row ? row.querySelector('.btn') : document.querySelector('.up-row .btn');
    const labelAsal = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Mengunggah…'; }
    const prev = $(targetId + '-prev');
    const persen = Math.max(1, Math.round(file.size / (1024 * 1024)));
    if (prev) prev.innerHTML = '<p class="up-hint">⏳ Mengunggah ' + esc(file.name) + ' (' + persen + ' MB)…</p>';
    setUnggahSibuk(true);
    toast('Mengunggah ' + file.name + ' …', 'ok');
    let sukses = false;

    try {
      let hasil;
      try {
        hasil = await unggahLangsung(file, aturan);
      } catch (tiketGagal) {
        // Tiket gagal → coba jalur lama. File >±3,4 MB pasti ditolak Vercel
        // (batas body), jadi jangan buang waktu untuk yang besar.
        if (file.size > 3.4 * 1024 * 1024) throw tiketGagal;
        console.warn('Unggah langsung gagal, memakai jalur server:', tiketGagal);
        hasil = await unggahViaServer(file, aturan);
      }

      const inp = $(targetId);
      if (inp) inp.value = hasil.url;
      // Nama berkas asli (kolom berkas) → badge jenis berkas tetap akurat.
      const inpNama = $(targetId + '-nama');
      if (inpNama) inpNama.value = file.name;
      sukses = true;
      // Nama berkas dipakai sebagai label (mis. "modul-aksara.pdf") pada kolom PDF.
      aturan.pratinjau(targetId, file.name);
      toast(aturan.label + ' terunggah — tautan sudah diisi otomatis.', 'ok');
    } catch (ex) {
      toast(ex.message, 'err');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = labelAsal; }
      setUnggahSibuk(false);
      // Hanya bersihkan pesan "Mengunggah…" saat gagal — kalau sukses, pratinjau
      // hasil unggahan (termasuk nama berkas) tidak boleh ditimpa.
      if (!sukses) aturan.pratinjau(targetId);
    }
  }

  export { uploadField, dokumenField, audioField, badgeBerkas, pilihBerkas, pratinjauGambar,
    pratinjauDokumen, pratinjauAudio, unggahBerkas };
