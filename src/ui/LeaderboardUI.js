import { StatisticsManager } from '../storage/StatisticsManager.js';
import { StatsAggregator } from '../storage/StatsAggregator.js';
import { audioManager } from '../audio/AudioManager.js';

/**
 * LeaderboardUI - Layar Papan Rekor Lokal (HTML/CSS)
 * Menampilkan Top 10 skor tertinggi dengan filter mode (Semua, Classic, Time, Daily).
 */
export class LeaderboardUI {
  constructor({ onBack }) {
    this.onBack = onBack;
    this.container = null;
    this.activeFilter = 'all'; // 'all' | 'classic' | 'time' | 'daily'
    this.cachedGames = [];
  }

  async show(targetElement) {
    this.container = targetElement;
    this.renderLoading();
    this.container.classList.add('active');

    try {
      this.cachedGames = await StatisticsManager.getAllGames();
      this.render();
    } catch (e) {
      console.warn('Gagal memuat leaderboard:', e);
      this.cachedGames = [];
      this.render();
    }
  }

  hide() {
    if (this.container) {
      this.container.classList.remove('active');
      this.container.innerHTML = '';
    }
  }

  renderLoading() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--color-background);">
        <div style="text-align: center; color: var(--color-on-surface-variant); font-size: 14px; font-weight: 600;">
          Memuat Papan Rekor...
        </div>
      </div>
    `;
  }

  render() {
    if (!this.container) return;

    const list = StatsAggregator.leaderboard(this.cachedGames, 10, this.activeFilter);

    this.container.innerHTML = `
      <div class="screen-leaderboard-container" style="width: 100%; height: 100%; overflow-y: auto; background: var(--color-background); display: flex; flex-direction: column;">
        
        <!-- Header Sticky -->
        <header style="padding: 16px 20px; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(8px); border-bottom: 1px solid var(--color-outline-variant); display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 20;">
          <button id="btn-leaderboard-back" class="btn-ghost" type="button" style="padding: 6px 14px; gap: 6px;">
            <span>←</span>
            <span>Menu</span>
          </button>

          <h1 style="margin: 0; font-size: var(--text-title-md-size); font-weight: 800; color: var(--color-on-surface);">
            Papan Rekor Lokal
          </h1>

          <div style="display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: var(--radius-full); background: var(--color-surface-container-high); border: 1px solid var(--color-outline-variant); font-size: 11px; font-weight: 700; color: var(--brand-primary);">
            <span>Top 10</span>
          </div>
        </header>

        <!-- Main Content -->
        <main style="max-width: 680px; width: 100%; margin: 0 auto; padding: 24px 20px; display: flex; flex-direction: column; gap: 20px; box-sizing: border-box;">
          
          <!-- Filter Tabs -->
          <div style="display: flex; background: var(--color-surface-container); padding: 4px; border-radius: var(--radius-full); gap: 4px;">
            <button class="filter-tab-btn ${this.activeFilter === 'all' ? 'active-tab' : ''}" data-filter="all" style="flex: 1; padding: 8px 12px; border: none; border-radius: var(--radius-full); font-weight: 700; font-size: 12px; cursor: pointer; background: ${this.activeFilter === 'all' ? '#ffffff' : 'transparent'}; color: ${this.activeFilter === 'all' ? 'var(--brand-primary)' : 'var(--color-on-surface-variant)'}; box-shadow: ${this.activeFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};">
              Semua
            </button>
            <button class="filter-tab-btn ${this.activeFilter === 'classic' ? 'active-tab' : ''}" data-filter="classic" style="flex: 1; padding: 8px 12px; border: none; border-radius: var(--radius-full); font-weight: 700; font-size: 12px; cursor: pointer; background: ${this.activeFilter === 'classic' ? '#ffffff' : 'transparent'}; color: ${this.activeFilter === 'classic' ? 'var(--brand-primary)' : 'var(--color-on-surface-variant)'}; box-shadow: ${this.activeFilter === 'classic' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};">
              Classic
            </button>
            <button class="filter-tab-btn ${this.activeFilter === 'time' ? 'active-tab' : ''}" data-filter="time" style="flex: 1; padding: 8px 12px; border: none; border-radius: var(--radius-full); font-weight: 700; font-size: 12px; cursor: pointer; background: ${this.activeFilter === 'time' ? '#ffffff' : 'transparent'}; color: ${this.activeFilter === 'time' ? 'var(--brand-primary)' : 'var(--color-on-surface-variant)'}; box-shadow: ${this.activeFilter === 'time' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};">
              Time
            </button>
            <button class="filter-tab-btn ${this.activeFilter === 'daily' ? 'active-tab' : ''}" data-filter="daily" style="flex: 1; padding: 8px 12px; border: none; border-radius: var(--radius-full); font-weight: 700; font-size: 12px; cursor: pointer; background: ${this.activeFilter === 'daily' ? '#ffffff' : 'transparent'}; color: ${this.activeFilter === 'daily' ? 'var(--brand-primary)' : 'var(--color-on-surface-variant)'}; box-shadow: ${this.activeFilter === 'daily' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};">
              Daily
            </button>
          </div>

          <!-- List Rekor -->
          <div class="card-tactile" style="padding: 18px; display: flex; flex-direction: column; gap: 10px;">
            ${list.length === 0 ? `
              <div style="padding: 32px 16px; text-align: center; color: var(--color-on-surface-variant); font-size: 13px;">
                Belum ada rekor tersimpan untuk kategori ini.<br>
                Mainkan game untuk mencatat rekor pertamamu!
              </div>
            ` : list.map((item, idx) => {
              const rankColor = idx === 0 ? '#fef08a' : (idx === 1 ? '#e2e8f0' : (idx === 2 ? '#fed7aa' : '#f1f5f9'));
              const rankTextColor = idx < 3 ? '#0f172a' : '#64748b';
              const modeBadgeColor = item.mode === 'classic' ? '#e5eeff' : (item.mode === 'time' ? '#ffe4e6' : '#dcfce7');
              const modeTextColor = item.mode === 'classic' ? '#004ac6' : (item.mode === 'time' ? '#e11d48' : '#166534');

              return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--color-surface-container-low); border-radius: var(--radius-default); border: 1px solid var(--color-outline-variant);">
                  
                  <div style="display: flex; align-items: center; gap: 14px;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: ${rankColor}; color: ${rankTextColor}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;">
                      ${idx + 1}
                    </div>

                    <div>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 11px; font-weight: 800; background: ${modeBadgeColor}; color: ${modeTextColor}; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
                          ${item.mode}
                        </span>
                        <span style="font-size: 11px; color: var(--color-on-surface-variant);">
                          ${item.formattedDate || item.date}
                        </span>
                      </div>
                      ${item.linesCleared > 0 ? `
                        <div style="font-size: 11px; color: var(--color-outline); margin-top: 2px;">
                          ${item.linesCleared} baris • ${item.maxCombo > 1 ? `x${item.maxCombo} combo` : 'tanpa combo'}
                        </div>
                      ` : ''}
                    </div>
                  </div>

                  <div style="font-size: 17px; font-weight: 800; color: var(--brand-primary); font-family: monospace;">
                    ${item.score.toLocaleString()} PTS
                  </div>

                </div>
              `;
            }).join('')}
          </div>

        </main>

      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const backBtn = this.container.querySelector('#btn-leaderboard-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        audioManager.playUIClick();
        this.hide();
        if (typeof this.onBack === 'function') {
          this.onBack();
        }
      });
    }

    const tabBtns = this.container.querySelectorAll('.filter-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        audioManager.playUIClick();
        const filter = btn.getAttribute('data-filter');
        if (filter) {
          this.activeFilter = filter;
          this.render();
        }
      });
    });
  }
}
