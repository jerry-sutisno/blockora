import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BlockSystem } from '../src/game/systems/BlockSystem.js';

describe('BlockSystem Tests', () => {
  test('generateSet harus menghasilkan 3 balok dengan used = false', () => {
    const blockSystem = new BlockSystem();
    const blocks = blockSystem.generateSet();

    assert.equal(blocks.length, 3);
    assert.equal(blockSystem.areAllUsed(), false);

    blocks.forEach((block, index) => {
      assert.equal(block.slotIndex, index);
      assert.equal(block.used, false);
      assert.ok(block.id);
      assert.ok(Array.isArray(block.coords));
      assert.ok(block.coords.length > 0);
      assert.ok(block.color);
      assert.ok(block.color.id > 0);
    });
  });

  test('generateSet dengan RNG deterministik menghasilkan balok yang persis sama', () => {
    // Implementasi Linear Congruential Generator sederhana untuk mock RNG
    function createDeterministicRng(seed) {
      let current = seed;
      return function () {
        current = (current * 9301 + 49297) % 233280;
        return current / 233280;
      };
    }

    const rng1 = createDeterministicRng(42);
    const rng2 = createDeterministicRng(42);

    const system1 = new BlockSystem();
    const system2 = new BlockSystem();

    const set1 = system1.generateSet(rng1);
    const set2 = system2.generateSet(rng2);

    assert.equal(set1.length, 3);
    assert.equal(set2.length, 3);

    for (let i = 0; i < 3; i++) {
      assert.equal(set1[i].shapeId, set2[i].shapeId);
      assert.deepEqual(set1[i].coords, set2[i].coords);
      assert.equal(set1[i].color.id, set2[i].color.id);
      assert.equal(set1[i].color.hex, set2[i].color.hex);
    }
  });

  test('markUsed menandai balok terpakai dan areAllUsed bekerja akurat', () => {
    const blockSystem = new BlockSystem();
    blockSystem.generateSet();

    assert.equal(blockSystem.areAllUsed(), false);

    // Pakai balok slot 0
    assert.equal(blockSystem.markUsed(0), true);
    assert.equal(blockSystem.areAllUsed(), false);
    assert.equal(blockSystem.getAvailableBlocks().length, 2);

    // Pakai lagi slot 0 -> false karena sudah used
    assert.equal(blockSystem.markUsed(0), false);

    // Pakai slot 1 dan 2
    blockSystem.markUsed(1);
    assert.equal(blockSystem.areAllUsed(), false);

    blockSystem.markUsed(2);
    assert.equal(blockSystem.areAllUsed(), true);
    assert.equal(blockSystem.getAvailableBlocks().length, 0);
  });
});
