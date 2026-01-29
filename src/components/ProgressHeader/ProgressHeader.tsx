import { ToolStatus } from '../../hooks/useEnvironmentStatus';

interface ProgressHeaderProps {
  isLoading: boolean;
  lastUpdated: Date | null;
  repoName?: string;
  repoPath: string;
  toolStatuses: ToolStatus[];
  envHasCriticalFailures: boolean;
  envHasWarnings: boolean;
  onRefresh: () => void;
  onHelpClick: () => void;
  onInfoClick: () => void;
  onConfigClick?: () => void;
  onEnvironmentClick: () => void;
  isDemoMode?: boolean;
  onDisableDemoMode?: () => void;
}

export function ProgressHeader({
  isLoading,
  lastUpdated,
  repoName,
  repoPath,
  toolStatuses,
  envHasCriticalFailures,
  envHasWarnings,
  onRefresh,
  onHelpClick,
  onInfoClick,
  onConfigClick,
  onEnvironmentClick,
  isDemoMode = false,
  onDisableDemoMode,
}: ProgressHeaderProps) {
  // Truncate repo path for display
  const truncatedPath = truncateRepoPath(repoPath, 30);

  return (
    <header data-tour="header" className="px-6 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
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
                Triage Sidekick
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Issue Triage</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-8 w-px" style={{ background: 'var(--border-subtle)' }} />

          {/* Repository Identity */}
          <div className="flex items-center gap-6">
            {/* Stacked repo info */}
            <div className="flex flex-col">
              {/* Primary: GitHub repo with icon */}
              <a
                href={`https://github.com/${repoName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium hover:underline"
                style={{ color: 'var(--text-primary)' }}
              >
                <svg className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                {repoName || 'No repository'}
              </a>
              {/* Secondary: Local path */}
              <button
                onClick={onEnvironmentClick}
                className="flex items-center gap-1.5 text-xs mt-0.5 text-left hover:underline"
                style={{ color: 'var(--text-muted)' }}
                title={repoPath || 'No repo path set'}
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {truncatedPath || 'No local path'}
              </button>
            </div>

            {/* Tool statuses - compact dots with labels */}
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={onEnvironmentClick}
              title="Click to view environment details"
            >
              {toolStatuses.map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-center gap-1.5"
                  title={`${tool.name}: ${tool.message}`}
                >
                  <ToolStatusDot status={tool.status} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {tool.name}
                  </span>
                </div>
              ))}
              {toolStatuses.length === 0 && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Loading...
                </span>
              )}
            </div>

            {/* Overall status indicator */}
            {(envHasCriticalFailures || envHasWarnings) && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer"
                onClick={onEnvironmentClick}
                style={{
                  background: envHasCriticalFailures ? 'rgba(229, 105, 90, 0.12)' : 'rgba(229, 168, 85, 0.12)',
                  color: envHasCriticalFailures ? 'var(--error)' : 'var(--warning)'
                }}
                title="Click to view environment details"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-xs font-medium">
                  {envHasCriticalFailures ? 'Issues' : 'Warnings'}
                </span>
              </div>
            )}

            {/* Demo mode badge */}
            {isDemoMode && (
              <button
                onClick={onDisableDemoMode}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all duration-150"
                style={{
                  background: 'rgba(212, 136, 15, 0.15)',
                  color: 'var(--warning)',
                  border: '1px solid rgba(212, 136, 15, 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(212, 136, 15, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(212, 136, 15, 0.15)';
                }}
                title="Click to disable demo mode"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-xs font-medium">Demo</span>
                <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
            onClick={onEnvironmentClick}
            label="Env"
            dataTour="env-button"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            }
          />

          <HeaderButton
            onClick={onInfoClick}
            label="About"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          {onConfigClick && (
            <HeaderButton
              onClick={onConfigClick}
              label="Config"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          )}

          <HeaderButton
            onClick={onHelpClick}
            label="Help"
            shortcut="?"
            dataTour="help-button"
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
  icon,
  dataTour,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  dataTour?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-tour={dataTour}
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

function ToolStatusDot({ status }: { status: 'pass' | 'warn' | 'fail' }) {
  const colors = {
    pass: 'var(--success)',
    warn: 'var(--warning)',
    fail: 'var(--error)',
  };

  return (
    <span
      className="w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: colors[status] }}
    />
  );
}

function truncateRepoPath(path: string, maxLength: number): string {
  if (!path) return '';
  if (path.length <= maxLength) return path;

  // Try to show the last part of the path
  const parts = path.split('/');
  let result = parts[parts.length - 1];

  // Add parent directories until we exceed maxLength
  for (let i = parts.length - 2; i >= 0; i--) {
    const candidate = parts[i] + '/' + result;
    if (candidate.length > maxLength - 3) {
      return '…/' + result;
    }
    result = candidate;
  }

  return result;
}
