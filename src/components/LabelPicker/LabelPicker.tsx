import { useState } from 'react';

interface LabelPickerProps {
  currentLabels: string[];
  onApply: (label: string) => void;
  onRemove: (label: string) => void;
}

// Common labels for the Positron repo
const AREA_LABELS = [
  'area:editor', 'area:console', 'area:variables', 'area:plots',
  'area:connections', 'area:help', 'area:data-explorer', 'area:notebooks',
  'area:extensions', 'area:r', 'area:python', 'area:infrastructure',
];

const TYPE_LABELS = ['type:bug', 'type:enhancement', 'type:question', 'type:docs'];

const STATUS_LABELS = ['status:triaged', 'status:needs-info', 'status:blocked'];

export function LabelPicker({ currentLabels, onApply, onRemove }: LabelPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const allLabels = [...AREA_LABELS, ...TYPE_LABELS, ...STATUS_LABELS];
  const availableLabels = allLabels.filter(l => !currentLabels.includes(l));

  const filteredLabels = searchQuery
    ? availableLabels.filter(l => l.toLowerCase().includes(searchQuery.toLowerCase()))
    : availableLabels;

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

          {/* Quick access sections */}
          {!searchQuery && (
            <div className="space-y-3">
              <LabelSection title="Area" labels={AREA_LABELS} currentLabels={currentLabels} onApply={onApply} />
              <LabelSection title="Type" labels={TYPE_LABELS} currentLabels={currentLabels} onApply={onApply} />
              <LabelSection title="Status" labels={STATUS_LABELS} currentLabels={currentLabels} onApply={onApply} />
            </div>
          )}

          {/* Search results */}
          {searchQuery && (
            <div className="flex gap-1.5 flex-wrap">
              {filteredLabels.length === 0 ? (
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No matching labels
                </span>
              ) : (
                filteredLabels.map(label => (
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
                      border: '1px solid rgba(212, 165, 116, 0.2)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(212, 165, 116, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--accent-dim)';
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
        {available.map(label => (
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
            {label.replace(/^(area|type|status):/, '')}
          </button>
        ))}
      </div>
    </div>
  );
}
