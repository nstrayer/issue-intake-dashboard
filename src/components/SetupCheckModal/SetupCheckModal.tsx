import { useState, useEffect, useCallback } from 'react';

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

interface SetupCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SetupCheckModal({ isOpen, onClose }: SetupCheckModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SetupCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/setup-check');
      if (!response.ok) {
        throw new Error('Setup check request failed');
      }
      const data: SetupCheckResponse = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !result && !loading) {
      runCheck();
    }
  }, [isOpen, result, loading, runCheck]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 animate-fadeIn"
      style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 max-h-[80vh] flex flex-col rounded-xl overflow-hidden animate-slideUp"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-dim)' }}
            >
              <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Setup Check
            </h2>
          </div>
          {result && <StatusBadge result={result} />}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                <svg className="w-6 h-6 spinner" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Running checks...</span>
              </div>
            </div>
          )}

          {error && (
            <div
              className="p-4 rounded-lg mb-4"
              style={{
                background: 'rgba(229, 105, 90, 0.1)',
                border: '1px solid rgba(229, 105, 90, 0.25)'
              }}
            >
              <p className="font-medium text-sm" style={{ color: 'var(--error)' }}>Check failed</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              {result.checks.map((check, i) => (
                <CheckResultItem key={i} check={check} onCopyCommand={copyCommand} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {result && (
            <button
              onClick={runCheck}
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 disabled:opacity-50"
              style={{
                background: 'var(--accent)',
                color: 'var(--bg-primary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent-muted)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--accent)';
              }}
            >
              Re-run Checks
            </button>
          )}
          <button
            onClick={onClose}
            className={`${result ? 'flex-1' : 'w-full'} py-2.5 text-sm font-medium rounded-lg transition-all duration-150`}
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

function StatusBadge({ result }: { result: SetupCheckResponse }) {
  if (result.hasCriticalFailures) {
    return (
      <span
        className="px-2.5 py-1 text-xs font-medium rounded-md"
        style={{
          background: 'rgba(229, 105, 90, 0.12)',
          color: 'var(--error)'
        }}
      >
        Issues Found
      </span>
    );
  }
  if (result.hasWarnings) {
    return (
      <span
        className="px-2.5 py-1 text-xs font-medium rounded-md"
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
      className="px-2.5 py-1 text-xs font-medium rounded-md"
      style={{
        background: 'rgba(109, 186, 130, 0.12)',
        color: 'var(--success)'
      }}
    >
      All Passed
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
        <svg className="w-5 h-5" style={{ color: 'var(--success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
      borderColor: 'rgba(109, 186, 130, 0.2)',
      bgColor: 'rgba(109, 186, 130, 0.05)',
    },
    warn: {
      icon: (
        <svg className="w-5 h-5" style={{ color: 'var(--warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      borderColor: 'rgba(229, 168, 85, 0.2)',
      bgColor: 'rgba(229, 168, 85, 0.05)',
    },
    fail: {
      icon: (
        <svg className="w-5 h-5" style={{ color: 'var(--error)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
      className="p-3 rounded-lg"
      style={{
        background: config.bgColor,
        border: `1px solid ${config.borderColor}`
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
              {check.name}
            </span>
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {check.message}
          </p>

          {check.details && (
            <p
              className="text-xs mt-2 font-mono break-all px-2 py-1.5 rounded"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-muted)'
              }}
            >
              {check.details}
            </p>
          )}

          {check.fixCommand && (
            <div className="mt-2 flex items-center gap-2">
              <code
                className="flex-1 text-xs px-2 py-1.5 rounded font-mono overflow-x-auto"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)'
                }}
              >
                {check.fixCommand}
              </code>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 px-2.5 py-1.5 text-xs font-medium rounded transition-all duration-150"
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
