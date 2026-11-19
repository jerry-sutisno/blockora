/**
 * HeaderNav.js - Pengelola Navigasi Header Terpadu untuk Konsistensi Antar Layar.
 * Menjamin semua link header (Play, Modes, Leaderboard, Rules, Audio, Profil)
 * berfungsi konsisten di semua layar, dan tombol yang belum ada fungsinya disabled secara rapi.
 */

import { audioManager } from '../audio/AudioManager.js';
import { StorageManager } from '../storage/StorageManager.js';

/**
 * Mengikat event listener terpadu untuk elemen header navigasi di container layar manapun.
 * @param {HTMLElement} container Wadah layar aktif
 * @param {string} currentScreen Nama layar saat ini ('menu', 'game', 'daily', 'stats', 'settings', 'result')
 */
export function bindHeaderNav(container, currentScreen = 'menu') {
  if (!container || typeof container.querySelector !== 'function') return;
  const header = container.querySelector('header');
  if (!header) return;

  // 1. Sinkronisasi Nilai Best Score di Header
  const bestEl = header.querySelector('[data-bind="header-best"]') || 
                 header.querySelector('.font-label-md.text-label-md.text-on-surface');
  if (bestEl) {
    const bestClassic = StorageManager.getBestScore('classic');
    const bestTime = StorageManager.getBestScore('time');
    const bestDaily = StorageManager.getBestScore('daily');
    const maxBest = Math.max(bestClassic, bestTime, bestDaily);
    if (maxBest > 0) {
      bestEl.textContent = maxBest.toLocaleString('id-ID');
    } else {
      bestEl.textContent = 'Belum ada';
    }
  }

  // 2. Navigasi Nav Links Utama (Play, Modes, Leaderboard, Rules, dll.)
  const navLinks = header.querySelectorAll('nav a');
  navLinks.forEach(link => {
    const path = (link.getAttribute('data-path') || '').toLowerCase();
    const action = (link.getAttribute('data-action') || '').toLowerCase();
    const href = (link.getAttribute('href') || '').toLowerCase();
    const text = link.textContent.trim().toLowerCase();

    link.addEventListener('click', (e) => {
      e.preventDefault();
      audioManager.playUiClick();

      if (path === 'play' || action === 'play-classic' || path === 'blockora-gameplay-screen' || text === 'play') {
        if (currentScreen !== 'game') {
          window.blockoraApp?.startFreshGame('classic');
        }
      } else if (path === 'modes' || action === 'scroll-modes' || path === 'blockora-main-menu' || href === '#modes-section' || text === 'modes') {
        if (currentScreen === 'menu') {
          const target = document.querySelector('#modes-section');
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.blockoraApp?.showScreen('menu');
          setTimeout(() => {
            const target = document.querySelector('#modes-section');
            if (target) target.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      } else if (path === 'leaderboard' || path === 'blockora-statistics' || action === 'open-leaderboard' || action === 'open-stats' || text === 'leaderboard' || text === 'statistics') {
        window.blockoraApp?.showScreen('stats');
      } else if (path === 'how-to-play' || action === 'scroll-rules' || href === '#rules-section' || text === 'rules') {
        if (currentScreen === 'menu') {
          const target = document.querySelector('#rules-section');
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.blockoraApp?.showScreen('menu');
          setTimeout(() => {
            const target = document.querySelector('#rules-section');
            if (target) target.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      } else if (path === 'blockora-daily-challenge' || text === 'daily challenge') {
        window.blockoraApp?.showScreen('daily');
      } else if (path === 'blockora-settings' || text === 'settings') {
        window.blockoraApp?.showScreen('settings');
      }
    });
  });

  // 3. Audio Quick Toggles di Header
  // Sound / SFX Toggle
  const soundBtn = header.querySelector('[data-action="toggle-sound"]') || 
                   header.querySelector('#btn-toggle-sfx-header');
  if (soundBtn) {
    soundBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const newMuted = typeof audioManager.toggleMute === 'function' 
        ? audioManager.toggleMute() 
        : audioManager.toggleSfxMute();
      const icon = soundBtn.querySelector('.material-symbols-outlined') || 
                   soundBtn.querySelector('[data-bind="sound-icon"]');
      if (icon) {
        icon.textContent = (audioManager.isMuted || audioManager.isSfxMuted) ? 'volume_off' : 'volume_up';
      }
    });
  }

  // Music / Settings Button
  const settingsBtn = header.querySelector('[data-action="open-settings"]') || 
                      header.querySelector('#btn-toggle-bgm-header');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      audioManager.playUiClick();
      window.blockoraApp?.showScreen('settings');
    });
  }

  // 4. Logo / Title klik -> Kembali ke Main Menu
  const logoGroup = header.querySelector('.flex.items-center.gap-space-md');
  if (logoGroup) {
    if (logoGroup.style) logoGroup.style.cursor = 'pointer';
    logoGroup.addEventListener('click', () => {
      audioManager.playUiClick();
      window.blockoraApp?.showScreen('menu');
    });
  }

  // 5. Profil Avatar -> Ditandai sebagai Pemain Lokal (Offline)
  const avatar = header.querySelector('.rounded-full.bg-primary');
  if (avatar) {
    if (typeof avatar.setAttribute === 'function') avatar.setAttribute('title', 'Pemain Lokal (Offline)');
    if (avatar.style) avatar.style.cursor = 'default';
  }
}
