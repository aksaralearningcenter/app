// ==================== ENTRY POINT — LANDING PAGE ====================
// Urutan impor dijaga: modul penyedia jembatan window (pasangStatistikDari,
// pilihDocTab, refreshFlipbook) harus jalan sebelum konten dinamis merender,
// dan chatbot dimuat setelah konten karena membaca window.__lpTerakhir.
import { toggleMenu } from './ui.js';
import './statistik.js';
import './tabs.js';
import './flipbook.js';
import './galeri.js';
import './konten/index.js';
import './chatbot.js';
import { submitRegistration } from './pendaftaran.js';

// Dipakai oleh atribut inline di index.html:
//   <button onclick="toggleMenu()"> dan <form onsubmit="submitRegistration(event)">
window.toggleMenu = toggleMenu;
window.submitRegistration = submitRegistration;
