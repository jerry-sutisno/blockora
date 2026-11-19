/**
 * DateHelper.js - Utilitas manipulasi tanggal lokal untuk BLOCKORA.
 * 
 * PENTING: Jangan gunakan `toISOString()` karena menggunakan waktu UTC!
 * Indonesia (WIB UTC+7, WITA UTC+8, WIT UTC+9) akan mengalami pergeseran tanggal
 * jika menggunakan UTC saat bermain di malam hari (antara 00:00 - 06:59 UTC / 07:00 - 13:59 WIB).
 * Semua fungsi di sini memakai waktu lokal perangkat pemain.
 */

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const NAMA_HARI_SINGKAT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/**
 * Format objek Date ke string 'YYYY-MM-DD' menggunakan waktu lokal.
 * @param {Date} [date=new Date()]
 * @returns {string} Contoh: '2026-11-18'
 */
export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse string 'YYYY-MM-DD' menjadi objek Date lokal (jam 00:00:00).
 * @param {string} dateStr 
 * @returns {Date}
 */
export function parseDateKey(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Menghitung selisih hari kalender antara dua tanggal string 'YYYY-MM-DD'.
 * Positif jika b > a.
 * @param {string} a 
 * @param {string} b 
 * @returns {number}
 */
export function daysBetween(a, b) {
  const dateA = parseDateKey(a);
  const dateB = parseDateKey(b);
  const diffMs = dateB.getTime() - dateA.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Cek apakah dua tanggal berurutan (b adalah tepat 1 hari setelah a).
 * @param {string} a 
 * @param {string} b 
 * @returns {boolean}
 */
export function isConsecutive(a, b) {
  return daysBetween(a, b) === 1;
}

/**
 * Mendapatkan informasi kalender untuk bulan tertentu.
 * Menghasilkan data untuk rendering kalender bulanan.
 * @param {number} year Contoh: 2026
 * @param {number} monthIndex 0-11 (0 = Januari)
 * @returns {{
 *   year: number,
 *   monthIndex: number,
 *   monthName: string,
 *   totalDays: number,
 *   firstDayOfWeek: number, // 0 = Minggu, 1 = Senin, dst.
 *   days: Array<{ dateKey: string, dayNumber: number, dayOfWeek: number }>
 * }}
 */
export function getMonthDays(year, monthIndex) {
  // Jumlah hari dalam bulan
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const firstDay = new Date(year, monthIndex, 1).getDay(); // 0: Min, 1: Sen

  const days = [];
  for (let d = 1; d <= totalDays; d++) {
    const curDate = new Date(year, monthIndex, d);
    days.push({
      dateKey: todayKey(curDate),
      dayNumber: d,
      dayOfWeek: curDate.getDay()
    });
  }

  return {
    year,
    monthIndex,
    monthName: NAMA_BULAN[monthIndex],
    totalDays,
    firstDayOfWeek: firstDay,
    days
  };
}

/**
 * Format string tanggal 'YYYY-MM-DD' ke format ramah bahasa Indonesia.
 * Contoh: '2026-11-18' -> '18 November 2026'
 * @param {string} dateStr 
 * @returns {string}
 */
export function formatIndonesianDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const bulan = NAMA_BULAN[m - 1] || '';
  return `${d} ${bulan} ${y}`;
}

/**
 * Format bulan dan tahun. Contoh: 'November 2026'
 * @param {number} year 
 * @param {number} monthIndex 
 * @returns {string}
 */
export function formatMonthYear(year, monthIndex) {
  return `${NAMA_BULAN[monthIndex]} ${year}`;
}

/**
 * Dapatkan 7 hari dalam minggu ini (Senin s/d Minggu) yang melingkupi tanggal tertentu.
 * @param {Date} [baseDate=new Date()]
 * @returns {Array<{ dateKey: string, dayNumber: number, dayName: string, isToday: boolean }>}
 */
export function getWeekDates(baseDate = new Date()) {
  const current = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const day = current.getDay();
  // Hitung offset ke hari Senin (jika Minggu = 0, offset = -6)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);

  const todayStr = todayKey(baseDate);
  const week = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = todayKey(d);
    week.push({
      dateKey: key,
      dayNumber: d.getDate(),
      dayName: NAMA_HARI_SINGKAT[d.getDay()],
      isToday: key === todayStr
    });
  }

  return week;
}
