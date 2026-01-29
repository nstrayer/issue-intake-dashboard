import { useState, useEffect, useCallback } from 'react';

interface SetupCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
  fixCommand?: string;
}

interface SetupCheckResponse {
  repo: {
    owner: string;
    name: string;
    fullName: string;
    url: string;
  };
  targetRepoPath: string;
  serverPort: string;
  nodeVersion: string;
  checks: SetupCheckResult[];
  allPassed: boolean;
  hasWarnings: boolean;
  hasCriticalFailures: boolean;
}

interface EnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDemoMode?: boolean;
  onToggleDemoMode?: () => void;
}

export function EnvironmentModal({ isOpen, onClose, isDemoMode, onToggleDemoMode }: EnvironmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SetupCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/setup-check');
      if (!response.ok) {
        throw new Error('Failed to fetch environment info');
      }
      const result: SetupCheckResponse = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !data && !loading) {
      fetchData();
    }
  }, [isOpen, data, loading, fetchData]);

  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
  };

  // Extract info from check results
  const getCheckByName = (name: string) => data?.checks.find(c => c.name === name);
  const claudeCheck = getCheckByName('Claude Code CLI');
  const ghCheck = getCheckByName('GitHub CLI');
  const authCheck = getCheckByName('GitHub Authentication');
  const repoCheck = getCheckByName('Target Repository');
  const skillsCheck = getCheckByName('Claude Skills File');

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 animate-fadeIn"
      style={{ background: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        data-tour="env-modal"
        className="w-full max-w-lg mx-4 max-h-[80vh] flex flex-col rounded-xl overflow-hidden animate-slideUp"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.15)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-dim)' }}
          >
            <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Environment
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Current session context</p>
          </div>
          {data && <SetupStatusBadge data={data} />}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                <svg className="w-5 h-5 spinner" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm">Loading environment info...</span>
              </div>
            </div>
          )}

          {error && (
            <div
              className="p-4 rounded-lg"
              style={{
                background: 'rgba(229, 105, 90, 0.1)',
                border: '1px solid rgba(229, 105, 90, 0.25)'
              }}
            >
              <p className="font-medium text-sm" style={{ color: 'var(--error)' }}>Failed to load</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              {/* Repository */}
              <EnvSection title="Target Repository">
                <a
                  href={data.repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  {data.repo.fullName}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </EnvSection>

              {/* Local repo path */}
              {repoCheck && (
                <EnvSection title="Local Repo Path">
                  <div className="flex items-center gap-2">
                    <StatusDot status={repoCheck.status} />
                    <code
                      className="text-xs px-2 py-1 rounded font-mono break-all"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                    >
                      {data.targetRepoPath}
                    </code>
                  </div>
                  {repoCheck.status === 'fail' && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--error)' }}>
                      {repoCheck.message}. Set TARGET_REPO_PATH env variable.
                    </p>
                  )}
                </EnvSection>
              )}

              {/* Claude Skills */}
              {skillsCheck && (
                <EnvSection title="Claude Skills File">
                  <div className="flex items-center gap-2">
                    <StatusDot status={skillsCheck.status} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {skillsCheck.message}
                    </span>
                  </div>
                  {skillsCheck.status === 'warn' && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                      Claude won't have codebase-specific context for follow-up searches.
                    </p>
                  )}
                </EnvSection>
              )}

              {/* Tools */}
              <EnvSection title="Tools">
                <div className="space-y-2">
                  {claudeCheck && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Claude Code</span>
                      <div className="flex items-center gap-2">
                        <StatusDot status={claudeCheck.status} />
                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          {claudeCheck.message}
                        </span>
                      </div>
                    </div>
                  )}
                  {ghCheck && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>GitHub CLI</span>
                      <div className="flex items-center gap-2">
                        <StatusDot status={ghCheck.status} />
                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          {ghCheck.message}
                        </span>
                      </div>
                    </div>
                  )}
                  {authCheck && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>GitHub Auth</span>
                      <div className="flex items-center gap-2">
                        <StatusDot status={authCheck.status} />
                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          {authCheck.message}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </EnvSection>

              {/* Server */}
              <EnvSection title="Server">
                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>Port: <span className="font-mono">{data.serverPort}</span></span>
                  <span>Node: <span className="font-mono">{data.nodeVersion}</span></span>
                </div>
              </EnvSection>

              {/* Check Details - show warnings/failures with fix commands */}
              {data.checks.filter(c => c.status !== 'pass' && c.fixCommand).length > 0 && (
                <EnvSection title="Fix Commands">
                  <div className="space-y-2">
                    {data.checks.filter(c => c.status !== 'pass' && c.fixCommand).map((check, i) => (
                      <CheckFixItem key={i} check={check} onCopyCommand={copyCommand} />
                    ))}
                  </div>
                </EnvSection>
              )}

              {/* Demo Mode toggle */}
              {onToggleDemoMode !== undefined && (
                <EnvSection title="Demo Mode">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Show demo data
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Display sample issues and discussions for testing
                      </p>
                    </div>
                    <button
                      onClick={onToggleDemoMode}
                      className="relative w-11 h-6 rounded-full transition-colors duration-200"
                      style={{
                        background: isDemoMode ? 'var(--accent)' : 'var(--bg-tertiary)',
                        border: `1px solid ${isDemoMode ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      }}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200"
                        style={{
                          background: isDemoMode ? 'white' : 'var(--text-muted)',
                          transform: isDemoMode ? 'translateX(20px)' : 'translateX(0)',
                        }}
                      />
                    </button>
                  </div>
                </EnvSection>
              )}

              {/* Re-run button */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="w-full py-2 text-xs font-medium rounded-lg transition-all duration-150 disabled:opacity-50"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                Re-run Checks
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium rounded-lg transition-all duration-150"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-elevated)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function EnvSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function StatusDot({ status }: { status: 'pass' | 'warn' | 'fail' }) {
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

function SetupStatusBadge({ data }: { data: SetupCheckResponse }) {
  if (data.hasCriticalFailures) {
    return (
      <span
        className="px-2 py-1 text-xs font-medium rounded"
        style={{
          background: 'rgba(229, 105, 90, 0.12)',
          color: 'var(--error)'
        }}
      >
        Issues
      </span>
    );
  }
  if (data.hasWarnings) {
    return (
      <span
        className="px-2 py-1 text-xs font-medium rounded"
        style={{
          background: 'rgba(229, 168, 85, 0.12)',
          color: 'var(--warning)'
        }}
      >
        Warnings
      </span>
    );
  }
  return (
    <span
      className="px-2 py-1 text-xs font-medium rounded"
      style={{
        background: 'rgba(109, 186, 130, 0.12)',
        color: 'var(--success)'
      }}
    >
      OK
    </span>
  );
}

function CheckFixItem({
  check,
  onCopyCommand
}: {
  check: SetupCheckResult;
  onCopyCommand: (cmd: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (check.fixCommand) {
      onCopyCommand(check.fixCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="p-2.5 rounded-lg"
      style={{
        background: check.status === 'fail' ? 'rgba(229, 105, 90, 0.05)' : 'rgba(229, 168, 85, 0.05)',
        border: `1px solid ${check.status === 'fail' ? 'rgba(229, 105, 90, 0.2)' : 'rgba(229, 168, 85, 0.2)'}`
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>
          {check.name}
        </span>
        <StatusDot status={check.status} />
      </div>
      <div className="flex items-center gap-1.5">
        <code
          className="flex-1 text-[10px] px-1.5 py-1 rounded font-mono overflow-x-auto"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)'
          }}
        >
          {check.fixCommand}
        </code>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 px-2 py-1 text-[10px] font-medium rounded transition-all duration-150"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-elevated)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
