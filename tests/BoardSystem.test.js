import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BoardSystem } from '../src/game/systems/BoardSystem.js';

describe('BoardSystem Tests', () => {
  test('Papan baru harus berukuran 10x10 dan semua sel bernilai 0', () => {
    const board = new BoardSystem(10);
    const grid = board.getGrid();

    assert.equal(grid.length, 10);
    assert.equal(grid[0].length, 10);

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        assert.equal(board.getCell(r, c), 0);
      }
    }
  });

  test('Balok di dalam area papan valid untuk diletakkan', () => {
    const board = new BoardSystem(10);
    const shape = [[0, 0], [0, 1], [1, 0], [1, 1]]; // 2x2

    // Tempatkan di tengah papan (r=4, c=4)
    assert.equal(board.canPlace(shape, 4, 4), true);
    assert.equal(board.place(shape, 4, 4, 1), true);

    // Cek sel terisi
    assert.equal(board.getCell(4, 4), 1);
    assert.equal(board.getCell(4, 5), 1);
    assert.equal(board.getCell(5, 4), 1);
    assert.equal(board.getCell(5, 5), 1);
  });

  test('Balok menempati sel sudut dan tepi papan adalah valid', () => {
    const board = new BoardSystem(10);
    const dot = [[0, 0]];

    // 4 sudut papan: [0,0], [0,9], [9,0], [9,9]
    assert.equal(board.canPlace(dot, 0, 0), true);
    assert.equal(board.canPlace(dot, 0, 9), true);
    assert.equal(board.canPlace(dot, 9, 0), true);
    assert.equal(board.canPlace(dot, 9, 9), true);

    assert.equal(board.place(dot, 0, 0, 2), true);
    assert.equal(board.place(dot, 0, 9, 2), true);
    assert.equal(board.place(dot, 9, 0, 2), true);
    assert.equal(board.place(dot, 9, 9, 2), true);

    assert.equal(board.getCell(0, 0), 2);
    assert.equal(board.getCell(0, 9), 2);
    assert.equal(board.getCell(9, 0), 2);
    assert.equal(board.getCell(9, 9), 2);
  });

  test('Balok keluar batas atas, bawah, kiri, dan kanan adalah invalid', () => {
    const board = new BoardSystem(10);
    const line3H = [[0, 0], [0, 1], [0, 2]]; // Panjang 3 horizontal
    const line3V = [[0, 0], [1, 0], [2, 0]]; // Panjang 3 vertikal

    // Keluar batas kiri (col < 0)
    assert.equal(board.canPlace(line3H, 0, -1), false);

    // Keluar batas kanan (col + 2 >= 10)
    assert.equal(board.canPlace(line3H, 0, 7), true);  // 7, 8, 9 -> muat
    assert.equal(board.canPlace(line3H, 0, 8), false); // 8, 9, 10 -> keluar batas

    // Keluar batas atas (row < 0)
    assert.equal(board.canPlace(line3V, -1, 0), false);

    // Keluar batas bawah (row + 2 >= 10)
    assert.equal(board.canPlace(line3V, 7, 0), true);  // 7, 8, 9 -> muat
    assert.equal(board.canPlace(line3V, 8, 0), false); // 8, 9, 10 -> keluar batas
  });

  test('Balok menimpa sel yang sudah terisi adalah invalid', () => {
    const board = new BoardSystem(10);
    const dot = [[0, 0]];
    const square2x2 = [[0, 0], [0, 1], [1, 0], [1, 1]];

    // Isi sel [5, 5]
    board.place(dot, 5, 5, 1);
    assert.equal(board.getCell(5, 5), 1);

    // Coba tempatkan balok 2x2 yang melintasi [5, 5]
    assert.equal(board.canPlace(square2x2, 5, 5), false);
    assert.equal(board.canPlace(square2x2, 4, 4), false); // sel [1,1] dari balok akan menimpa [5,5]
    assert.equal(board.canPlace(square2x2, 4, 5), false); // sel [1,0] dari balok akan menimpa [5,5]
    assert.equal(board.canPlace(square2x2, 5, 4), false); // sel [0,1] dari balok akan menimpa [5,5]

    // Di tempat yang bebas tetap valid
    assert.equal(board.canPlace(square2x2, 0, 0), true);
  });

  test('canPlaceAnywhere bernilai true pada papan kosong dan false pada papan penuh', () => {
    const board = new BoardSystem(10);
    const square3x3 = [
      [0, 0], [0, 1], [0, 2],
      [1, 0], [1, 1], [1, 2],
      [2, 0], [2, 1], [2, 2]
    ];

    // Papan kosong -> harus true
    assert.equal(board.canPlaceAnywhere(square3x3), true);

    // Isi penuh seluruh papan
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        board.grid[r][c] = 1;
      }
    }

    // Papan penuh -> harus false
    assert.equal(board.canPlaceAnywhere(square3x3), false);

    // Bahkan balok 1x1 pun harus false
    assert.equal(board.canPlaceAnywhere([[0, 0]]), false);

    // Kosongkan 1 sel di pojok [9, 9]
    board.grid[9][9] = 0;
    assert.equal(board.canPlaceAnywhere([[0, 0]]), true); // 1x1 bisa masuk
    assert.equal(board.canPlaceAnywhere(square3x3), false); // 3x3 tetap tidak bisa
  });
});
