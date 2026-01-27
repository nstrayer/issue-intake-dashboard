export interface Issue {
	number: number;
	title: string;
	author: string;
	createdAt: string;
	labels: string[];
	url: string;
	body?: string;
}

export interface Discussion {
	number: number;
	title: string;
	author: string;
	createdAt: string;
	category: string;
	url: string;
	answerCount: number;
}

export interface IntakeData {
	issues: Issue[];
	discussions: Discussion[];
	unlabeledCount: number;
	areaBreakdown: Record<string, number>;
}

// New types for Command Center 2.0
export interface QueueItem {
	id: string;
	type: 'issue' | 'discussion';
	number: number;
	title: string;
	author: string;
	createdAt: Date;
	labels: string[];
	url: string;
	body?: string;
	category?: string;
	isStale: boolean;
	ageInDays: number;
}

export interface ClaudeAnalysis {
	suggestedLabels: string[];
	duplicates: { number: number; title: string; url: string; similarity: number }[];
	summary: string;
	draftResponse?: string;
	isLoading: boolean;
	error?: string;
}

// SDK Message types (simplified for frontend use)
export interface SDKAssistantMessage {
	type: 'assistant';
	session_id: string;
	message: {
		content: Array<{
			type: 'text' | 'tool_use';
			text?: string;
			name?: string;
			input?: unknown;
		}>;
	};
}

export interface SDKResultMessage {
	type: 'result';
	session_id: string;
	subtype: 'success' | 'error_max_turns' | 'error_during_execution';
	result?: string;
	is_error: boolean;
}

export interface SDKSystemMessage {
	type: 'system';
	session_id: string;
	subtype: 'init' | 'compact_boundary';
}

export interface SDKStreamEvent {
	type: 'stream_event';
	session_id: string;
	event: {
		type: string;
		delta?: {
			type: string;
			text?: string;
		};
	};
}

export interface SDKUserMessage {
	type: 'user';
	session_id: string;
}

export interface ErrorMessage {
	type: 'error';
	content: string;
}

export type SDKMessage =
	| SDKAssistantMessage
	| SDKResultMessage
	| SDKSystemMessage
	| SDKStreamEvent
	| SDKUserMessage
	| ErrorMessage;

export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: Date;
	isStreaming?: boolean;
}
