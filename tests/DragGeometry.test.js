import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getShapeBounds,
  computeBlockRect,
  computeTargetCell
} from '../src/game/systems/DragGeometry.js';

test('DragGeometry: getShapeBounds menghitung batas bentuk dengan benar', () => {
  // 1x1
  const b1 = getShapeBounds([[0, 0]]);
  assert.deepEqual(b1, { minR: 0, maxR: 0, minC: 0, maxC: 0, rows: 1, cols: 1 });

  // Garis 5 horizontal
  const bLine5 = getShapeBounds([[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]);
  assert.deepEqual(bLine5, { minR: 0, maxR: 0, minC: 0, maxC: 4, rows: 1, cols: 5 });

  // 3x3
  const b3x3 = getShapeBounds([
    [0, 0], [0, 1], [0, 2],
    [1, 0], [1, 1], [1, 2],
    [2, 0], [2, 1], [2, 2]
  ]);
  assert.deepEqual(b3x3, { minR: 0, maxR: 2, minC: 0, maxC: 2, rows: 3, cols: 3 });

  // Bentuk L dengan offset (misal [1, 0], [1, 1], [0, 1])
  const bL = getShapeBounds([[1, 0], [1, 1], [0, 1]]);
  assert.deepEqual(bL, { minR: 0, maxR: 1, minC: 0, maxC: 1, rows: 2, cols: 2 });
});

test('DragGeometry: computeBlockRect posisi horizontal tepat di tengah pointer', () => {
  const cellSize = 40;
  const cellGap = 5;
  const bounds3x3 = getShapeBounds([[0, 0], [0, 1], [0, 2], [2, 2]]);
  const pointerX = 200;
  const pointerY = 300;

  // Lebar 3 kolom = 3 * 40 + 2 * 5 = 130
  const rect = computeBlockRect(pointerX, pointerY, bounds3x3, cellSize, cellGap, false);
  assert.equal(rect.width, 130);
  assert.equal(rect.left, 200 - 130 / 2); // 135
  assert.equal(rect.left + rect.width / 2, pointerX); // Pusat horizontal persis di pointerX
});

test('DragGeometry: computeBlockRect mode Touch mengangkat balok di atas jari', () => {
  const cellSize = 39;
  const cellGap = 6;
  const bounds3x3 = getShapeBounds([[0, 0], [2, 2]]); // rows = 3, cols = 3
  const pointerX = 200;
  const pointerY = 500;

  // Lebar/tinggi 3x3 = 3 * 39 + 2 * 6 = 129px
  const rectTouch = computeBlockRect(pointerX, pointerY, bounds3x3, cellSize, cellGap, true, { touchGapMultiplier: 1.2 });
  
  // Bagian bawah balok: rectTouch.top + rectTouch.height
  const bottom = rectTouch.top + rectTouch.height;
  const expectedGap = 1.2 * (cellSize + cellGap); // 1.2 * 45 = 54px
  assert.equal(bottom, pointerY - expectedGap);
  assert.ok(bottom < pointerY, 'Bagian bawah balok harus berada di atas titik sentuh jari');
  assert.equal(rectTouch.top, pointerY - expectedGap - rectTouch.height);
});

test('DragGeometry: computeBlockRect mode Mouse memusatkan balok di kursor', () => {
  const cellSize = 40;
  const cellGap = 0;
  const bounds1x1 = getShapeBounds([[0, 0]]);
  const pointerX = 100;
  const pointerY = 150;

  const rectMouse = computeBlockRect(pointerX, pointerY, bounds1x1, cellSize, cellGap, false);
  assert.equal(rectMouse.left + rectMouse.width / 2, pointerX);
  assert.equal(rectMouse.top + rectMouse.height / 2, pointerY);
});

test('DragGeometry: computeTargetCell balok di posisi sel (r, c) menghasilkan snap (r, c) tepat', () => {
  const cellSize = 39;
  const cellGap = 6;
  const cellStep = cellSize + cellGap; // 45
  const board = { left: 50, top: 120 };

  const shapes = [
    { name: '1x1', bounds: getShapeBounds([[0, 0]]) },
    { name: 'line5', bounds: getShapeBounds([[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]) },
    { name: '3x3', bounds: getShapeBounds([[0, 0], [2, 2]]) }
  ];

  for (const s of shapes) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        // Simulasikan balok berada tepat di sel (r, c)
        const blockRect = {
          left: board.left + (c * cellStep),
          top: board.top + (r * cellStep),
          width: (s.bounds.cols * cellSize) + (s.bounds.cols - 1) * cellGap,
          height: (s.bounds.rows * cellSize) + (s.bounds.rows - 1) * cellGap
        };

        const target = computeTargetCell(blockRect, board, cellStep, s.bounds);
        assert.equal(target.row, r, `Bentuk ${s.name} gagal pada row ${r}`);
        assert.equal(target.col, c, `Bentuk ${s.name} gagal pada col ${c}`);
      }
    }
  }
});

test('DragGeometry: Offset kecil (< 0.5 sel) tetap snap ke sel yang sama, offset > 0.5 sel berpindah', () => {
  const cellStep = 45;
  const board = { left: 0, top: 0 };
  const bounds = getShapeBounds([[0, 0]]);

  const baseLeft = 2 * cellStep; // 90px (kolom 2)
  const baseTop = 3 * cellStep;  // 135px (baris 3)

  // Geser kecil +15px (< 22.5px)
  const nearRect = { left: baseLeft + 15, top: baseTop - 15 };
  const snapNear = computeTargetCell(nearRect, board, cellStep, bounds);
  assert.equal(snapNear.col, 2);
  assert.equal(snapNear.row, 3);

  // Geser melewati setengah sel +25px (> 22.5px)
  const farRect = { left: baseLeft + 25, top: baseTop + 25 };
  const snapFar = computeTargetCell(farRect, board, cellStep, bounds);
  assert.equal(snapFar.col, 3); // Pindah ke kolom 3
  assert.equal(snapFar.row, 4); // Pindah ke baris 4
});

test('DragGeometry: Bentuk dengan minR/minC offset snap ke origin balok dengan benar', () => {
  // Bentuk dengan koordinat offset: misal [[1, 1], [1, 2], [2, 1]]
  const coords = [[1, 1], [1, 2], [2, 1]];
  const bounds = getShapeBounds(coords);
  assert.equal(bounds.minR, 1);
  assert.equal(bounds.minC, 1);

  const cellStep = 40;
  const board = { left: 100, top: 100 };

  // Jika bounding box berada di kolom 4, baris 3
  const blockRect = {
    left: board.left + (4 * cellStep),
    top: board.top + (3 * cellStep),
    width: 2 * cellStep,
    height: 2 * cellStep
  };

  const target = computeTargetCell(blockRect, board, cellStep, bounds);
  // boxCol = 4, boxRow = 3
  // col = boxCol - minC = 4 - 1 = 3
  // row = boxRow - minR = 3 - 1 = 2
  assert.equal(target.boxCol, 4);
  assert.equal(target.boxRow, 3);
  assert.equal(target.col, 3);
  assert.equal(target.row, 2);

  // Periksa sel pertama coords [1, 1] jika ditaruh di (row, col):
  // targetRow = row + 1 = 2 + 1 = 3 (persis boxRow)
  // targetCol = col + 1 = 3 + 1 = 4 (persis boxCol)
  assert.equal(target.row + coords[0][0], target.boxRow);
  assert.equal(target.col + coords[0][1], target.boxCol);
});
