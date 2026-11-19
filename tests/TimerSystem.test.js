import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TimerSystem } from '../src/game/systems/TimerSystem.js';

test('TimerSystem inisialisasi durasi dan format waktu awal', () => {
  const timer = new TimerSystem(120);
  assert.equal(timer.getRemainingSeconds(), 120);
  assert.equal(timer.getFormattedTime(), '02:00');
  assert.equal(timer.isFinished(), false);
  assert.equal(timer.isCritical(), false);
});

test('TimerSystem tick mengurangi waktu dan memanggil onTick', () => {
  let tickCount = 0;
  let lastFormatted = '';
  const timer = new TimerSystem(10, {
    onTick: (sec, fmt) => {
      tickCount++;
      lastFormatted = fmt;
    }
  });

  timer.start();
  // Simulasikan 1000ms berlalu
  const finished = timer.tick(1000);
  assert.equal(finished, false);
  assert.equal(timer.getRemainingSeconds(), 9);
  assert.equal(timer.getFormattedTime(), '00:09');
  assert.equal(lastFormatted, '00:09');
  assert.equal(timer.isCritical(), true);
});

test('TimerSystem pause dan resume bekerja dengan benar', () => {
  const timer = new TimerSystem(10);
  timer.start();
  timer.pause();

  // Tick saat pause tidak mengurangi waktu
  timer.tick(2000);
  assert.equal(timer.getRemainingSeconds(), 10);

  timer.resume();
  timer.tick(2000);
  assert.equal(timer.getRemainingSeconds(), 8);
});

test('TimerSystem selesai dan memanggil onFinish saat waktu habis', () => {
  let finishedCalled = false;
  const timer = new TimerSystem(2, {
    onFinish: () => {
      finishedCalled = true;
    }
  });

  timer.start();
  timer.tick(1500);
  assert.equal(timer.isFinished(), false);

  const justFinished = timer.tick(1000);
  assert.equal(justFinished, true);
  assert.equal(timer.isFinished(), true);
  assert.equal(timer.getRemainingSeconds(), 0);
  assert.equal(timer.getFormattedTime(), '00:00');
  assert.equal(finishedCalled, true);
});
