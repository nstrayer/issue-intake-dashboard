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
	ageInHours: number;
}

/**
 * Format age for display - shows hours for same-day items, days for older items
 */
export function formatAge(ageInDays: number, ageInHours: number): string {
	if (ageInDays === 0) {
		if (ageInHours === 0) {
			return '<1h';
		}
		return `${ageInHours}h`;
	}
	return `${ageInDays}d`;
}

/**
 * Format age for display in verbose form (e.g., "3 hours ago", "5 days ago")
 */
export function formatAgeVerbose(ageInDays: number, ageInHours: number): string {
	if (ageInDays === 0) {
		if (ageInHours === 0) {
			return 'less than an hour ago';
		}
		if (ageInHours === 1) {
			return '1 hour ago';
		}
		return `${ageInHours} hours ago`;
	}
	if (ageInDays === 1) {
		return '1 day ago';
	}
	return `${ageInDays} days ago`;
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
	lastAnalysisType?: 'full' | 'duplicates' | 'labels' | 'response';
	conversationHistory?: FollowUpMessage[];
}
