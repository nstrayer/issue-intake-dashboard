// Types for Command Center 2.0

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

export interface FollowUpMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: Date;
}

export interface ClaudeAnalysis {
	suggestedLabels: string[];
	duplicates: { number: number; title: string; url: string; similarity: number }[];
	summary: string;
	draftResponse?: string;
	isLoading: boolean;
	error?: string;
	conversationHistory?: FollowUpMessage[];
}
