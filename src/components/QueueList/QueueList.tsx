import { QueueItem } from '../../types/intake';

interface QueueListProps {
  items: QueueItem[];
  selectedId: string | null;
  onSelect: (item: QueueItem) => void;
  filters: QueueFilters;
  onFiltersChange: (filters: QueueFilters) => void;
}

export interface QueueFilters {
  type: 'all' | 'issue' | 'discussion';
  hasLabels: 'all' | 'labeled' | 'unlabeled';
  age: 'all' | 'fresh' | 'stale';
  searchQuery: string;
}

export function QueueList({ items, selectedId, onSelect, filters, onFiltersChange }: QueueListProps) {
  const filteredItems = items.filter(item => {
    if (filters.type !== 'all' && item.type !== filters.type) return false;

    // Label filter only applies to issues (discussions don't have labels)
    if (filters.hasLabels === 'labeled' && item.type === 'issue' && item.labels.length === 0) return false;
    if (filters.hasLabels === 'unlabeled' && item.type === 'issue' && item.labels.length > 0) return false;

    if (filters.age === 'fresh' && item.isStale) return false;
    if (filters.age === 'stale' && !item.isStale) return false;
    if (filters.searchQuery && !item.title.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="p-3 border-b border-gray-800 space-y-2">
        <input
          type="text"
          placeholder="Search issues..."
          value={filters.searchQuery}
          onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
          className="w-full px-3 py-1.5 bg-[#0d1117] border border-gray-700 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <div className="flex gap-2 flex-wrap">
          <FilterChip
            label="All"
            active={filters.type === 'all'}
            onClick={() => onFiltersChange({ ...filters, type: 'all' })}
          />
          <FilterChip
            label="Issues"
            active={filters.type === 'issue'}
            onClick={() => onFiltersChange({ ...filters, type: 'issue' })}
          />
          <FilterChip
            label="Discussions"
            active={filters.type === 'discussion'}
            onClick={() => onFiltersChange({ ...filters, type: 'discussion' })}
          />
          <span className="mx-1 border-l border-gray-700" />
          <FilterChip
            label="Unlabeled Issues"
            active={filters.hasLabels === 'unlabeled'}
            onClick={() => onFiltersChange({ ...filters, hasLabels: filters.hasLabels === 'unlabeled' ? 'all' : 'unlabeled' })}
          />
          <FilterChip
            label="Stale"
            active={filters.age === 'stale'}
            onClick={() => onFiltersChange({ ...filters, age: filters.age === 'stale' ? 'all' : 'stale' })}
          />
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {items.length === 0 ? 'No items in queue' : 'No items match filters'}
          </div>
        ) : (
          filteredItems.map(item => (
            <QueueItemRow
              key={item.id}
              item={item}
              isSelected={item.id === selectedId}
              onClick={() => onSelect(item)}
            />
          ))
        )}
      </div>

      {/* Count footer */}
      <div className="p-2 border-t border-gray-800 text-xs text-gray-500 text-center">
        Showing {filteredItems.length} of {items.length} items
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

function QueueItemRow({ item, isSelected, onClick }: { item: QueueItem; isSelected: boolean; onClick: () => void }) {
  const typeIcon = item.type === 'issue' ? '●' : '💬';

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 text-left border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
        isSelected ? 'bg-gray-800 border-l-2 border-l-blue-500' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`text-sm ${item.type === 'issue' ? 'text-green-400' : 'text-purple-400'}`}>
          {typeIcon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">#{item.number}</span>
            <span className="text-white font-medium truncate">{item.title}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs">
            <span className="text-gray-500">@{item.author}</span>
            <span className={`${item.isStale ? 'text-yellow-400' : 'text-gray-500'}`}>
              {item.ageInDays}d
            </span>
            {item.isStale && (
              <span className="px-1.5 py-0.5 bg-yellow-900/50 text-yellow-400 rounded text-xs">
                STALE
              </span>
            )}
          </div>
          {item.labels.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {item.labels.slice(0, 3).map(label => (
                <span key={label} className="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">
                  {label}
                </span>
              ))}
              {item.labels.length > 3 && (
                <span className="text-gray-500 text-xs">+{item.labels.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
