import { useState, useEffect, useCallback } from 'react';

export interface ToolStatus {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

export interface EnvironmentStatus {
  targetRepoPath: string;
  toolStatuses: ToolStatus[];
  isLoading: boolean;
  error: string | null;
  hasCriticalFailures: boolean;
  hasWarnings: boolean;
  refresh: () => void;
}

interface SetupCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
  fixCommand?: string;
}

interface SetupCheckResponse {
  targetRepoPath: string;
  checks: SetupCheckResult[];
  allPassed: boolean;
  hasWarnings: boolean;
  hasCriticalFailures: boolean;
}

export function useEnvironmentStatus(): EnvironmentStatus {
  const [targetRepoPath, setTargetRepoPath] = useState<string>('');
  const [toolStatuses, setToolStatuses] = useState<ToolStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCriticalFailures, setHasCriticalFailures] = useState(false);
  const [hasWarnings, setHasWarnings] = useState(false);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/setup-check');
      if (!response.ok) {
        throw new Error('Failed to fetch environment status');
      }
      const data: SetupCheckResponse = await response.json();

      setTargetRepoPath(data.targetRepoPath);
      setHasCriticalFailures(data.hasCriticalFailures);
      setHasWarnings(data.hasWarnings);

      // Extract the three main tool statuses
      const toolNames = ['Claude Code CLI', 'GitHub CLI', 'GitHub Authentication'];
      const statuses: ToolStatus[] = toolNames
        .map(name => {
          const check = data.checks.find(c => c.name === name);
          if (check) {
            return {
              name: name === 'Claude Code CLI' ? 'Claude' : name === 'GitHub CLI' ? 'GitHub CLI' : 'Auth',
              status: check.status,
              message: check.message,
            };
          }
          return null;
        })
        .filter((s): s is ToolStatus => s !== null);

      setToolStatuses(statuses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    targetRepoPath,
    toolStatuses,
    isLoading,
    error,
    hasCriticalFailures,
    hasWarnings,
    refresh: fetchStatus,
  };
}
