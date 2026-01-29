import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDemoMode } from '../useDemoMode';

const STORAGE_KEY = 'triage-sidekick-demo-mode';

describe('useDemoMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initial state', () => {
    it('defaults to false when no stored preference', () => {
      const { result } = renderHook(() => useDemoMode());
      expect(result.current.isDemoMode).toBe(false);
    });

    it('reads stored true preference', () => {
      localStorage.setItem(STORAGE_KEY, 'true');

      const { result } = renderHook(() => useDemoMode());

      expect(result.current.isDemoMode).toBe(true);
    });

    it('reads stored false preference', () => {
      localStorage.setItem(STORAGE_KEY, 'false');

      const { result } = renderHook(() => useDemoMode());

      expect(result.current.isDemoMode).toBe(false);
    });
  });

  describe('toggle behavior', () => {
    it('toggleDemoMode flips the value and persists', () => {
      const { result } = renderHook(() => useDemoMode());

      act(() => result.current.toggleDemoMode());

      expect(result.current.isDemoMode).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');

      act(() => result.current.toggleDemoMode());

      expect(result.current.isDemoMode).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });

    it('enableDemoMode sets true and persists', () => {
      const { result } = renderHook(() => useDemoMode());

      act(() => result.current.enableDemoMode());

      expect(result.current.isDemoMode).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('disableDemoMode sets false and persists', () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      const { result } = renderHook(() => useDemoMode());

      act(() => result.current.disableDemoMode());

      expect(result.current.isDemoMode).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });
  });

  describe('auto-enable behavior', () => {
    it('auto-enables when queue is empty and no stored preference', async () => {
      const { result, rerender } = renderHook(
        ({ autoEnableWhenEmpty, realItemCount }) =>
          useDemoMode({ autoEnableWhenEmpty, realItemCount }),
        { initialProps: { autoEnableWhenEmpty: true, realItemCount: 0 } }
      );

      // Need to rerender to trigger the effect
      rerender({ autoEnableWhenEmpty: true, realItemCount: 0 });

      // Wait for effect to run
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(result.current.isDemoMode).toBe(true);
    });

    it('does NOT persist auto-enabled state', async () => {
      const { rerender } = renderHook(
        ({ autoEnableWhenEmpty, realItemCount }) =>
          useDemoMode({ autoEnableWhenEmpty, realItemCount }),
        { initialProps: { autoEnableWhenEmpty: true, realItemCount: 0 } }
      );

      rerender({ autoEnableWhenEmpty: true, realItemCount: 0 });
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should not have written to localStorage
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('respects explicit false preference over auto-enable', async () => {
      localStorage.setItem(STORAGE_KEY, 'false');

      const { result, rerender } = renderHook(
        ({ autoEnableWhenEmpty, realItemCount }) =>
          useDemoMode({ autoEnableWhenEmpty, realItemCount }),
        { initialProps: { autoEnableWhenEmpty: true, realItemCount: 0 } }
      );

      rerender({ autoEnableWhenEmpty: true, realItemCount: 0 });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(result.current.isDemoMode).toBe(false);
    });

    it('does not auto-enable when queue has items', async () => {
      const { result, rerender } = renderHook(
        ({ autoEnableWhenEmpty, realItemCount }) =>
          useDemoMode({ autoEnableWhenEmpty, realItemCount }),
        { initialProps: { autoEnableWhenEmpty: true, realItemCount: 5 } }
      );

      rerender({ autoEnableWhenEmpty: true, realItemCount: 5 });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(result.current.isDemoMode).toBe(false);
    });
  });
});
