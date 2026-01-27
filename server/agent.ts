import { query, type SDKMessage } from '@anthropic-ai/claude-code';
import { INTAKE_SYSTEM_PROMPT, CATCH_UP_PROMPT } from './prompts/intake.js';

export interface AgentOptions {
	sessionId?: string;
	workingDirectory?: string;
}

/**
 * Error thrown when Claude Code authentication is required.
 * Users should run `claude` in their terminal to authenticate first.
 */
export class AuthenticationRequiredError extends Error {
	constructor() {
		super('Claude Code authentication required. Please run "claude" in your terminal to authenticate first.');
		this.name = 'AuthenticationRequiredError';
	}
}

/**
 * Detect if an error is an authentication-related error.
 * This happens when the CLI outputs interactive text instead of JSON.
 */
function isAuthError(error: unknown): boolean {
	if (error instanceof Error) {
		// JSON parsing error with "Attempting" suggests auth prompt in stdout
		if (error.message.includes('Unexpected token') && error.message.includes('Attempting')) {
			return true;
		}
		// Other auth-related patterns
		if (error.message.includes('not authenticated') || error.message.includes('authentication required')) {
			return true;
		}
	}
	return false;
}

export async function* runIntakeAnalysis(options: AgentOptions = {}): AsyncGenerator<SDKMessage> {
	const { sessionId, workingDirectory = process.cwd() } = options;

	try {
		for await (const message of query({
			prompt: CATCH_UP_PROMPT,
			options: {
				allowedTools: ['Bash', 'Read', 'Glob', 'Grep'],
				appendSystemPrompt: INTAKE_SYSTEM_PROMPT,
				cwd: workingDirectory,
				resume: sessionId,
			},
		})) {
			yield message;
		}
	} catch (error) {
		if (isAuthError(error)) {
			throw new AuthenticationRequiredError();
		}
		throw error;
	}
}

export async function* sendFollowUp(
	prompt: string,
	sessionId: string,
	options: AgentOptions = {}
): AsyncGenerator<SDKMessage> {
	const { workingDirectory = process.cwd() } = options;

	try {
		for await (const message of query({
			prompt,
			options: {
				allowedTools: ['Bash', 'Read', 'Glob', 'Grep'],
				appendSystemPrompt: INTAKE_SYSTEM_PROMPT,
				resume: sessionId,
				cwd: workingDirectory,
			},
		})) {
			yield message;
		}
	} catch (error) {
		if (isAuthError(error)) {
			throw new AuthenticationRequiredError();
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
	const { workingDirectory = process.cwd() } = options;

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
			},
		})) {
			yield message;
		}
	} catch (error) {
		if (isAuthError(error)) {
			throw new AuthenticationRequiredError();
		}
		throw error;
	}
}
