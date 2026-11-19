# BLOCKORA - Minimalist Tactile Puzzle Game

> Place. Match. Clear. Repeat.

Game puzzle balok 10 × 10 offline berbasis Vite + Vanilla JS + Phaser 3 + PWA (Workbox), dirancang dengan filosofi desain **Luminous Tactile Minimal** dari Google Stitch.

---

## Fitur Utama

- **100% Offline & Mandiri**: Seluruh aset (font Plus Jakarta Sans, audio sintesis Web Audio API, ikon SVG/PNG) tersimpan lokal tanpa dependensi CDN eksternal.
- **PWA (Progressive Web App)**: Service Worker otomatis melakukan precache seluruh aset aplikasi. Siap dipasang di Android, iOS (Safari), dan Desktop.
- **Tiga Mode Permainan**: Classic Mode, Time Challenge (120 detik), dan Daily Challenge (puzzle harian sinkron dengan PRNG deterministik).
- **Audio Sintetis & Haptik**: Web Audio API sintesis prosedural (tanpa file audio eksternal) dan Web Vibration API dengan preferensi motion control (`prefers-reduced-motion`).
- **Penyimpanan Lokal Ganda**: LocalStorage untuk pengaturan dan best score sinkron; IndexedDB untuk riwayat komprehensif pertandingan dan analitik statistik.

---

## Struktur Direktori

- `public/`: Aset statis offline (font Plus Jakarta Sans WOFF2, ikon PWA 192/512/maskable, favicon).
- `src/`:
  - `style.css`: Token desain CSS (Luminous Tactile Minimal), safe-area insets, font `@font-face`, dan styling UI.
  - `main.js`: Titik masuk aplikasi, manajemen transisi layar, dan listener tombol back sistem.
  - `game/`: Modul Phaser 3 (scenes, BoardSystem, BlockSystem, ClearSystem, ScoreSystem, TimerSystem, DragSystem).
  - `audio/`: `AudioManager.js` (sintesis audio prosedural oscillator Web Audio).
  - `haptics/`: `HapticManager.js` (umpan balik getaran taktil).
  - `storage/`: `StorageManager.js` (LocalStorage) & `StatisticsManager.js` (IndexedDB).
  - `ui/`: Komponen antarmuka HTML/CSS modular (MenuUI, DailyUI, ResultUI, SettingsUI, StatisticsUI, LeaderboardUI).
  - `utils/`: `PWAManager.js` (Service Worker lifecycle, prompt install PWA, deteksi standalone).
- `design/`: Dokumen spesifikasi fungsional dan rancangan game.
- `tests/`: Automated unit tests (Node.js test runner bawaan `node:test`).

---

## Menjalankan Aplikasi

### 1. Server Pengembangan (Development)
```bash
npm install
npm run dev
```
Buka di browser: `http://localhost:5173/`.  
*Catatan: Pada mode dev, Service Worker sengaja dinonaktifkan (`devOptions: { enabled: false }`) agar tidak ada caching yang mengganggu perubahan kode aktif.*

### 2. Menjalankan Unit Test
```bash
npm test
```
Menjalankan seluruh 53 unit test (Board, Clear, Score, Timer, PRNG, Daily Streak, Stats Aggregator, Storage).

### 3. Build & Preview PWA Lokal
Untuk menguji instalasi PWA dan Service Worker precache secara lokal:
```bash
npm run build
npm run preview
```
Buka tautan lokal yang ditampilkan Vite (biasanya `http://localhost:4173/`).
- Buka DevTools (`F12`) -> Tab **Application**:
  - **Manifest**: Verifikasi identitas aplikasi, warna latar, dan daftar ikon.
  - **Service Workers**: Verifikasi `sw.js` berstatus *Activated and is running*.
  - **Storage**: Centang opsi *Offline*, lalu segarkan halaman (`F5`). Game tetap dapat dimainkan 100% tanpa jaringan.

> **PENTING UNTUK PENGUJIAN DI SMARTPHONE:**  
> Standar keamanan browser membatasi instalasi PWA dan aktivasi Service Worker hanya pada **origin aman (HTTPS)** atau **localhost**.  
> Jika Anda membuka alamat IP lokal LAN (misalnya `http://192.168.x.x:4173`) langsung di HP tanpa HTTPS, browser akan memblokir pendaftaran Service Worker. Uji di HP setelah aplikasi di-deploy ke Vercel (HTTPS aktif otomatis) atau gunakan tunnel HTTPS lokal (seperti Cloudflare Tunnel atau ngrok).

---
