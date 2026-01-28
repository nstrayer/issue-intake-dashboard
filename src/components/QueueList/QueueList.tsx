import { useState } from 'react';
import { QueueItem } from '../../types/intake';

interface QueueListProps {
  items: QueueItem[];
  selectedId: string | null;
  onSelect: (item: QueueItem) => void;
  filters: QueueFilters;
  onFiltersChange: (filters: QueueFilters) => void;
}

export interface QueueFilters {
  hasLabels: 'all' | 'labeled' | 'unlabeled';
  age: 'all' | 'fresh' | 'stale';
  searchQuery: string;
  sortBy: 'oldest' | 'newest';
}

export function QueueList({ items, selectedId, onSelect, filters, onFiltersChange }: QueueListProps) {
  const [issuesCollapsed, setIssuesCollapsed] = useState(false);
  const [discussionsCollapsed, setDiscussionsCollapsed] = useState(false);

  // Filter items (excluding type filter since we're separating them)
  const filteredItems = items.filter(item => {
    // Label filter only applies to issues (discussions don't have labels)
    if (filters.hasLabels === 'labeled' && item.type === 'issue' && item.labels.length === 0) return false;
    if (filters.hasLabels === 'unlabeled' && item.type === 'issue' && item.labels.length > 0) return false;

    if (filters.age === 'fresh' && item.isStale) return false;
    if (filters.age === 'stale' && !item.isStale) return false;
    if (filters.searchQuery && !item.title.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
    return true;
  });

  // Sort items
  const sortItems = (itemsToSort: QueueItem[]) => {
    return [...itemsToSort].sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'oldest':
        default:
          return a.createdAt.getTime() - b.createdAt.getTime();
      }
    });
  };

  // Separate and sort by type
  const issues = sortItems(filteredItems.filter(item => item.type === 'issue'));
  const discussions = sortItems(filteredItems.filter(item => item.type === 'discussion'));

  const totalIssues = items.filter(item => item.type === 'issue').length;
  const totalDiscussions = items.filter(item => item.type === 'discussion').length;

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
              placeholder="Search items..."
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
          </select>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap">
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

      {/* Split panels for Issues and Discussions */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Issues panel */}
        <TypePanel
          title="Issues"
          type="issue"
          items={issues}
          totalCount={totalIssues}
          selectedId={selectedId}
          onSelect={onSelect}
          collapsed={issuesCollapsed}
          onToggleCollapse={() => setIssuesCollapsed(!issuesCollapsed)}
          emptyMessage={items.length === 0 ? 'No issues in queue' : 'No issues match filters'}
        />

        {/* Divider */}
        <div
          className="h-px flex-shrink-0"
          style={{ background: 'var(--border-subtle)' }}
        />

        {/* Discussions panel */}
        <TypePanel
          title="Discussions"
          type="discussion"
          items={discussions}
          totalCount={totalDiscussions}
          selectedId={selectedId}
          onSelect={onSelect}
          collapsed={discussionsCollapsed}
          onToggleCollapse={() => setDiscussionsCollapsed(!discussionsCollapsed)}
          emptyMessage={items.length === 0 ? 'No discussions in queue' : 'No discussions match filters'}
        />
      </div>

      {/* Count footer */}
      <div
        className="px-4 py-2.5 text-xs flex-shrink-0"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)'
        }}
      >
        <span className="tabular-nums">{issues.length + discussions.length}</span> of <span className="tabular-nums">{items.length}</span> items
      </div>
    </div>
  );
}

function TypePanel({
  title,
  type,
  items,
  totalCount,
  selectedId,
  onSelect,
  collapsed,
  onToggleCollapse,
  emptyMessage,
}: {
  title: string;
  type: 'issue' | 'discussion';
  items: QueueItem[];
  totalCount: number;
  selectedId: string | null;
  onSelect: (item: QueueItem) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  emptyMessage: string;
}) {
  const typeColor = type === 'issue' ? 'var(--success)' : 'var(--info)';

  return (
    <div className={`flex flex-col ${collapsed ? 'flex-shrink-0' : 'flex-1 min-h-0'}`}>
      {/* Panel header */}
      <button
        onClick={onToggleCollapse}
        className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg-tertiary)] transition-colors"
        style={{ borderBottom: collapsed ? 'none' : '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: typeColor }}
          />
          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            {title}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
          >
            {items.length}/{totalCount}
          </span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
          style={{ color: 'var(--text-muted)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Panel content */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {emptyMessage}
              </p>
            </div>
          ) : (
            <div className="py-1">
              {items.map((item, index) => (
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
      )}
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
      className="w-full px-4 py-2.5 text-left transition-all duration-150 group"
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
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-0.5">
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
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
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
