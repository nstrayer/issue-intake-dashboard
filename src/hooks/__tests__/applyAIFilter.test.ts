import { describe, it, expect } from 'vitest';
import { applyAIFilter } from '../useAIFilter';
import { createTestItem } from '../../test/fixtures';
import type { AIFilterCriteria } from '../../types/aiFilter';

describe('applyAIFilter', () => {
  describe('label filtering', () => {
    it('includes items with matching labels (labelsIncludeAny)', () => {
      const items = [
        createTestItem({ id: '1', labels: ['bug'] }),
        createTestItem({ id: '2', labels: ['feature'] }),
        createTestItem({ id: '3', labels: ['bug', 'urgent'] }),
      ];
      const criteria: AIFilterCriteria = {
        labelsIncludeAny: ['bug'],
      };

      const result = applyAIFilter(items, criteria);

      expect(result.map(i => i.id)).toEqual(['1', '3']);
    });

    it('excludes items with excluded labels', () => {
      const items = [
        createTestItem({ id: '1', labels: ['bug'] }),
        createTestItem({ id: '2', labels: ['wontfix'] }),
        createTestItem({ id: '3', labels: [] }),
      ];
      const criteria: AIFilterCriteria = {
        labelsExclude: ['wontfix'],
      };

      const result = applyAIFilter(items, criteria);

      expect(result.map(i => i.id)).toEqual(['1', '3']);
    });

    it('matches labels fuzzily (partial match)', () => {
      const items = [
        createTestItem({ id: '1', labels: ['area: editor'] }),
        createTestItem({ id: '2', labels: ['area: python'] }),
        createTestItem({ id: '3', labels: ['bug'] }),
      ];
      const criteria: AIFilterCriteria = {
        labelsIncludeAny: ['editor'],
      };

      const result = applyAIFilter(items, criteria);

      expect(result.map(i => i.id)).toEqual(['1']);
    });

    it('filters by hasLabels=true', () => {
      const items = [
        createTestItem({ id: '1', labels: ['bug'] }),
        createTestItem({ id: '2', labels: [] }),
      ];
      const criteria: AIFilterCriteria = { hasLabels: true };

      const result = applyAIFilter(items, criteria);

      expect(result.map(i => i.id)).toEqual(['1']);
    });

    it('filters by hasLabels=false', () => {
      const items = [
        createTestItem({ id: '1', labels: ['bug'] }),
        createTestItem({ id: '2', labels: [] }),
      ];
      const criteria: AIFilterCriteria = { hasLabels: false };

      const result = applyAIFilter(items, criteria);

      expect(result.map(i => i.id)).toEqual(['2']);
    });
  });

  describe('type filtering', () => {
    it('filters by item type', () => {
      const items = [
        createTestItem({ id: '1', type: 'issue' }),
        createTestItem({ id: '2', type: 'discussion', category: 'Q&A' }),
        createTestItem({ id: '3', type: 'issue' }),
      ];
      const criteria: AIFilterCriteria = { types: ['issue'] };

      const result = applyAIFilter(items, criteria);

      expect(result.every(i => i.type === 'issue')).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('allows multiple types', () => {
      const items = [
        createTestItem({ id: '1', type: 'issue' }),
        createTestItem({ id: '2', type: 'discussion', category: 'Q&A' }),
      ];
      const criteria: AIFilterCriteria = { types: ['issue', 'discussion'] };

      const result = applyAIFilter(items, criteria);

      expect(result).toHaveLength(2);
    });
  });

  describe('title filtering', () => {
    it('matches keywords in title (case insensitive)', () => {
      const items = [
        createTestItem({ id: '1', title: 'Error when saving file' }),
        createTestItem({ id: '2', title: 'Feature: new tab support' }),
        createTestItem({ id: '3', title: 'CRASH on startup' }),
      ];
      const criteria: AIFilterCriteria = { titleContains: ['error', 'crash'] };

      const result = applyAIFilter(items, criteria);

      expect(result.map(i => i.id)).toEqual(['1', '3']);
    });
  });

  describe('author filtering', () => {
    it('matches author partially (case insensitive)', () => {
      const items = [
        createTestItem({ id: '1', author: 'john-doe' }),
        createTestItem({ id: '2', author: 'jane-smith' }),
        createTestItem({ id: '3', author: 'JOHN-123' }),
      ];
      const criteria: AIFilterCriteria = { authorIncludes: ['john'] };

      const result = applyAIFilter(items, criteria);

      expect(result.map(i => i.id)).toEqual(['1', '3']);
    });
  });

  describe('age filtering', () => {
    it('filters by minimum age', () => {
      const items = [
        createTestItem({ id: '1', ageInDays: 5 }),
        createTestItem({ id: '2', ageInDays: 10 }),
        createTestItem({ id: '3', ageInDays: 3 }),
      ];
      const criteria: AIFilterCriteria = { ageMinDays: 5 };

      const result = applyAIFilter(items, criteria);

      expect(result.map(i => i.id)).toEqual(['1', '2']);
    });

    it('filters by maximum age', () => {
      const items = [
        createTestItem({ id: '1', ageInDays: 5 }),
        createTestItem({ id: '2', ageInDays: 10 }),
        createTestItem({ id: '3', ageInDays: 3 }),
      ];
      const criteria: AIFilterCriteria = { ageMaxDays: 5 };

      const result = applyAIFilter(items, criteria);

      expect(result.map(i => i.id)).toEqual(['1', '3']);
    });

    it('filters by stale status', () => {
      const items = [
        createTestItem({ id: '1', isStale: true }),
        createTestItem({ id: '2', isStale: false }),
      ];
      const criteria: AIFilterCriteria = { isStale: true };

      const result = applyAIFilter(items, criteria);

      expect(result.map(i => i.id)).toEqual(['1']);
    });
  });

  describe('combined criteria', () => {
    it('applies all criteria with AND logic', () => {
      const items = [
        createTestItem({ id: '1', type: 'issue', labels: ['bug'], title: 'Bug report' }),
        createTestItem({ id: '2', type: 'issue', labels: ['feature'], title: 'Bug in feature' }),
        createTestItem({ id: '3', type: 'discussion', labels: ['bug'], title: 'Bug question', category: 'Q&A' }),
      ];
      const criteria: AIFilterCriteria = {
        types: ['issue'],
        labelsIncludeAny: ['bug'],
      };

      const result = applyAIFilter(items, criteria);

      // Only item 1 matches both: type=issue AND has bug label
      expect(result.map(i => i.id)).toEqual(['1']);
    });

    it('returns all items when criteria is empty', () => {
      const items = [
        createTestItem({ id: '1' }),
        createTestItem({ id: '2' }),
      ];

      const result = applyAIFilter(items, {});

      expect(result).toHaveLength(2);
    });
  });
});
