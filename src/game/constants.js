/**
 * Konstanta Game BLOCKORA
 * Mengikuti spesifikasi rancangan & design tokens dari Stitch (Luminous Tactile Minimal).
 */

export const BOARD_SIZE = 10;
export const TRAY_SLOTS = 3;

/**
 * Konfigurasi Mode Permainan (Tahap 4)
 */
export const TIME_CHALLENGE_DURATION = 120; // 120 detik (2 menit)

export const GAME_MODES = {
  classic: {
    id: 'classic',
    name: 'Mode Klasik',
    title: 'Classic',
    subtitle: 'Santai tanpa batas waktu',
    badge: 'CLASSIC',
    hasTimer: false,
    duration: null,
    storageKey: 'blockora.best.classic'
  },
  time: {
    id: 'time',
    name: 'Time Challenge',
    title: 'Time Attack',
    subtitle: '120 Detik Skor Tertinggi',
    badge: '120 DETIK',
    hasTimer: true,
    duration: TIME_CHALLENGE_DURATION,
    storageKey: 'blockora.best.time'
  },
  daily: {
    id: 'daily',
    name: 'Tantangan Harian',
    title: 'Daily Challenge',
    subtitle: 'Puzzle & Misi Hari Ini',
    badge: 'HARIAN',
    hasTimer: false,
    duration: null,
    storageKey: 'blockora.best.daily'
  }
};

/**
 * Jenis Target Misi Tantangan Harian
 */
export const DAILY_TARGET_TYPES = {
  SCORE: 'score',         // Mencapai skor minimal
  LINES: 'lines',         // Membersihkan total N garis (baris/kolom)
  COMBO: 'combo',         // Mencapai combo streak minimal
  MULTI_LINE: 'multi_line'// Melakukan N kali clear 2+ baris sekaligus
};

/**
 * Durasi & Easing Animasi Game Terpusat (Tahap 6: Polish)
 */
export const ANIMATION_TIMINGS = {
  PLACE_BOUNCE_DURATION: 120,    // Durasi scale bounce sel baru
  CLEAR_DURATION: 260,            // Durasi shrink & fade sel yang terhapus
  CLEAR_STAGGER_MAX: 100,         // Maksimal offset stagger gelombang
  SCORE_FLOAT_DURATION: 380,      // Durasi angka skor melayang
  TRAY_ENTRY_DURATION: 220,       // Durasi balok baru muncul di tray
  GAME_OVER_FADE_DURATION: 350,   // Durasi redup papan saat game over
  MAX_PARTICLES_PER_CLEAR: 24     // Batas maksimal partikel ringan per clear
};

/**
 * Aturan Sistem Skor & Combo (Tahap 3 - Sesuai Rancangan Bagian 8)
 */
export const SCORE_RULES = {
  POINTS_PER_CELL: 1,      // +1 poin untuk setiap sel balok yang ditempatkan
  POINTS_PER_LINE: 10,     // +10 poin untuk setiap garis (baris/kolom) yang dihapus
  MULTI_LINE_BONUS: {      // Bonus penghapusan banyak garis dalam 1 penempatan
    1: 0,
    2: 20,                 // +20 jika 2 garis terhapus sekaligus
    3: 40,                 // +40 jika 3 garis
    4: 70,                 // +70 jika 4 garis
    5: 100                 // +100 jika 5 garis atau lebih
  },
  COMBO_BONUS_PER_LEVEL: 10 // Bonus bertingkat saat combo beruntun >= 2: (combo - 1) * 10
};

/**
 * Palet Warna Balok Permainan
 * Setiap warna memiliki id angka unik (> 0), nilai hex, dan format integer 0xRRGGBB untuk Phaser.
 */
export const BLOCK_COLORS = [
  { id: 1, name: 'azure', hex: '#2563eb', num: 0x2563eb, light: '#60a5fa' },
  { id: 2, name: 'coral', hex: '#f43f5e', num: 0xf43f5e, light: '#fb7185' },
  { id: 3, name: 'emerald', hex: '#10b981', num: 0x10b981, light: '#34d399' },
  { id: 4, name: 'amber', hex: '#f59e0b', num: 0xf59e0b, light: '#fbbf24' },
  { id: 5, name: 'violet', hex: '#8b5cf6', num: 0x8b5cf6, light: '#a78bfa' }
];

/**
 * Warna Antarmuka Papan & Sel (Luminous Tactile Minimal)
 */
export const THEME_COLORS = {
  background: 0xf8f9ff,
  boardBg: 0xffffff,
  boardWell: 0xe5eeff,
  cellEmpty: 0xeff4ff,
  cellEmptyStroke: 0xd3e4fe,
  previewValid: 0x2563eb,
  previewInvalid: 0xba1a1a,
  trayBg: 0xffffff,
  traySlotBg: 0xeff4ff,
  traySlotStroke: 0xdbe1ff
};

/**
 * Definisi Bentuk Balok (Shapes)
 * Konvensi: Array koordinat [row, col] relatif terhadap titik awal [0, 0].
 * Setiap orientasi didefinisikan sebagai bentuk terpisah (rotasi pemain tidak disediakan).
 * Weight menentukan peluang relatif kemunculan balok (bentuk besar memiliki bobot lebih kecil).
 */
export const SHAPES = [
  // 1. Balok 1x1
  {
    id: 'dot_1x1',
    coords: [[0, 0]],
    weight: 12
  },

  // 2. Garis Horizontal
  {
    id: 'line_2_h',
    coords: [[0, 0], [0, 1]],
    weight: 12
  },
  {
    id: 'line_3_h',
    coords: [[0, 0], [0, 1], [0, 2]],
    weight: 10
  },
  {
    id: 'line_4_h',
    coords: [[0, 0], [0, 1], [0, 2], [0, 3]],
    weight: 6
  },
  {
    id: 'line_5_h',
    coords: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
    weight: 3
  },

  // 3. Garis Vertikal
  {
    id: 'line_2_v',
    coords: [[0, 0], [1, 0]],
    weight: 12
  },
  {
    id: 'line_3_v',
    coords: [[0, 0], [1, 0], [2, 0]],
    weight: 10
  },
  {
    id: 'line_4_v',
    coords: [[0, 0], [1, 0], [2, 0], [3, 0]],
    weight: 6
  },
  {
    id: 'line_5_v',
    coords: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
    weight: 3
  },

  // 4. Kotak Persegi
  {
    id: 'square_2x2',
    coords: [[0, 0], [0, 1], [1, 0], [1, 1]],
    weight: 8
  },
  {
    id: 'square_3x3',
    coords: [
      [0, 0], [0, 1], [0, 2],
      [1, 0], [1, 1], [1, 2],
      [2, 0], [2, 1], [2, 2]
    ],
    weight: 2
  },

  // 5. Sudut / Corner Kecil 2x2 (3 sel)
  {
    id: 'corner_tl',
    coords: [[0, 0], [0, 1], [1, 0]],
    weight: 9
  },
  {
    id: 'corner_tr',
    coords: [[0, 0], [0, 1], [1, 1]],
    weight: 9
  },
  {
    id: 'corner_bl',
    coords: [[0, 0], [1, 0], [1, 1]],
    weight: 9
  },
  {
    id: 'corner_br',
    coords: [[0, 1], [1, 0], [1, 1]],
    weight: 9
  },

  // 6. Bentuk L 3x2 (4 sel)
  {
    id: 'l_norm_v',
    coords: [[0, 0], [1, 0], [2, 0], [2, 1]],
    weight: 7
  },
  {
    id: 'l_mirr_v',
    coords: [[0, 1], [1, 1], [2, 1], [2, 0]],
    weight: 7
  },
  {
    id: 'l_inv_v',
    coords: [[0, 0], [0, 1], [1, 0], [2, 0]],
    weight: 7
  },
  {
    id: 'l_inv_mirr_v',
    coords: [[0, 0], [0, 1], [1, 1], [2, 1]],
    weight: 7
  },
  // L Horizontal (4 sel)
  {
    id: 'l_norm_h',
    coords: [[0, 0], [1, 0], [1, 1], [1, 2]],
    weight: 7
  },
  {
    id: 'l_mirr_h',
    coords: [[0, 2], [1, 0], [1, 1], [1, 2]],
    weight: 7
  },
  {
    id: 'l_inv_h',
    coords: [[0, 0], [0, 1], [0, 2], [1, 0]],
    weight: 7
  },
  {
    id: 'l_inv_mirr_h',
    coords: [[0, 0], [0, 1], [0, 2], [1, 2]],
    weight: 7
  },

  // 7. Bentuk T (4 orientasi)
  {
    id: 't_down',
    coords: [[0, 0], [0, 1], [0, 2], [1, 1]],
    weight: 6
  },
  {
    id: 't_up',
    coords: [[1, 0], [1, 1], [1, 2], [0, 1]],
    weight: 6
  },
  {
    id: 't_right',
    coords: [[0, 0], [1, 0], [2, 0], [1, 1]],
    weight: 6
  },
  {
    id: 't_left',
    coords: [[0, 1], [1, 1], [2, 1], [1, 0]],
    weight: 6
  },

  // 8. Bentuk Z & S
  {
    id: 'z_h',
    coords: [[0, 0], [0, 1], [1, 1], [1, 2]],
    weight: 6
  },
  {
    id: 'z_v',
    coords: [[0, 1], [1, 0], [1, 1], [2, 0]],
    weight: 6
  },
  {
    id: 's_h',
    coords: [[0, 1], [0, 2], [1, 0], [1, 1]],
    weight: 6
  },
  {
    id: 's_v',
    coords: [[0, 0], [1, 0], [1, 1], [2, 1]],
    weight: 6
  }
];

/**
 * Tips Taktil untuk Layar Tantangan Harian (Daily Challenge)
 */
export const TACTILE_TIPS = [
  'Simpan balok berdimensi 3x3 di slot cadangan untuk memicu kombo cascade pada baris ketiga.',
  'Bersihkan garis horizontal dan vertikal sekaligus untuk melipatgandakan perolehan poin kombo.',
  'Pertahankan area tengah papan tetap terbuka agar balok berukuran besar selalu muat diletakkan.',
  'Perhatikan ketiga balok di tray sebelum menaruh balok pertama untuk merencanakan alur penempatan.',
  'Jangan terburu-buru meletakkan balok 1x1; simpan untuk mengisi celah kritis saat membersihkan baris.'
];

