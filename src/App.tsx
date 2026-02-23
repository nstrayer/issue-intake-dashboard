import { useState, useEffect, useCallback, useMemo } from 'react';
import { ProgressHeader } from './components/ProgressHeader/ProgressHeader';
import { QueueList, QueueFilters, FilterMode } from './components/QueueList/QueueList';
import { SidePanel } from './components/SidePanel/SidePanel';
import { HelpModal } from './components/HelpModal/HelpModal';
import { InfoModal } from './components/InfoModal/InfoModal';
import { IntakeConfigModal } from './components/IntakeConfigModal/IntakeConfigModal';
import { EnvironmentModal } from './components/EnvironmentModal/EnvironmentModal';
import { Tour } from './components/Tour/Tour';
import { useIntakeQueue, IntakeFilterOptions, DEFAULT_INTAKE_FILTERS } from './hooks/useIntakeQueue';
import { useAnalysis, AnalysisType } from './hooks/useAnalysis';
import { useAIFilter } from './hooks/useAIFilter';
import { useConfig } from './hooks/useConfig';
import { useDemoMode } from './hooks/useDemoMode';
import { useTour } from './hooks/useTour';
import { useEnvironmentStatus } from './hooks/useEnvironmentStatus';
import { useNewItemNotifications } from './hooks/useNewItemNotifications';
import { NewItemToast } from './components/NewItemToast/NewItemToast';
import { QueueItem } from './types/intake';
import { ALL_DEMO_ITEMS } from './data/demoData';

const DEFAULT_FILTERS: QueueFilters = {
  hasLabels: 'all',
  age: 'all',
  searchQuery: '',
  issuesSortBy: 'newest',
  discussionsSortBy: 'newest',
};

// All intake filters disabled (show everything)
const ALL_INTAKE_FILTERS_OFF: IntakeFilterOptions = {
  excludeBacklogProject: false,
  excludeMilestoned: false,
  excludeTriagedLabels: false,
  excludeStatusSet: false,
  excludeAnswered: false,
  excludeMaintainerResponded: false,
};

function App() {
  const [intakeFilters, setIntakeFilters] = useState<IntakeFilterOptions>(DEFAULT_INTAKE_FILTERS);
  const [includeAllItems, setIncludeAllItems] = useState(false);
  const [savedIntakeFilters, setSavedIntakeFilters] = useState<IntakeFilterOptions>(DEFAULT_INTAKE_FILTERS);

  // Use disabled filters when includeAllItems is true
  const effectiveIntakeFilters = includeAllItems ? ALL_INTAKE_FILTERS_OFF : intakeFilters;
  const queue = useIntakeQueue(effectiveIntakeFilters);

  const { analysis, analyzeItem, clearAnalysis, sendFollowUp, followUpLoading } = useAnalysis();
  const aiFilter = useAIFilter();
  const { config } = useConfig();
  const envStatus = useEnvironmentStatus();
  const { notification, dismiss: dismissNotification } = useNewItemNotifications();
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [filters, setFilters] = useState<QueueFilters>(DEFAULT_FILTERS);
  const [filterMode, setFilterMode] = useState<FilterMode>('standard');
  const [showHelp, setShowHelp] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showIntakeConfig, setShowIntakeConfig] = useState(false);
  const [showEnvironment, setShowEnvironment] = useState(false);

  // Demo mode - auto-enables when queue is empty
  const demoMode = useDemoMode({
    autoEnableWhenEmpty: true,
    realItemCount: queue.items.length,
  });

  // Merge demo data with real data when demo mode is active
  const displayItems = useMemo(() => {
    if (demoMode.isDemoMode) {
      return [...queue.items, ...ALL_DEMO_ITEMS];
    }
    return queue.items;
  }, [queue.items, demoMode.isDemoMode]);

  // Tour - select first item helper for step 4
  const selectFirstItem = useCallback(() => {
    if (displayItems.length > 0 && !selectedItem) {
      setSelectedItem(displayItems[0]);
    }
  }, [displayItems, selectedItem]);

  // Tour state management
  const tour = useTour({
    onOpenEnvironmentModal: () => setShowEnvironment(true),
    onCloseEnvironmentModal: () => setShowEnvironment(false),
    onSelectFirstItem: selectFirstItem,
  });

  // Handle includeAllItems toggle
  const handleIncludeAllItemsChange = useCallback((value: boolean) => {
    if (value) {
      // Save current filters before disabling
      setSavedIntakeFilters(intakeFilters);
    } else {
      // Restore saved filters when disabling
      setIntakeFilters(savedIntakeFilters);
    }
    setIncludeAllItems(value);
  }, [intakeFilters, savedIntakeFilters]);

  const handleSelectItem = useCallback((item: QueueItem) => {
    setSelectedItem(item);
    clearAnalysis();
  }, [clearAnalysis]);

  const handleClosePanel = useCallback(() => {
    setSelectedItem(null);
    clearAnalysis();
  }, [clearAnalysis]);

  const handleRequestAnalysis = useCallback((body: string, type: AnalysisType = 'full') => {
    if (selectedItem) {
      analyzeItem(selectedItem, body, type);
    }
  }, [selectedItem, analyzeItem]);

  const handleFollowUp = useCallback((question: string, body: string) => {
    if (selectedItem) {
      sendFollowUp(question, selectedItem, body);
    }
  }, [selectedItem, sendFollowUp]);

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

      const items = displayItems;
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
          setShowInfo(false);
          setShowEnvironment(false);
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
  }, [displayItems, queue.isLoading, queue.refresh, selectedItem, handleSelectItem, handleClosePanel]);

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Noise texture overlay */}
      <div className="noise-overlay" />

      <ProgressHeader
        isLoading={queue.isLoading}
        lastUpdated={queue.fetchedAt}
        repoName={config?.repo.fullName}
        repoPath={envStatus.targetRepoPath}
        toolStatuses={envStatus.toolStatuses}
        envHasCriticalFailures={envStatus.hasCriticalFailures}
        envHasWarnings={envStatus.hasWarnings}
        onRefresh={queue.refresh}
        onHelpClick={() => setShowHelp(true)}
        onInfoClick={() => setShowInfo(true)}
        onConfigClick={() => setShowIntakeConfig(true)}
        onEnvironmentClick={() => setShowEnvironment(true)}
        isDemoMode={demoMode.isDemoMode}
        onDisableDemoMode={demoMode.disableDemoMode}
      />

      {queue.warnings.length > 0 && (
        <div
          className="mx-6 mt-4 px-4 py-3 rounded-lg animate-slideUp"
          style={{
            background: 'rgba(212, 136, 15, 0.08)',
            border: '1px solid rgba(212, 136, 15, 0.2)'
          }}
        >
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              {queue.warnings.map((warning, i) => (
                <p key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>{warning}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden mt-4">
        {/* Queue list - takes more space */}
        <div
          className="w-[55%] lg:w-[60%] overflow-hidden flex flex-col mx-6 mb-6 rounded-xl"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <QueueList
            items={displayItems}
            selectedId={selectedItem?.id ?? null}
            onSelect={handleSelectItem}
            filters={filters}
            onFiltersChange={setFilters}
            intakeFilters={intakeFilters}
            onIntakeFiltersChange={setIntakeFilters}
            filterMode={filterMode}
            onFilterModeChange={setFilterMode}
            aiFilter={{
              isLoading: aiFilter.isLoading,
              error: aiFilter.error,
              result: aiFilter.result,
            }}
            onAIFilterSubmit={aiFilter.generateFilter}
            onAIFilterClear={aiFilter.clearFilter}
            includeAllItems={includeAllItems}
            onIncludeAllItemsChange={handleIncludeAllItemsChange}
            isLoading={queue.isLoading}
          />
        </div>

        {/* Side panel */}
        <div
          className="w-[45%] lg:w-[40%] overflow-hidden flex flex-col mr-6 mb-6 rounded-xl"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <SidePanel
            item={selectedItem}
            analysis={analysis}
            onClose={handleClosePanel}
            onApplyLabel={handleApplyLabel}
            onRemoveLabel={handleRemoveLabel}
            onRequestAnalysis={handleRequestAnalysis}
            onFollowUp={handleFollowUp}
            followUpLoading={followUpLoading}
          />
        </div>
      </main>

      {/* Help modal */}
      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        onRestartTour={tour.resetTour}
      />

      {/* Info modal */}
      <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />

      {/* Intake config modal */}
      <IntakeConfigModal
        isOpen={showIntakeConfig}
        onClose={() => setShowIntakeConfig(false)}
        onSave={() => queue.refresh()}
      />

      {/* Environment modal */}
      <EnvironmentModal
        isOpen={showEnvironment}
        onClose={() => setShowEnvironment(false)}
        isDemoMode={demoMode.isDemoMode}
        onToggleDemoMode={demoMode.toggleDemoMode}
      />

      {/* Tour component */}
      <Tour
        isRunning={tour.isRunning}
        stepIndex={tour.stepIndex}
        onCallback={tour.handleJoyrideCallback}
      />

      {/* New item notification toast */}
      {notification && (
        <NewItemToast
          notification={notification}
          onDismiss={dismissNotification}
          onRefresh={queue.refresh}
        />
      )}

      {/* Error toast */}
      {queue.error && (
        <div
          className="fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-xl animate-slideUp"
          style={{
            background: 'rgba(229, 105, 90, 0.95)',
            color: 'white'
          }}
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{queue.error}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
