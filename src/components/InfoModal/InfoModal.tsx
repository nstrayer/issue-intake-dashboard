interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 animate-fadeIn"
      style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 p-6 rounded-xl animate-slideUp max-h-[80vh] overflow-y-auto"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-dim)' }}
          >
            <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            About Issue Intake
          </h2>
        </div>

        <div className="space-y-5">
          <InfoSection
            title="What is this?"
            content="Issue Intake is a triage dashboard for reviewing GitHub issues and discussions. It helps maintainers process incoming items by providing AI-powered analysis and organization tools."
          />

          <InfoSection
            title="How Claude Code is used"
            content="This app uses the Claude Code SDK (@anthropic-ai/claude-code) to power analysis. When you click 'Analyze':"
          >
            <ul className="mt-2 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--accent)' }}>•</span>
                <span><strong>Multi-turn analysis</strong> — Issue content is sent to Claude with a system prompt containing the Positron label taxonomy. Claude can search for duplicates via <code className="px-1 py-0.5 rounded text-xs" style={{ background: 'var(--bg-tertiary)' }}>gh</code> CLI, then returns structured JSON with summary, suggested labels, found duplicates, and draft response.</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--accent)' }}>•</span>
                <span><strong>Follow-up chat</strong> — Continue the conversation to ask questions, request deeper searches, or refine the analysis. Same tool access as initial analysis.</span>
              </li>
            </ul>
          </InfoSection>

          <InfoSection
            title="Tool permissions"
            content="Claude has consistent capabilities across all operations:"
          >
            <ul className="mt-2 space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--text-muted)' }}>→</span>
                <span><strong>Bash tool:</strong> Read-only <code className="px-1 py-0.5 rounded text-xs" style={{ background: 'var(--bg-tertiary)' }}>gh</code> commands only (maxTurns: 15)</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--text-muted)' }}>→</span>
                <span><strong>Label actions:</strong> Executed via GitHub API, not Claude</span>
              </li>
            </ul>
          </InfoSection>

          <InfoSection
            title="What is 'Stale'?"
            content="Items are marked as stale when they've been open for 14 or more days without receiving a status label. Stale items are highlighted to help prioritize older issues that may need attention."
          />

          <InfoSection
            title="Intake criteria"
            content="By default, the queue shows issues and discussions that match the 'intake' criteria:"
          >
            <ul className="mt-2 space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--accent)' }}>•</span>
                <span>No <code className="px-1 py-0.5 rounded text-xs" style={{ background: 'var(--bg-tertiary)' }}>status:*</code> label applied</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--accent)' }}>•</span>
                <span>You can expand filters to customize what's shown</span>
              </li>
            </ul>
          </InfoSection>

          <InfoSection
            title="Progress tracking"
            content="The progress bar shows how many items have been triaged (given a status label) out of the total in your current view. Your goal is to process items by either labeling them or taking other appropriate action."
          />
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-150"
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
  );
}

function InfoSection({
  title,
  content,
  children
}: {
  title: string;
  content: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {content}
      </p>
      {children}
    </div>
  );
}
