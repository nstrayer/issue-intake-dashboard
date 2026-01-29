import { describe, it, expect } from 'vitest';
import { createTestItem, createIntakeResponse, TEST_NOW, daysAgo } from '../fixtures';

describe('Test Fixtures', () => {
  describe('createTestItem', () => {
    it('creates a valid QueueItem with defaults', () => {
      const item = createTestItem();

      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('number');
      expect(item).toHaveProperty('title');
      expect(item.type).toBe('issue');
    });

    it('allows overriding properties', () => {
      const item = createTestItem({
        title: 'Custom title',
        labels: ['bug', 'urgent'],
        type: 'discussion',
      });

      expect(item.title).toBe('Custom title');
      expect(item.labels).toEqual(['bug', 'urgent']);
      expect(item.type).toBe('discussion');
    });
  });

  describe('createIntakeResponse', () => {
    it('creates empty response by default', () => {
      const response = createIntakeResponse();

      expect(response.issues).toEqual([]);
      expect(response.discussions).toEqual([]);
      expect(response.warnings).toEqual([]);
    });

    it('creates items with overrides', () => {
      const response = createIntakeResponse({
        issues: [{ title: 'Issue 1' }, { title: 'Issue 2' }],
        discussions: [{ title: 'Discussion 1' }],
      });

      expect(response.issues).toHaveLength(2);
      expect(response.discussions).toHaveLength(1);
      expect(response.issues[0].title).toBe('Issue 1');
    });
  });

  describe('daysAgo', () => {
    it('calculates date relative to TEST_NOW', () => {
      const fiveDaysAgo = daysAgo(5);
      const diff = TEST_NOW.getTime() - fiveDaysAgo.getTime();
      const daysDiff = diff / (24 * 60 * 60 * 1000);

      expect(daysDiff).toBe(5);
    });
  });
});
