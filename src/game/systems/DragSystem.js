import { getShapeBounds, computeBlockRect, computeTargetCell } from './DragGeometry.js';

/**
 * DragSystem - Pengelola interaksi Drag and Drop balok menggunakan pointer Phaser.
 * Mendukung Mouse dan Touch (layar sentuh HP) dengan perhitungan snap ke grid 10x10.
 */
export class DragSystem {
  /**
   * @param {Phaser.Scene} scene Instance GameScene
   * @param {object} config Parameter posisi dan ukuran grid papan
   */
  constructor(scene, config) {
    this.scene = scene;
    this.boardSystem = config.boardSystem;
    this.blockSystem = config.blockSystem;
    this.boardOriginX = config.boardOriginX;
    this.boardOriginY = config.boardOriginY;
    this.cellSize = config.cellSize;
    this.cellGap = config.cellGap;
    this.onBlockPlaced = config.onBlockPlaced;
    this.onDragStateChange = config.onDragStateChange;

    // State drag aktif
    this.isDragging = false;
    this.activePointerId = null;
    this.draggedBlock = null;
    this.draggedContainer = null;
    this.originSlotIndex = null;
    this.originX = 0;
    this.originY = 0;
    this.originScale = 1;

    // State preview snap
    this.currentSnapRow = null;
    this.currentSnapCol = null;
    this.isValidPlacement = false;

    // Offset vertikal saat touch (agar balok tidak tertutup jari)
    // Sekitar 1.8x tinggi sel papan
    this.touchOffsetY = this.cellSize * 1.8;

    // Objek event reusable untuk mencegah alokasi GC di jalur drag
    this._moveStateEvent = {
      type: 'move',
      row: null,
      col: null,
      isValid: false,
      hasCellsOnBoard: false,
      block: null
    };
  }

  /**
   * Memperbarui konfigurasi papan jika terjadi penyesuaian tata letak
   */
  updateBoardConfig(config) {
    this.boardOriginX = config.boardOriginX;
    this.boardOriginY = config.boardOriginY;
    this.cellSize = config.cellSize;
    this.cellGap = config.cellGap;
    this.touchOffsetY = this.cellSize * 1.8;
  }

  /**
   * Memulai proses drag pada balok tertentu dari slot tray
   * @param {Phaser.Input.Pointer} pointer Pointer yang memicu drag
   * @param {number} slotIndex Indeks slot di tray (0..2)
   * @param {object} blockData Objek data balok dari BlockSystem
   * @param {Phaser.GameObjects.Container} container Wadah visual balok
   */
  startDrag(pointer, slotIndex, blockData, container) {
    // Tolak multi-touch kedua saat sudah ada balok yang sedang di-drag
    if (this.isDragging) return;

    this.isDragging = true;
    this.activePointerId = pointer.id;
    this.draggedBlock = blockData;
    this.draggedContainer = container;
    this.originSlotIndex = slotIndex;
    this.originX = container.x;
    this.originY = container.y;
    this.originScale = container.scaleX;

    // Bawa kontainer ke lapisan paling atas
    container.setDepth(100);

    // Hitung posisi awal drag menggunakan DragGeometry
    const isTouch = pointer.wasTouch;
    this.currentShapeBounds = getShapeBounds(blockData.coords);
    const blockRect = computeBlockRect(
      pointer.x,
      pointer.y,
      this.currentShapeBounds,
      this.cellSize,
      this.cellGap,
      isTouch
    );

    // Langsung posisikan kontainer ke posisi anchor yang tepat
    container.x = blockRect.left;
    container.y = blockRect.top;

    // Animasi membesar ke ukuran sel papan asli hanya pada scale (tanpa tween x/y)
    this.scene.tweens.add({
      targets: container,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 80,
      ease: 'Cubic.easeOut'
    });

    if (this.onDragStateChange) {
      this.onDragStateChange({ type: 'start', slotIndex, blockData });
    }
  }

  /**
   * Menangani perpindahan pointer saat drag berlangsung
   * @param {Phaser.Input.Pointer} pointer 
   */
  onPointerMove(pointer) {
    if (!this.isDragging || pointer.id !== this.activePointerId) return;

    const isTouch = pointer.wasTouch;
    const blockRect = computeBlockRect(
      pointer.x,
      pointer.y,
      this.currentShapeBounds,
      this.cellSize,
      this.cellGap,
      isTouch
    );

    this.draggedContainer.x = blockRect.left;
    this.draggedContainer.y = blockRect.top;

    // Hitung snap grid papan
    this.calculateGridSnap();
  }

  /**
   * Menghitung posisi baris & kolom target di papan berdasarkan posisi balok yang di-drag
   */
  calculateGridSnap() {
    if (!this.draggedContainer || !this.draggedBlock) return;

    const step = this.cellSize + this.cellGap;
    const board = { left: this.boardOriginX, top: this.boardOriginY };
    const target = computeTargetCell(
      { left: this.draggedContainer.x, top: this.draggedContainer.y },
      board,
      step,
      this.currentShapeBounds
    );

    const targetRow = target.row;
    const targetCol = target.col;

    // Optimasi A: Hanya jalankan canPlace dan update ghost saat sel target BERUBAH
    if (targetRow === this.currentSnapRow && targetCol === this.currentSnapCol) {
      return;
    }

    this.currentSnapRow = targetRow;
    this.currentSnapCol = targetCol;

    // Periksa apakah penempatan valid menggunakan BoardSystem
    this.isValidPlacement = this.boardSystem.canPlace(
      this.draggedBlock.coords,
      targetRow,
      targetCol
    );

    // Periksa apakah setidaknya salah satu sel berada di dalam batas papan tanpa closure/spread
    let hasAnyCellOnBoard = false;
    const coords = this.draggedBlock.coords;
    const boardSize = this.boardSystem.size;
    for (let i = 0; i < coords.length; i++) {
      const tr = targetRow + coords[i][0];
      const tc = targetCol + coords[i][1];
      if (tr >= 0 && tr < boardSize && tc >= 0 && tc < boardSize) {
        hasAnyCellOnBoard = true;
        break;
      }
    }

    if (this.onDragStateChange) {
      const ev = this._moveStateEvent;
      ev.row = targetRow;
      ev.col = targetCol;
      ev.isValid = this.isValidPlacement;
      ev.hasCellsOnBoard = hasAnyCellOnBoard;
      ev.block = this.draggedBlock;
      this.onDragStateChange(ev);
    }
  }

  /**
   * Menangani pelepasan pointer (drop)
   * @param {Phaser.Input.Pointer} pointer 
   */
  onPointerUp(pointer) {
    if (!this.isDragging) return;
    if (this.activePointerId !== null && pointer.id !== this.activePointerId) return;

    if (this.isValidPlacement && this.currentSnapRow !== null && this.currentSnapCol !== null) {
      // Penempatan VALID: Taruh di papan
      const row = this.currentSnapRow;
      const col = this.currentSnapCol;
      const block = this.draggedBlock;
      const slotIndex = this.originSlotIndex;

      const success = this.boardSystem.place(block.coords, row, col, block.color.id);

      if (success) {
        this.blockSystem.markUsed(slotIndex);

        if (this.onBlockPlaced) {
          this.onBlockPlaced({
            block,
            slotIndex,
            row,
            col,
            container: this.draggedContainer
          });
        }

        // Hancurkan kontainer drag lama karena sel sudah digambar di papan
        this.draggedContainer.destroy();
        this.resetDragState();
        return;
      }
    }

    // Penempatan TIDAK VALID: Balikkan balok ke slot tray dengan animasi tween halus
    this.revertToTray();
  }

  /**
   * Mengembalikan balok yang gagal diletakkan kembali ke slot tray asalnya
   */
  revertToTray() {
    if (!this.draggedContainer) {
      this.resetDragState();
      return;
    }

    const container = this.draggedContainer;
    container.setDepth(10);

    this.scene.tweens.add({
      targets: container,
      x: this.originX,
      y: this.originY,
      scaleX: this.originScale,
      scaleY: this.originScale,
      duration: 180,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.resetDragState();
      }
    });

    if (this.onDragStateChange) {
      this.onDragStateChange({ type: 'revert' });
    }
  }

  /**
   * Membatalkan proses drag saat ini (mis. window blur atau pointercancel)
   */
  cancelDrag() {
    if (this.isDragging) {
      this.revertToTray();
    }
  }

  /**
   * Mereset seluruh variabel status drag
   */
  resetDragState() {
    this.isDragging = false;
    this.activePointerId = null;
    this.draggedBlock = null;
    this.draggedContainer = null;
    this.originSlotIndex = null;
    this.currentSnapRow = null;
    this.currentSnapCol = null;
    this.isValidPlacement = false;

    if (this.onDragStateChange) {
      this.onDragStateChange({ type: 'end' });
    }
  }
}
