import { useState, useEffect } from 'react';

interface IntakeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const POLL_INTERVAL_OPTIONS = [
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 90, label: '1.5m' },
  { value: 120, label: '2m' },
  { value: 300, label: '5m' },
  { value: 600, label: '10m' },
];

export function IntakeConfigModal({ isOpen, onClose, onSave }: IntakeConfigModalProps) {
  const [criteria, setCriteria] = useState('');
  const [pollIntervalSeconds, setPollIntervalSeconds] = useState(90);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load current config when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      fetch('/api/intake-config')
        .then(res => res.json())
        .then(data => {
          setCriteria(data.intakeCriteria || '');
          setPollIntervalSeconds(data.pollIntervalSeconds || 90);
          setIsLoading(false);
        })
        .catch(() => {
          setError('Failed to load configuration');
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/intake-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intakeCriteria: criteria, pollIntervalSeconds }),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      setSuccessMessage('Configuration saved successfully');
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 animate-fadeIn"
      style={{ background: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 p-6 rounded-xl animate-slideUp"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.15)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-dim)' }}
          >
            <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Intake Configuration
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Customize which items appear in the intake queue
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="w-6 h-6 spinner" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Intake Criteria
              </label>
              <textarea
                value={criteria}
                onChange={(e) => setCriteria(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-lg resize-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)'
                }}
                placeholder="Describe in natural language which items should appear in the intake queue..."
              />
              <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                Examples: "Exclude items in 'Done' status", "Only show unlabeled issues", "Exclude backlog project items"
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Poll for new items every
              </label>
              <div className="flex gap-1.5">
                {POLL_INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPollIntervalSeconds(opt.value)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150"
                    style={{
                      background: pollIntervalSeconds === opt.value ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color: pollIntervalSeconds === opt.value ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${pollIntervalSeconds === opt.value ? 'var(--accent)' : 'var(--border-subtle)'}`,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                How often to check GitHub for new issues and discussions. Sends a desktop notification when new items arrive.
              </p>
            </div>

            <div
              className="p-3 rounded-lg"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <h4 className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                How it works
              </h4>
              <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <li className="flex items-start gap-2">
                  <span style={{ color: 'var(--accent)' }}>1.</span>
                  <span>Your criteria is saved to <code className="px-1 py-0.5 rounded" style={{ background: 'var(--bg-secondary)' }}>~/.config/issue-intake/</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: 'var(--accent)' }}>2.</span>
                  <span>The dashboard uses it to filter which issues and discussions to show</span>
                </li>
                <li className="flex items-start gap-2">
                  <span style={{ color: 'var(--accent)' }}>3.</span>
                  <span>Add <code className="px-1 py-0.5 rounded" style={{ background: 'var(--bg-secondary)' }}>.issue-intake.json</code> to your repo to share with your team</span>
                </li>
              </ul>
            </div>

            {error && (
              <div
                className="p-3 rounded-lg text-sm"
                style={{
                  background: 'rgba(229, 105, 90, 0.1)',
                  border: '1px solid rgba(229, 105, 90, 0.3)',
                  color: 'var(--error)'
                }}
              >
                {error}
              </div>
            )}

            {successMessage && (
              <div
                className="p-3 rounded-lg text-sm"
                style={{
                  background: 'rgba(76, 175, 80, 0.1)',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                  color: 'var(--success)'
                }}
              >
                {successMessage}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-150"
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
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 disabled:opacity-50"
            style={{
              background: 'var(--accent)',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              if (!isSaving && !isLoading) {
                e.currentTarget.style.background = 'var(--accent-muted)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent)';
            }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
