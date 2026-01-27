import { useState, useRef, useEffect } from 'react';
import { StreamingMessage } from '../StreamingMessage/StreamingMessage';
import type { ChatMessage } from '../../types/intake';

interface ChatInterfaceProps {
	messages: ChatMessage[];
	isLoading: boolean;
	onSendMessage: (message: string) => void;
}

export function ChatInterface({
	messages,
	isLoading,
	onSendMessage,
}: ChatInterfaceProps) {
	const [input, setInput] = useState('');
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim() || isLoading) return;

		onSendMessage(input.trim());
		setInput('');
	};

	const suggestedQueries = [
		'Tell me about the oldest issues',
		'Are there any duplicate issues?',
		'Which issues need labels?',
		'Show me bug reports',
	];

	return (
		<div className="bg-[#161b22] rounded-lg border border-gray-800 flex flex-col h-[600px]">
			{/* Messages area */}
			<div className="flex-1 overflow-y-auto p-4">
				{messages.length === 0 ? (
					<div className="h-full flex flex-col items-center justify-center text-gray-500">
						<svg
							className="w-16 h-16 mb-4 text-gray-700"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
							/>
						</svg>
						<p className="text-lg mb-2">Ready to help with intake</p>
						<p className="text-sm text-gray-600">
							Click "Let's get caught up" to analyze the current queue
						</p>
					</div>
				) : (
					<>
						{messages.map((message) => (
							<StreamingMessage key={message.id} message={message} />
						))}
						<div ref={messagesEndRef} />
					</>
				)}
			</div>

			{/* Suggested queries */}
			{messages.length > 0 && !isLoading && (
				<div className="px-4 pb-2">
					<div className="flex flex-wrap gap-2">
						{suggestedQueries.map((query) => (
							<button
								key={query}
								onClick={() => onSendMessage(query)}
								className="text-xs px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-full border border-gray-700 transition-colors"
							>
								{query}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Input area */}
			<form onSubmit={handleSubmit} className="border-t border-gray-800 p-4">
				<div className="flex gap-3">
					<input
						ref={inputRef}
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Ask a follow-up question..."
						disabled={isLoading || messages.length === 0}
						className="flex-1 bg-[#0d1117] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
					/>
					<button
						type="submit"
						disabled={isLoading || !input.trim() || messages.length === 0}
						className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
					>
						Send
					</button>
				</div>
			</form>
		</div>
	);
}
