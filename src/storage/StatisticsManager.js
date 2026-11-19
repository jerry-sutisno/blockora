/**
 * StatisticsManager.js - Wrapper IndexedDB murni (tanpa library eksternal) untuk BLOCKORA.
 * Mengelola penyimpanan riwayat permainan lengkap dan catatan harian secara asynchronous.
 * Dilengkapi dengan in-memory fallback jika IndexedDB tidak tersedia/gagal.
 */

const DB_NAME = 'blockora';
const DB_VERSION = 1;

export class StatisticsManager {
  static dbInstance = null;
  static isStorageLimited = false;

  // In-memory fallback stores
  static _memoryGames = [];
  static _memoryDaily = new Map();

  /**
   * Membuka koneksi IndexedDB
   * @returns {Promise<IDBDatabase|null>}
   */
  static async getDB() {
    if (this.dbInstance) return this.dbInstance;

    if (typeof indexedDB === 'undefined') {
      this.isStorageLimited = true;
      return null;
    }

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;

          // Object store untuk riwayat sesi permainan
          if (!db.objectStoreNames.contains('games')) {
            const gamesStore = db.createObjectStore('games', { keyPath: 'id', autoIncrement: true });
            gamesStore.createIndex('by_mode', 'mode', { unique: false });
            gamesStore.createIndex('by_date', 'date', { unique: false });
          }

          // Object store untuk riwayat tantangan harian
          if (!db.objectStoreNames.contains('daily')) {
            db.createObjectStore('daily', { keyPath: 'date' });
          }
        };

        request.onsuccess = (event) => {
          this.dbInstance = event.target.result;
          this.isStorageLimited = false;
          resolve(this.dbInstance);
        };

        request.onerror = (event) => {
          console.warn('StatisticsManager: Gagal membuka IndexedDB, beralih ke memori', event.target.error);
          this.isStorageLimited = true;
          resolve(null);
        };
      } catch (e) {
        console.warn('StatisticsManager: Exception saat inisialisasi IndexedDB', e);
        this.isStorageLimited = true;
        resolve(null);
      }
    });
  }

  /**
   * Menambahkan rekaman sesi game baru (async, non-blocking)
   * @param {{
   *   mode: string,
   *   score: number,
   *   linesCleared: number,
   *   maxCombo: number,
   *   durationMs: number,
   *   endReason: string,
   *   date: string
   * }} record
   * @returns {Promise<number|null>} ID catatan
   */
  static async addGame(record) {
    const entry = {
      ...record,
      timestamp: Date.now()
    };

    const db = await this.getDB();
    if (!db) {
      // Simpan ke in-memory
      const mockId = this._memoryGames.length + 1;
      this._memoryGames.push({ ...entry, id: mockId });
      return mockId;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('games', 'readwrite');
        const store = tx.objectStore('games');
        const req = store.add(entry);

        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => {
          console.warn('StatisticsManager: addGame gagal', e.target.error);
          resolve(null);
        };
      } catch (err) {
        console.warn('StatisticsManager: Transaksi addGame error', err);
        resolve(null);
      }
    });
  }

  /**
   * Mengambil semua riwayat permainan
   * @returns {Promise<Array>}
   */
  static async getAllGames() {
    const db = await this.getDB();
    if (!db) {
      return [...this._memoryGames];
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('games', 'readonly');
        const store = tx.objectStore('games');
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => {
          console.warn('StatisticsManager: getAllGames gagal', e.target.error);
          resolve([...this._memoryGames]);
        };
      } catch (err) {
        console.warn('StatisticsManager: Transaksi getAllGames error', err);
        resolve([...this._memoryGames]);
      }
    });
  }

  /**
   * Menyimpan / memperbarui catatan Daily Challenge untuk tanggal tertentu
   * @param {{ date: string, completed: boolean, bestScore: number, targetsDone: number }} record
   * @returns {Promise<boolean>}
   */
  static async saveDaily(record) {
    const entry = {
      ...record,
      updatedAt: new Date().toISOString()
    };

    const db = await this.getDB();
    if (!db) {
      this._memoryDaily.set(record.date, entry);
      return true;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('daily', 'readwrite');
        const store = tx.objectStore('daily');
        const req = store.put(entry);

        req.onsuccess = () => resolve(true);
        req.onerror = (e) => {
          console.warn('StatisticsManager: saveDaily gagal', e.target.error);
          resolve(false);
        };
      } catch (err) {
        console.warn('StatisticsManager: Transaksi saveDaily error', err);
        resolve(false);
      }
    });
  }

  /**
   * Mengambil catatan Daily Challenge untuk satu tanggal
   * @param {string} dateKey
   * @returns {Promise<Object|null>}
   */
  static async getDaily(dateKey) {
    const db = await this.getDB();
    if (!db) {
      return this._memoryDaily.get(dateKey) || null;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('daily', 'readonly');
        const store = tx.objectStore('daily');
        const req = store.get(dateKey);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = (e) => {
          console.warn('StatisticsManager: getDaily gagal', e.target.error);
          resolve(null);
        };
      } catch (err) {
        console.warn('StatisticsManager: Transaksi getDaily error', err);
        resolve(null);
      }
    });
  }

  /**
   * Mengambil seluruh catatan Daily Challenge
   * @returns {Promise<Array>}
   */
  static async getAllDaily() {
    const db = await this.getDB();
    if (!db) {
      return Array.from(this._memoryDaily.values());
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('daily', 'readonly');
        const store = tx.objectStore('daily');
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => {
          console.warn('StatisticsManager: getAllDaily gagal', e.target.error);
          resolve(Array.from(this._memoryDaily.values()));
        };
      } catch (err) {
        console.warn('StatisticsManager: Transaksi getAllDaily error', err);
        resolve(Array.from(this._memoryDaily.values()));
      }
    });
  }

  /**
   * Menghapus seluruh data di IndexedDB (digunakan saat Reset Data Lokal)
   * @returns {Promise<boolean>}
   */
  static async clearAll() {
    this._memoryGames = [];
    this._memoryDaily.clear();

    const db = await this.getDB();
    if (!db) return true;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(['games', 'daily'], 'readwrite');
        const gamesStore = tx.objectStore('games');
        const dailyStore = tx.objectStore('daily');

        gamesStore.clear();
        dailyStore.clear();

        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => {
          console.warn('StatisticsManager: clearAll gagal', e.target.error);
          resolve(false);
        };
      } catch (err) {
        console.warn('StatisticsManager: Transaksi clearAll error', err);
        resolve(false);
      }
    });
  }
}
