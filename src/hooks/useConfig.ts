import { useState, useEffect } from 'react';

export interface RepoConfig {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
}

export interface AppConfig {
  repo: RepoConfig;
  intakeCriteria: string;
  pollIntervalSeconds: number;
}

export function useConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchConfig() {
      try {
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error('Failed to fetch config');
        }
        const data = await response.json();
        if (!cancelled) {
          setConfig(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  return { config, isLoading, error };
}
