import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIFilter } from '../useAIFilter';
import { mockApi, resetApiMock } from '../../test/apiMock';

describe('useAIFilter', () => {
  afterEach(() => {
    resetApiMock();
  });

  describe('initial state', () => {
    it('starts with no filter active', () => {
      const { result } = renderHook(() => useAIFilter());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.result).toBeNull();
    });
  });

  describe('generateFilter', () => {
    it('returns filter criteria on success', async () => {
      mockApi({
        '/api/filters/ai': {
          criteria: { labelsIncludeAny: ['bug'] },
          explanation: 'Showing bugs',
          originalQuery: 'show me bugs',
        },
      });

      const { result } = renderHook(() => useAIFilter());

      await act(async () => {
        await result.current.generateFilter('show me bugs');
      });

      expect(result.current.result).toEqual({
        criteria: { labelsIncludeAny: ['bug'] },
        explanation: 'Showing bugs',
        originalQuery: 'show me bugs',
      });
    });

    it('sets loading state while fetching', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise(resolve => { resolvePromise = resolve; });

      mockApi({ '/api/filters/ai': promise });

      const { result } = renderHook(() => useAIFilter());

      act(() => {
        result.current.generateFilter('test');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({ criteria: {}, explanation: 'Filter', originalQuery: 'test' });
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets error state on failure', async () => {
      mockApi({ '/api/filters/ai': new Error('API error') });

      const { result } = renderHook(() => useAIFilter());

      await act(async () => {
        await result.current.generateFilter('test');
      });

      expect(result.current.error).toBe('API error');
      expect(result.current.result).toBeNull();
    });

    it('sets error from API response', async () => {
      mockApi({
        '/api/filters/ai': {
          ok: false,
          status: 400,
          json: async () => ({ error: 'Query is required' }),
        },
      });

      const { result } = renderHook(() => useAIFilter());

      await act(async () => {
        await result.current.generateFilter('test');
      });

      expect(result.current.error).toBe('Query is required');
    });

    it('ignores empty queries', async () => {
      const fetchMock = mockApi({ '/api/filters/ai': {} });

      const { result } = renderHook(() => useAIFilter());

      await act(async () => {
        await result.current.generateFilter('');
        await result.current.generateFilter('   ');
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('clearFilter', () => {
    it('resets all state', async () => {
      mockApi({
        '/api/filters/ai': { criteria: { labelsIncludeAny: ['bug'] }, explanation: 'Test', originalQuery: 'bugs' },
      });

      const { result } = renderHook(() => useAIFilter());

      await act(async () => {
        await result.current.generateFilter('bugs');
      });

      expect(result.current.result).not.toBeNull();

      act(() => {
        result.current.clearFilter();
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
