import { useState, useEffect } from 'react';

interface LabelPickerProps {
  currentLabels: string[];
  onApply: (label: string) => void;
  onRemove: (label: string) => void;
}

export function LabelPicker({ currentLabels, onApply, onRemove }: LabelPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [allLabels, setAllLabels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch labels from API when picker is expanded
  useEffect(() => {
    if (isExpanded && allLabels.length === 0) {
      setIsLoading(true);
      fetch('/api/labels')
        .then(res => res.json())
        .then(data => {
          setAllLabels(data.labels || []);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [isExpanded, allLabels.length]);

  const availableLabels = allLabels.filter(l => !currentLabels.includes(l));

  const filteredLabels = searchQuery
    ? availableLabels.filter(l => l.toLowerCase().includes(searchQuery.toLowerCase()))
    : availableLabels;

  // Group labels by prefix for better organization
  const groupedLabels = filteredLabels.reduce((acc, label) => {
    const prefix = label.includes(':') ? label.split(':')[0] : 'other';
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(label);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="space-y-3">
      {/* Current labels */}
      {currentLabels.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {currentLabels.map(label => (
            <span
              key={label}
              className="group flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md transition-all duration-150"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {label}
              <button
                onClick={() => onRemove(label)}
                className="w-4 h-4 flex items-center justify-center rounded opacity-50 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--error)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add label toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-sm font-medium transition-colors duration-150"
        style={{ color: 'var(--accent)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--accent-muted)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--accent)';
        }}
      >
        <svg
          className="w-4 h-4 transition-transform duration-150"
          style={{ transform: isExpanded ? 'rotate(45deg)' : 'rotate(0deg)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        {isExpanded ? 'Close picker' : 'Add label'}
      </button>

      {/* Expanded picker */}
      {isExpanded && (
        <div
          className="p-3 rounded-lg animate-slideUp"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          {/* Search input */}
          <div className="relative mb-3">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--text-muted)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search labels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)'
              }}
              autoFocus
            />
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center gap-2 py-2">
              <svg className="w-4 h-4 spinner" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading labels...</span>
            </div>
          )}

          {/* Labels grouped by prefix */}
          {!isLoading && !searchQuery && (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Object.entries(groupedLabels).map(([prefix, labels]) => (
                <LabelSection
                  key={prefix}
                  title={prefix}
                  labels={labels}
                  currentLabels={currentLabels}
                  onApply={onApply}
                />
              ))}
              {Object.keys(groupedLabels).length === 0 && (
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No labels available
                </span>
              )}
            </div>
          )}

          {/* Search results */}
          {!isLoading && searchQuery && (
            <div className="flex gap-1.5 flex-wrap max-h-64 overflow-y-auto">
              {filteredLabels.length === 0 ? (
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No matching labels
                </span>
              ) : (
                filteredLabels.slice(0, 20).map(label => (
                  <button
                    key={label}
                    onClick={() => {
                      onApply(label);
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all duration-150"
                    style={{
                      background: 'var(--accent-dim)',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--accent)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--accent-dim)';
                      e.currentTarget.style.color = 'var(--accent)';
                    }}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LabelSection({
  title,
  labels,
  currentLabels,
  onApply
}: {
  title: string;
  labels: string[];
  currentLabels: string[];
  onApply: (label: string) => void;
}) {
  const available = labels.filter(l => !currentLabels.includes(l));
  if (available.length === 0) return null;

  return (
    <div>
      <h5 className="text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {title}
      </h5>
      <div className="flex gap-1.5 flex-wrap">
        {available.slice(0, 15).map(label => (
          <button
            key={label}
            onClick={() => onApply(label)}
            className="px-2 py-1 text-xs rounded-md transition-all duration-150"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            {label.includes(':') ? label.split(':')[1] : label}
          </button>
        ))}
        {available.length > 15 && (
          <span className="px-2 py-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            +{available.length - 15} more
          </span>
        )}
      </div>
    </div>
  );
}
