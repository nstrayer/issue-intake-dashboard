import { useState, useEffect, useCallback } from 'react';

interface EnvironmentInfo {
  repo: {
    owner: string;
    name: string;
    fullName: string;
    url: string;
  };
  targetRepoPath: string;
  targetRepoExists: boolean;
  claudeSkillsFile: string | null;
  claudeCodeVersion: string | null;
  ghVersion: string | null;
  ghAuthUser: string | null;
  serverPort: string;
  nodeVersion: string;
}

interface SetupCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
  fixCommand?: string;
}

interface SetupCheckResponse {
  checks: SetupCheckResult[];
  allPassed: boolean;
  hasWarnings: boolean;
  hasCriticalFailures: boolean;
}

interface EnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EnvironmentModal({ isOpen, onClose }: EnvironmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Setup check state
  const [setupExpanded, setSetupExpanded] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupResult, setSetupResult] = useState<SetupCheckResponse | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  const fetchEnvironment = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/environment');
      if (!response.ok) {
        throw new Error('Failed to fetch environment info');
      }
      const data: EnvironmentInfo = await response.json();
      setEnvInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const runSetupCheck = useCallback(async () => {
    setSetupLoading(true);
    setSetupError(null);

    try {
      const response = await fetch('/api/setup-check');
      if (!response.ok) {
        throw new Error('Setup check request failed');
      }
      const data: SetupCheckResponse = await response.json();
      setSetupResult(data);
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSetupLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !envInfo && !loading) {
      fetchEnvironment();
    }
  }, [isOpen, envInfo, loading, fetchEnvironment]);

  // Auto-run setup check when expanded
  useEffect(() => {
    if (setupExpanded && !setupResult && !setupLoading) {
      runSetupCheck();
    }
  }, [setupExpanded, setupResult, setupLoading, runSetupCheck]);

  useEffect(() => {
    if (!isOpen) {
      setEnvInfo(null);
      setError(null);
      setSetupExpanded(false);
      setSetupResult(null);
      setSetupError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 animate-fadeIn"
      style={{ background: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
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
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Environment
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Current session context</p>
          </div>
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

          {envInfo && (
            <div className="space-y-4">
              {/* Repository */}
              <EnvSection title="Target Repository">
                <a
                  href={envInfo.repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  {envInfo.repo.fullName}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </EnvSection>

              {/* Local repo path */}
              <EnvSection title="Local Repo Path">
                <div className="flex items-center gap-2">
                  <StatusDot status={envInfo.targetRepoExists ? 'pass' : 'fail'} />
                  <code
                    className="text-xs px-2 py-1 rounded font-mono break-all"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    {envInfo.targetRepoPath}
                  </code>
                </div>
                {!envInfo.targetRepoExists && (
                  <p className="text-xs mt-1.5" style={{ color: 'var(--error)' }}>
                    Path not found. Set TARGET_REPO_PATH env variable.
                  </p>
                )}
              </EnvSection>

              {/* Claude Skills */}
              <EnvSection title="Claude Skills File">
                <div className="flex items-center gap-2">
                  <StatusDot status={envInfo.claudeSkillsFile ? 'pass' : 'warn'} />
                  {envInfo.claudeSkillsFile ? (
                    <code
                      className="text-xs px-2 py-1 rounded font-mono"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                    >
                      {envInfo.claudeSkillsFile}
                    </code>
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Not found</span>
                  )}
                </div>
                {!envInfo.claudeSkillsFile && (
                  <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                    Claude won't have codebase-specific context for follow-up searches.
                  </p>
                )}
              </EnvSection>

              {/* Tools */}
              <EnvSection title="Tools">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Claude Code</span>
                    <div className="flex items-center gap-2">
                      <StatusDot status={envInfo.claudeCodeVersion ? 'pass' : 'fail'} />
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {envInfo.claudeCodeVersion || 'Not installed'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>GitHub CLI</span>
                    <div className="flex items-center gap-2">
                      <StatusDot status={envInfo.ghVersion ? 'pass' : 'fail'} />
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {envInfo.ghVersion || 'Not installed'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>GitHub Auth</span>
                    <div className="flex items-center gap-2">
                      <StatusDot status={envInfo.ghAuthUser ? 'pass' : 'warn'} />
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {envInfo.ghAuthUser || 'Not authenticated'}
                      </span>
                    </div>
                  </div>
                </div>
              </EnvSection>

              {/* Server */}
              <EnvSection title="Server">
                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>Port: <span className="font-mono">{envInfo.serverPort}</span></span>
                  <span>Node: <span className="font-mono">{envInfo.nodeVersion}</span></span>
                </div>
              </EnvSection>

              {/* Setup Check - Collapsible */}
              <div
                className="rounded-lg overflow-hidden"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                <button
                  onClick={() => setSetupExpanded(!setupExpanded)}
                  className="w-full flex items-center justify-between p-3 transition-colors"
                  style={{ background: 'var(--bg-tertiary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-elevated)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Setup Check
                    </span>
                    {setupResult && (
                      <SetupStatusBadge result={setupResult} />
                    )}
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform ${setupExpanded ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--text-muted)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {setupExpanded && (
                  <div className="p-3 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    {setupLoading && (
                      <div className="flex items-center justify-center py-4">
                        <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                          <svg className="w-4 h-4 spinner" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span className="text-xs">Running checks...</span>
                        </div>
                      </div>
                    )}

                    {setupError && (
                      <div
                        className="p-3 rounded-lg"
                        style={{
                          background: 'rgba(229, 105, 90, 0.1)',
                          border: '1px solid rgba(229, 105, 90, 0.25)'
                        }}
                      >
                        <p className="font-medium text-xs" style={{ color: 'var(--error)' }}>Check failed</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{setupError}</p>
                      </div>
                    )}

                    {setupResult && (
                      <>
                        {setupResult.checks.map((check, i) => (
                          <CheckResultItem key={i} check={check} onCopyCommand={copyCommand} />
                        ))}
                        <button
                          onClick={runSetupCheck}
                          disabled={setupLoading}
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
                      </>
                    )}
                  </div>
                )}
              </div>
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

function SetupStatusBadge({ result }: { result: SetupCheckResponse }) {
  if (result.hasCriticalFailures) {
    return (
      <span
        className="px-1.5 py-0.5 text-[10px] font-medium rounded"
        style={{
          background: 'rgba(229, 105, 90, 0.12)',
          color: 'var(--error)'
        }}
      >
        Issues
      </span>
    );
  }
  if (result.hasWarnings) {
    return (
      <span
        className="px-1.5 py-0.5 text-[10px] font-medium rounded"
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
      className="px-1.5 py-0.5 text-[10px] font-medium rounded"
      style={{
        background: 'rgba(109, 186, 130, 0.12)',
        color: 'var(--success)'
      }}
    >
      OK
    </span>
  );
}

function CheckResultItem({
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

  const statusConfig = {
    pass: {
      icon: (
        <svg className="w-4 h-4" style={{ color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
      borderColor: 'rgba(109, 186, 130, 0.2)',
      bgColor: 'rgba(109, 186, 130, 0.05)',
    },
    warn: {
      icon: (
        <svg className="w-4 h-4" style={{ color: 'var(--warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      borderColor: 'rgba(229, 168, 85, 0.2)',
      bgColor: 'rgba(229, 168, 85, 0.05)',
    },
    fail: {
      icon: (
        <svg className="w-4 h-4" style={{ color: 'var(--error)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      borderColor: 'rgba(229, 105, 90, 0.2)',
      bgColor: 'rgba(229, 105, 90, 0.05)',
    },
  };

  const config = statusConfig[check.status];

  return (
    <div
      className="p-2.5 rounded-lg"
      style={{
        background: config.bgColor,
        border: `1px solid ${config.borderColor}`
      }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>
              {check.name}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {check.message}
          </p>

          {check.details && (
            <p
              className="text-[10px] mt-1.5 font-mono break-all px-1.5 py-1 rounded"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-muted)'
              }}
            >
              {check.details}
            </p>
          )}

          {check.fixCommand && (
            <div className="mt-1.5 flex items-center gap-1.5">
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
          )}
        </div>
      </div>
    </div>
  );
}
