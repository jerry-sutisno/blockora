import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ClearSystem } from '../src/game/systems/ClearSystem.js';
import { BoardSystem } from '../src/game/systems/BoardSystem.js';

describe('ClearSystem Tests', () => {
  test('Tidak ada garis penuh jika papan kosong', () => {
    const board = new BoardSystem(10);
    const result = ClearSystem.findCompleteLines(board);

    assert.equal(result.linesCleared, 0);
    assert.equal(result.rows.length, 0);
    assert.equal(result.cols.length, 0);
    assert.equal(result.clearedCells.length, 0);
  });

  test('Satu baris penuh terdeteksi dan terhapus', () => {
    const board = new BoardSystem(10);
    // Isi penuh baris 3
    for (let c = 0; c < 10; c++) {
      board.grid[3][c] = 1;
    }

    const result = ClearSystem.clearCompleteLines(board);

    assert.equal(result.linesCleared, 1);
    assert.deepEqual(result.rows, [3]);
    assert.deepEqual(result.cols, []);
    assert.equal(result.clearedCells.length, 10);

    // Pastikan baris 3 sekarang bernilai 0
    for (let c = 0; c < 10; c++) {
      assert.equal(board.getCell(3, c), 0);
    }
  });

  test('Satu kolom penuh terdeteksi dan terhapus', () => {
    const board = new BoardSystem(10);
    // Isi penuh kolom 7
    for (let r = 0; r < 10; r++) {
      board.grid[r][7] = 2;
    }

    const result = ClearSystem.clearCompleteLines(board);

    assert.equal(result.linesCleared, 1);
    assert.deepEqual(result.rows, []);
    assert.deepEqual(result.cols, [7]);
    assert.equal(result.clearedCells.length, 10);

    // Pastikan kolom 7 sekarang bernilai 0
    for (let r = 0; r < 10; r++) {
      assert.equal(board.getCell(r, 7), 0);
    }
  });

  test('Dua baris penuh sekaligus terdeteksi dan terhapus', () => {
    const board = new BoardSystem(10);
    for (let c = 0; c < 10; c++) {
      board.grid[1][c] = 1;
      board.grid[8][c] = 3;
    }

    const result = ClearSystem.clearCompleteLines(board);

    assert.equal(result.linesCleared, 2);
    assert.deepEqual(result.rows, [1, 8]);
    assert.equal(result.clearedCells.length, 20);

    for (let c = 0; c < 10; c++) {
      assert.equal(board.getCell(1, c), 0);
      assert.equal(board.getCell(8, c), 0);
    }
  });

  test('Baris dan kolom yang berpotongan terhitung unik (sel perpotongan hanya dihitung 1x)', () => {
    const board = new BoardSystem(10);
    // Isi penuh baris 4 dan kolom 4 (berpotongan di [4, 4])
    for (let i = 0; i < 10; i++) {
      board.grid[4][i] = 1; // baris 4
      board.grid[i][4] = 1; // kolom 4
    }

    const result = ClearSystem.clearCompleteLines(board);

    assert.equal(result.linesCleared, 2);
    assert.deepEqual(result.rows, [4]);
    assert.deepEqual(result.cols, [4]);

    // 10 sel baris + 10 sel kolom - 1 sel perpotongan = 19 sel unik
    assert.equal(result.clearedCells.length, 19);

    // Seluruh baris 4 dan kolom 4 sekarang kosong
    for (let i = 0; i < 10; i++) {
      assert.equal(board.getCell(4, i), 0);
      assert.equal(board.getCell(i, 4), 0);
    }
  });
});
