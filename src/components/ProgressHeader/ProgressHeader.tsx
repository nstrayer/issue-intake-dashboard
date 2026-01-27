interface ProgressHeaderProps {
  totalCount: number;
  completedCount: number;
  staleCount: number;
  isLoading: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
}

export function ProgressHeader({
  totalCount,
  completedCount,
  staleCount,
  isLoading,
  lastUpdated,
  onRefresh,
}: ProgressHeaderProps) {
  const remainingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <header className="border-b border-gray-800 bg-[#161b22] sticky top-0 z-10">
      <div className="max-w-full mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Title and progress */}
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-white">
              Issue Intake Command Center
            </h1>

            {/* Progress indicator */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{remainingCount}</span>
                <span className="text-gray-400 text-sm">remaining</span>
              </div>

              {/* Progress bar */}
              <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {staleCount > 0 && (
                <span className="px-2 py-0.5 text-xs bg-yellow-900/50 text-yellow-400 rounded-full">
                  {staleCount} stale
                </span>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
