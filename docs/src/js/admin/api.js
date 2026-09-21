// ============ API HELPER (jembatan REST) ============
// Signature lama dipertahankan: api(fn, ...args) dan post(endpoint, payload).
// Isinya fetch ke REST API (Authorization: Bearer token) — call site di seluruh
// aplikasi tidak perlu diubah. Pemetaan nama → endpoint di API_MAP.
import { API_URL } from './config.js';
import { state, REQ_TIMEOUT, hardLogout } from './state.js';

// Mode ganda Guru/Orang Tua: permintaan data panel anak menandai dirinya
// `sebagai=ortu` supaya server memakai skop Orang Tua (hanya anaknya).
function modeOrtu() {
  const me = state.me || {};
  return me.peran === 'Guru' && !!me.punyaAnak && state.mode === 'Orang Tua';
}
const ortuQuery = (awal) => modeOrtu() ? (awal ? '&sebagai=ortu' : '?sebagai=ortu') : '';

// Bungkus fetch dengan batas waktu agar UI tidak menggantung bila server lambat.
function fetchWithTimeout(url, opsi) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const o = Object.assign({}, opsi || {});
  if (ctrl) o.signal = ctrl.signal;
  const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, REQ_TIMEOUT);
  return fetch(url, o)
    .finally(() => clearTimeout(timer))
    .catch(err => {
      if (err && err.name === 'AbortError') {
        throw new Error('Server tidak merespons dalam ' + Math.round(REQ_TIMEOUT / 1000) + ' detik. Periksa koneksi lalu coba lagi.');
      }
      // Jaringan gagal (offline, DNS, server tak terjangkau). Pesan mentah browser
      // ("Failed to fetch") tidak informatif, jadi diganti kalimat yang jelas.
      console.error('Koneksi gagal:', err);
      throw new Error('Koneksi gagal. Periksa jaringan internet Anda lalu coba lagi.');
    });
}

function authHeaders() {
  return state.token ? { 'Authorization': 'Bearer ' + state.token } : {};
}

function parseRes(r) {
  // Mengubah Response fetch → objek; 401 memicu logout otomatis (needLogin).
  return r.text().then(function (text) {
    var data;
    try { data = text ? JSON.parse(text) : {}; } catch (_parseErr) {
      console.error('Non-JSON response:', text.substring(0, 200));
      throw new Error('Respon server tidak valid. Pastikan URL API benar dan coba lagi.');
    }
    if (r.status === 401 || (data && data.needLogin)) {
      hardLogout();
      throw new Error(data.message || 'Sesi berakhir. Silakan login ulang.');
    }
    if (!r.ok) throw new Error((data && data.message) || ('Server error (HTTP ' + r.status + '). Coba lagi.'));
    if (data && data.success === false) throw new Error(data.message || 'Terjadi kesalahan.');
    return data;
  });
}

function parseResLogin(r) {
  // Khusus login: server membalas HTTP 200 + success:false untuk kredensial salah
  // (lihat server/routes/auth.js) — itu jawaban wajar, bukan kegagalan koneksi.
  // Jadi jangan dilempar: doLogin akan menampilkan pesan server apa adanya.
  // Kegagalan sungguhan (respon rusak / tanpa pesan) tetap dilempar.
  return r.text().then(function (text) {
    var data;
    try { data = text ? JSON.parse(text) : {}; } catch (_parseErr) {
      console.error('Non-JSON response:', text.substring(0, 200));
      throw new Error('Respon server tidak valid. Pastikan URL API benar dan coba lagi.');
    }
    if (data && data.message) return data;
    if (!r.ok) throw new Error('Server error (HTTP ' + r.status + '). Coba lagi.');
    return data;
  });
}

// Pembungkus encodeURIComponent untuk parameter query yang bisa kosong.
const enc = v => encodeURIComponent(v == null ? '' : String(v));

// Pemetaan: nama fungsi lama (fn, args) → REST endpoint baru.
// Argumen dari call site dipetakan sesuai urutannya.
const API_MAP = {
  // --- LMS ---
  getStudents:            { m: 'GET',  p: 'students' },
  getStudent:             { m: 'GET',  p: a => 'students/' + a[0] },
  addStudent:             { m: 'POST', p: 'students', b: a => a[0] },
  updateStudent:          { m: 'PUT',  p: a => 'students/' + a[0], b: a => a[1] },
  deleteStudent:          { m: 'DELETE', p: a => 'students/' + a[0] },
  getClasses:             { m: 'GET',  p: 'classes' },
  addClass:               { m: 'POST', p: 'classes', b: a => a[0] },
  updateClass:            { m: 'PUT',  p: a => 'classes/' + a[0], b: a => a[1] },
  deleteClass:            { m: 'DELETE', p: a => 'classes/' + a[0] },
  getAttendanceToday:     { m: 'GET',  p: 'attendance/today' },
  // Lembar absensi satu tanggal (tanggal lampau = absensi susulan).
  getAttendanceSheet:     { m: 'GET',  p: a => 'attendance/sheet?tanggal=' + enc(a[0]) + '&kelas=' + enc(a[1]) },
  getAttendanceHistory:   { m: 'GET',  p: a => 'attendance/history?dari=' + enc(a[0]) + '&sampai=' + enc(a[1]) +
                                                     '&kelas=' + enc(a[2]) + '&status=' + enc(a[3]) },
  recordAttendance:       { m: 'POST', p: 'attendance', b: a => a[0] },
  // Jadwal belajar (per pekan, per kelas atau per murid).
  getSchedules:           { m: 'GET',  p: 'schedules' },
  // Permintaan jadwal (Guru / Orang Tua) + kuota sesi per pekan.
  getScheduleRequests:      { m: 'GET',  p: () => 'schedule-requests' + ortuQuery(false) },
  addScheduleRequest:       { m: 'POST', p: () => 'schedule-requests' + ortuQuery(false), b: a => a[0] },
  prosesScheduleRequest:    { m: 'POST', p: a => 'schedule-requests/' + enc(a[0]) + '/proses', b: a => ({ aksi: a[1], jawaban: a[2] || '' }) },
  batalkanScheduleRequest:  { m: 'POST', p: a => 'schedule-requests/' + enc(a[0]) + '/batal' },
  getScheduleQuota:         { m: 'GET',  p: a => 'schedule-quota?murid=' + enc(a[0]) + ortuQuery(true) },
  terapkanKuotaPaket:       { m: 'POST', p: 'schedule-quota/terapkan' },
  addSchedule:            { m: 'POST', p: 'schedules', b: a => a[0] },
  updateSchedule:         { m: 'PUT',  p: a => 'schedules/' + enc(a[0]), b: a => a[1] },
  deleteSchedule:         { m: 'DELETE', p: a => 'schedules/' + enc(a[0]) },
  addProgress:            { m: 'POST', p: 'progress', b: a => a[0] },
  getProgressByStudent:   { m: 'GET',  p: a => 'progress/' + a[0] },
  getSavingsAccounts:     { m: 'GET',  p: 'savings/accounts' },
  getSavingsTrend:        { m: 'GET',  p: a => 'savings/trend?days=' + (a[0] || 30) },
  addTransaction:         { m: 'POST', p: 'transactions', b: a => a[0] },
  getAllTransactions:     { m: 'GET',  p: a => 'transactions?limit=' + (a[0] || 200) },
  getTransactionsByStudent: { m: 'GET', p: a => 'transactions/' + a[0] },
  getDashboardData:       { m: 'GET',  p: 'dashboard' },
  getBatchStartupData:    { m: 'GET',  p: 'dashboard/batch' },
  getStatsData:           { m: 'GET',  p: 'stats' },
  getMyChildrenData:      { m: 'GET',  p: () => 'my-children' + ortuQuery(false) },
  // Panel Murid (SMA/mahasiswa/les privat dewasa): data miliknya sendiri.
  getMyStudent:           { m: 'GET',  p: 'my-student' },
  setMyNotifEmail:        { m: 'POST', p: 'my-notif-email', b: a => ({ status: a[0] }) },
  // --- ASESMEN (paket ujian + bank soal) ---
  getAssesmen:            { m: 'GET',  p: 'assessments' },
  getAsesmenDetail:       { m: 'GET',  p: a => 'assessments/' + encodeURIComponent(a[0]) },
  addAssesmen:            { m: 'POST', p: 'assessments', b: a => a[0] },
  updateAssesmen:         { m: 'PUT',  p: a => 'assessments/' + encodeURIComponent(a[0]), b: a => a[1] },
  deleteAssesmen:         { m: 'DELETE', p: a => 'assessments/' + encodeURIComponent(a[0]) },
  addSoal:                { m: 'POST', p: a => 'assessments/' + encodeURIComponent(a[0]) + '/questions', b: a => a[1] },
  // Impor massal: argumen kedua = array soal yang sudah lolos pratinjau.
  bulkSoal:               { m: 'POST', p: a => 'assessments/' + encodeURIComponent(a[0]) + '/questions/bulk', b: a => ({ soal: a[1] }) },
  updateSoal:             { m: 'PUT',  p: a => 'assessments/' + encodeURIComponent(a[0]) + '/questions/' + encodeURIComponent(a[1]), b: a => a[2] },
  deleteSoal:             { m: 'DELETE', p: a => 'assessments/' + encodeURIComponent(a[0]) + '/questions/' + encodeURIComponent(a[1]) },
  reorderSoal:            { m: 'POST', p: a => 'assessments/' + encodeURIComponent(a[0]) + '/reorder', b: a => ({ ids: a[1] }) },
  // Hasil pengerjaan siswa (mode ujian daring).
  getHasilAssesmen:       { m: 'GET',  p: a => 'assessments/' + encodeURIComponent(a[0]) + '/attempts' },
  getDetailHasil:         { m: 'GET',  p: a => 'assessments/attempts/' + encodeURIComponent(a[0]) },
  nilaiEsai:              { m: 'POST', p: a => 'assessments/attempts/' + encodeURIComponent(a[0]) + '/nilai', b: a => a[1] },
  // --- USERS & LOG ---
  getUsers:               { m: 'GET',  p: 'users' },
  addUser:                { m: 'POST', p: 'users', b: a => a[0] },
  updateUser:             { m: 'PUT',  p: a => 'users/' + encodeURIComponent(a[0]), b: a => a[1] },
  deleteUser:             { m: 'DELETE', p: a => 'users/' + encodeURIComponent(a[0]) },
  resetUserPassword:      { m: 'POST', p: 'users/reset-password', b: a => ({ login: a[0] }) },
  // Akun Orang Tua ↔ anak (kakak-adik, termasuk yang emailnya berbeda).
  getUserChildren:        { m: 'GET',  p: 'user-children' },
  tautkanAnak:            { m: 'POST', p: 'user-children/link', b: a => ({ email: a[0], studentId: a[1] }) },
  lepasAnak:              { m: 'POST', p: 'user-children/unlink', b: a => ({ email: a[0], studentId: a[1] }) },
  getActivityLog:         { m: 'GET',  p: a => 'activity-log?limit=' + (a[0] || 200) },
  getLoginHistory:        { m: 'GET',  p: a => 'login-history?limit=' + (a[0] || 100) },
  // --- PENDAFTARAN ---
  getRegistrations:       { m: 'GET',  p: 'registrations' },
  getRegistrationStats:   { m: 'GET',  p: 'registrations/stats' },
  convertRegistrationToStudent: { m: 'POST', p: 'registrations/convert', b: a => ({ id: a[0] }) },
  rejectRegistration:     { m: 'POST', p: 'registrations/reject', b: a => ({ id: a[0] }) },
  // --- KONTEN LANDING (10 entitas, CRUD generik) ---
  getPricingData:  { ent: 'pricing' },   getNews:  { ent: 'news' },
  getBooks:        { ent: 'books' },     getGallery: { ent: 'gallery' },
  getPartners:     { ent: 'partners' },  getTestimoni: { ent: 'testimoni' },
  getFaq:          { ent: 'faq' },       getProgram: { ent: 'program' },
  getKurikulum:    { ent: 'kurikulum' }, getKartu: { ent: 'kartu' },
  addPricing:  { ent: 'pricing', act: 'add' },   addNews:  { ent: 'news', act: 'add' },
  addBook:     { ent: 'books', act: 'add' },     addGallery: { ent: 'gallery', act: 'add' },
  addPartner:  { ent: 'partners', act: 'add' },  addTestimoni: { ent: 'testimoni', act: 'add' },
  addFaq:      { ent: 'faq', act: 'add' },       addProgram: { ent: 'program', act: 'add' },
  addKurikulum: { ent: 'kurikulum', act: 'add' }, addKartu: { ent: 'kartu', act: 'add' },
  updatePricing:  { ent: 'pricing', act: 'update' },   updateNews:  { ent: 'news', act: 'update' },
  updateBook:     { ent: 'books', act: 'update' },     updateGallery: { ent: 'gallery', act: 'update' },
  updatePartner:  { ent: 'partners', act: 'update' },  updateTestimoni: { ent: 'testimoni', act: 'update' },
  updateFaq:      { ent: 'faq', act: 'update' },       updateProgram: { ent: 'program', act: 'update' },
  updateKurikulum: { ent: 'kurikulum', act: 'update' }, updateKartu: { ent: 'kartu', act: 'update' },
  deletePricing:  { ent: 'pricing', act: 'delete' },   deleteNews:  { ent: 'news', act: 'delete' },
  deleteBook:     { ent: 'books', act: 'delete' },     deleteGallery: { ent: 'gallery', act: 'delete' },
  deletePartner:  { ent: 'partners', act: 'delete' },  deleteTestimoni: { ent: 'testimoni', act: 'delete' },
  deleteFaq:      { ent: 'faq', act: 'delete' },       deleteProgram: { ent: 'program', act: 'delete' },
  deleteKurikulum: { ent: 'kurikulum', act: 'delete' }, deleteKartu: { ent: 'kartu', act: 'delete' },
  reorderBooks:     { ent: 'books', act: 'reorder' },     reorderGallery: { ent: 'gallery', act: 'reorder' },
  reorderPartners:  { ent: 'partners', act: 'reorder' },  reorderTestimoni: { ent: 'testimoni', act: 'reorder' },
  reorderFaq:       { ent: 'faq', act: 'reorder' },       reorderProgram: { ent: 'program', act: 'reorder' },
  reorderKurikulum: { ent: 'kurikulum', act: 'reorder' }, reorderKartu: { ent: 'kartu', act: 'reorder' },
  // Penugasan buku khusus ke kelas/murid (Guru/Admin).
  getBookOptions:      { m: 'GET', p: 'content/books/options' },
  assignBook:          { m: 'POST', p: a => 'content/books/assign/' + a[0], b: a => a[1] },
  // --- PENGATURAN & LAIN-LAIN ---
  getSiteSettings:        { m: 'GET', p: 'site-settings' },
  saveSiteSettings:       { m: 'POST', p: 'site-settings', b: a => a[0] },
  getWhatsAppSettings:    { m: 'GET', p: 'whatsapp' },
  saveWhatsAppSettings:   { m: 'POST', p: 'whatsapp', b: a => ({ token: a[0], enabled: a[1] === true || a[1] === 'Ya' }) },
  testWhatsApp:           { m: 'POST', p: 'whatsapp/test', b: a => ({ phone: a[0] }) },
  getChatConfig:          { m: 'GET', p: 'chatbot' },
  saveChatApiKey:         { m: 'POST', p: 'chatbot/key', b: a => a[0] },
  saveChatModel:          { m: 'POST', p: 'chatbot/model', b: a => a[0] },
  hapusChatApiKey:        { m: 'DELETE', p: 'chatbot/key' },
  // Endpoint publik landing (dipakai tombol Tes Balasan di panel admin).
  publicChat:             { m: 'POST', p: 'public/chat', b: a => a[0] },
  getReportSettings:      { m: 'GET', p: 'site-settings' },
  saveReportSettings:     { m: 'POST', p: 'site-settings', b: a => ({ nilai: { laporan_email_penerima: a[0] } }) },
  downloadReport:         { m: 'GET', p: a => 'reports/' + a[0] + (a[1] ? ('/' + a[1]) : '') },
  triggerTestReport:      { m: 'POST', p: 'reports/test' },
  triggerInstallMonthly:  { m: 'POST', p: 'site-settings', b: () => ({ nilai: { laporan_cron_aktif: 'Ya' } }) },
  triggerRemoveMonthly:   { m: 'POST', p: 'site-settings', b: () => ({ nilai: { laporan_cron_aktif: 'Tidak' } }) },
  uploadImage:            { m: 'POST', p: 'upload/image', b: a => a[0] },
  uploadDoc:              { m: 'POST', p: 'upload/doc', b: a => a[0] },
  uploadAudio:            { m: 'POST', p: 'upload/audio', b: a => a[0] },
  requestUploadTicket:    { m: 'POST', p: 'upload/ticket', b: a => a[0] },
  confirmUploadTicket:    { m: 'POST', p: 'upload/confirm', b: a => a[0] },
  getMaintenanceInfo:     { m: 'GET', p: 'maintenance' },
  seedSemuaData:          { m: 'POST', p: 'maintenance/seed-semua' },
  unseedKontenLanding:    { m: 'POST', p: 'maintenance/unseed-konten', b: a => a[0] },
  unseedDataLms:          { m: 'POST', p: 'maintenance/unseed-lms', b: a => a[0] },
  unseedSemuaData:        { m: 'POST', p: 'maintenance/unseed-semua', b: a => a[0] }
};

export async function api(fn) {
  const args = Array.prototype.slice.call(arguments, 1);
  const map = API_MAP[fn];
  if (!map) throw new Error('Fungsi API tidak dikenal: ' + fn);
  let path, body = undefined, method;
  if (map.ent) {
    // Endpoint konten generik: /content/<ent>[/<id>] (dengan aksi add/update/delete/reorder)
    const ent = map.ent;
    const act = map.act || 'list';
    method = act === 'list' ? 'GET' : (act === 'update' || act === 'add') ? (act === 'update' ? 'PUT' : 'POST') : (act === 'delete' ? 'DELETE' : 'POST');
    if (act === 'list') path = 'content/' + ent;
    else if (act === 'add') { path = 'content/' + ent; body = args[0]; }
    else if (act === 'update') { path = 'content/' + ent + '/' + encodeURIComponent(args[0]); body = args[1]; }
    else if (act === 'delete') { path = 'content/' + ent + '/' + encodeURIComponent(args[0]); }
    else if (act === 'reorder') { path = 'content/' + ent + '/reorder'; body = { ids: args[0] }; }
  } else {
    method = map.m;
    path = typeof map.p === 'function' ? map.p(args) : map.p;
    if (map.b) body = map.b(args);
  }
  const r = await fetchWithTimeout(API_URL + '/' + path, {
    method: method,
    headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  return parseRes(r);
}

export async function post(endpoint, payload) {
  // Endpoint auth khusus: login/forgot/logout tanpa token; me/logout bawa token.
  let r;
  if (endpoint === 'login') {
    r = await fetchWithTimeout(API_URL + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    return parseResLogin(r);
  } else if (endpoint === 'forgot-password') {
    r = await fetchWithTimeout(API_URL + '/auth/forgot-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
  } else if (endpoint === 'change-password') {
    r = await fetchWithTimeout(API_URL + '/auth/change-password', {
      method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify(payload || {})
    });
  } else if (endpoint === 'me') {
    r = await fetchWithTimeout(API_URL + '/auth/me', { method: 'GET', headers: authHeaders() });
  } else if (endpoint === 'logout') {
    r = await fetchWithTimeout(API_URL + '/auth/logout', { method: 'POST', headers: authHeaders() });
  } else if (endpoint === 'call') {
    // Jalur lama (batch startup) — dipetakan manual.
    const fn = payload && payload.fn;
    if (fn === 'getBatchStartupData') {
      r = await fetchWithTimeout(API_URL + '/dashboard/batch', { method: 'GET', headers: authHeaders() });
    } else {
      throw new Error('Panggilan "call" tidak didukung: ' + fn);
    }
  } else {
    throw new Error('Endpoint tidak dikenal: ' + endpoint);
  }
  return parseRes(r);
}
