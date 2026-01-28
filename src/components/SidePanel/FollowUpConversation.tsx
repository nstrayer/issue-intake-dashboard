import { useState, useRef, useEffect } from 'react';
import { FollowUpMessage } from '../../types/intake';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FollowUpConversationProps {
  conversationHistory: FollowUpMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
}

export function FollowUpConversation({
  conversationHistory,
  isLoading,
  onSendMessage,
}: FollowUpConversationProps) {
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationHistory, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    onSendMessage(trimmed);
    setInputValue('');
  };

  return (
    <div className="pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <h4 className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
        Follow-up Questions
      </h4>

      {/* Conversation history */}
      {conversationHistory.length > 0 && (
        <div
          ref={scrollRef}
          className="max-h-64 overflow-y-auto space-y-3 mb-4 pr-1"
        >
          {conversationHistory.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[85%] px-3 py-2 rounded-lg text-sm"
                style={{
                  background: message.role === 'user' ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: message.role === 'user' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  border: message.role === 'assistant' ? '1px solid var(--border-subtle)' : 'none'
                }}
              >
                {message.role === 'assistant' ? (
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div
                className="px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <LoadingDots />
                <span>Thinking...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isLoading ? "Waiting for response..." : "Ask a follow-up question..."}
            disabled={isLoading}
            className="w-full px-3 py-2 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: inputValue.trim() && !isLoading ? 'var(--accent)' : 'var(--bg-tertiary)',
            color: inputValue.trim() && !isLoading ? 'var(--bg-primary)' : 'var(--text-muted)'
          }}
          onMouseEnter={(e) => {
            if (inputValue.trim() && !isLoading) {
              e.currentTarget.style.background = 'var(--accent-muted)';
            }
          }}
          onMouseLeave={(e) => {
            if (inputValue.trim() && !isLoading) {
              e.currentTarget.style.background = 'var(--accent)';
            }
          }}
        >
          {isLoading ? (
            <LoadingDots />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex gap-1">
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: 'currentColor',
          animation: 'pulse 1.4s ease-in-out infinite'
        }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: 'currentColor',
          animation: 'pulse 1.4s ease-in-out 0.2s infinite'
        }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: 'currentColor',
          animation: 'pulse 1.4s ease-in-out 0.4s infinite'
        }}
      />
    </div>
  );
}
