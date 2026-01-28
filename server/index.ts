import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
import {
	runIntakeAnalysis,
	sendFollowUp,
	executeQuickAction,
	analyzeIssue,
	followUpAnalysis,
	AuthenticationRequiredError,
	loadClaudeSettings,
	type ClaudeSettings,
	type FollowUpMessage,
} from './agent.js';
import {
	fetchIntakeQueue,
	fetchIssueDetails,
	fetchDiscussionDetails,
	applyLabel,
	removeLabel,
	setProjectStatus,
	fetchRepoLabels,
	searchDuplicates,
} from './github.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Load Claude settings at startup
const claudeSettings: ClaudeSettings = loadClaudeSettings();
if (claudeSettings.env) {
	console.log('Loaded Claude Code settings with env config');
	if (claudeSettings.env.CLAUDE_CODE_USE_BEDROCK) {
		console.log('Using Bedrock authentication');
	}
}

// Default: sibling positron repo. Override with POSITRON_REPO_PATH env var.
const positronRepoPath = process.env.POSITRON_REPO_PATH || resolve(__dirname, '../../positron');
if (existsSync(positronRepoPath)) {
	console.log(`Using positron repo at: ${positronRepoPath}`);
} else {
	console.warn(`Warning: Positron repo not found at ${positronRepoPath}`);
	console.warn('Follow-up searches will not work. Set POSITRON_REPO_PATH to fix.');
}

app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req, res) => {
	res.json({ status: 'ok' });
});

// ===== REST API Endpoints for Command Center =====

// Lightweight list endpoint (no bodies)
app.get('/api/intake', async (_req, res) => {
	try {
		const data = await fetchIntakeQueue();
		res.json(data);
	} catch (error) {
		console.error('Failed to fetch intake queue:', error);
		res.status(500).json({ error: 'Failed to fetch GitHub data' });
	}
});

// Detail endpoints for full content
app.get('/api/issues/:number', async (req, res) => {
	try {
		const { number } = req.params;
		const issue = await fetchIssueDetails(parseInt(number));
		res.json(issue);
	} catch (error) {
		console.error('Failed to fetch issue details:', error);
		res.status(500).json({ error: 'Failed to fetch issue details' });
	}
});

app.get('/api/discussions/:number', async (req, res) => {
	try {
		const { number } = req.params;
		const discussion = await fetchDiscussionDetails(parseInt(number));
		res.json(discussion);
	} catch (error) {
		console.error('Failed to fetch discussion details:', error);
		res.status(500).json({ error: 'Failed to fetch discussion details' });
	}
});

// Label management with validation
app.post('/api/issues/:number/labels', async (req, res) => {
	try {
		const { number } = req.params;
		const { label, action } = req.body; // action: 'add' | 'remove'

		if (!label || typeof label !== 'string') {
			res.status(400).json({ error: 'Invalid label' });
			return;
		}

		if (action === 'add') {
			await applyLabel(parseInt(number), label);
		} else if (action === 'remove') {
			await removeLabel(parseInt(number), label);
		} else {
			res.status(400).json({ error: 'Invalid action' });
			return;
		}

		res.json({ success: true });
	} catch (error) {
		console.error('Failed to update label:', error);
		res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update label' });
	}
});

// Project status update
app.post('/api/issues/:number/status', async (req, res) => {
	try {
		const { number } = req.params;
		const { status } = req.body;

		if (!status || typeof status !== 'string') {
			res.status(400).json({ error: 'Invalid status' });
			return;
		}

		await setProjectStatus(parseInt(number), status);
		res.json({ success: true });
	} catch (error) {
		console.error('Failed to set status:', error);
		res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to set status' });
	}
});

// Get available labels
app.get('/api/labels', async (_req, res) => {
	try {
		const labels = await fetchRepoLabels();
		res.json({ labels });
	} catch (error) {
		console.error('Failed to fetch labels:', error);
		res.status(500).json({ error: 'Failed to fetch labels' });
	}
});

// Search for duplicate issues
app.post('/api/issues/search-duplicates', async (req, res) => {
	try {
		const { searchTerms, excludeNumber } = req.body;

		if (!Array.isArray(searchTerms) || searchTerms.length === 0) {
			res.status(400).json({ error: 'Invalid search terms' });
			return;
		}

		const duplicates = await searchDuplicates(searchTerms, excludeNumber || 0);
		res.json({ duplicates });
	} catch (error) {
		console.error('Duplicate search failed:', error);
		res.status(500).json({ error: 'Duplicate search failed' });
	}
});

// Claude analysis endpoint
app.post('/api/issues/:number/analyze', async (req, res) => {
	const { number } = req.params;
	const { title, body, labels } = req.body;

	try {
		const analysis = await analyzeIssue(
			{
				number: parseInt(number),
				title,
				body,
				labels: labels || [],
			},
			{ claudeSettings }
		);
		res.json(analysis);
	} catch (error) {
		console.error('Analysis failed:', error);
		const isAuth = error instanceof AuthenticationRequiredError;
		res.status(isAuth ? 401 : 500).json({
			error: error instanceof Error ? error.message : 'Analysis failed',
			isAuthError: isAuth,
		});
	}
});

// Claude follow-up conversation endpoint
app.post('/api/issues/:number/analyze/follow-up', async (req, res) => {
	const { number } = req.params;
	const { question, issue, analysis, conversationHistory } = req.body;

	if (!question || typeof question !== 'string' || question.trim() === '') {
		res.status(400).json({ error: 'Question is required' });
		return;
	}

	try {
		const response = await followUpAnalysis(
			question,
			{
				issue: {
					number: parseInt(number),
					title: issue?.title || '',
					body: issue?.body || '',
				},
				analysis: {
					summary: analysis?.summary || '',
					suggestedLabels: analysis?.suggestedLabels || [],
					draftResponse: analysis?.draftResponse,
				},
				conversationHistory: (conversationHistory || []) as FollowUpMessage[],
			},
			{ claudeSettings, workingDirectory: positronRepoPath }
		);
		res.json({ response });
	} catch (error) {
		console.error('Follow-up failed:', error);
		const isAuth = error instanceof AuthenticationRequiredError;
		res.status(isAuth ? 401 : 500).json({
			error: error instanceof Error ? error.message : 'Follow-up failed',
			isAuthError: isAuth,
		});
	}
});

interface ClientState {
	sessionId?: string;
}

const clientStates = new Map<WebSocket, ClientState>();

wss.on('connection', (ws) => {
	console.log('Client connected');
	clientStates.set(ws, {});

	ws.on('message', async (data) => {
		try {
			const message = JSON.parse(data.toString());
			const state = clientStates.get(ws) || {};

			switch (message.type) {
				case 'catch_up': {
					await handleCatchUp(ws, state);
					break;
				}
				case 'follow_up': {
					if (!state.sessionId) {
						ws.send(JSON.stringify({
							type: 'error',
							content: 'No active session. Please run "Let\'s get caught up" first.',
						}));
						return;
					}
					await handleFollowUp(ws, state, message.prompt);
					break;
				}
				case 'quick_action': {
					await handleQuickAction(ws, message.action, message.issueNumber, message.value);
					break;
				}
				default:
					ws.send(JSON.stringify({
						type: 'error',
						content: `Unknown message type: ${message.type}`,
					}));
			}
		} catch (error) {
			console.error('Error handling message:', error);
			ws.send(JSON.stringify({
				type: 'error',
				content: error instanceof Error ? error.message : 'Unknown error',
			}));
		}
	});

	ws.on('close', () => {
		console.log('Client disconnected');
		clientStates.delete(ws);
	});
});

async function handleCatchUp(ws: WebSocket, state: ClientState) {
	try {
		for await (const message of runIntakeAnalysis({ sessionId: state.sessionId, claudeSettings })) {
			ws.send(JSON.stringify(message));

			// Extract session ID from messages (SDK messages have session_id)
			if ('session_id' in message && message.session_id) {
				state.sessionId = message.session_id;
				clientStates.set(ws, state);
			}
		}
	} catch (error) {
		console.error('Error in catch up:', error);

		const authError = error instanceof AuthenticationRequiredError ? error : null;
		ws.send(JSON.stringify({
			type: 'error',
			isAuthError: !!authError,
			content: authError
				? authError.message
				: (error instanceof Error ? error.message : 'Failed to analyze intake'),
		}));
	}
}

async function handleFollowUp(ws: WebSocket, state: ClientState, prompt: string) {
	try {
		for await (const message of sendFollowUp(prompt, state.sessionId!, { claudeSettings })) {
			ws.send(JSON.stringify(message));

			if ('session_id' in message && message.session_id) {
				state.sessionId = message.session_id;
				clientStates.set(ws, state);
			}
		}
	} catch (error) {
		console.error('Error in follow up:', error);

		const authError = error instanceof AuthenticationRequiredError ? error : null;
		ws.send(JSON.stringify({
			type: 'error',
			isAuthError: !!authError,
			content: authError
				? authError.message
				: (error instanceof Error ? error.message : 'Failed to process follow-up'),
		}));
	}
}

async function handleQuickAction(
	ws: WebSocket,
	action: string,
	issueNumber: number,
	value?: string
) {
	try {
		for await (const message of executeQuickAction(action, issueNumber, value, { claudeSettings })) {
			ws.send(JSON.stringify(message));
		}
	} catch (error) {
		console.error('Error in quick action:', error);

		const authError = error instanceof AuthenticationRequiredError ? error : null;
		ws.send(JSON.stringify({
			type: 'error',
			isAuthError: !!authError,
			content: authError
				? authError.message
				: (error instanceof Error ? error.message : 'Failed to execute action'),
		}));
	}
}

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
	console.log(`WebSocket server ready`);
});
