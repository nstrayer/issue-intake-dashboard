interface ProgressHeaderProps {
  totalCount: number;
  completedCount: number;
  staleCount: number;
  isLoading: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onHelpClick: () => void;
  onSetupCheckClick: () => void;
}

export function ProgressHeader({
  totalCount,
  completedCount,
  staleCount,
  isLoading,
  lastUpdated,
  onRefresh,
  onHelpClick,
  onSetupCheckClick,
}: ProgressHeaderProps) {
  const remainingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <header className="px-6 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between">
        {/* Left: Branding and metrics */}
        <div className="flex items-center gap-8">
          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-dim)' }}
            >
              <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Issue Intake
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Positron</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-8 w-px" style={{ background: 'var(--border-subtle)' }} />

          {/* Metrics */}
          <div className="flex items-center gap-6">
            {/* Remaining count - prominent */}
            <div className="flex items-baseline gap-2">
              <span
                className="text-3xl font-semibold tabular-nums"
                style={{ color: 'var(--text-primary)' }}
              >
                {remainingCount}
              </span>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                to review
              </span>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <div
                className="w-28 h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progressPercent}%`,
                    background: progressPercent === 100 ? 'var(--success)' : 'var(--accent)'
                  }}
                />
              </div>
              <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {Math.round(progressPercent)}%
              </span>
            </div>

            {/* Stale badge */}
            {staleCount > 0 && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md"
                style={{
                  background: 'rgba(229, 168, 85, 0.12)',
                  color: 'var(--warning)'
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium">{staleCount} stale</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs mr-2" style={{ color: 'var(--text-muted)' }}>
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          <IconButton
            onClick={onSetupCheckClick}
            title="Check setup"
            icon={
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <IconButton
            onClick={onHelpClick}
            title="Keyboard shortcuts (?)"
            icon={<span className="text-sm font-mono">?</span>}
          />

          <IconButton
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh (r)"
            icon={
              <svg
                className={`w-[18px] h-[18px] ${isLoading ? 'spinner' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
          />
        </div>
      </div>
    </header>
  );
}

function IconButton({
  onClick,
  disabled,
  title,
  icon
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-40"
      style={{
        color: 'var(--text-muted)',
        background: 'transparent'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-tertiary)';
        e.currentTarget.style.color = 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--text-muted)';
      }}
      title={title}
    >
      {icon}
    </button>
  );
}
