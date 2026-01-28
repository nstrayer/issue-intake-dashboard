import { QueueItem, ClaudeAnalysis } from '../../types/intake';
import { useItemDetails } from '../../hooks/useIntakeQueue';
import { LabelPicker } from '../LabelPicker/LabelPicker';
import { FollowUpConversation } from './FollowUpConversation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// Strip HTML comments from issue templates (e.g., <!-- instructions -->)
function stripHtmlComments(text: string | undefined): string {
  if (!text) return '';
  return text.replace(/<!--[\s\S]*?-->/g, '').trim();
}

interface SidePanelProps {
  item: QueueItem | null;
  analysis: ClaudeAnalysis | null;
  onClose: () => void;
  onApplyLabel: (label: string) => void;
  onRemoveLabel: (label: string) => void;
  onRequestAnalysis: (body: string) => void;
  onFollowUp?: (question: string, body: string) => void;
  followUpLoading?: boolean;
}

export function SidePanel({ item, analysis, onClose, onApplyLabel, onRemoveLabel, onRequestAnalysis, onFollowUp, followUpLoading = false }: SidePanelProps) {
  // Fetch full details including body when item is selected
  const { body, isLoading: bodyLoading, error: bodyError } = useItemDetails(item);

  if (!item) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg">Select an item to view details</p>
          <p className="text-sm mt-1">Click on any issue or discussion in the queue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${item.type === 'issue' ? 'text-green-400' : 'text-purple-400'}`}>
              {item.type === 'issue' ? 'Issue' : 'Discussion'}
            </span>
            <span className="text-gray-500">#{item.number}</span>
            {item.isStale && (
              <span className="px-1.5 py-0.5 bg-yellow-900/50 text-yellow-400 rounded text-xs">
                STALE
              </span>
            )}
          </div>
          <h2 className="text-lg font-medium text-white mt-1">{item.title}</h2>
          <div className="text-sm text-gray-400 mt-1">
            @{item.author} · {item.ageInDays} days ago
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Open in GitHub"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </a>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Labels section - always show for issues */}
        {item.type === 'issue' && (
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Labels</h3>
            <LabelPicker
              currentLabels={item.labels}
              onApply={onApplyLabel}
              onRemove={onRemoveLabel}
            />
          </div>
        )}

        {/* Body */}
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Description</h3>
          {bodyLoading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <span>Loading description...</span>
            </div>
          ) : bodyError ? (
            <div className="text-red-400 text-sm">Failed to load description: {bodyError}</div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {stripHtmlComments(body) || '*No description provided*'}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Claude Analysis Section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400">Claude Analysis</h3>
            {!analysis && !bodyLoading && (
              <button
                onClick={() => onRequestAnalysis(body)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
              >
                Analyze
              </button>
            )}
          </div>

          {analysis?.isLoading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <span>Analyzing...</span>
            </div>
          ) : analysis?.error ? (
            <div className="text-red-400 text-sm">{analysis.error}</div>
          ) : analysis ? (
            <div className="space-y-4">
              {/* Summary */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Summary</h4>
                <p className="text-gray-300 text-sm">{analysis.summary}</p>
              </div>

              {/* Suggested Labels */}
              {analysis.suggestedLabels.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Suggested Labels</h4>
                  <div className="flex gap-2 flex-wrap">
                    {analysis.suggestedLabels.map(label => (
                      <button
                        key={label}
                        onClick={() => onApplyLabel(label)}
                        className="px-2 py-1 bg-blue-900/50 text-blue-400 hover:bg-blue-800 rounded text-sm transition-colors"
                      >
                        + {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicates */}
              {analysis.duplicates.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Potential Duplicates</h4>
                  <div className="space-y-1">
                    {analysis.duplicates.map(dup => (
                      <a
                        key={dup.number}
                        href={dup.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
                      >
                        <span className="text-gray-500">#{dup.number}</span>{' '}
                        <span className="text-gray-300">{dup.title}</span>
                        {dup.similarity > 0 && (
                          <span className="text-gray-500 ml-2">({Math.round(dup.similarity * 100)}% similar)</span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Draft Response */}
              {analysis.draftResponse && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Draft Response</h4>
                  <div className="p-3 bg-gray-800 rounded text-sm text-gray-300 whitespace-pre-wrap">
                    {analysis.draftResponse}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(analysis.draftResponse!)}
                    className="mt-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                  >
                    Copy to Clipboard
                  </button>
                </div>
              )}

              {/* Follow-up Conversation */}
              {onFollowUp && (
                <FollowUpConversation
                  conversationHistory={analysis.conversationHistory || []}
                  isLoading={followUpLoading}
                  onSendMessage={(question) => onFollowUp(question, body)}
                />
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              Click "Analyze" to get AI-powered insights, label suggestions, and duplicate detection.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
