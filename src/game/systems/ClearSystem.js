/**
 * ClearSystem - Sistem pendeteksi dan penghapusan baris & kolom penuh pada papan 10x10.
 * Murni JavaScript tanpa dependensi Phaser.
 */
export class ClearSystem {
  /**
   * Memeriksa seluruh baris dan kolom yang terisi penuh pada papan.
   * Tidak mengubah isi papan secara langsung (hanya deteksi).
   * 
   * @param {object|number[][]} boardInstance Instance BoardSystem atau matriks grid 2D
   * @returns {{ rows: number[], cols: number[], clearedCells: Array<[number, number]>, linesCleared: number }}
   */
  static findCompleteLines(boardInstance) {
    const grid = Array.isArray(boardInstance) ? boardInstance : boardInstance.grid;
    const size = grid.length;

    const fullRows = [];
    const fullCols = [];

    // 1. Cek seluruh baris
    for (let r = 0; r < size; r++) {
      let isRowFull = true;
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 0) {
          isRowFull = false;
          break;
        }
      }
      if (isRowFull) {
        fullRows.push(r);
      }
    }

    // 2. Cek seluruh kolom
    for (let c = 0; c < size; c++) {
      let isColFull = true;
      for (let r = 0; r < size; r++) {
        if (grid[r][c] === 0) {
          isColFull = false;
          break;
        }
      }
      if (isColFull) {
        fullCols.push(c);
      }
    }

    // 3. Gabungkan seluruh sel yang terkena penghapusan (Union)
    // Menggunakan Map/Set berbasis string koordinat "r,c" agar sel perpotongan tidak dihitung ganda
    const cellMap = new Map();

    // Masukkan sel dari baris penuh
    for (const r of fullRows) {
      for (let c = 0; c < size; c++) {
        cellMap.set(`${r},${c}`, [r, c]);
      }
    }

    // Masukkan sel dari kolom penuh
    for (const c of fullCols) {
      for (let r = 0; r < size; r++) {
        cellMap.set(`${r},${c}`, [r, c]);
      }
    }

    const clearedCells = Array.from(cellMap.values());
    const linesCleared = fullRows.length + fullCols.length;

    return {
      rows: fullRows,
      cols: fullCols,
      clearedCells,
      linesCleared
    };
  }

  /**
   * Memeriksa baris/kolom penuh lalu MENGOSONGKAN sel-sel tersebut sekaligus pada papan.
   * 
   * @param {object} boardInstance Instance BoardSystem
   * @returns {{ rows: number[], cols: number[], clearedCells: Array<[number, number]>, linesCleared: number }}
   */
  static clearCompleteLines(boardInstance) {
    const result = ClearSystem.findCompleteLines(boardInstance);

    // Kosongkan seluruh sel yang teridentifikasi sekaligus
    if (result.clearedCells.length > 0) {
      const grid = boardInstance.grid;
      for (const [r, c] of result.clearedCells) {
        grid[r][c] = 0;
      }
    }

    return result;
  }
}
