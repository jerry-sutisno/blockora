/**
 * BoardSystem - Pengelola logika papan puzzle 10x10 murni JavaScript (tanpa dependensi Phaser).
 * 
 * KONVENSI KOORDINAT:
 * Di seluruh modul ini dan proyek BLOCKORA, koordinat sel selalu menggunakan format [row, col]:
 * - row: indeks vertikal (0 sampai 9, dari atas ke bawah, searah sumbu Y).
 * - col: indeks horizontal (0 sampai 9, dari kiri ke kanan, searah sumbu X).
 * 
 * Nilai sel papan:
 * - 0 = sel kosong
 * - angka > 0 = ID warna balok yang menempati sel
 */
export class BoardSystem {
  /**
   * @param {number} size Ukuran papan (default: 10 untuk 10x10)
   */
  constructor(size = 10) {
    this.size = size;
    this.grid = this.createEmptyGrid();
  }

  /**
   * Membuat matriks 2D kosong berukuran size x size berisi angka 0
   * @returns {number[][]}
   */
  createEmptyGrid() {
    return Array.from({ length: this.size }, () => Array(this.size).fill(0));
  }

  /**
   * Mengosongkan papan kembali ke keadaan awal
   */
  reset() {
    this.grid = this.createEmptyGrid();
  }

  /**
   * Memeriksa apakah suatu koordinat sel berada di dalam batas papan
   * @param {number} row Indeks baris
   * @param {number} col Indeks kolom
   * @returns {boolean}
   */
  isWithinBounds(row, col) {
    return row >= 0 && row < this.size && col >= 0 && col < this.size;
  }

  isValidCell(row, col) {
    return this.isWithinBounds(row, col);
  }

  /**
   * Mengambil nilai sel pada baris dan kolom tertentu
   * @param {number} row 
   * @param {number} col 
   * @returns {number|null} Nilai sel atau null jika di luar batas
   */
  getCell(row, col) {
    if (!this.isWithinBounds(row, col)) return null;
    return this.grid[row][col];
  }

  /**
   * Memeriksa apakah balok dapat ditempatkan pada posisi target (anchor row, col).
   * 
   * @param {Array<[number, number]>} shape Array koordinat relatif [[r1, c1], [r2, c2], ...]
   * @param {number} row Posisi baris target (anchor)
   * @param {number} col Posisi kolom target (anchor)
   * @returns {boolean} True jika semua sel balok berada dalam papan dan sel kosong
   */
  canPlace(shape, row, col) {
    if (!Array.isArray(shape) || shape.length === 0) return false;

    for (let i = 0; i < shape.length; i++) {
      const [rOffset, cOffset] = shape[i];
      const targetRow = row + rOffset;
      const targetCol = col + cOffset;

      // 1. Cek batas papan
      if (!this.isWithinBounds(targetRow, targetCol)) {
        return false;
      }

      // 2. Cek apakah sel sudah terisi
      if (this.grid[targetRow][targetCol] !== 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Menempatkan balok ke dalam papan.
   * 
   * @param {Array<[number, number]>} shape Array koordinat relatif [[r1, c1], ...]
   * @param {number} row Posisi baris target
   * @param {number} col Posisi kolom target
   * @param {number} colorId ID warna (harus angka > 0)
   * @returns {boolean} True jika berhasil ditempatkan, false jika posisi tidak valid
   */
  place(shape, row, col, colorId) {
    if (!this.canPlace(shape, row, col)) {
      return false;
    }

    const assignedColor = colorId > 0 ? colorId : 1;

    for (let i = 0; i < shape.length; i++) {
      const [rOffset, cOffset] = shape[i];
      this.grid[row + rOffset][col + cOffset] = assignedColor;
    }

    return true;
  }

  /**
   * Memeriksa apakah ada minimal satu posisi valid di seluruh papan untuk balok tertentu.
   * Sangat penting untuk deteksi Game Over di tahap berikutnya.
   * 
   * @param {Array<[number, number]>} shape Array koordinat relatif
   * @returns {boolean} True jika balok masih bisa diletakkan di suatu tempat
   */
  canPlaceAnywhere(shape) {
    if (!Array.isArray(shape) || shape.length === 0) return false;

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.canPlace(shape, r, c)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Menghitung jumlah sel kosong di seluruh papan
   * @returns {number}
   */
  getEmptyCount() {
    let emptyCount = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 0) {
          emptyCount++;
        }
      }
    }
    return emptyCount;
  }

  /**
   * Mengembalikan salinan matriks grid saat ini
   * @returns {number[][]}
   */
  getGrid() {
    return this.grid.map(row => [...row]);
  }
}
