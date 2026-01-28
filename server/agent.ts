import { query, type SDKMessage } from '@anthropic-ai/claude-code';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { INTAKE_SYSTEM_PROMPT, CATCH_UP_PROMPT } from './prompts/intake.js';
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt, buildFollowUpPrompt, type FollowUpMessage } from './prompts/analysis.js';

export interface ClaudeSettings {
	env?: Record<string, string>;
	awsAuthRefresh?: string;
}

export interface AgentOptions {
	sessionId?: string;
	workingDirectory?: string;
	claudeSettings?: ClaudeSettings;
}

/**
 * Load Claude Code settings from the user's ~/.claude/settings.json
 */
export function loadClaudeSettings(): ClaudeSettings {
	const settingsPath = join(homedir(), '.claude', 'settings.json');
	if (!existsSync(settingsPath)) {
		return {};
	}
	try {
		return JSON.parse(readFileSync(settingsPath, 'utf-8'));
	} catch {
		return {};
	}
}

/**
 * Error thrown when Claude Code authentication is required.
 * Users should run `claude` in their terminal to authenticate first.
 */
export class AuthenticationRequiredError extends Error {
	refreshCommand?: string;

	constructor(refreshCommand?: string) {
		const baseMsg = 'Claude Code authentication required.';
		const hint = refreshCommand
			? `Run: ${refreshCommand}`
			: 'Please run "claude" in your terminal to authenticate.';
		super(`${baseMsg} ${hint}`);
		this.name = 'AuthenticationRequiredError';
		this.refreshCommand = refreshCommand;
	}
}

/**
 * Detect if an error is an authentication-related error.
 * This happens when the CLI outputs interactive text instead of JSON.
 */
function isAuthError(error: unknown): boolean {
	if (error instanceof Error) {
		const msg = error.message.toLowerCase();
		// JSON parsing error with "Attempting" suggests auth prompt in stdout
		if (msg.includes('unexpected token') && error.message.includes('Attempting')) {
			return true;
		}
		// Other auth-related patterns
		if (msg.includes('not authenticated') || msg.includes('authentication required')) {
			return true;
		}
		// SSO token expiry detection
		if (msg.includes('token has expired') || msg.includes('sso session') || msg.includes('expired sso')) {
			return true;
		}
		// AWS credential errors
		if (msg.includes('unable to locate credentials') || msg.includes('invalid credentials')) {
			return true;
		}
	}
	return false;
}

/**
 * Build environment by merging process.env with Claude settings env.
 * This ensures PATH and other system variables are preserved.
 */
function buildEnv(claudeSettings?: ClaudeSettings): Record<string, string> | undefined {
	if (!claudeSettings?.env) {
		return undefined;
	}
	return {
		...process.env as Record<string, string>,
		...claudeSettings.env,
	};
}

export async function* runIntakeAnalysis(options: AgentOptions = {}): AsyncGenerator<SDKMessage> {
	const { sessionId, workingDirectory = process.cwd(), claudeSettings } = options;

	try {
		for await (const message of query({
			prompt: CATCH_UP_PROMPT,
			options: {
				allowedTools: ['Bash', 'Read', 'Glob', 'Grep'],
				appendSystemPrompt: INTAKE_SYSTEM_PROMPT,
				cwd: workingDirectory,
				resume: sessionId,
				env: buildEnv(claudeSettings),
			},
		})) {
			yield message;
		}
	} catch (error) {
		if (isAuthError(error)) {
			throw new AuthenticationRequiredError(claudeSettings?.awsAuthRefresh);
		}
		throw error;
	}
}

export async function* sendFollowUp(
	prompt: string,
	sessionId: string,
	options: AgentOptions = {}
): AsyncGenerator<SDKMessage> {
	const { workingDirectory = process.cwd(), claudeSettings } = options;

	try {
		for await (const message of query({
			prompt,
			options: {
				allowedTools: ['Bash', 'Read', 'Glob', 'Grep'],
				appendSystemPrompt: INTAKE_SYSTEM_PROMPT,
				resume: sessionId,
				cwd: workingDirectory,
				env: buildEnv(claudeSettings),
			},
		})) {
			yield message;
		}
	} catch (error) {
		if (isAuthError(error)) {
			throw new AuthenticationRequiredError(claudeSettings?.awsAuthRefresh);
		}
		throw error;
	}
}

export async function* executeQuickAction(
	action: string,
	issueNumber: number,
	value?: string,
	options: AgentOptions = {}
): AsyncGenerator<SDKMessage> {
	const { workingDirectory = process.cwd(), claudeSettings } = options;

	let prompt: string;

	switch (action) {
		case 'add-label':
			prompt = `Add the label "${value}" to issue #${issueNumber} in the posit-dev/positron repository using: gh issue edit ${issueNumber} --repo posit-dev/positron --add-label "${value}"`;
			break;
		case 'set-triage':
			prompt = `Set issue #${issueNumber} to "Triage" status in the Positron project board. Use the gh CLI to update the project field.`;
			break;
		case 'close':
			prompt = `Close issue #${issueNumber} in posit-dev/positron with a brief comment explaining why.`;
			break;
		default:
			throw new Error(`Unknown action: ${action}`);
	}

	try {
		for await (const message of query({
			prompt,
			options: {
				allowedTools: ['Bash'],
				cwd: workingDirectory,
				env: buildEnv(claudeSettings),
			},
		})) {
			yield message;
		}
	} catch (error) {
		if (isAuthError(error)) {
			throw new AuthenticationRequiredError(claudeSettings?.awsAuthRefresh);
		}
		throw error;
	}
}

export interface AnalysisResult {
	summary: string;
	suggestedLabels: string[];
	duplicateSearchTerms: string[];
	needsInfo: boolean;
	draftResponse?: string;
}

export { type FollowUpMessage } from './prompts/analysis.js';

export async function analyzeIssue(
	issue: { number: number; title: string; body: string; labels: string[] },
	options: AgentOptions = {}
): Promise<AnalysisResult> {
	const { claudeSettings } = options;

	const prompt = buildAnalysisPrompt(issue);
	let fullResponse = '';

	try {
		for await (const message of query({
			prompt,
			options: {
				allowedTools: ['Bash'],
				appendSystemPrompt: ANALYSIS_SYSTEM_PROMPT,
				maxTurns: 15,
				cwd: options.workingDirectory,
				env: buildEnv(claudeSettings),
			},
		})) {
			if (message.type === 'assistant') {
				for (const block of message.message.content) {
					if (block.type === 'text') {
						fullResponse += block.text;
					}
				}
			}
		}

		// Extract JSON from response
		const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)```/);
		if (jsonMatch) {
			const analysis = JSON.parse(jsonMatch[1]);
			return {
				summary: analysis.summary || '',
				suggestedLabels: analysis.suggestedLabels || [],
				duplicateSearchTerms: analysis.duplicateSearchTerms || [],
				needsInfo: analysis.needsInfo || false,
				draftResponse: analysis.draftResponse,
			};
		} else {
			throw new Error('Failed to parse analysis response - no JSON block found');
		}
	} catch (error) {
		if (isAuthError(error)) {
			throw new AuthenticationRequiredError(claudeSettings?.awsAuthRefresh);
		}
		throw error;
	}
}

export interface FollowUpContext {
	issue: { number: number; title: string; body: string };
	analysis: { summary: string; suggestedLabels: string[]; draftResponse?: string };
	conversationHistory: FollowUpMessage[];
}

export async function followUpAnalysis(
	userQuestion: string,
	context: FollowUpContext,
	options: AgentOptions = {}
): Promise<string> {
	const { claudeSettings, workingDirectory } = options;

	const prompt = buildFollowUpPrompt(
		context.issue,
		context.analysis,
		context.conversationHistory,
		userQuestion
	);
	let fullResponse = '';
	let hitMaxTurns = false;

	try {
		for await (const message of query({
			prompt,
			options: {
				allowedTools: ['Bash'],
				appendSystemPrompt: ANALYSIS_SYSTEM_PROMPT,
				maxTurns: 15,
				cwd: workingDirectory,
				env: buildEnv(claudeSettings),
			},
		})) {
			if (message.type === 'assistant') {
				for (const block of message.message.content) {
					if (block.type === 'text') {
						fullResponse += block.text;
					}
				}
			} else if (message.type === 'result') {
				if ('subtype' in message && message.subtype === 'error_max_turns') {
					hitMaxTurns = true;
				}
			}
		}

		// If hit max turns and response is incomplete, explain the issue
		if (hitMaxTurns && fullResponse.trim().length < 100) {
			return 'The search took too long to complete. Please try a more specific question, or search manually using the GitHub CLI.';
		}

		return fullResponse.trim();
	} catch (error) {
		if (isAuthError(error)) {
			throw new AuthenticationRequiredError(claudeSettings?.awsAuthRefresh);
		}
		throw error;
	}
}
