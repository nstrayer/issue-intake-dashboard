import { useState, useEffect, useCallback, useRef } from 'react';
import { QueueItem, ClaudeAnalysis, formatAgeVerbose } from '../../types/intake';
import { useItemDetails } from '../../hooks/useIntakeQueue';
import { LabelPicker } from '../LabelPicker/LabelPicker';
import { FollowUpConversation } from './FollowUpConversation';
import { generateClaudeCodePrompt } from '../../utils/generateClaudeCodePrompt';
import { AnalysisType } from '../../hooks/useAnalysis';
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
  onRequestAnalysis: (body: string, type?: AnalysisType) => void;
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

  // Check if we have any analysis results to show (including "no results" for completed searches)
  const hasAnalysisResults = analysis && !analysis.isLoading && !analysis.error && (
    analysis.summary ||
    analysis.suggestedLabels.length > 0 ||
    analysis.duplicates.length > 0 ||
    analysis.draftResponse ||
    analysis.lastAnalysisType
  );

  return (
    <div data-tour="side-panel" className="h-full flex flex-col">
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

          {/* Close button only - GitHub moved to action bar */}
          <div className="flex items-center gap-1 flex-shrink-0">
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

        {/* AI Analysis Section - only show when we have results or loading/error */}
        {(analysis?.isLoading || analysis?.error || hasAnalysisResults) && (
          <Section title="AI Analysis">
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
                {analysis.summary && (
                  <div>
                    <SubsectionTitle>Summary</SubsectionTitle>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {analysis.summary}
                    </p>
                  </div>
                )}

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
                {analysis.duplicates.length > 0 ? (
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
                ) : (analysis.lastAnalysisType === 'duplicates' || analysis.lastAnalysisType === 'full') && (
                  <div>
                    <SubsectionTitle>Potential Duplicates</SubsectionTitle>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      No potential duplicates found.
                    </p>
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
            ) : null}
          </Section>
        )}
      </div>

      {/* Fixed Action Bar */}
      <ActionBar
        item={item}
        body={body}
        bodyLoading={bodyLoading}
        isAnalyzing={analysis?.isLoading ?? false}
        copyFeedback={copyFeedback}
        onRequestAnalysis={onRequestAnalysis}
        onCopyPrompt={handleCopyPrompt}
      />
    </div>
  );
}

// Analyze Dropdown Component
function AnalyzeDropdown({
  onSelect,
  disabled,
  isLoading,
}: {
  onSelect: (type: AnalysisType) => void;
  disabled: boolean;
  isLoading: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const options: { type: AnalysisType; label: string; icon: React.ReactNode }[] = [
    {
      type: 'full',
      label: 'Full Analysis',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      type: 'duplicates',
      label: 'Find Duplicates',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      type: 'labels',
      label: 'Suggest Labels',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      type: 'response',
      label: 'Draft Response',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        data-tour="analyze-button"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-subtle)',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = 'var(--bg-elevated)';
            e.currentTarget.style.borderColor = 'var(--border-medium)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--bg-tertiary)';
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
      >
        {isLoading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )}
        <span>Analyze</span>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-2 py-1 rounded-lg shadow-lg min-w-[160px] z-10"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-medium)',
          }}
        >
          {options.map((option) => (
            <button
              key={option.type}
              onClick={() => {
                setIsOpen(false);
                onSelect(option.type);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Action Bar Component
function ActionBar({
  item,
  body,
  bodyLoading,
  isAnalyzing,
  copyFeedback,
  onRequestAnalysis,
  onCopyPrompt,
}: {
  item: QueueItem;
  body: string;
  bodyLoading: boolean;
  isAnalyzing: boolean;
  copyFeedback: boolean;
  onRequestAnalysis: (body: string, type?: AnalysisType) => void;
  onCopyPrompt: () => void;
}) {
  const handleAnalyze = (type: AnalysisType) => {
    onRequestAnalysis(body, type);
  };

  return (
    <div
      className="flex items-center gap-2 px-4 py-3"
      style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
      }}
    >
      {/* Analyze dropdown - left side */}
      <AnalyzeDropdown
        onSelect={handleAnalyze}
        disabled={bodyLoading || isAnalyzing}
        isLoading={isAnalyzing}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Claude Code button - right side */}
      <button
        onClick={onCopyPrompt}
        data-tour="copy-claude-code"
        className="group relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150"
        style={{
          background: copyFeedback ? 'var(--success)' : 'var(--bg-tertiary)',
          color: copyFeedback ? 'white' : 'var(--text-secondary)',
          border: `1px solid ${copyFeedback ? 'var(--success)' : 'var(--border-subtle)'}`,
        }}
        onMouseEnter={(e) => {
          if (!copyFeedback) {
            e.currentTarget.style.background = 'var(--bg-elevated)';
            e.currentTarget.style.borderColor = 'var(--border-medium)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!copyFeedback) {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
      >
        {/* Tooltip */}
        <span
          className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-medium)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          Copy issue context to continue in Claude Code
        </span>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {copyFeedback ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          )}
        </svg>
        <span>{copyFeedback ? 'Copied!' : 'Copy prompt'}</span>
        <kbd
          className="px-1 py-0.5 text-[10px] font-mono rounded"
          style={{
            background: copyFeedback ? 'rgba(255,255,255,0.2)' : 'var(--bg-elevated)',
            color: copyFeedback ? 'white' : 'var(--text-muted)',
          }}
        >
          c
        </kbd>
      </button>

      {/* GitHub link - right side */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-subtle)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-elevated)';
          e.currentTarget.style.borderColor = 'var(--border-medium)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--bg-tertiary)';
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
        title="Open in GitHub (o)"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
        <span>GitHub</span>
      </a>
    </div>
  );
}

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {title}
        </h3>
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
