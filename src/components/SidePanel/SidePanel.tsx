import { useState, useEffect, useCallback } from 'react';
import { QueueItem, ClaudeAnalysis, formatAgeVerbose } from '../../types/intake';
import { useItemDetails } from '../../hooks/useIntakeQueue';
import { LabelPicker } from '../LabelPicker/LabelPicker';
import { FollowUpConversation } from './FollowUpConversation';
import { generateClaudeCodePrompt } from '../../utils/generateClaudeCodePrompt';
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
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleCopyPrompt = useCallback(() => {
    if (!item) return;
    const prompt = generateClaudeCodePrompt(item, body, analysis);
    navigator.clipboard.writeText(prompt);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }, [item, body, analysis]);

  // Keyboard shortcut for copy
  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'c') {
        handleCopyPrompt();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, handleCopyPrompt]);

  if (!item) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center px-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <svg
              className="w-8 h-8"
              style={{ color: 'var(--text-muted)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </div>
          <p className="text-base font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Select an item
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Click an issue or discussion to view details
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Type and number badge */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded"
                style={{
                  background: item.type === 'issue' ? 'rgba(109, 186, 130, 0.12)' : 'rgba(107, 155, 212, 0.12)',
                  color: item.type === 'issue' ? 'var(--success)' : 'var(--info)'
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: item.type === 'issue' ? 'var(--success)' : 'var(--info)' }}
                />
                {item.type === 'issue' ? 'Issue' : 'Discussion'}
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                #{item.number}
              </span>
              {item.isStale && (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded"
                  style={{
                    background: 'rgba(229, 168, 85, 0.12)',
                    color: 'var(--warning)'
                  }}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Stale
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-base font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
              {item.title}
            </h2>

            {/* Author and age */}
            <div className="flex items-center gap-2 mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              <span>@{item.author}</span>
              <span>·</span>
              <span>{formatAgeVerbose(item.ageInDays, item.ageInHours)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
              title="Open in GitHub (o)"
            >
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
              title="Close (Esc)"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Labels section - always show for issues */}
        {item.type === 'issue' && (
          <Section title="Labels">
            <LabelPicker
              currentLabels={item.labels}
              onApply={onApplyLabel}
              onRemove={onRemoveLabel}
            />
          </Section>
        )}

        {/* Body */}
        <Section title="Description">
          {bodyLoading ? (
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <LoadingSpinner size="sm" />
              <span className="text-sm">Loading description...</span>
            </div>
          ) : bodyError ? (
            <div className="text-sm" style={{ color: 'var(--error)' }}>
              Failed to load description: {bodyError}
            </div>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {stripHtmlComments(body) || '*No description provided*'}
              </ReactMarkdown>
            </div>
          )}
        </Section>

        {/* Claude Analysis Section */}
        <Section
          title="AI Analysis"
          action={
            !analysis && !bodyLoading ? (
              <button
                onClick={() => onRequestAnalysis(body)}
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150"
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
                Analyze
              </button>
            ) : undefined
          }
        >
          {analysis?.isLoading ? (
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <LoadingSpinner size="sm" />
              <span className="text-sm">Analyzing...</span>
            </div>
          ) : analysis?.error ? (
            <div className="text-sm" style={{ color: 'var(--error)' }}>{analysis.error}</div>
          ) : analysis ? (
            <div className="space-y-5">
              {/* Summary */}
              <div>
                <SubsectionTitle>Summary</SubsectionTitle>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {analysis.summary}
                </p>
              </div>

              {/* Suggested Labels */}
              {analysis.suggestedLabels.length > 0 && (
                <div>
                  <SubsectionTitle>Suggested Labels</SubsectionTitle>
                  <div className="flex gap-2 flex-wrap">
                    {analysis.suggestedLabels.map(label => (
                      <button
                        key={label}
                        onClick={() => onApplyLabel(label)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150"
                        style={{
                          background: 'var(--accent-dim)',
                          color: 'var(--accent)',
                          border: '1px solid var(--accent)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--accent)';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--accent-dim)';
                          e.currentTarget.style.color = 'var(--accent)';
                        }}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicates */}
              {analysis.duplicates.length > 0 && (
                <div>
                  <SubsectionTitle>Potential Duplicates</SubsectionTitle>
                  <div className="space-y-2">
                    {analysis.duplicates.map(dup => (
                      <a
                        key={dup.number}
                        href={dup.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2.5 rounded-lg transition-all duration-150"
                        style={{
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-subtle)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-medium)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        }}
                      >
                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          #{dup.number}
                        </span>
                        <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                          {dup.title}
                        </span>
                        {dup.similarity > 0 && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              background: 'var(--accent-dim)',
                              color: 'var(--accent)'
                            }}
                          >
                            {Math.round(dup.similarity * 100)}%
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Draft Response */}
              {analysis.draftResponse && (
                <div>
                  <SubsectionTitle>Draft Response</SubsectionTitle>
                  <div
                    className="p-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    {analysis.draftResponse}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(analysis.draftResponse!)}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150"
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
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy to clipboard
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
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Get AI-powered insights, label suggestions, and duplicate detection.
            </p>
          )}
        </Section>

        {/* Continue in Claude Code section */}
        <div className="p-4">
          <div
            className="p-4 rounded-lg"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono font-bold"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {'>_'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Need more control?
                </h4>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                  Continue in Claude Code for full flexibility with the intake workflow.
                </p>
                <button
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150"
                  style={{
                    background: copyFeedback ? 'var(--success)' : 'var(--bg-elevated)',
                    color: copyFeedback ? 'white' : 'var(--text-secondary)',
                    border: `1px solid ${copyFeedback ? 'var(--success)' : 'var(--border-subtle)'}`
                  }}
                  onMouseEnter={(e) => {
                    if (!copyFeedback) {
                      e.currentTarget.style.background = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.borderColor = 'var(--border-medium)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!copyFeedback) {
                      e.currentTarget.style.background = 'var(--bg-elevated)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    }
                  }}
                >
                  {copyFeedback ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy prompt for Claude Code
                    </>
                  )}
                  <kbd
                    className="ml-1 px-1.5 py-0.5 text-[10px] font-mono rounded"
                    style={{
                      background: copyFeedback ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)',
                      color: copyFeedback ? 'white' : 'var(--text-muted)',
                      border: `1px solid ${copyFeedback ? 'rgba(255,255,255,0.3)' : 'var(--border-subtle)'}`
                    }}
                  >
                    c
                  </kbd>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  action,
  children
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {title}
        </h3>
        {action}
      </div>
      <div className="px-4 pb-4">
        {children}
      </div>
    </div>
  );
}

function SubsectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
      {children}
    </h4>
  );
}

function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <svg className={`spinner ${sizeClass}`} viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
