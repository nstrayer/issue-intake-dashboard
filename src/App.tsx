import { useState } from 'react';
import { ProgressHeader } from './components/ProgressHeader/ProgressHeader';
import { QueueList, QueueFilters } from './components/QueueList/QueueList';
import { SidePanel } from './components/SidePanel/SidePanel';
import { useIntakeQueue } from './hooks/useIntakeQueue';
import { QueueItem, ClaudeAnalysis } from './types/intake';

const DEFAULT_FILTERS: QueueFilters = {
  type: 'all',
  hasLabels: 'all',
  age: 'all',
  searchQuery: '',
};

function App() {
  const queue = useIntakeQueue();
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [analysis, setAnalysis] = useState<ClaudeAnalysis | null>(null);
  const [filters, setFilters] = useState<QueueFilters>(DEFAULT_FILTERS);

  const handleSelectItem = (item: QueueItem) => {
    setSelectedItem(item);
    setAnalysis(null); // Clear previous analysis
  };

  const handleClosePanel = () => {
    setSelectedItem(null);
    setAnalysis(null);
  };

  const handleRequestAnalysis = async () => {
    if (!selectedItem) return;

    setAnalysis({ suggestedLabels: [], duplicates: [], summary: '', isLoading: true });

    // TODO: Implement in Phase 4
    // For now, simulate loading
    setTimeout(() => {
      setAnalysis({
        suggestedLabels: ['area:editor', 'type:bug'],
        duplicates: [],
        summary: 'This appears to be a bug report about...',
        isLoading: false,
      });
    }, 1000);
  };

  const handleApplyLabel = async (label: string) => {
    if (!selectedItem) return;

    try {
      const response = await fetch(`/api/issues/${selectedItem.number}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, action: 'add' }),
      });

      if (response.ok) {
        // Refresh to show updated labels
        queue.refresh();
      }
    } catch (error) {
      console.error('Failed to apply label:', error);
    }
  };

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
            onRequestAnalysis={handleRequestAnalysis}
          />
        </div>
      </main>

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
