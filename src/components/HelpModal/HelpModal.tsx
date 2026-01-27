interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#161b22] rounded-lg border border-gray-700 p-6 max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-4">Keyboard Shortcuts</h2>

        <div className="space-y-3 text-sm">
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
          className="mt-6 w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
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
      <span className="text-gray-400">{description}</span>
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <span key={i}>
            <kbd className="px-2 py-0.5 bg-gray-800 border border-gray-600 rounded text-gray-300 font-mono text-xs">
              {key}
            </kbd>
            {i < keys.length - 1 && <span className="text-gray-500 mx-1">/</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
