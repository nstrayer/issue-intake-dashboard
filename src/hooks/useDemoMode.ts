import { useState, useEffect, useCallback } from 'react';

const DEMO_MODE_KEY = 'triage-sidekick-demo-mode';

interface UseDemoModeOptions {
  /** If true, automatically enable demo mode when there's no real data */
  autoEnableWhenEmpty?: boolean;
  /** Number of real items in the queue (used for auto-enable logic) */
  realItemCount?: number;
}

interface UseDemoModeReturn {
  isDemoMode: boolean;
  enableDemoMode: () => void;
  disableDemoMode: () => void;
  toggleDemoMode: () => void;
}

export function useDemoMode(options: UseDemoModeOptions = {}): UseDemoModeReturn {
  const { autoEnableWhenEmpty = false, realItemCount = 0 } = options;

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    const stored = localStorage.getItem(DEMO_MODE_KEY);
    return stored === 'true';
  });

  // Track if we've done the initial auto-enable check
  const [hasCheckedAutoEnable, setHasCheckedAutoEnable] = useState(false);

  // Auto-enable demo mode when queue is empty and we haven't explicitly disabled it
  useEffect(() => {
    if (autoEnableWhenEmpty && !hasCheckedAutoEnable) {
      // Only auto-enable if:
      // 1. There's no real data
      // 2. User hasn't explicitly set a preference (no stored value)
      const storedPref = localStorage.getItem(DEMO_MODE_KEY);

      if (realItemCount === 0 && storedPref === null) {
        setIsDemoMode(true);
        // Don't persist auto-enable - let user explicitly save preference
      }
      setHasCheckedAutoEnable(true);
    }
  }, [autoEnableWhenEmpty, realItemCount, hasCheckedAutoEnable]);

  const enableDemoMode = useCallback(() => {
    setIsDemoMode(true);
    localStorage.setItem(DEMO_MODE_KEY, 'true');
  }, []);

  const disableDemoMode = useCallback(() => {
    setIsDemoMode(false);
    localStorage.setItem(DEMO_MODE_KEY, 'false');
  }, []);

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode(prev => {
      const newValue = !prev;
      localStorage.setItem(DEMO_MODE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  return {
    isDemoMode,
    enableDemoMode,
    disableDemoMode,
    toggleDemoMode,
  };
}
