import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  todayKey,
  parseDateKey,
  daysBetween,
  isConsecutive,
  getMonthDays,
  formatIndonesianDate,
  formatMonthYear,
  getWeekDates
} from '../src/utils/DateHelper.js';

test('todayKey memformat tanggal lokal YYYY-MM-DD dengan benar', () => {
  const d = new Date(2026, 10, 18); // Bulan November (index 10)
  assert.equal(todayKey(d), '2026-11-18');

  const d2 = new Date(2026, 0, 5); // 5 Januari 2026
  assert.equal(todayKey(d2), '2026-01-05');
});

test('parseDateKey mengubah string YYYY-MM-DD ke objek Date lokal', () => {
  const d = parseDateKey('2026-11-18');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 10);
  assert.equal(d.getDate(), 18);
});

test('daysBetween menghitung selisih hari dengan akurat', () => {
  assert.equal(daysBetween('2026-11-18', '2026-11-18'), 0);
  assert.equal(daysBetween('2026-11-18', '2026-11-19'), 1);
  assert.equal(daysBetween('2026-11-18', '2026-11-25'), 7);
  assert.equal(daysBetween('2026-11-20', '2026-11-18'), -2);
});

test('isConsecutive mengecek apakah dua tanggal berselang tepat 1 hari', () => {
  assert.equal(isConsecutive('2026-11-17', '2026-11-18'), true);
  assert.equal(isConsecutive('2026-11-18', '2026-11-19'), true);
  assert.equal(isConsecutive('2026-11-18', '2026-11-20'), false);
  assert.equal(isConsecutive('2026-11-19', '2026-11-18'), false);
});

test('getMonthDays mengembalikan struktur kalender bulanan yang lengkap', () => {
  // November 2026: 30 hari
  const cal = getMonthDays(2026, 10);
  assert.equal(cal.monthName, 'November');
  assert.equal(cal.totalDays, 30);
  assert.equal(cal.days.length, 30);
  assert.equal(cal.days[0].dateKey, '2026-11-01');
  assert.equal(cal.days[29].dateKey, '2026-11-30');
});

test('formatIndonesianDate memformat string tanggal dengan nama bulan Indonesia', () => {
  assert.equal(formatIndonesianDate('2026-11-18'), '18 November 2026');
  assert.equal(formatIndonesianDate('2026-08-17'), '17 Agustus 2026');
});

test('getWeekDates mengembalikan 7 hari (Senin s/d Minggu)', () => {
  const d = new Date(2026, 10, 18); // Rabu, 18 Nov 2026
  const week = getWeekDates(d);
  assert.equal(week.length, 7);
  // Senin harus 16 Nov
  assert.equal(week[0].dateKey, '2026-11-16');
  // Rabu harus isToday = true
  assert.equal(week[2].dateKey, '2026-11-18');
  assert.equal(week[2].isToday, true);
  // Minggu harus 22 Nov
  assert.equal(week[6].dateKey, '2026-11-22');
});
