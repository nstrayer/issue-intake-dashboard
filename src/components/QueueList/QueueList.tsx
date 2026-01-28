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
  sortBy: 'oldest' | 'newest' | 'type';
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

  // Apply sorting
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (filters.sortBy) {
      case 'newest':
        return b.createdAt.getTime() - a.createdAt.getTime();
      case 'oldest':
        return a.createdAt.getTime() - b.createdAt.getTime();
      case 'type':
        if (a.type !== b.type) return a.type === 'issue' ? -1 : 1;
        return a.createdAt.getTime() - b.createdAt.getTime();
      default:
        return 0;
    }
  });

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {/* Search and sort row */}
        <div className="flex gap-3 mb-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
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
              placeholder="Search issues..."
              value={filters.searchQuery}
              onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-sm input"
            />
          </div>
          <select
            value={filters.sortBy}
            onChange={(e) => onFiltersChange({ ...filters, sortBy: e.target.value as QueueFilters['sortBy'] })}
            className="px-3 py-2 text-sm input cursor-pointer"
            style={{ minWidth: '130px' }}
          >
            <option value="oldest">Oldest first</option>
            <option value="newest">Newest first</option>
            <option value="type">By type</option>
          </select>
        </div>

        {/* Filter chips */}
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
            icon={
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
            }
          />
          <FilterChip
            label="Discussions"
            active={filters.type === 'discussion'}
            onClick={() => onFiltersChange({ ...filters, type: 'discussion' })}
            icon={
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--info)' }} />
            }
          />

          <div className="w-px h-5 self-center mx-1" style={{ background: 'var(--border-subtle)' }} />

          <FilterChip
            label="Unlabeled"
            active={filters.hasLabels === 'unlabeled'}
            onClick={() => onFiltersChange({ ...filters, hasLabels: filters.hasLabels === 'unlabeled' ? 'all' : 'unlabeled' })}
          />
          <FilterChip
            label="Stale"
            active={filters.age === 'stale'}
            onClick={() => onFiltersChange({ ...filters, age: filters.age === 'stale' ? 'all' : 'stale' })}
            icon={
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto">
        {sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <svg className="w-6 h-6" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>
              {items.length === 0 ? 'No items in queue' : 'No items match filters'}
            </p>
            {items.length > 0 && (
              <button
                onClick={() => onFiltersChange({
                  type: 'all',
                  hasLabels: 'all',
                  age: 'all',
                  searchQuery: '',
                  sortBy: 'oldest',
                })}
                className="mt-3 text-sm"
                style={{ color: 'var(--accent)' }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="py-2">
            {sortedItems.map((item, index) => (
              <QueueItemRow
                key={item.id}
                item={item}
                isSelected={item.id === selectedId}
                onClick={() => onSelect(item)}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* Count footer */}
      <div
        className="px-4 py-2.5 text-xs"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)'
        }}
      >
        <span className="tabular-nums">{sortedItems.length}</span> of <span className="tabular-nums">{items.length}</span> items
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  icon
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150"
      style={{
        background: active ? 'var(--accent-dim)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        border: `1px solid ${active ? 'rgba(212, 165, 116, 0.3)' : 'var(--border-subtle)'}`,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function QueueItemRow({
  item,
  isSelected,
  onClick,
  index
}: {
  item: QueueItem;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 text-left transition-all duration-150 group"
      style={{
        background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
        borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
        animationDelay: `${Math.min(index * 0.02, 0.2)}s`,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'var(--bg-tertiary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <div className="flex items-start gap-3">
        {/* Type indicator */}
        <div
          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
          style={{
            background: item.type === 'issue' ? 'var(--success)' : 'var(--info)'
          }}
        />

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              #{item.number}
            </span>
            <span
              className="font-medium truncate text-sm"
              style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              {item.title}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>@{item.author}</span>
            <span className="flex items-center gap-1">
              <span
                className={item.isStale ? 'font-medium' : ''}
                style={{ color: item.isStale ? 'var(--warning)' : undefined }}
              >
                {item.ageInDays}d
              </span>
              {item.isStale && (
                <svg className="w-3 h-3" style={{ color: 'var(--warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </span>
          </div>

          {/* Labels */}
          {item.labels.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {item.labels.slice(0, 3).map(label => (
                <span
                  key={label}
                  className="px-2 py-0.5 text-xs rounded"
                  style={{
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {label}
                </span>
              ))}
              {item.labels.length > 3 && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  +{item.labels.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
