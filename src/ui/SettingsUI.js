import { StorageManager } from '../storage/StorageManager.js';
import { StatisticsManager } from '../storage/StatisticsManager.js';
import { audioManager } from '../audio/AudioManager.js';
import { HapticManager } from '../utils/HapticManager.js';
import { MotionPrefs } from '../utils/MotionPrefs.js';
import { bindHeaderNav } from './HeaderNav.js';

/**
 * SettingsUI - Layar Pengaturan & Preferensi Sistem BLOCKORA
 * Markup disalin NYARIS VERBATIM dari design/stitch/settings.html
 * dengan pengikatan data nyata ke AudioManager, HapticManager, MotionPrefs, dan StorageManager.
 */
export class SettingsUI {
  constructor({ onBack, onResetComplete }) {
    this.onBack = onBack;
    this.onResetComplete = onResetComplete;
    this.container = null;
    this._saveTimeout = null;
  }

  async show(targetElement) {
    this.container = targetElement;
    this.container.classList.add('active');
    await this.render();
  }

  hide() {
    if (this.container) {
      this.container.classList.remove('active');
      this.container.innerHTML = '';
    }
  }

  async render() {
    if (!this.container) return;

    const settings = StorageManager.getSettings();
    const hapticMode = HapticManager.getMode();
    const hasVibration = HapticManager.isSupported();
    const isMotionReduced = MotionPrefs.isReduced;
    const isMuted = audioManager.muted;

    // Skor terbaik lintas mode
    const bestClassic = StorageManager.getBestScore('classic');
    const bestTime = StorageManager.getBestScore('time');
    const bestDaily = StorageManager.getBestScore('daily');
    const maxBest = Math.max(bestClassic, bestTime, bestDaily);
    const bestDisplay = maxBest > 0 ? maxBest.toLocaleString('id-ID') : 'Belum ada';

    // Hitung perkiraan penyimpanan nyata
    let storageDetails = 'IndexedDB: 0 KB (0 Sesi)';
    try {
      const games = (await StatisticsManager.getAllGames()) || [];
      const sessionCount = games.length;
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        const kb = (est.usage || 0) / 1024;
        const sizeStr = kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${Math.round(kb)} KB`;
        storageDetails = `IndexedDB: ${sizeStr} (${sessionCount} Sesi)`;
      } else {
        storageDetails = `IndexedDB + LocalStorage (${sessionCount} Sesi)`;
      }
    } catch (_) {
      storageDetails = 'IndexedDB + LocalStorage (Lokal)';
    }

    this.container.innerHTML = `
<!-- Ambient Background Visual Clusters -->
<div class="fixed inset-0 pointer-events-none -z-10 overflow-hidden"><div class="absolute -top-12 -left-12 w-64 h-64 rounded-xl bg-surface-container-high/40 blur-2xl transform -rotate-12"></div><div class="absolute top-1/3 -right-20 w-80 h-80 rounded-xl bg-surface-variant/30 blur-3xl transform rotate-45"></div><div class="absolute -bottom-16 left-1/4 w-72 h-72 rounded-xl bg-surface-container-low/60 blur-2xl transform rotate-6"></div></div>

<!-- Header -->
<header class="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div class="h-16 max-w-7xl mx-auto px-margin flex items-center justify-between gap-gutter"><div class="flex items-center gap-space-md shrink-0"><img alt="BLOCKORA Logo" class="h-8 w-auto object-contain" src="/assets/images/blockora-emblem.png"><span class="font-headline-sm text-headline-sm tracking-tight text-on-surface uppercase">BLOCKORA</span></div><nav class="hidden lg:flex items-center gap-space-xs p-space-xs bg-surface-container-low/70 rounded-full" data-active-classes="bg-surface-container-high text-on-surface font-label-lg text-label-lg rounded-full"><a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="play" data-action="back" href="#">Play</a><a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="modes" data-action="back" href="#">Modes</a><a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="daily" data-action="back" href="#">Daily Challenge</a><a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="leaderboard" data-action="back" href="#">Leaderboard</a><a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors" data-path="statistics" data-action="back" href="#">Statistics</a><a class="px-space-md py-space-xs rounded-full font-label-lg text-label-lg bg-surface-container-high text-on-surface transition-colors" data-path="settings" href="#">Settings</a></nav><div class="flex items-center gap-space-sm shrink-0"><div class="hidden sm:flex items-center gap-space-xs px-space-md py-space-xs bg-surface-container-lowest rounded-full shadow-[0_2px_6px_rgba(15,23,42,0.04)]"><span class="material-symbols-outlined text-tertiary text-[18px]">trophy</span><span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Best</span><span class="font-label-md text-label-md text-on-surface" data-bind="header-best">${bestDisplay}</span></div><button class="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-95" data-action="toggle-sound-master" type="button" aria-label="Toggle Sound"><span class="material-symbols-outlined text-[20px]" data-bind="sound-icon">${isMuted ? 'volume_off' : 'volume_up'}</span></button><button class="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-95" data-action="back" type="button" aria-label="Audio & Settings"><span class="material-symbols-outlined text-[20px]">music_note</span></button><div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center"><span class="material-symbols-outlined text-on-primary text-[18px]">person</span></div></div></div></header>

<!-- Main Container -->
<main class="w-full pt-16 bg-surface"><div class="flex flex-col w-full">
<div class="w-full mx-auto px-margin py-space-lg flex flex-col gap-space-lg max-w-3xl">

<!-- Top Action / Context Row -->
<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pt-space-xs">
<a class="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-lowest hover:bg-surface-container transition-all text-on-surface font-label-md text-label-md shadow-sm active:scale-95 group w-fit" data-action="back" href="#">
<span class="material-symbols-outlined text-[18px] text-primary group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
<span>Kembali ke Menu Utama</span>
</a>
<!-- Status Auto-Save Chip -->
<div class="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-tertiary-container/10 text-tertiary font-label-md text-label-md w-fit transition-opacity duration-300 opacity-90" id="status-save-chip">
<span class="material-symbols-outlined text-[16px] text-tertiary" style="font-variation-settings: 'FILL' 1;">cloud_done</span>
<span id="status-save-text">Pengaturan Tersimpan</span>
<span class="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" id="status-pulse-dot"></span>
</div>
</div>

<!-- Editorial Header Section with Tactile Badge -->
<div class="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-xs">
<div class="flex flex-col gap-space-xs max-w-2xl">
<div class="flex items-center gap-space-xs">
<span class="px-space-sm py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm uppercase tracking-wider">Konfigurasi Sistem</span>
<span class="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-widest">• PREFERENSI STUDIO</span>
</div>
<h1 class="font-display-lg text-display-lg text-on-surface tracking-tight">Pengaturan &amp; Preferensi</h1>
<p class="font-body-lg text-body-lg text-on-surface-variant">Kustomisasi pengalaman audio taktil, respon getaran perangkat, dan kontrol akun lokal Anda.</p>
</div>
<!-- Quick Reset / Status Pill -->
<div class="hidden lg:flex items-center gap-space-sm bg-surface-container-lowest px-space-md py-space-sm rounded-lg shadow-sm">
<div class="w-10 h-10 rounded-full bg-primary-fixed/60 flex items-center justify-center text-primary">
<span class="material-symbols-outlined text-[22px]">tune</span>
</div>
<div class="flex flex-col">
<span class="font-label-sm text-label-sm text-on-surface-variant uppercase">Profil Aktif</span>
<span class="font-headline-sm text-headline-sm text-on-surface leading-tight">Studio Akrilik</span>
</div>
</div>
</div>

<!-- Asymmetric Settings Bento Grid -->
<div class="flex flex-col gap-space-lg w-full">

<!-- Section 1: Audio & Akustik Card -->
<div class="bg-surface-container-lowest rounded-lg p-space-xl shadow-sm flex flex-col gap-space-lg relative overflow-hidden">
<div class="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-surface-container-low/80 pointer-events-none -z-0"></div>
<!-- Section Title Header -->
<div class="flex items-center justify-between z-10">
<div class="flex items-center gap-space-sm">
<div class="w-11 h-11 rounded-2xl bg-surface-container flex items-center justify-center text-primary shadow-sm">
<span class="material-symbols-outlined text-[24px]">volume_up</span>
</div>
<div class="flex flex-col">
<span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Audio Engine</span>
<h2 class="font-headline-md text-headline-md text-on-surface tracking-tight">Audio &amp; Akustik</h2>
</div>
</div>
<span class="px-space-sm py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm">Akustik 3D</span>
</div>

<!-- SFX Row & Interactive Volume -->
<div class="bg-surface-container-low/70 rounded-2xl p-space-md flex flex-col gap-space-md z-10">
<div class="flex items-center justify-between">
<div class="flex flex-col pr-space-md">
<span class="font-headline-sm text-headline-sm text-on-surface">Efek Suara (SFX)</span>
<p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Suara klik blok taktil, denting cascade, dan transisi kisi.</p>
</div>
<!-- Tactile Switch SFX -->
<button aria-label="Toggle SFX" class="relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full ${settings.sfxEnabled ? 'bg-primary-container' : 'bg-surface-container-highest'} p-1 transition-colors duration-200 ease-in-out shadow-inner focus:outline-none" id="toggle-sfx" type="button">
<span class="pointer-events-none inline-block h-6 w-6 transform ${settings.sfxEnabled ? 'translate-x-6' : 'translate-x-0'} rounded-full bg-surface-container-lowest shadow-md ring-0 transition duration-200 ease-in-out"></span>
</button>
</div>
<!-- Volume Slider Deck -->
<div class="flex items-center gap-space-md pt-space-xs">
<span class="material-symbols-outlined text-on-surface-variant text-[20px]">volume_down</span>
<div class="relative w-full flex items-center">
<div class="h-2.5 w-full bg-surface-container rounded-full overflow-hidden">
<div class="h-full bg-primary-container rounded-full" id="sfx-bar" style="width: ${settings.sfxVolume}%"></div>
</div>
<input aria-label="SFX Volume Slider" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" id="sfx-range" max="100" min="0" type="range" value="${settings.sfxVolume}">
</div>
<span class="font-label-md text-label-md text-on-surface w-10 text-right" id="sfx-label">${settings.sfxVolume}%</span>
</div>
</div>

<!-- BGM Row & Theme Ambient Selector -->
<div class="bg-surface-container-low/70 rounded-2xl p-space-md flex flex-col gap-space-md z-10">
<div class="flex items-center justify-between">
<div class="flex flex-col pr-space-md">
<span class="font-headline-sm text-headline-sm text-on-surface">Musik Latar (BGM)</span>
<p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Komposisi ambient menenangkan untuk memandu kondisi fokus mendalam.</p>
</div>
<!-- Tactile Switch BGM -->
<button aria-label="Toggle BGM" class="relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full ${settings.bgmEnabled ? 'bg-primary-container' : 'bg-surface-container-highest'} p-1 transition-colors duration-200 ease-in-out shadow-inner focus:outline-none" id="toggle-bgm" type="button">
<span class="pointer-events-none inline-block h-6 w-6 transform ${settings.bgmEnabled ? 'translate-x-6' : 'translate-x-0'} rounded-full bg-surface-container-lowest shadow-md ring-0 transition duration-200 ease-in-out"></span>
</button>
</div>

<!-- Ambience Track Selectors -->
<div class="flex flex-col gap-space-xs">
<span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Pilihan Jalur Ambience</span>
<div class="grid grid-cols-3 gap-space-xs">
<button class="px-space-sm py-space-xs rounded-full bg-primary-container text-on-primary font-label-md text-label-md shadow-sm active:scale-95 transition-all text-center flex items-center justify-center gap-1" type="button">
<span class="material-symbols-outlined text-[14px]">headphones</span>
<span>Chillwave Focus</span>
</button>
<button class="px-space-sm py-space-xs rounded-full bg-surface-container text-on-surface-variant font-label-md text-label-md opacity-60 cursor-not-allowed text-center transition-all" type="button" disabled>
Nordic Dawn <span class="text-[10px] font-normal opacity-80">(Segera)</span>
</button>
<button class="px-space-sm py-space-xs rounded-full bg-surface-container text-on-surface-variant font-label-md text-label-md opacity-60 cursor-not-allowed text-center transition-all" type="button" disabled>
Matte Wood <span class="text-[10px] font-normal opacity-80">(Segera)</span>
</button>
</div>
</div>

<!-- BGM Volume Slider Deck -->
<div class="flex items-center gap-space-md pt-space-xs">
<span class="material-symbols-outlined text-on-surface-variant text-[20px]">music_note</span>
<div class="relative w-full flex items-center">
<div class="h-2.5 w-full bg-surface-container rounded-full overflow-hidden">
<div class="h-full bg-primary-container rounded-full" id="bgm-bar" style="width: ${settings.bgmVolume}%"></div>
</div>
<input aria-label="BGM Volume Slider" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" id="bgm-range" max="100" min="0" type="range" value="${settings.bgmVolume}">
</div>
<span class="font-label-md text-label-md text-on-surface w-10 text-right" id="bgm-label">${settings.bgmVolume}%</span>
</div>
</div>

<!-- Sound Profile Pills -->
<div class="flex flex-col gap-space-sm z-10 pt-space-xs">
<span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Profil Resonansi Suara</span>
<div class="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
<button class="p-space-md rounded-2xl bg-surface-container-high text-on-surface shadow-sm text-left flex flex-col justify-between gap-space-sm active:scale-95 transition-all group" type="button">
<div class="flex items-center justify-between h-5">
<span class="material-symbols-outlined text-primary text-[20px]">spa</span>
<span class="material-symbols-outlined text-primary text-[18px]">check_circle</span>
</div>
<div>
<div class="font-headline-sm text-headline-sm">Taktil Organik</div>
<div class="font-body-sm text-body-sm text-on-surface-variant">Kayu, marmer, &amp; batu</div>
</div>
</button>
<button class="p-space-md rounded-2xl bg-surface-container-low text-on-surface-variant opacity-60 cursor-not-allowed text-left flex flex-col justify-between gap-space-sm transition-all" type="button" disabled>
<div class="flex items-center justify-between h-5">
<span class="material-symbols-outlined text-[20px]">equalizer</span>
<span class="text-[9px] px-1 py-0.2 rounded-full bg-surface-container-highest text-on-surface-variant uppercase tracking-wider font-bold">Segera</span>
</div>
<div>
<div class="font-headline-sm text-headline-sm">Sintesis Modern</div>
<div class="font-body-sm text-body-sm">Harmonik FM &amp; lonceng</div>
</div>
</button>
<button class="p-space-md rounded-2xl bg-surface-container-low text-on-surface-variant opacity-60 cursor-not-allowed text-left flex flex-col justify-between gap-space-sm transition-all" type="button" disabled>
<div class="flex items-center justify-between h-5">
<span class="material-symbols-outlined text-[20px]">volume_off</span>
<span class="text-[9px] px-1 py-0.2 rounded-full bg-surface-container-highest text-on-surface-variant uppercase tracking-wider font-bold">Segera</span>
</div>
<div>
<div class="font-headline-sm text-headline-sm">Minimalis Bisu</div>
<div class="font-body-sm text-body-sm">Fokus murni zen</div>
</div>
</button>
</div>
</div>
</div>

<!-- Section 2: Haptic & Respon Fisik Card -->
<div class="bg-surface-container-lowest rounded-lg p-space-xl shadow-sm flex flex-col gap-space-lg ${!hasVibration ? 'opacity-70' : ''}">
<div class="flex items-center justify-between">
<div class="flex items-center gap-space-sm">
<div class="w-11 h-11 rounded-2xl bg-surface-container flex items-center justify-center text-primary shadow-sm">
<span class="material-symbols-outlined text-[24px]">vibration</span>
</div>
<div class="flex flex-col">
<span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Umpan Balik Perangkat</span>
<h2 class="font-headline-md text-headline-md text-on-surface tracking-tight">Haptic &amp; Respon Fisik</h2>
</div>
</div>
<span class="w-2.5 h-2.5 rounded-full ${hasVibration ? 'bg-primary animate-ping' : 'bg-outline-variant'}"></span>
</div>

<div class="flex flex-col gap-space-xs">
<span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Pilihan Getaran / Respon Taktil${!hasVibration ? ' • Tidak didukung perangkat ini' : ''}</span>
<!-- Haptic Selector Stack -->
<div class="flex flex-col gap-space-xs" id="haptic-options-container">

<!-- Option 1: Crisp -->
<label class="flex items-center justify-between p-space-md rounded-2xl ${hapticMode === 'crisp' ? 'bg-primary-fixed/40' : 'bg-surface-container-low hover:bg-surface-container'} cursor-pointer transition-all">
<div class="flex items-center gap-space-sm">
<div class="w-8 h-8 rounded-full ${hapticMode === 'crisp' ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface-variant'} flex items-center justify-center">
<span class="material-symbols-outlined text-[16px]">touch_app</span>
</div>
<div class="flex flex-col">
<span class="font-headline-sm text-headline-sm text-on-surface">Renyah &amp; Ringan (Crisp)</span>
<span class="font-label-sm text-label-sm text-primary font-bold">Rekomendasi BLOCKORA</span>
</div>
</div>
<input class="w-4 h-4 text-primary focus:ring-0 cursor-pointer accent-primary" name="haptic" type="radio" value="crisp" ${hapticMode === 'crisp' ? 'checked' : ''} ${!hasVibration ? 'disabled' : ''}>
</label>

<!-- Option 2: Solid -->
<label class="flex items-center justify-between p-space-md rounded-2xl ${hapticMode === 'solid' ? 'bg-primary-fixed/40' : 'bg-surface-container-low hover:bg-surface-container'} cursor-pointer transition-all">
<div class="flex items-center gap-space-sm">
<div class="w-8 h-8 rounded-full ${hapticMode === 'solid' ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface-variant'} flex items-center justify-center">
<span class="material-symbols-outlined text-[16px]">hardware</span>
</div>
<div class="flex flex-col">
<span class="font-headline-sm text-headline-sm text-on-surface">Tegas &amp; Dalam (Solid)</span>
<span class="font-body-sm text-body-sm text-on-surface-variant">Guncangan haptic mikro intens</span>
</div>
</div>
<input class="w-4 h-4 text-primary focus:ring-0 cursor-pointer accent-primary" name="haptic" type="radio" value="solid" ${hapticMode === 'solid' ? 'checked' : ''} ${!hasVibration ? 'disabled' : ''}>
</label>

<!-- Option 3: Dynamic -->
<label class="flex items-center justify-between p-space-md rounded-2xl ${hapticMode === 'dynamic' ? 'bg-primary-fixed/40' : 'bg-surface-container-low hover:bg-surface-container'} cursor-pointer transition-all">
<div class="flex items-center gap-space-sm">
<div class="w-8 h-8 rounded-full ${hapticMode === 'dynamic' ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface-variant'} flex items-center justify-center">
<span class="material-symbols-outlined text-[16px]">auto_awesome</span>
</div>
<div class="flex flex-col">
<span class="font-headline-sm text-headline-sm text-on-surface">Getaran Dinamis</span>
<span class="font-body-sm text-body-sm text-on-surface-variant">Adaptive Cascade kombo</span>
</div>
</div>
<input class="w-4 h-4 text-primary focus:ring-0 cursor-pointer accent-primary" name="haptic" type="radio" value="dynamic" ${hapticMode === 'dynamic' ? 'checked' : ''} ${!hasVibration ? 'disabled' : ''}>
</label>

<!-- Option 4: Off -->
<label class="flex items-center justify-between p-space-md rounded-2xl ${hapticMode === 'off' ? 'bg-primary-fixed/40' : 'bg-surface-container-low hover:bg-surface-container'} cursor-pointer transition-all">
<div class="flex items-center gap-space-sm">
<div class="w-8 h-8 rounded-full ${hapticMode === 'off' ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-on-surface-variant'} flex items-center justify-center">
<span class="material-symbols-outlined text-[16px]">phonelink_erase</span>
</div>
<div class="flex flex-col">
<span class="font-headline-sm text-headline-sm text-on-surface">Nonaktifkan Getaran</span>
<span class="font-body-sm text-body-sm text-on-surface-variant">Mati sepenuhnya</span>
</div>
</div>
<input class="w-4 h-4 text-primary focus:ring-0 cursor-pointer accent-primary" name="haptic" type="radio" value="off" ${hapticMode === 'off' ? 'checked' : ''} ${!hasVibration ? 'disabled' : ''}>
</label>

</div>
</div>

<!-- Test Haptic Button with Physical Bevel -->
<div class="pt-space-xs">
<button class="w-full h-14 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg flex items-center justify-center gap-space-sm transition-all active:scale-95 shadow-sm ${!hasVibration ? 'opacity-50 cursor-not-allowed' : ''}" id="haptic-test-btn" type="button" ${!hasVibration ? 'disabled' : ''}>
<span class="material-symbols-outlined text-[20px] text-primary" id="vibrate-icon">sensors</span>
<span id="vibrate-text">Tes Respon Getar</span>
</button>
</div>
</div>

<!-- Section 3: Visual & Tampilan Card -->
<div class="bg-surface-container-lowest rounded-lg p-space-xl shadow-sm flex flex-col gap-space-lg">
<div class="flex items-center justify-between">
<div class="flex items-center gap-space-sm">
<div class="w-11 h-11 rounded-2xl bg-surface-container flex items-center justify-center text-primary shadow-sm">
<span class="material-symbols-outlined text-[24px]">palette</span>
</div>
<div class="flex flex-col">
<span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Tampilan Render</span>
<h2 class="font-headline-md text-headline-md text-on-surface tracking-tight">Visual &amp; Tampilan</h2>
</div>
</div>
</div>

<!-- Theme Grid Pickers -->
<div class="flex flex-col gap-space-sm">
<span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Tema Kisi Balok Permainan</span>
<div class="grid grid-cols-1 sm:grid-cols-3 gap-space-md">

<!-- Active Theme Card: Luminous Light -->
<button class="flex flex-col p-space-sm rounded-2xl bg-surface-container-high shadow-md transition-all text-left" type="button">
<div class="h-20 rounded-xl bg-surface p-space-xs flex items-center justify-center gap-1.5 shadow-inner mb-space-sm">
<div class="w-6 h-6 rounded-md bg-primary-container shadow-sm"></div>
<div class="w-6 h-6 rounded-md bg-secondary shadow-sm"></div>
<div class="w-6 h-6 rounded-md bg-tertiary shadow-sm"></div>
</div>
<div class="flex items-center justify-between px-space-xs pb-space-xs">
<span class="font-headline-sm text-headline-sm text-on-surface">Luminous Light</span>
<span class="material-symbols-outlined text-primary text-[18px]">check_circle</span>
</div>
<span class="px-space-xs font-body-sm text-body-sm text-on-surface-variant">Palet cerah Skandinavia standar</span>
</button>

<!-- Deep Slate Dark Theme (Segera) -->
<button class="flex flex-col p-space-sm rounded-2xl bg-surface-container-low opacity-60 cursor-not-allowed shadow-sm transition-all text-left" type="button" disabled>
<div class="h-20 rounded-xl bg-inverse-surface p-space-xs flex items-center justify-center gap-1.5 shadow-inner mb-space-sm relative">
<div class="w-6 h-6 rounded-md bg-inverse-primary shadow-sm"></div>
<div class="w-6 h-6 rounded-md bg-secondary-fixed-dim shadow-sm"></div>
<div class="w-6 h-6 rounded-md bg-tertiary-fixed-dim shadow-sm"></div>
<span class="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant uppercase tracking-wider font-bold">Segera</span>
</div>
<div class="flex items-center justify-between px-space-xs pb-space-xs">
<span class="font-headline-sm text-headline-sm text-on-surface">Deep Slate Dark</span>
</div>
<span class="px-space-xs font-body-sm text-body-sm text-on-surface-variant">Kontras malam OLED ramah mata</span>
</button>

<!-- Pastel Minimal Theme (Segera) -->
<button class="flex flex-col p-space-sm rounded-2xl bg-surface-container-low opacity-60 cursor-not-allowed shadow-sm transition-all text-left" type="button" disabled>
<div class="h-20 rounded-xl bg-surface-container-lowest p-space-xs flex items-center justify-center gap-1.5 shadow-inner mb-space-sm relative">
<div class="w-6 h-6 rounded-md bg-primary-fixed shadow-sm"></div>
<div class="w-6 h-6 rounded-md bg-secondary-fixed shadow-sm"></div>
<div class="w-6 h-6 rounded-md bg-tertiary-fixed shadow-sm"></div>
<span class="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant uppercase tracking-wider font-bold">Segera</span>
</div>
<div class="flex items-center justify-between px-space-xs pb-space-xs">
<span class="font-headline-sm text-headline-sm text-on-surface">Pastel Minimal</span>
</div>
<span class="px-space-xs font-body-sm text-body-sm text-on-surface-variant">Nada pastel lembut tanpa silau</span>
</button>

</div>
</div>

<!-- Reduced Motion Toggle -->
<div class="bg-surface-container-low/70 rounded-2xl p-space-md flex items-center justify-between">
<div class="flex flex-col pr-space-md">
<span class="font-headline-sm text-headline-sm text-on-surface">Mode Reduksi Animasi</span>
<p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Mematikan partikel cascade dan transisi zoom balok untuk efisiensi performa.</p>
</div>
<!-- Tactile Switch Reduced Motion -->
<button aria-label="Toggle Reduced Motion" class="relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full ${isMotionReduced ? 'bg-primary-container' : 'bg-surface-container-highest'} p-1 transition-colors duration-200 ease-in-out shadow-inner focus:outline-none" id="toggle-motion" type="button">
<span class="pointer-events-none inline-block h-6 w-6 transform ${isMotionReduced ? 'translate-x-6' : 'translate-x-0'} rounded-full bg-surface-container-lowest shadow-md ring-0 transition duration-200 ease-in-out"></span>
</button>
</div>

</div>

<!-- Section 4: Manajemen Data & Keamanan (Danger Zone) -->
<div class="bg-error-container/30 rounded-lg p-space-xl shadow-sm flex flex-col gap-space-lg relative overflow-hidden">
<div class="flex items-center justify-between">
<div class="flex items-center gap-space-sm">
<div class="w-11 h-11 rounded-2xl bg-error-container flex items-center justify-center text-error shadow-sm">
<span class="material-symbols-outlined text-[24px]">warning</span>
</div>
<div class="flex flex-col">
<span class="font-label-sm text-label-sm uppercase tracking-wider text-error">Privasi &amp; Memori</span>
<h2 class="font-headline-md text-headline-md text-error tracking-tight">Zona Bahaya &amp; Data</h2>
</div>
</div>
</div>
<p class="font-body-md text-body-md text-on-surface-variant">
            Menghapus seluruh skor rekor lokal, riwayat permainan, dan pengaturan yang tersimpan di peramban ini. Tindakan ini tidak dapat dibatalkan.
          </p>

<!-- Storage Details Snippet -->
<div class="bg-surface-container-lowest/80 rounded-2xl p-space-md flex items-center justify-between">
<div class="flex items-center gap-space-sm">
<span class="material-symbols-outlined text-on-surface-variant text-[20px]">database</span>
<div class="flex flex-col">
<span class="font-label-md text-label-md text-on-surface">Penyimpanan Terpakai</span>
<span class="font-body-sm text-body-sm text-on-surface-variant" id="storage-details-text">${storageDetails}</span>
</div>
</div>
<span class="px-space-sm py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface-variant">Lokal</span>
</div>

<!-- Danger CTA & Supporting Export Action -->
<div class="flex flex-col sm:flex-row gap-space-sm pt-space-xs">
<!-- Reset Button -->
<button class="flex-1 h-14 rounded-full bg-secondary-container hover:bg-secondary text-on-secondary font-label-lg text-label-lg flex items-center justify-center gap-space-xs transition-all active:translate-y-1 shadow-[0_4px_0_#92002a]" id="btn-reset-data" type="button">
<span class="material-symbols-outlined text-[20px]">delete_forever</span>
<span>Reset Data Lokal</span>
</button>
<!-- Impor Data (Disabled) -->
<button class="h-14 px-space-lg rounded-full bg-surface-container-lowest text-on-surface font-label-lg text-label-lg flex items-center justify-center gap-space-xs opacity-50 cursor-not-allowed pointer-events-none transition-all shadow-sm" type="button" disabled>
<span class="material-symbols-outlined text-[18px]">download</span>
<span>Ekspor / Impor Data</span>
</button>
</div>
</div>

<!-- System Version Metadata Card -->
<div class="bg-surface-container-low/50 rounded-2xl p-space-md flex flex-col sm:flex-row items-center justify-between gap-space-sm text-center sm:text-left">
<div class="flex items-center gap-space-xs text-on-surface-variant">
<span class="material-symbols-outlined text-[16px]">verified</span>
<span class="font-label-sm text-label-sm tracking-wider uppercase">BLOCKORA v0.1.0 (Build #010-Stable)</span>
</div>
<div class="font-body-sm text-body-sm text-on-surface-variant">
            Penyimpanan: <span class="font-label-md text-label-md text-on-surface">Lokal Perangkat</span>
</div>
</div>

</div>
</div>
</div></main>

<!-- Footer -->
<footer class="w-full bg-surface-container-low/60 mt-space-xl py-space-lg"><div class="max-w-7xl mx-auto px-margin flex flex-col sm:flex-row items-center justify-between gap-space-md text-center sm:text-left"><div class="flex items-center gap-space-sm"><span class="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">BLOCKORA Minimalist Tactile Puzzle</span></div><div class="font-body-sm text-body-sm text-on-surface-variant">© 2025 BLOCKORA Studio. Crafted for focus &amp; flow.</div></div></footer>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    if (!this.container) return;

    // Kembali ke menu
    this.container.querySelectorAll('[data-action="back"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        audioManager.playUiClick();
        if (this.onBack) this.onBack();
      });
    });

    // Toggle Sound Master dari Header
    const toggleSoundMaster = this.container.querySelector('[data-action="toggle-sound-master"]');
    if (toggleSoundMaster) {
      toggleSoundMaster.addEventListener('click', (e) => {
        e.preventDefault();
        const newMuted = audioManager.toggleMute();
        const iconSpan = this.container.querySelector('[data-bind="sound-icon"]');
        if (iconSpan) {
          iconSpan.textContent = newMuted ? 'volume_off' : 'volume_up';
        }
        this._notifySaved();
      });
    }

    // --- SFX Controls ---
    const toggleSfx = this.container.querySelector('#toggle-sfx');
    const sfxRange = this.container.querySelector('#sfx-range');
    const sfxBar = this.container.querySelector('#sfx-bar');
    const sfxLabel = this.container.querySelector('#sfx-label');

    if (toggleSfx) {
      toggleSfx.addEventListener('click', () => {
        const knob = toggleSfx.querySelector('span');
        const isActive = knob.classList.contains('translate-x-6');
        const newActive = !isActive;

        if (newActive) {
          knob.classList.remove('translate-x-0');
          knob.classList.add('translate-x-6');
          toggleSfx.classList.remove('bg-surface-container-highest');
          toggleSfx.classList.add('bg-primary-container');
        } else {
          knob.classList.remove('translate-x-6');
          knob.classList.add('translate-x-0');
          toggleSfx.classList.remove('bg-primary-container');
          toggleSfx.classList.add('bg-surface-container-highest');
        }

        audioManager.setSfxEnabled(newActive);
        StorageManager.saveSetting('sfx_enabled', newActive);
        if (newActive) audioManager.playPlace();
        this._notifySaved();
      });
    }

    if (sfxRange && sfxBar && sfxLabel) {
      sfxRange.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        sfxBar.style.width = val + '%';
        sfxLabel.textContent = val + '%';
        audioManager.setSfxVolume(val);
        StorageManager.saveSetting('sfx_volume', val);
        this._notifySaved();
      });
      sfxRange.addEventListener('change', () => {
        audioManager.playPlace();
      });
    }

    // --- BGM Controls ---
    const toggleBgm = this.container.querySelector('#toggle-bgm');
    const bgmRange = this.container.querySelector('#bgm-range');
    const bgmBar = this.container.querySelector('#bgm-bar');
    const bgmLabel = this.container.querySelector('#bgm-label');

    if (toggleBgm) {
      toggleBgm.addEventListener('click', () => {
        const knob = toggleBgm.querySelector('span');
        const isActive = knob.classList.contains('translate-x-6');
        const newActive = !isActive;

        if (newActive) {
          knob.classList.remove('translate-x-0');
          knob.classList.add('translate-x-6');
          toggleBgm.classList.remove('bg-surface-container-highest');
          toggleBgm.classList.add('bg-primary-container');
        } else {
          knob.classList.remove('translate-x-6');
          knob.classList.add('translate-x-0');
          toggleBgm.classList.remove('bg-primary-container');
          toggleBgm.classList.add('bg-surface-container-highest');
        }

        audioManager.setBgmEnabled(newActive);
        StorageManager.saveSetting('bgm_enabled', newActive);
        this._notifySaved();
      });
    }

    if (bgmRange && bgmBar && bgmLabel) {
      bgmRange.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        bgmBar.style.width = val + '%';
        bgmLabel.textContent = val + '%';
        audioManager.setBgmVolume(val);
        StorageManager.saveSetting('bgm_volume', val);
        this._notifySaved();
      });
    }

    // --- Haptic Controls ---
    const hapticOptions = this.container.querySelectorAll('input[name="haptic"]');
    hapticOptions.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const mode = e.target.value;
        HapticManager.setMode(mode);

        // Update active card background styles
        const container = this.container.querySelector('#haptic-options-container');
        if (container) {
          container.querySelectorAll('label').forEach(lbl => {
            const r = lbl.querySelector('input[type="radio"]');
            const iconWrap = lbl.querySelector('.w-8.h-8');
            if (r && r.checked) {
              lbl.classList.remove('bg-surface-container-low', 'hover:bg-surface-container');
              lbl.classList.add('bg-primary-fixed/40');
              if (iconWrap) {
                iconWrap.classList.remove('bg-surface-container', 'text-on-surface-variant');
                iconWrap.classList.add('bg-primary-container', 'text-on-primary');
              }
            } else {
              lbl.classList.remove('bg-primary-fixed/40');
              lbl.classList.add('bg-surface-container-low', 'hover:bg-surface-container');
              if (iconWrap) {
                iconWrap.classList.remove('bg-primary-container', 'text-on-primary');
                iconWrap.classList.add('bg-surface-container', 'text-on-surface-variant');
              }
            }
          });
        }

        HapticManager.test(mode);
        this._notifySaved();
      });
    });

    const hapticBtn = this.container.querySelector('#haptic-test-btn');
    const vibrateText = this.container.querySelector('#vibrate-text');
    const vibrateIcon = this.container.querySelector('#vibrate-icon');
    if (hapticBtn && vibrateText && vibrateIcon) {
      hapticBtn.addEventListener('click', () => {
        const currentMode = HapticManager.getMode();
        HapticManager.test(currentMode);

        const modeLabels = {
          crisp: 'Getaran Aktif (Crisp)!',
          solid: 'Getaran Aktif (Solid)!',
          dynamic: 'Getaran Aktif (Dinamis)!',
          off: 'Getaran Nonaktif'
        };

        vibrateText.textContent = modeLabels[currentMode] || 'Getaran Aktif!';
        vibrateIcon.textContent = currentMode !== 'off' ? 'check' : 'close';
        hapticBtn.classList.add('bg-tertiary-fixed', 'text-on-tertiary-fixed');

        setTimeout(() => {
          vibrateText.textContent = 'Tes Respon Getar';
          vibrateIcon.textContent = 'sensors';
          hapticBtn.classList.remove('bg-tertiary-fixed', 'text-on-tertiary-fixed');
        }, 1200);
      });
    }

    // --- Reduced Motion Toggle ---
    const toggleMotion = this.container.querySelector('#toggle-motion');
    if (toggleMotion) {
      toggleMotion.addEventListener('click', () => {
        const knob = toggleMotion.querySelector('span');
        const isActive = knob.classList.contains('translate-x-6');
        const newActive = !isActive;

        if (newActive) {
          knob.classList.remove('translate-x-0');
          knob.classList.add('translate-x-6');
          toggleMotion.classList.remove('bg-surface-container-highest');
          toggleMotion.classList.add('bg-primary-container');
        } else {
          knob.classList.remove('translate-x-6');
          knob.classList.add('translate-x-0');
          toggleMotion.classList.remove('bg-primary-container');
          toggleMotion.classList.add('bg-surface-container-highest');
        }

        MotionPrefs.setReducedMotion(newActive);
        this._notifySaved();
      });
    }

    // --- Danger Zone: Reset Data Lokal ---
    const resetBtn = this.container.querySelector('#btn-reset-data');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        audioManager.playUiClick();
        const confirmed = confirm(
          'Apakah Anda yakin ingin mengatur ulang data lokal BLOCKORA?\n\n' +
          'Tindakan ini akan menghapus:\n' +
          '• Seluruh skor rekor dan statistik permainan lokal\n' +
          '• Riwayat tantangan harian (streak)\n' +
          '• Preferensi pengaturan game\n\n' +
          '(File aplikasi dan cache offline TIDAK akan terhapus).'
        );

        if (confirmed) {
          await StorageManager.resetAllLocalData();
          alert('Seluruh data statistik dan preferensi lokal BLOCKORA telah berhasil di-reset.');
          if (this.onResetComplete) {
            this.onResetComplete();
          } else {
            await this.render();
          }
        }
      });
    }

    // Unified Header Navigation
    bindHeaderNav(this.container, 'settings');
  }

  _notifySaved() {
    const chip = this.container?.querySelector('#status-save-chip');
    const text = this.container?.querySelector('#status-save-text');
    const dot = this.container?.querySelector('#status-pulse-dot');
    if (!chip) return;

    if (text) text.textContent = 'Pengaturan Tersimpan';
    chip.classList.remove('opacity-0');
    chip.classList.add('opacity-100');

    if (dot) {
      dot.classList.remove('animate-pulse');
      // Trigger reflow
      void dot.offsetWidth;
      dot.classList.add('animate-pulse');
    }

    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => {
      chip.classList.add('opacity-90');
    }, 2000);
  }
}
