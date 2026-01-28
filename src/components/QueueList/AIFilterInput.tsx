import { useState, FormEvent } from 'react';
import type { AIFilterResult, AIFilterCriteria } from '../../types/aiFilter';

interface AIFilterInputProps {
  isLoading: boolean;
  error: string | null;
  result: AIFilterResult | null;
  onSubmit: (query: string) => void;
  onClear: () => void;
  includeAllItems: boolean;
  onIncludeAllItemsChange: (value: boolean) => void;
}

/**
 * Format criteria into readable filter rules
 */
function formatCriteriaRules(criteria: AIFilterCriteria): string[] {
  const rules: string[] = [];

  if (criteria.types?.length) {
    rules.push(`type: ${criteria.types.join(' | ')}`);
  }
  if (criteria.titleContains?.length) {
    rules.push(`title contains: "${criteria.titleContains.join('" or "')}"`);
  }
  if (criteria.authorIncludes?.length) {
    rules.push(`author: ${criteria.authorIncludes.join(' | ')}`);
  }
  if (criteria.labelsIncludeAny?.length) {
    rules.push(`labels: ${criteria.labelsIncludeAny.join(' | ')}`);
  }
  if (criteria.labelsExclude?.length) {
    rules.push(`exclude labels: ${criteria.labelsExclude.join(', ')}`);
  }
  if (criteria.hasLabels === true) {
    rules.push('has labels: yes');
  } else if (criteria.hasLabels === false) {
    rules.push('has labels: no');
  }
  if (criteria.ageMinDays !== undefined) {
    rules.push(`age >= ${criteria.ageMinDays}d`);
  }
  if (criteria.ageMaxDays !== undefined) {
    rules.push(`age <= ${criteria.ageMaxDays}d`);
  }
  if (criteria.isStale === true) {
    rules.push('stale: yes (>14d)');
  } else if (criteria.isStale === false) {
    rules.push('stale: no');
  }

  return rules;
}

export function AIFilterInput({
  isLoading,
  error,
  result,
  onSubmit,
  onClear,
  includeAllItems,
  onIncludeAllItemsChange,
}: AIFilterInputProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    onClear();
  };

  return (
    <div className="space-y-3">
      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--text-muted)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
            />
          </svg>
          <input
            type="text"
            placeholder="Describe what you want to see..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            className="w-full pl-9 pr-3 py-2 text-sm input"
            style={{
              opacity: isLoading ? 0.6 : 1,
            }}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150"
          style={{
            background: isLoading || !query.trim() ? 'var(--bg-tertiary)' : 'var(--accent)',
            color: isLoading || !query.trim() ? 'var(--text-muted)' : 'var(--bg-primary)',
            cursor: isLoading || !query.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </span>
          ) : (
            'Go'
          )}
        </button>
      </form>

      {/* Include all items toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={includeAllItems}
          onChange={(e) => onIncludeAllItemsChange(e.target.checked)}
          className="w-3.5 h-3.5 rounded cursor-pointer accent-[var(--accent)]"
        />
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Include all items
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          (bypass intake filters)
        </span>
      </label>

      {/* Error message */}
      {error && (
        <div
          className="px-3 py-2 rounded-lg text-sm"
          style={{
            background: 'rgba(229, 105, 90, 0.1)',
            border: '1px solid rgba(229, 105, 90, 0.25)',
            color: 'var(--error)',
          }}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
            <button
              onClick={() => onSubmit(query.trim())}
              className="ml-auto text-xs underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Active filter criteria */}
      {result && (
        <div
          className="px-3 py-2 rounded-lg"
          style={{
            background: 'rgba(212, 165, 116, 0.1)',
            border: '1px solid rgba(212, 165, 116, 0.25)',
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: 'var(--accent)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Active Filters
                </span>
              </div>
              {/* Filter rules */}
              <div className="flex flex-wrap gap-1.5 pl-6">
                {formatCriteriaRules(result.criteria).map((rule, i) => (
                  <code
                    key={i}
                    className="px-1.5 py-0.5 text-xs rounded"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {rule}
                  </code>
                ))}
                {formatCriteriaRules(result.criteria).length === 0 && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    No filters applied (showing all items)
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors flex-shrink-0"
              style={{
                color: 'var(--text-muted)',
                background: 'var(--bg-tertiary)',
              }}
            >
              Clear
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
