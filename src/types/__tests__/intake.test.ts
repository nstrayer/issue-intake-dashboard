import { describe, it, expect } from 'vitest';
import { formatAge, formatAgeVerbose } from '../intake';

describe('formatAge', () => {
  describe('hours display for same-day items', () => {
    it.each([
      [0, 0, '<1h'],
      [0, 1, '1h'],
      [0, 5, '5h'],
      [0, 23, '23h'],
    ])('formats %i days, %i hours as "%s"', (days, hours, expected) => {
      expect(formatAge(days, hours)).toBe(expected);
    });
  });

  describe('days display for older items', () => {
    it.each([
      [1, 24, '1d'],
      [7, 168, '7d'],
      [14, 336, '14d'],
      [30, 720, '30d'],
    ])('formats %i days, %i hours as "%s"', (days, hours, expected) => {
      expect(formatAge(days, hours)).toBe(expected);
    });
  });
});

describe('formatAgeVerbose', () => {
  describe('hours display', () => {
    it.each([
      [0, 0, 'less than an hour ago'],
      [0, 1, '1 hour ago'],
      [0, 5, '5 hours ago'],
    ])('formats %i days, %i hours as "%s"', (days, hours, expected) => {
      expect(formatAgeVerbose(days, hours)).toBe(expected);
    });
  });

  describe('days display', () => {
    it.each([
      [1, 24, '1 day ago'],
      [7, 168, '7 days ago'],
      [30, 720, '30 days ago'],
    ])('formats %i days, %i hours as "%s"', (days, hours, expected) => {
      expect(formatAgeVerbose(days, hours)).toBe(expected);
    });
  });
});
