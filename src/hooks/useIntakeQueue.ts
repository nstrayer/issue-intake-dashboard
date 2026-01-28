import { useState, useEffect, useCallback } from 'react';

export interface QueueItem {
  id: string;
  type: 'issue' | 'discussion';
  number: number;
  title: string;
  author: string;
  createdAt: Date;
  labels: string[];
  url: string;
  body?: string; // Optional - fetched on demand
  category?: string; // discussions only
  isStale: boolean;
  ageInDays: number;
}

export interface IntakeQueue {
  items: QueueItem[];
  totalCount: number;
  unlabeledCount: number;
  staleCount: number;
  fetchedAt: Date | null;
  isLoading: boolean;
  error: string | null;
  warnings: string[];
}

const STALE_THRESHOLD_DAYS = 14;

function calculateAge(createdAt: string): { ageInDays: number; isStale: boolean } {
  const created = new Date(createdAt);
  const now = new Date();
  const ageInDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  return { ageInDays, isStale: ageInDays >= STALE_THRESHOLD_DAYS };
}

interface GitHubIssueSummary {
  number: number;
  title: string;
  author: { login: string };
  createdAt: string;
  labels: { name: string }[];
  url: string;
}

interface GitHubDiscussionSummary {
  number: number;
  title: string;
  author: { login: string };
  createdAt: string;
  category: { name: string };
  url: string;
}

interface IntakeQueueResponse {
  issues: GitHubIssueSummary[];
  discussions: GitHubDiscussionSummary[];
  fetchedAt: string;
  warnings?: string[];
}

export function useIntakeQueue(): IntakeQueue & { refresh: () => Promise<void> } {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/intake');
      if (!response.ok) throw new Error('Failed to fetch');

      const data: IntakeQueueResponse = await response.json();

      // Transform and unify issues + discussions
      const issueItems: QueueItem[] = data.issues.map((issue) => {
        const { ageInDays, isStale } = calculateAge(issue.createdAt);
        return {
          id: `issue-${issue.number}`,
          type: 'issue' as const,
          number: issue.number,
          title: issue.title,
          author: issue.author.login,
          createdAt: new Date(issue.createdAt),
          labels: issue.labels.map((l) => l.name),
          url: issue.url,
          // body not included in list response
          isStale,
          ageInDays,
        };
      });

      const discussionItems: QueueItem[] = data.discussions.map((disc) => {
        const { ageInDays, isStale } = calculateAge(disc.createdAt);
        return {
          id: `discussion-${disc.number}`,
          type: 'discussion' as const,
          number: disc.number,
          title: disc.title,
          author: disc.author?.login || 'unknown',
          createdAt: new Date(disc.createdAt),
          labels: [],
          url: disc.url,
          // body not included in list response
          category: disc.category?.name,
          isStale,
          ageInDays,
        };
      });

      // Sort by age (oldest first = most urgent)
      const allItems = [...issueItems, ...discussionItems].sort(
        (a, b) => b.ageInDays - a.ageInDays
      );

      setItems(allItems);
      setFetchedAt(new Date(data.fetchedAt));
      setWarnings(data.warnings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const unlabeledCount = items.filter(
    item => item.type === 'issue' && item.labels.length === 0
  ).length;

  const staleCount = items.filter(item => item.isStale).length;

  return {
    items,
    totalCount: items.length,
    unlabeledCount,
    staleCount,
    fetchedAt,
    isLoading,
    error,
    warnings,
    refresh: fetchData,
  };
}

// Separate hook for fetching item details on demand
export function useItemDetails(item: QueueItem | null) {
  const [details, setDetails] = useState<{ body: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item || item.body !== undefined) {
      // Already have body or no item selected
      setDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const endpoint = item.type === 'issue'
          ? `/api/issues/${item.number}`
          : `/api/discussions/${item.number}`;

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to fetch details');

        const data = await response.json();
        setDetails({ body: data.body || '' });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [item]);

  return {
    body: details?.body || item?.body || '',
    isLoading,
    error
  };
}
