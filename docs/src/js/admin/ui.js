// ============ UI: HELPER TAMPILAN ============

export const $ = id => document.getElementById(id);

export function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

export const rp = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

// Rangka pemuatan (skeleton) — lebih halus daripada tulisan "Memuat...".
export function skeletonHtml() {
  return '<div class="card"><div class="skel">' +
    '<div class="skel-grid"><div class="skel-block"></div><div class="skel-block"></div><div class="skel-block"></div><div class="skel-block"></div></div>' +
    '<div class="skel-line"></div><div class="skel-line"></div><div class="skel-line short"></div>' +
    '</div></div>';
}

let toastTimer;

export function toast(msg, type) {
  const t = $('toast');
  const jenis = type === 'err' ? 'err' : 'ok';
  const ikon = jenis === 'err' ? 'fa-triangle-exclamation' : 'fa-circle-check';
  t.className = 'toast ' + jenis;
  t.innerHTML =
    '<i class="fa-solid ' + ikon + ' t-ic"></i>' +
    '<div class="t-msg"></div>' +
    '<button class="t-x" type="button" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>';
  t.querySelector('.t-msg').textContent = msg;
  t.querySelector('.t-x').addEventListener('click', hideToast);
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, jenis === 'err' ? 6000 : 4000);
}

function hideToast() {
  const t = $('toast');
  t.classList.remove('on');
  clearTimeout(toastTimer);
}

// Menyiapkan tabel agar enak dibaca di ponsel: tiap sel diberi data-label dari
// header kolomnya, sehingga CSS bisa menampilkan nama kolom di samping nilainya
// saat baris berubah jadi kartu bertumpuk. Dipasang otomatis di sini supaya
// tidak ada satu pun renderer tabel yang perlu diubah.
export function siapkanTabelResponsif(akar) {
  const wadah = akar || document;
  wadah.querySelectorAll('table').forEach(function (tabel) {
    const kepala = Array.prototype.map.call(tabel.querySelectorAll('thead th'), function (th) {
      return (th.textContent || '').trim();
    });
    tabel.classList.add('responsif');
    tabel.querySelectorAll('tbody tr').forEach(function (baris) {
      Array.prototype.forEach.call(baris.children, function (sel, i) {
        if (!sel.hasAttribute('data-label')) sel.setAttribute('data-label', kepala[i] || '');
      });
    });
  });
}
