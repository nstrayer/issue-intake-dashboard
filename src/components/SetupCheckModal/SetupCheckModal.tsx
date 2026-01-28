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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#161b22] rounded-lg border border-gray-700 p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Setup Check</h2>
          {result && (
            <StatusBadge result={result} />
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="ml-3 text-gray-300">Running checks...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4">
            <p className="font-medium">Check failed</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            {result.checks.map((check, i) => (
              <CheckResultItem key={i} check={check} onCopyCommand={copyCommand} />
            ))}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          {result && (
            <button
              onClick={runCheck}
              disabled={loading}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors"
            >
              Re-run Checks
            </button>
          )}
          <button
            onClick={onClose}
            className={`${result ? 'flex-1' : 'w-full'} py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors`}
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
      <span className="px-2 py-1 text-xs bg-red-900/50 text-red-400 rounded-full">
        Issues Found
      </span>
    );
  }
  if (result.hasWarnings) {
    return (
      <span className="px-2 py-1 text-xs bg-yellow-900/50 text-yellow-400 rounded-full">
        Warnings
      </span>
    );
  }
  return (
    <span className="px-2 py-1 text-xs bg-green-900/50 text-green-400 rounded-full">
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
        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      borderColor: 'border-green-900/50',
      bgColor: 'bg-green-900/10',
    },
    warn: {
      icon: (
        <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      borderColor: 'border-yellow-900/50',
      bgColor: 'bg-yellow-900/10',
    },
    fail: {
      icon: (
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      borderColor: 'border-red-900/50',
      bgColor: 'bg-red-900/10',
    },
  };

  const config = statusConfig[check.status];

  return (
    <div className={`p-3 rounded-lg border ${config.borderColor} ${config.bgColor}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-white">{check.name}</span>
          </div>
          <p className="text-sm text-gray-300 mt-0.5">{check.message}</p>

          {check.details && (
            <p className="text-xs text-gray-500 mt-1 font-mono break-all">{check.details}</p>
          )}

          {check.fixCommand && (
            <div className="mt-2 flex items-center gap-2">
              <code className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300 font-mono flex-1 overflow-x-auto">
                {check.fixCommand}
              </code>
              <button
                onClick={handleCopy}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors flex-shrink-0"
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
