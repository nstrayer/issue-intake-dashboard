import type { QueueItem, ClaudeAnalysis } from '../types/intake';

// Fixed date for deterministic time-based tests
export const TEST_NOW = new Date('2026-01-29T12:00:00Z');

export function daysAgo(days: number): Date {
  return new Date(TEST_NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

// Factory for test items - only specify what matters for each test
export function createTestItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: `test-${Math.random().toString(36).slice(2)}`,
    type: 'issue',
    number: Math.floor(Math.random() * 10000),
    title: 'Test item',
    author: 'test-user',
    createdAt: daysAgo(1),
    labels: [],
    url: 'https://github.com/test/repo/issues/1',
    isStale: false,
    ageInDays: 1,
    ageInHours: 24,
    ...overrides,
  };
}

// Common test scenarios
export const TEST_ITEMS = {
  newIssue: createTestItem({ type: 'issue', ageInDays: 1 }),
  staleIssue: createTestItem({ type: 'issue', ageInDays: 20, isStale: true }),
  labeledIssue: createTestItem({ labels: ['bug', 'area: editor'] }),
  unlabeledIssue: createTestItem({ labels: [] }),
  discussion: createTestItem({ type: 'discussion', category: 'Q&A' }),
};

// API response factories
export function createIntakeResponse(overrides: Partial<{
  issues: Partial<QueueItem>[];
  discussions: Partial<QueueItem>[];
  warnings: string[];
}> = {}) {
  return {
    issues: overrides.issues?.map(i => createTestItem({ type: 'issue', ...i })) ?? [],
    discussions: overrides.discussions?.map(d => createTestItem({ type: 'discussion', category: 'Q&A', ...d })) ?? [],
    warnings: overrides.warnings ?? [],
  };
}

export function createAnalysisResponse(overrides: Partial<ClaudeAnalysis> = {}): ClaudeAnalysis {
  return {
    suggestedLabels: [],
    duplicates: [],
    summary: 'Test summary',
    isLoading: false,
    ...overrides,
  };
}
