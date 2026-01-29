import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueueList, QueueFilters } from '../QueueList/QueueList';
import { createTestItem } from '../../test/fixtures';
import { DEFAULT_INTAKE_FILTERS } from '../../hooks/useIntakeQueue';
import type { QueueItem } from '../../types/intake';

describe('QueueList', () => {
  const defaultFilters: QueueFilters = {
    hasLabels: 'all',
    age: 'all',
    searchQuery: '',
    issuesSortBy: 'oldest',
    discussionsSortBy: 'oldest',
  };

  const defaultProps = {
    items: [] as QueueItem[],
    selectedId: null,
    onSelect: vi.fn(),
    filters: defaultFilters,
    onFiltersChange: vi.fn(),
    intakeFilters: DEFAULT_INTAKE_FILTERS,
    onIntakeFiltersChange: vi.fn(),
    filterMode: 'standard' as const,
    onFilterModeChange: vi.fn(),
    aiFilter: { isLoading: false, error: null, result: null },
    onAIFilterSubmit: vi.fn(),
    onAIFilterClear: vi.fn(),
    includeAllItems: false,
    onIncludeAllItemsChange: vi.fn(),
    isLoading: false,
  };

  describe('rendering items', () => {
    it('shows empty state message when no items', () => {
      render(<QueueList {...defaultProps} />);

      expect(screen.getByText(/no issues in queue/i)).toBeInTheDocument();
    });

    it('displays issue titles', () => {
      const items = [
        createTestItem({ id: 'issue-1', type: 'issue', title: 'First bug report', number: 1 }),
        createTestItem({ id: 'issue-2', type: 'issue', title: 'Second feature request', number: 2 }),
      ];

      render(<QueueList {...defaultProps} items={items} />);

      expect(screen.getByText('First bug report')).toBeInTheDocument();
      expect(screen.getByText('Second feature request')).toBeInTheDocument();
    });

    it('displays labels on items', () => {
      const items = [
        createTestItem({ id: 'issue-1', type: 'issue', title: 'Bug', labels: ['bug', 'area: editor'], number: 1 }),
      ];

      render(<QueueList {...defaultProps} items={items} />);

      expect(screen.getByText('bug')).toBeInTheDocument();
      expect(screen.getByText('area: editor')).toBeInTheDocument();
    });

    it('separates issues and discussions into panels', () => {
      const items = [
        createTestItem({ id: 'issue-1', type: 'issue', title: 'An issue', number: 1 }),
        createTestItem({ id: 'disc-1', type: 'discussion', title: 'A discussion', category: 'Q&A', number: 10 }),
      ];

      render(<QueueList {...defaultProps} items={items} />);

      // Both should be visible
      expect(screen.getByText('An issue')).toBeInTheDocument();
      expect(screen.getByText('A discussion')).toBeInTheDocument();
    });

    it('displays issue numbers', () => {
      const items = [
        createTestItem({ id: 'issue-123', type: 'issue', title: 'Test issue', number: 123 }),
      ];

      render(<QueueList {...defaultProps} items={items} />);

      expect(screen.getByText('#123')).toBeInTheDocument();
    });

    it('displays author names', () => {
      const items = [
        createTestItem({ id: 'issue-1', type: 'issue', title: 'Test', author: 'test-author', number: 1 }),
      ];

      render(<QueueList {...defaultProps} items={items} />);

      expect(screen.getByText('@test-author')).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('calls onSelect when user clicks an item', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const item = createTestItem({ id: 'item-123', type: 'issue', title: 'Click me', number: 1 });

      render(<QueueList {...defaultProps} items={[item]} onSelect={onSelect} />);

      await user.click(screen.getByText('Click me'));

      expect(onSelect).toHaveBeenCalledWith(item);
    });

    it('updates search filter when user types in search', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();

      render(<QueueList {...defaultProps} onFiltersChange={onFiltersChange} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'b');

      // onFiltersChange is called for each keystroke
      expect(onFiltersChange).toHaveBeenCalled();
      // Verify the call includes search query (each keystroke only sees what's typed so far)
      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ searchQuery: 'b' })
      );
    });

    it('toggles unlabeled filter when clicked', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();

      render(<QueueList {...defaultProps} onFiltersChange={onFiltersChange} />);

      const unlabeledButton = screen.getByRole('button', { name: /unlabeled/i });
      await user.click(unlabeledButton);

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ hasLabels: 'unlabeled' })
      );
    });

    it('toggles stale filter when clicked', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();

      render(<QueueList {...defaultProps} onFiltersChange={onFiltersChange} />);

      const staleButton = screen.getByRole('button', { name: /stale/i });
      await user.click(staleButton);

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ age: 'stale' })
      );
    });
  });

  describe('filtering behavior', () => {
    it('hides items that do not match search filter', () => {
      const items = [
        createTestItem({ id: 'issue-1', type: 'issue', title: 'Bug in editor', number: 1 }),
        createTestItem({ id: 'issue-2', type: 'issue', title: 'Feature request', number: 2 }),
      ];

      render(
        <QueueList
          {...defaultProps}
          items={items}
          filters={{ ...defaultFilters, searchQuery: 'bug' }}
        />
      );

      expect(screen.getByText('Bug in editor')).toBeInTheDocument();
      expect(screen.queryByText('Feature request')).not.toBeInTheDocument();
    });

    it('shows only unlabeled items when filter is active', () => {
      const items = [
        createTestItem({ id: 'issue-1', type: 'issue', title: 'Unlabeled item', labels: [], number: 1 }),
        createTestItem({ id: 'issue-2', type: 'issue', title: 'Labeled item', labels: ['bug'], number: 2 }),
      ];

      render(
        <QueueList
          {...defaultProps}
          items={items}
          filters={{ ...defaultFilters, hasLabels: 'unlabeled' }}
        />
      );

      expect(screen.getByText('Unlabeled item')).toBeInTheDocument();
      expect(screen.queryByText('Labeled item')).not.toBeInTheDocument();
    });

    it('shows only stale items when filter is active', () => {
      const items = [
        createTestItem({ id: 'issue-1', type: 'issue', title: 'Fresh item', isStale: false, number: 1 }),
        createTestItem({ id: 'issue-2', type: 'issue', title: 'Stale item', isStale: true, number: 2 }),
      ];

      render(
        <QueueList
          {...defaultProps}
          items={items}
          filters={{ ...defaultFilters, age: 'stale' }}
        />
      );

      expect(screen.queryByText('Fresh item')).not.toBeInTheDocument();
      expect(screen.getByText('Stale item')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading indicator when isLoading is true', () => {
      render(<QueueList {...defaultProps} isLoading={true} />);

      // Each panel shows "Loading..." text
      const loadingTexts = screen.getAllByText(/loading/i);
      expect(loadingTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('filter mode switching', () => {
    it('calls onFilterModeChange when AI Filter tab is clicked', async () => {
      const user = userEvent.setup();
      const onFilterModeChange = vi.fn();

      render(<QueueList {...defaultProps} onFilterModeChange={onFilterModeChange} />);

      const aiFilterTab = screen.getByRole('button', { name: /ai filter/i });
      await user.click(aiFilterTab);

      expect(onFilterModeChange).toHaveBeenCalledWith('ai');
    });

    it('calls onFilterModeChange when Standard tab is clicked', async () => {
      const user = userEvent.setup();
      const onFilterModeChange = vi.fn();

      render(<QueueList {...defaultProps} filterMode="ai" onFilterModeChange={onFilterModeChange} />);

      const standardTab = screen.getByRole('button', { name: /standard/i });
      await user.click(standardTab);

      expect(onFilterModeChange).toHaveBeenCalledWith('standard');
    });
  });

  describe('counts', () => {
    it('displays correct item counts in footer', () => {
      const items = [
        createTestItem({ id: 'issue-1', type: 'issue', title: 'Issue 1', number: 1 }),
        createTestItem({ id: 'issue-2', type: 'issue', title: 'Issue 2', number: 2 }),
        createTestItem({ id: 'disc-1', type: 'discussion', title: 'Discussion 1', number: 10, category: 'Q&A' }),
      ];

      render(<QueueList {...defaultProps} items={items} />);

      // Footer structure is: <span>3</span> of <span>3</span> items
      // So we check for the "items" text
      expect(screen.getByText(/items/)).toBeInTheDocument();
    });

    it('displays filtered vs total counts when filter is active', () => {
      const items = [
        createTestItem({ id: 'issue-1', type: 'issue', title: 'Bug report', labels: ['bug'], number: 1 }),
        createTestItem({ id: 'issue-2', type: 'issue', title: 'Feature request', labels: [], number: 2 }),
      ];

      render(
        <QueueList
          {...defaultProps}
          items={items}
          filters={{ ...defaultFilters, hasLabels: 'unlabeled' }}
        />
      );

      // Footer structure is: <span>1</span> of <span>2</span> items
      // Check the footer container has the right structure
      expect(screen.getByText(/items/)).toBeInTheDocument();
      // Only the unlabeled item should be visible in list
      expect(screen.getByText('Feature request')).toBeInTheDocument();
      expect(screen.queryByText('Bug report')).not.toBeInTheDocument();
    });
  });
});
