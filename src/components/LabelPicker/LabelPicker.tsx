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
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Current Labels</h4>
          <div className="flex gap-1 flex-wrap">
            {currentLabels.map(label => (
              <span
                key={label}
                className="group px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm flex items-center gap-1"
              >
                {label}
                <button
                  onClick={() => onRemove(label)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-opacity"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add label */}
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          {isExpanded ? '− Hide label picker' : '+ Add label'}
        </button>

        {isExpanded && (
          <div className="mt-2 p-3 bg-gray-800 rounded-lg">
            <input
              type="text"
              placeholder="Search labels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm mb-2 focus:outline-none focus:border-blue-500"
            />

            {/* Quick access sections */}
            {!searchQuery && (
              <div className="space-y-2">
                <LabelSection title="Area" labels={AREA_LABELS} currentLabels={currentLabels} onApply={onApply} />
                <LabelSection title="Type" labels={TYPE_LABELS} currentLabels={currentLabels} onApply={onApply} />
                <LabelSection title="Status" labels={STATUS_LABELS} currentLabels={currentLabels} onApply={onApply} />
              </div>
            )}

            {/* Search results */}
            {searchQuery && (
              <div className="flex gap-1 flex-wrap">
                {filteredLabels.length === 0 ? (
                  <span className="text-gray-500 text-sm">No matching labels</span>
                ) : (
                  filteredLabels.map(label => (
                    <button
                      key={label}
                      onClick={() => {
                        onApply(label);
                        setSearchQuery('');
                      }}
                      className="px-2 py-1 bg-blue-900/50 text-blue-400 hover:bg-blue-800 rounded text-sm transition-colors"
                    >
                      + {label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
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
      <h5 className="text-xs text-gray-500 mb-1">{title}</h5>
      <div className="flex gap-1 flex-wrap">
        {available.map(label => (
          <button
            key={label}
            onClick={() => onApply(label)}
            className="px-2 py-0.5 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded text-xs transition-colors"
          >
            {label.replace(/^(area|type|status):/, '')}
          </button>
        ))}
      </div>
    </div>
  );
}
