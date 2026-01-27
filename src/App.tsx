import { useState, useEffect, useCallback } from 'react';
import { ProgressHeader } from './components/ProgressHeader/ProgressHeader';
import { QueueList, QueueFilters } from './components/QueueList/QueueList';
import { SidePanel } from './components/SidePanel/SidePanel';
import { HelpModal } from './components/HelpModal/HelpModal';
import { useIntakeQueue } from './hooks/useIntakeQueue';
import { useAnalysis } from './hooks/useAnalysis';
import { QueueItem } from './types/intake';

const DEFAULT_FILTERS: QueueFilters = {
  type: 'all',
  hasLabels: 'all',
  age: 'all',
  searchQuery: '',
};

function App() {
  const queue = useIntakeQueue();
  const { analysis, analyzeItem, clearAnalysis } = useAnalysis();
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [filters, setFilters] = useState<QueueFilters>(DEFAULT_FILTERS);
  const [showHelp, setShowHelp] = useState(false);

  const handleSelectItem = useCallback((item: QueueItem) => {
    setSelectedItem(item);
    clearAnalysis();
  }, [clearAnalysis]);

  const handleClosePanel = useCallback(() => {
    setSelectedItem(null);
    clearAnalysis();
  }, [clearAnalysis]);

  const handleRequestAnalysis = useCallback((body: string) => {
    if (selectedItem) {
      analyzeItem(selectedItem, body);
    }
  }, [selectedItem, analyzeItem]);

  const handleApplyLabel = async (label: string) => {
    if (!selectedItem) return;

    try {
      const response = await fetch(`/api/issues/${selectedItem.number}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, action: 'add' }),
      });

      if (response.ok) {
        queue.refresh();
      }
    } catch (error) {
      console.error('Failed to apply label:', error);
    }
  };

  const handleRemoveLabel = async (label: string) => {
    if (!selectedItem) return;

    try {
      const response = await fetch(`/api/issues/${selectedItem.number}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, action: 'remove' }),
      });

      if (response.ok) {
        queue.refresh();
      }
    } catch (error) {
      console.error('Failed to remove label:', error);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const items = queue.items;
      const currentIndex = selectedItem ? items.findIndex(i => i.id === selectedItem.id) : -1;

      switch (e.key) {
        case 'j': // Next item
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < items.length - 1) {
            handleSelectItem(items[currentIndex + 1]);
          } else if (currentIndex === -1 && items.length > 0) {
            handleSelectItem(items[0]);
          }
          break;
        case 'k': // Previous item
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            handleSelectItem(items[currentIndex - 1]);
          }
          break;
        case 'Escape':
          handleClosePanel();
          setShowHelp(false);
          break;
        case 'o':
          if (selectedItem) {
            window.open(selectedItem.url, '_blank');
          }
          break;
        case 'r':
          if (!queue.isLoading) {
            queue.refresh();
          }
          break;
        case '?':
          setShowHelp(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [queue.items, queue.isLoading, queue.refresh, selectedItem, handleSelectItem, handleClosePanel]);

  // Calculate completed count (items with status labels or triaged)
  const completedCount = queue.items.filter(item =>
    item.labels.some(l => l.startsWith('status:'))
  ).length;

  return (
    <div className="h-screen flex flex-col bg-[#0d1117]">
      <ProgressHeader
        totalCount={queue.totalCount}
        completedCount={completedCount}
        staleCount={queue.staleCount}
        isLoading={queue.isLoading}
        lastUpdated={queue.fetchedAt}
        onRefresh={queue.refresh}
        onHelpClick={() => setShowHelp(true)}
      />

      <main className="flex-1 flex overflow-hidden">
        {/* Queue list */}
        <div className="w-1/2 lg:w-3/5 border-r border-gray-800 overflow-hidden">
          <QueueList
            items={queue.items}
            selectedId={selectedItem?.id ?? null}
            onSelect={handleSelectItem}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>

        {/* Side panel */}
        <div className="w-1/2 lg:w-2/5 bg-[#161b22] overflow-hidden">
          <SidePanel
            item={selectedItem}
            analysis={analysis}
            onClose={handleClosePanel}
            onApplyLabel={handleApplyLabel}
            onRemoveLabel={handleRemoveLabel}
            onRequestAnalysis={handleRequestAnalysis}
          />
        </div>
      </main>

      {/* Help modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Error toast */}
      {queue.error && (
        <div className="fixed bottom-4 right-4 bg-red-900/90 text-red-200 px-4 py-2 rounded-lg shadow-lg">
          {queue.error}
        </div>
      )}
    </div>
  );
}

export default App;
