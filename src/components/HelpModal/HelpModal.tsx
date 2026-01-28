interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 animate-fadeIn"
      style={{ background: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 p-6 rounded-xl animate-slideUp"
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Keyboard Shortcuts
          </h2>
        </div>

        <div className="space-y-3">
          <ShortcutRow keys={['j', '↓']} description="Next item" />
          <ShortcutRow keys={['k', '↑']} description="Previous item" />
          <ShortcutRow keys={['a']} description="Analyze selected item" />
          <ShortcutRow keys={['o']} description="Open in GitHub" />
          <ShortcutRow keys={['r']} description="Refresh queue" />
          <ShortcutRow keys={['Esc']} description="Close side panel" />
          <ShortcutRow keys={['?']} description="Show this help" />
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

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{description}</span>
      <div className="flex items-center gap-1.5">
        {keys.map((key, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <kbd
              className="px-2 py-1 text-xs font-mono rounded"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)'
              }}
            >
              {key}
            </kbd>
            {i < keys.length - 1 && <span style={{ color: 'var(--text-muted)' }}>/</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
