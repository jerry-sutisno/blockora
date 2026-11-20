/**
 * DragGeometry - Modul murni (tanpa ketergantungan DOM atau Phaser)
 * Menjadi satu-satunya sumber kebenaran (single source of truth) untuk:
 * 1. Bounding box bentuk balok (getShapeBounds)
 * 2. Posisi visual balok di layar saat di-drag (computeBlockRect)
 * 3. Penghitungan sel target snap di papan 10x10 (computeTargetCell)
 */

/**
 * Menghitung batas baris dan kolom serta dimensi bounding box dari koordinat sel balok.
 * @param {Array<[number, number]>} coords - Array pasangan [row, col]
 * @returns {{ minR: number, maxR: number, minC: number, maxC: number, rows: number, cols: number }}
 */
export function getShapeBounds(coords) {
  if (!coords || coords.length === 0) {
    return { minR: 0, maxR: 0, minC: 0, maxC: 0, rows: 1, cols: 1 };
  }
  let minR = Infinity;
  let maxR = -Infinity;
  let minC = Infinity;
  let maxC = -Infinity;

  for (let i = 0; i < coords.length; i++) {
    const [r, c] = coords[i];
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }

  return {
    minR,
    maxR,
    minC,
    maxC,
    rows: maxR - minR + 1,
    cols: maxC - minC + 1
  };
}

/**
 * Menghitung posisi dan ukuran visual balok di layar (viewport) berdasarkan posisi pointer.
 * 
 * Aturan Anchor:
 * - Horizontal: Pusat bounding box balok tepat berada di pointerX (tengah kursor/jari).
 * - Vertikal:
 *   - Touch: Bagian BAWAH bounding box balok berada sekitar 1.0 - 1.5 tinggi sel di ATAS titik sentuh,
 *     sehingga seluruh balok terlihat jelas dan tidak tertutup jari pengguna.
 *   - Mouse: Pusat bounding box balok berada di kursor dengan offset vertikal kecil/nol.
 * 
 * @param {number} pointerX - Koordinat horizontal pointer (mis. clientX)
 * @param {number} pointerY - Koordinat vertikal pointer (mis. clientY)
 * @param {object} shapeBounds - Hasil dari getShapeBounds(coords)
 * @param {number} cellSize - Ukuran sel papan yang terlihat di layar (px)
 * @param {number} [cellGap=0] - Jarak antar sel di layar (px)
 * @param {boolean} [isTouch=false] - True jika input sentuhan layar HP/tablet
 * @param {object} [config={}] - Opsi tambahan konfigurasi
 * @param {number} [config.touchGapMultiplier=1.2] - Jarak vertikal antara jari dan bagian bawah balok (dalam kelipatan cellSize + cellGap)
 * @param {number} [config.mouseOffsetY=0] - Offset vertikal untuk mouse
 * @returns {{ left: number, top: number, width: number, height: number }}
 */
export function computeBlockRect(pointerX, pointerY, shapeBounds, cellSize, cellGap = 0, isTouch = false, config = {}) {
  const cols = shapeBounds ? shapeBounds.cols : 1;
  const rows = shapeBounds ? shapeBounds.rows : 1;

  // Lebar dan tinggi balok dihitung persis dari ukuran sel dan celah papan
  const blockWidth = (cols * cellSize) + Math.max(0, cols - 1) * cellGap;
  const blockHeight = (rows * cellSize) + Math.max(0, rows - 1) * cellGap;

  // 1. Horizontal: Pusat horizontal bounding box balok tepat di pointerX
  const left = pointerX - (blockWidth / 2);

  // 2. Vertikal:
  let top;
  if (isTouch) {
    const multiplier = config.touchGapMultiplier ?? 1.2;
    const gapAboveFinger = multiplier * (cellSize + cellGap);
    // Bagian bawah balok (top + blockHeight) = pointerY - gapAboveFinger
    top = pointerY - gapAboveFinger - blockHeight;
  } else {
    const mouseOffsetY = config.mouseOffsetY ?? 0;
    // Pusat vertikal di pointerY (bisa digeser ke atas sedikit bila diinginkan via mouseOffsetY)
    top = pointerY - (blockHeight / 2) - mouseOffsetY;
  }

  return {
    left,
    top,
    width: blockWidth,
    height: blockHeight
  };
}

/**
 * Menghitung sel target (row, col) di papan 10x10 dari posisi balok yang terlihat.
 * Menggunakan sudut kiri-atas bounding box balok relatif terhadap origin papan,
 * dengan pembulatan Math.round untuk snap ke sel TERDEKAT.
 * 
 * @param {{ left: number, top: number }} blockRect - Posisi sudut kiri-atas balok
 * @param {{ left: number, top: number }} board - Posisi sudut kiri-atas papan (origin)
 * @param {number} cellStep - Jarak antar awal sel (cellSize + cellGap)
 * @param {object} [shapeBounds] - Batas bentuk untuk menentukan offset minR & minC
 * @returns {{ row: number, col: number, boxRow: number, boxCol: number }}
 */
export function computeTargetCell(blockRect, board, cellStep, shapeBounds = null) {
  if (cellStep <= 0) return { row: 0, col: 0, boxRow: 0, boxCol: 0 };

  // Snap sudut kiri-atas bounding box balok ke sel terdekat di papan
  const boxCol = Math.round((blockRect.left - board.left) / cellStep);
  const boxRow = Math.round((blockRect.top - board.top) / cellStep);

  const minR = shapeBounds ? shapeBounds.minR : 0;
  const minC = shapeBounds ? shapeBounds.minC : 0;

  // Koordinat baris & kolom origin balok [0, 0] di papan
  const col = boxCol - minC;
  const row = boxRow - minR;

  return { row, col, boxRow, boxCol };
}
