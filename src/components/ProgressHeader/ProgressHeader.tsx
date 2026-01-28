interface ProgressHeaderProps {
  totalCount: number;
  completedCount: number;
  staleCount: number;
  isLoading: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onHelpClick: () => void;
  onSetupCheckClick: () => void;
  onInfoClick: () => void;
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
  onInfoClick,
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
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          <div className="h-6 w-px" style={{ background: 'var(--border-subtle)' }} />

          <HeaderButton
            onClick={onInfoClick}
            label="About"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <HeaderButton
            onClick={onSetupCheckClick}
            label="Setup"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <HeaderButton
            onClick={onHelpClick}
            label="Help"
            shortcut="?"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <HeaderButton
            onClick={onRefresh}
            disabled={isLoading}
            label="Refresh"
            shortcut="R"
            icon={
              <svg
                className={`w-4 h-4 ${isLoading ? 'spinner' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
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

function HeaderButton({
  onClick,
  disabled,
  label,
  shortcut,
  icon
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150 disabled:opacity-40"
      style={{
        color: 'var(--text-secondary)',
        background: 'var(--bg-tertiary)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-elevated)';
        e.currentTarget.style.color = 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-tertiary)';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }}
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
      {shortcut && (
        <kbd
          className="text-xs px-1.5 py-0.5 rounded"
          style={{
            background: 'var(--bg-primary)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
