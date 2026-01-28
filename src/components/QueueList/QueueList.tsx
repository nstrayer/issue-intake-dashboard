import { useState } from 'react';
import { QueueItem, formatAge } from '../../types/intake';
import { IntakeFilterOptions, DEFAULT_INTAKE_FILTERS } from '../../hooks/useIntakeQueue';
import { AIFilterInput } from './AIFilterInput';
import { applyAIFilter } from '../../hooks/useAIFilter';
import type { AIFilterResult } from '../../types/aiFilter';

export type FilterMode = 'standard' | 'ai';

interface QueueListProps {
  items: QueueItem[];
  selectedId: string | null;
  onSelect: (item: QueueItem) => void;
  filters: QueueFilters;
  onFiltersChange: (filters: QueueFilters) => void;
  intakeFilters: IntakeFilterOptions;
  onIntakeFiltersChange: (filters: IntakeFilterOptions) => void;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  aiFilter: {
    isLoading: boolean;
    error: string | null;
    result: AIFilterResult | null;
  };
  onAIFilterSubmit: (query: string) => void;
  onAIFilterClear: () => void;
  includeAllItems: boolean;
  onIncludeAllItemsChange: (value: boolean) => void;
  isLoading?: boolean;
}

export type SortOrder = 'oldest' | 'newest';

export interface QueueFilters {
  hasLabels: 'all' | 'labeled' | 'unlabeled';
  age: 'all' | 'fresh' | 'stale';
  searchQuery: string;
  issuesSortBy: SortOrder;
  discussionsSortBy: SortOrder;
}

// Human-readable labels for intake filter options
const INTAKE_FILTER_LABELS: Record<keyof IntakeFilterOptions, { label: string; description: string }> = {
  excludeBacklogProject: {
    label: 'Hide backlog items',
    description: 'Items in "Positron Backlog" project',
  },
  excludeMilestoned: {
    label: 'Hide milestoned',
    description: 'Items assigned to a milestone',
  },
  excludeTriagedLabels: {
    label: 'Hide triaged labels',
    description: 'Items with duplicate/wontfix/invalid labels',
  },
  excludeStatusSet: {
    label: 'Hide with status',
    description: 'Items with Status field set in project',
  },
  excludeAnswered: {
    label: 'Hide answered',
    description: 'Discussions that have been answered',
  },
  excludeMaintainerResponded: {
    label: 'Hide maintainer-responded',
    description: 'Discussions where a maintainer replied but no user follow-up',
  },
};

export function QueueList({
  items,
  selectedId,
  onSelect,
  filters,
  onFiltersChange,
  intakeFilters,
  onIntakeFiltersChange,
  filterMode,
  onFilterModeChange,
  aiFilter,
  onAIFilterSubmit,
  onAIFilterClear,
  includeAllItems,
  onIncludeAllItemsChange,
  isLoading = false,
}: QueueListProps) {
  const [issuesCollapsed, setIssuesCollapsed] = useState(false);
  const [discussionsCollapsed, setDiscussionsCollapsed] = useState(false);
  const [intakeFiltersExpanded, setIntakeFiltersExpanded] = useState(false);

  // Check if any intake filters are disabled (showing more items)
  const hasCustomIntakeFilters = Object.entries(intakeFilters).some(
    ([key, value]) => value !== DEFAULT_INTAKE_FILTERS[key as keyof IntakeFilterOptions]
  );

  // Filter items based on active mode
  const filteredItems = filterMode === 'ai' && aiFilter.result
    ? applyAIFilter(items, aiFilter.result.criteria)
    : items.filter(item => {
        // Standard filter logic
        // Label filter only applies to issues (discussions don't have labels)
        if (filters.hasLabels === 'labeled' && item.type === 'issue' && item.labels.length === 0) return false;
        if (filters.hasLabels === 'unlabeled' && item.type === 'issue' && item.labels.length > 0) return false;

        if (filters.age === 'fresh' && item.isStale) return false;
        if (filters.age === 'stale' && !item.isStale) return false;
        if (filters.searchQuery && !item.title.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
        return true;
      });

  // Sort items by given sort order
  const sortItems = (itemsToSort: QueueItem[], sortBy: SortOrder) => {
    return [...itemsToSort].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'oldest':
        default:
          return a.createdAt.getTime() - b.createdAt.getTime();
      }
    });
  };

  // Separate and sort by type (each with its own sort order)
  const issues = sortItems(filteredItems.filter(item => item.type === 'issue'), filters.issuesSortBy);
  const discussions = sortItems(filteredItems.filter(item => item.type === 'discussion'), filters.discussionsSortBy);

  const totalIssues = items.filter(item => item.type === 'issue').length;
  const totalDiscussions = items.filter(item => item.type === 'discussion').length;

  const handleIntakeFilterToggle = (key: keyof IntakeFilterOptions) => {
    onIntakeFiltersChange({
      ...intakeFilters,
      [key]: !intakeFilters[key],
    });
  };

  const handleResetIntakeFilters = () => {
    onIntakeFiltersChange(DEFAULT_INTAKE_FILTERS);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {/* Mode toggle tabs */}
        <div className="flex gap-1 mb-3 p-1 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
          <button
            onClick={() => onFilterModeChange('standard')}
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150"
            style={{
              background: filterMode === 'standard' ? 'var(--bg-secondary)' : 'transparent',
              color: filterMode === 'standard' ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: filterMode === 'standard' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Standard
          </button>
          <button
            onClick={() => onFilterModeChange('ai')}
            className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex items-center justify-center gap-1.5"
            style={{
              background: filterMode === 'ai' ? 'var(--bg-secondary)' : 'transparent',
              color: filterMode === 'ai' ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: filterMode === 'ai' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
            AI Filter
          </button>
        </div>

        {filterMode === 'ai' ? (
          /* AI Filter mode */
          <AIFilterInput
            isLoading={aiFilter.isLoading}
            error={aiFilter.error}
            result={aiFilter.result}
            onSubmit={onAIFilterSubmit}
            onClear={onAIFilterClear}
            includeAllItems={includeAllItems}
            onIncludeAllItemsChange={onIncludeAllItemsChange}
          />
        ) : (
          /* Standard filter mode */
          <>
            {/* Search row */}
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
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 flex-wrap items-center">
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

              <div className="w-px h-5 mx-1" style={{ background: 'var(--border-subtle)' }} />

              {/* Show all items toggle */}
              <FilterChip
                label="Show All"
                active={includeAllItems}
                onClick={() => onIncludeAllItemsChange(!includeAllItems)}
                icon={
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                }
              />

              {/* Intake criteria toggle */}
              <button
                onClick={() => setIntakeFiltersExpanded(!intakeFiltersExpanded)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150"
                style={{
                  background: hasCustomIntakeFilters ? 'var(--accent-dim)' : 'transparent',
                  color: hasCustomIntakeFilters ? 'var(--accent)' : 'var(--text-muted)',
                  border: `1px solid ${hasCustomIntakeFilters ? 'var(--accent-dim)' : 'var(--border-subtle)'}`,
                }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Intake Criteria
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${intakeFiltersExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Expandable intake filters panel */}
            {intakeFiltersExpanded && (
          <div
            className="mt-3 p-3 rounded-lg animate-slideUp"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Intake Filter Criteria
              </span>
              {hasCustomIntakeFilters && (
                <button
                  onClick={handleResetIntakeFilters}
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ color: 'var(--accent)' }}
                >
                  Reset to defaults
                </button>
              )}
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              These filters determine which items are fetched from GitHub. Disable filters to see more items.
            </p>

            {/* Issues filters */}
            <div className="mb-3">
              <span className="text-xs font-medium flex items-center gap-1.5 mb-2" style={{ color: 'var(--success)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
                Issues
              </span>
              <div className="space-y-1.5 pl-3.5">
                {(['excludeBacklogProject', 'excludeMilestoned', 'excludeTriagedLabels', 'excludeStatusSet'] as const).map((key) => (
                  <IntakeFilterToggle
                    key={key}
                    filterKey={key}
                    checked={intakeFilters[key]}
                    onChange={() => handleIntakeFilterToggle(key)}
                  />
                ))}
              </div>
            </div>

            {/* Discussions filters */}
            <div>
              <span className="text-xs font-medium flex items-center gap-1.5 mb-2" style={{ color: 'var(--info)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--info)' }} />
                Discussions
              </span>
              <div className="space-y-1.5 pl-3.5">
                <IntakeFilterToggle
                  filterKey="excludeAnswered"
                  checked={intakeFilters.excludeAnswered}
                  onChange={() => handleIntakeFilterToggle('excludeAnswered')}
                />
                <IntakeFilterToggle
                  filterKey="excludeMaintainerResponded"
                  checked={intakeFilters.excludeMaintainerResponded}
                  onChange={() => handleIntakeFilterToggle('excludeMaintainerResponded')}
                />
              </div>
            </div>
          </div>
            )}
          </>
        )}
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
          sortBy={filters.issuesSortBy}
          onSortChange={(sortBy) => onFiltersChange({ ...filters, issuesSortBy: sortBy })}
          isLoading={isLoading}
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
          sortBy={filters.discussionsSortBy}
          onSortChange={(sortBy) => onFiltersChange({ ...filters, discussionsSortBy: sortBy })}
          isLoading={isLoading}
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

function IntakeFilterToggle({
  filterKey,
  checked,
  onChange,
}: {
  filterKey: keyof IntakeFilterOptions;
  checked: boolean;
  onChange: () => void;
}) {
  const { label, description } = INTAKE_FILTER_LABELS[filterKey];

  return (
    <label className="flex items-start gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 w-3.5 h-3.5 rounded cursor-pointer accent-[var(--accent)]"
      />
      <div className="flex-1">
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
          — {description}
        </span>
      </div>
    </label>
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
  sortBy,
  onSortChange,
  isLoading = false,
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
  sortBy: SortOrder;
  onSortChange: (sortBy: SortOrder) => void;
  isLoading?: boolean;
}) {
  const typeColor = type === 'issue' ? 'var(--success)' : 'var(--info)';

  return (
    <div className={`flex flex-col ${collapsed ? 'flex-shrink-0' : 'flex-1 min-h-0'}`}>
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: collapsed ? 'none' : '1px solid var(--border-subtle)' }}
      >
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
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

        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOrder)}
          onClick={(e) => e.stopPropagation()}
          className="px-2 py-1 text-xs rounded cursor-pointer"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <option value="oldest">Oldest</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {/* Panel content */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto relative">
          {isLoading ? (
            // Show loading overlay - keeps existing items visible if any
            <>
              <div
                className="absolute inset-0 flex items-center justify-center z-10"
                style={{ background: 'var(--bg-secondary)', opacity: items.length > 0 ? 0.7 : 1 }}
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 animate-spin"
                    style={{ color: 'var(--text-muted)' }}
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
                  {items.length === 0 && (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Loading...
                    </p>
                  )}
                </div>
              </div>
              {items.length > 0 && (
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
            </>
          ) : items.length === 0 ? (
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
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border-subtle)'}`,
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
                {formatAge(item.ageInDays, item.ageInHours)}
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
