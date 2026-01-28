import { useState, useCallback } from 'react';
import type { AIFilterCriteria, AIFilterResult, AIFilterState } from '../types/aiFilter';
import type { QueueItem } from '../types/intake';

export function useAIFilter() {
  const [state, setState] = useState<AIFilterState>({
    isLoading: false,
    error: null,
    result: null,
  });

  const generateFilter = useCallback(async (query: string) => {
    if (!query.trim()) {
      return;
    }

    setState({ isLoading: true, error: null, result: null });

    try {
      const response = await fetch('/api/filters/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate filter');
      }

      const result: AIFilterResult = await response.json();
      setState({ isLoading: false, error: null, result });
    } catch (err) {
      setState({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        result: null,
      });
    }
  }, []);

  const clearFilter = useCallback(() => {
    setState({ isLoading: false, error: null, result: null });
  }, []);

  return {
    ...state,
    generateFilter,
    clearFilter,
  };
}

/**
 * Apply AI filter criteria to a list of queue items.
 * Returns only items that match all specified criteria.
 */
export function applyAIFilter(
  items: QueueItem[],
  criteria: AIFilterCriteria
): QueueItem[] {
  return items.filter((item) => {
    // Filter by type
    if (criteria.types && criteria.types.length > 0) {
      if (!criteria.types.includes(item.type)) {
        return false;
      }
    }

    // Filter by title contains (case-insensitive, match any)
    if (criteria.titleContains && criteria.titleContains.length > 0) {
      const titleLower = item.title.toLowerCase();
      const matchesAny = criteria.titleContains.some((term) =>
        titleLower.includes(term.toLowerCase())
      );
      if (!matchesAny) {
        return false;
      }
    }

    // Filter by author (partial match, any)
    if (criteria.authorIncludes && criteria.authorIncludes.length > 0) {
      const authorLower = item.author.toLowerCase();
      const matchesAny = criteria.authorIncludes.some((term) =>
        authorLower.includes(term.toLowerCase())
      );
      if (!matchesAny) {
        return false;
      }
    }

    // Filter by labels include any (fuzzy match - contains)
    if (criteria.labelsIncludeAny && criteria.labelsIncludeAny.length > 0) {
      const hasAny = criteria.labelsIncludeAny.some((label) => {
        const searchTerm = label.toLowerCase();
        return item.labels.some((l) => {
          const itemLabel = l.toLowerCase();
          // Match if either contains the other, or exact match
          return itemLabel === searchTerm ||
                 itemLabel.includes(searchTerm) ||
                 searchTerm.includes(itemLabel);
        });
      });
      if (!hasAny) {
        return false;
      }
    }

    // Filter by labels exclude (fuzzy match - contains)
    if (criteria.labelsExclude && criteria.labelsExclude.length > 0) {
      const hasExcluded = criteria.labelsExclude.some((label) => {
        const searchTerm = label.toLowerCase();
        return item.labels.some((l) => {
          const itemLabel = l.toLowerCase();
          return itemLabel === searchTerm ||
                 itemLabel.includes(searchTerm) ||
                 searchTerm.includes(itemLabel);
        });
      });
      if (hasExcluded) {
        return false;
      }
    }

    // Filter by has labels
    if (criteria.hasLabels !== undefined) {
      const hasLabels = item.labels.length > 0;
      if (criteria.hasLabels !== hasLabels) {
        return false;
      }
    }

    // Filter by minimum age
    if (criteria.ageMinDays !== undefined) {
      if (item.ageInDays < criteria.ageMinDays) {
        return false;
      }
    }

    // Filter by maximum age
    if (criteria.ageMaxDays !== undefined) {
      if (item.ageInDays > criteria.ageMaxDays) {
        return false;
      }
    }

    // Filter by stale status
    if (criteria.isStale !== undefined) {
      if (item.isStale !== criteria.isStale) {
        return false;
      }
    }

    return true;
  });
}
