import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useIntakeQueue, DEFAULT_INTAKE_FILTERS } from '../useIntakeQueue';
import { mockApi, resetApiMock } from '../../test/apiMock';

// Use real dates for testing - the hook calculates age from current time
const NOW = new Date();

describe('useIntakeQueue', () => {
  afterEach(() => {
    resetApiMock();
  });

  it('starts in loading state', () => {
    mockApi({ '/api/intake': { issues: [], discussions: [], fetchedAt: NOW.toISOString(), activeFilters: DEFAULT_INTAKE_FILTERS } });

    const { result } = renderHook(() => useIntakeQueue(DEFAULT_INTAKE_FILTERS));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toEqual([]);
  });

  it('returns items after loading', async () => {
    mockApi({
      '/api/intake': {
        issues: [
          { number: 1, title: 'Issue 1', author: { login: 'user1' }, createdAt: NOW.toISOString(), labels: [], url: 'https://github.com/test/repo/issues/1' },
          { number: 2, title: 'Issue 2', author: { login: 'user2' }, createdAt: NOW.toISOString(), labels: [], url: 'https://github.com/test/repo/issues/2' },
        ],
        discussions: [],
        fetchedAt: NOW.toISOString(),
        activeFilters: DEFAULT_INTAKE_FILTERS,
      },
    });

    const { result } = renderHook(() => useIntakeQueue(DEFAULT_INTAKE_FILTERS));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('sets error state on fetch failure', async () => {
    mockApi({ '/api/intake': new Error('Network error') });

    const { result } = renderHook(() => useIntakeQueue(DEFAULT_INTAKE_FILTERS));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.items).toEqual([]);
  });

  it('calculates staleness based on age (>14 days = stale)', async () => {
    const fifteenDaysAgo = new Date(NOW.getTime() - 15 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000);

    mockApi({
      '/api/intake': {
        issues: [
          { number: 1, title: 'Old issue', author: { login: 'user' }, createdAt: fifteenDaysAgo.toISOString(), labels: [], url: 'https://github.com/test/repo/issues/1' },
          { number: 2, title: 'New issue', author: { login: 'user' }, createdAt: oneDayAgo.toISOString(), labels: [], url: 'https://github.com/test/repo/issues/2' },
        ],
        discussions: [],
        fetchedAt: NOW.toISOString(),
        activeFilters: DEFAULT_INTAKE_FILTERS,
      },
    });

    const { result } = renderHook(() => useIntakeQueue(DEFAULT_INTAKE_FILTERS));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const oldItem = result.current.items.find(i => i.number === 1);
    const newItem = result.current.items.find(i => i.number === 2);

    expect(oldItem?.isStale).toBe(true);
    expect(newItem?.isStale).toBe(false);
  });

  it('counts unlabeled issues correctly', async () => {
    mockApi({
      '/api/intake': {
        issues: [
          { number: 1, title: 'Unlabeled 1', author: { login: 'user' }, createdAt: NOW.toISOString(), labels: [], url: 'https://github.com/test/repo/issues/1' },
          { number: 2, title: 'Labeled', author: { login: 'user' }, createdAt: NOW.toISOString(), labels: [{ name: 'bug' }], url: 'https://github.com/test/repo/issues/2' },
          { number: 3, title: 'Unlabeled 2', author: { login: 'user' }, createdAt: NOW.toISOString(), labels: [], url: 'https://github.com/test/repo/issues/3' },
        ],
        discussions: [
          { number: 10, title: 'Discussion', author: { login: 'user' }, createdAt: NOW.toISOString(), category: { name: 'Q&A' }, url: 'https://github.com/test/repo/discussions/10' },
        ],
        fetchedAt: NOW.toISOString(),
        activeFilters: DEFAULT_INTAKE_FILTERS,
      },
    });

    const { result } = renderHook(() => useIntakeQueue(DEFAULT_INTAKE_FILTERS));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Only issues count toward unlabeledCount
    expect(result.current.unlabeledCount).toBe(2);
  });

  it('provides refresh function that refetches data', async () => {
    let callCount = 0;
    mockApi({
      '/api/intake': () => {
        callCount++;
        return {
          issues: [{ number: callCount, title: `Issue ${callCount}`, author: { login: 'user' }, createdAt: NOW.toISOString(), labels: [], url: 'https://github.com/test/repo/issues/1' }],
          discussions: [],
          fetchedAt: NOW.toISOString(),
          activeFilters: DEFAULT_INTAKE_FILTERS,
        };
      },
    });

    const { result } = renderHook(() => useIntakeQueue(DEFAULT_INTAKE_FILTERS));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items[0].number).toBe(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.items[0].number).toBe(2);
  });

  it('includes discussions in items', async () => {
    mockApi({
      '/api/intake': {
        issues: [],
        discussions: [
          { number: 10, title: 'Discussion', author: { login: 'user' }, createdAt: NOW.toISOString(), category: { name: 'Q&A' }, url: 'https://github.com/test/repo/discussions/10' },
        ],
        fetchedAt: NOW.toISOString(),
        activeFilters: DEFAULT_INTAKE_FILTERS,
      },
    });

    const { result } = renderHook(() => useIntakeQueue(DEFAULT_INTAKE_FILTERS));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].type).toBe('discussion');
  });
});
