import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BoardSystem } from '../src/game/systems/BoardSystem.js';

describe('Game Over Logic Tests', () => {
  // Fungsi helper logika deteksi Game Over persis seperti di GameScene
  function checkGameOver(boardSystem, availableBlocks) {
    const unplacedBlocks = availableBlocks.filter(b => !b.used);
    if (unplacedBlocks.length === 0) return false;

    // Game Over HANYA jika TIDAK ADA satu pun balok belum terpakai yang bisa ditempatkan
    const hasAnyValidMove = unplacedBlocks.some(block => {
      return boardSystem.canPlaceAnywhere(block.coords);
    });

    return !hasAnyValidMove;
  }

  test('Game over true bila papan penuh dan balok tidak ada yang muat', () => {
    const board = new BoardSystem(10);
    // Isi penuh seluruh papan
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        board.grid[r][c] = 1;
      }
    }

    const availableBlocks = [
      { id: 'b1', coords: [[0, 0], [0, 1]], used: false },
      { id: 'b2', coords: [[0, 0]], used: false }
    ];

    assert.equal(checkGameOver(board, availableBlocks), true);
  });

  test('Game over false bila ada minimal satu balok belum terpakai yang masih muat', () => {
    const board = new BoardSystem(10);
    // Isi hampir seluruh papan, sisakan 1 sel di [9, 9]
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        board.grid[r][c] = 1;
      }
    }
    board.grid[9][9] = 0; // 1 sel kosong

    const availableBlocks = [
      { id: 'b1', coords: [[0, 0], [0, 1], [0, 2]], used: false }, // line 3 -> tidak muat
      { id: 'b2', coords: [[0, 0]], used: false }                   // dot 1x1 -> MUAT!
    ];

    assert.equal(checkGameOver(board, availableBlocks), false);
  });

  test('Balok yang sudah terpakai (used = true) diabaikan dalam pengecekan game over', () => {
    const board = new BoardSystem(10);
    // Isi penuh papan
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        board.grid[r][c] = 1;
      }
    }

    // Balok yang muat sudah used: true, sedangkan balok yang belum dipakai (used: false) tidak muat
    const availableBlocks = [
      { id: 'b1', coords: [[0, 0]], used: true },                  // dot 1x1 tapi SUDAH TERPAKAI
      { id: 'b2', coords: [[0, 0], [0, 1]], used: false }          // line 2 belum terpakai dan tidak muat
    ];

    // Karena b1 sudah used, hanya b2 yang dicek -> b2 tidak muat -> Game Over!
    assert.equal(checkGameOver(board, availableBlocks), true);
  });
});
