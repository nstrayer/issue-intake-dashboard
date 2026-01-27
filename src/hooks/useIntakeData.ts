import { useMemo } from 'react';
import type { ChatMessage, Issue, IntakeData } from '../types/intake';

// Parse issues from Claude's response
function parseIssuesFromContent(content: string): Issue[] {
	const issues: Issue[] = [];

	// Look for JSON arrays in code blocks
	const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
	if (jsonMatch) {
		try {
			const parsed = JSON.parse(jsonMatch[1]);
			if (Array.isArray(parsed)) {
				return parsed.map((item) => ({
					number: item.number,
					title: item.title,
					author: item.author?.login || item.author || 'Unknown',
					createdAt: item.createdAt,
					labels: item.labels?.map((l: { name?: string } | string) =>
						typeof l === 'string' ? l : l.name
					) || [],
					url: item.url,
					body: item.body,
				}));
			}
		} catch {
			// Fall through to regex parsing
		}
	}

	// Fallback: Parse issue references from text
	const issuePattern = /#(\d+)\s*[-–]\s*([^\n]+)/g;
	let match;
	while ((match = issuePattern.exec(content)) !== null) {
		issues.push({
			number: parseInt(match[1], 10),
			title: match[2].trim(),
			author: 'Unknown',
			createdAt: new Date().toISOString(),
			labels: [],
			url: `https://github.com/posit-dev/positron/issues/${match[1]}`,
		});
	}

	return issues;
}

// Extract area breakdown from content
function parseAreaBreakdown(content: string): Record<string, number> {
	const breakdown: Record<string, number> = {};

	// Look for area patterns like "area:editor (5)" or "- area:console: 3"
	const areaPattern = /area:([a-z-]+)[:\s]+(\d+)/gi;
	let match;
	while ((match = areaPattern.exec(content)) !== null) {
		breakdown[match[1]] = parseInt(match[2], 10);
	}

	return breakdown;
}

// Count unlabeled issues mentioned
function countUnlabeled(content: string): number {
	const unlabeledMatch = content.match(/(\d+)\s*(?:unlabeled|without labels)/i);
	if (unlabeledMatch) {
		return parseInt(unlabeledMatch[1], 10);
	}
	return 0;
}

export function useIntakeData(messages: ChatMessage[]): IntakeData | null {
	return useMemo(() => {
		// Find the most recent assistant message with substantial content
		const assistantMessages = messages.filter(
			(m) => m.role === 'assistant' && m.content.length > 100
		);

		if (assistantMessages.length === 0) {
			return null;
		}

		const latestContent = assistantMessages[assistantMessages.length - 1].content;

		const issues = parseIssuesFromContent(latestContent);
		const areaBreakdown = parseAreaBreakdown(latestContent);
		const unlabeledCount = countUnlabeled(latestContent);

		return {
			issues,
			discussions: [], // TODO: Parse discussions
			unlabeledCount,
			areaBreakdown,
		};
	}, [messages]);
}
