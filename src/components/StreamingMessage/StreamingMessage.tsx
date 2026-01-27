import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../../types/intake';

interface StreamingMessageProps {
	message: ChatMessage;
}

export function StreamingMessage({ message }: StreamingMessageProps) {
	const isUser = message.role === 'user';

	return (
		<div
			className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
		>
			<div
				className={`max-w-[85%] rounded-lg px-4 py-3 ${isUser
						? 'bg-blue-600 text-white'
						: 'bg-[#21262d] text-gray-200 border border-gray-700'
					}`}
			>
				{isUser ? (
					<p>{message.content}</p>
				) : (
					<div className="markdown-content">
						<ReactMarkdown>{message.content}</ReactMarkdown>
						{message.isStreaming && (
							<span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse" />
						)}
					</div>
				)}
				<div
					className={`text-xs mt-2 ${isUser ? 'text-blue-200' : 'text-gray-500'
						}`}
				>
					{message.timestamp.toLocaleTimeString()}
				</div>
			</div>
		</div>
	);
}
