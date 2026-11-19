import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ScoreSystem } from '../src/game/systems/ScoreSystem.js';

describe('ScoreSystem Tests', () => {
  test('Skor tanpa clear: hanya mendapat poin sel (+1 per sel)', () => {
    const scoreSystem = new ScoreSystem();
    const result = scoreSystem.processPlacement({
      placedCellsCount: 4, // Balok 4 sel
      clearResult: { linesCleared: 0 }
    });

    assert.equal(result.scoreGained, 4);
    assert.equal(result.currentScore, 4);
    assert.equal(result.newCombo, 0);
  });

  test('Satu garis terhapus: +10 poin garis + poin sel', () => {
    const scoreSystem = new ScoreSystem();
    const result = scoreSystem.processPlacement({
      placedCellsCount: 3,
      clearResult: { linesCleared: 1 }
    });

    // 3 sel + 10 garis = 13 poin
    assert.equal(result.scoreGained, 13);
    assert.equal(result.currentScore, 13);
    assert.equal(result.newCombo, 1);
  });

  test('Banyak garis sekaligus: bonus multi-garis (+20 untuk 2 garis)', () => {
    const scoreSystem = new ScoreSystem();
    const result = scoreSystem.processPlacement({
      placedCellsCount: 4,
      clearResult: { linesCleared: 2 }
    });

    // 4 sel + (2 * 10) + 20 bonus = 44 poin
    assert.equal(result.scoreGained, 44);
    assert.equal(result.currentScore, 44);
    assert.equal(result.newCombo, 1);
  });

  test('Combo berturut-turut bertambah dan memberikan bonus combo saat >= 2', () => {
    const scoreSystem = new ScoreSystem();

    // Turn 1: clear 1 garis -> combo 1 (belum ada combo bonus)
    const t1 = scoreSystem.processPlacement({
      placedCellsCount: 2,
      clearResult: { linesCleared: 1 }
    });
    assert.equal(t1.newCombo, 1);
    assert.equal(t1.scoreGained, 12); // 2 + 10

    // Turn 2: clear 1 garis lagi -> combo 2 -> bonus combo = (2 - 1) * 10 = +10
    const t2 = scoreSystem.processPlacement({
      placedCellsCount: 2,
      clearResult: { linesCleared: 1 }
    });
    assert.equal(t2.newCombo, 2);
    // 2 sel + 10 garis + 10 combo bonus = 22 poin
    assert.equal(t2.scoreGained, 22);
    assert.equal(t2.currentScore, 34);

    // Turn 3: clear 1 garis lagi -> combo 3 -> bonus combo = (3 - 1) * 10 = +20
    const t3 = scoreSystem.processPlacement({
      placedCellsCount: 1,
      clearResult: { linesCleared: 1 }
    });
    assert.equal(t3.newCombo, 3);
    // 1 sel + 10 garis + 20 combo bonus = 31 poin
    assert.equal(t3.scoreGained, 31);
    assert.equal(t3.currentScore, 65);
    assert.equal(scoreSystem.maxCombo, 3);
  });

  test('Combo reset ke 0 saat giliran tidak ada garis yang terhapus', () => {
    const scoreSystem = new ScoreSystem();

    // Buat combo sampai 2
    scoreSystem.processPlacement({ placedCellsCount: 2, clearResult: { linesCleared: 1 } });
    scoreSystem.processPlacement({ placedCellsCount: 2, clearResult: { linesCleared: 1 } });
    assert.equal(scoreSystem.currentCombo, 2);

    // Giliran tanpa clear
    const resetTurn = scoreSystem.processPlacement({
      placedCellsCount: 3,
      clearResult: { linesCleared: 0 }
    });
    assert.equal(resetTurn.newCombo, 0);
    assert.equal(scoreSystem.currentCombo, 0);
    assert.equal(scoreSystem.maxCombo, 2); // maxCombo tetap tercatat 2
  });
});
