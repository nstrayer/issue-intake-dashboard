import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

import { initRepoConfig, type RepoConfig } from './config.js';
import { loadIntakeConfig, saveIntakeConfig, type IntakeConfig } from './intake-config.js';
import {
	runIntakeAnalysis,
	sendFollowUp,
	executeQuickAction,
	analyzeIssue,
	followUpAnalysis,
	generateAIFilter,
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
	fetchRepoMetadata,
	initGitHub,
	DEFAULT_INTAKE_FILTERS,
	type IntakeFilterOptions,
} from './github.js';
import { BackgroundPoller } from './background-poller.js';
import { runSetupChecks } from './setup-check.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Initialize repo config at startup
const repoConfig: RepoConfig = initRepoConfig();
console.log(`Target repository: ${repoConfig.fullName}`);

// Initialize GitHub module after repo config
initGitHub();

// Load Claude settings at startup
const claudeSettings: ClaudeSettings = loadClaudeSettings();
if (claudeSettings.env) {
	console.log('Loaded Claude Code settings with env config');
	if (claudeSettings.env.CLAUDE_CODE_USE_BEDROCK) {
		console.log('Using Bedrock authentication');
	}
}

// Support both old and new env var names for repo path
const targetRepoPath = process.env.TARGET_REPO_PATH || process.env.POSITRON_REPO_PATH || resolve(__dirname, '../../positron');
if (existsSync(targetRepoPath)) {
	console.log(`Using target repo at: ${targetRepoPath}`);
} else {
	console.warn(`Warning: Target repo not found at ${targetRepoPath}`);
	console.warn('Follow-up searches will not work. Set TARGET_REPO_PATH to fix.');
}

// Load intake config
const intakeConfig: IntakeConfig = loadIntakeConfig(repoConfig, targetRepoPath);
console.log(`Intake criteria: ${intakeConfig.intakeCriteria.substring(0, 50)}...`);

// Fetch repo metadata for prompts
let repoDescription: string | null = null;
fetchRepoMetadata().then(meta => {
	repoDescription = meta.description;
	if (repoDescription) {
		console.log(`Repo description: ${repoDescription}`);
	}
}).catch(console.error);

// Background poller for new item notifications
const poller = new BackgroundPoller({
	filters: DEFAULT_INTAKE_FILTERS,
	onNewItems: (event) => {
		const payload = JSON.stringify(event);
		for (const client of wss.clients) {
			if (client.readyState === WebSocket.OPEN) {
				client.send(payload);
			}
		}
	},
});

app.use(express.json());

// Serve static frontend in production mode
const distPath = resolve(__dirname, '../dist');
if (existsSync(distPath)) {
	console.log(`Serving static frontend from: ${distPath}`);
	app.use(express.static(distPath));
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
	res.json({ status: 'ok' });
});

// Config endpoint - expose repo info to frontend
app.get('/api/config', (_req, res) => {
	res.json({
		repo: {
			owner: repoConfig.owner,
			name: repoConfig.name,
			fullName: repoConfig.fullName,
			description: repoDescription,
		},
		intakeCriteria: intakeConfig.intakeCriteria,
	});
});

// Intake config endpoints
app.get('/api/intake-config', (_req, res) => {
	res.json({
		intakeCriteria: intakeConfig.intakeCriteria,
		version: intakeConfig.version,
	});
});

app.post('/api/intake-config', (req, res) => {
	const { intakeCriteria } = req.body;

	if (!intakeCriteria || typeof intakeCriteria !== 'string') {
		res.status(400).json({ error: 'Invalid intake criteria' });
		return;
	}

	try {
		// Update in-memory config
		intakeConfig.intakeCriteria = intakeCriteria;

		// Save to disk
		saveIntakeConfig(repoConfig, intakeConfig);

		res.json({ success: true });
	} catch (error) {
		console.error('Failed to save intake config:', error);
		res.status(500).json({ error: 'Failed to save intake config' });
	}
});

// Setup check endpoint
app.get('/api/setup-check', async (_req, res) => {
	try {
		const result = await runSetupChecks(targetRepoPath, repoConfig);
		res.json(result);
	} catch (error) {
		console.error('Setup check failed:', error);
		res.status(500).json({ error: 'Setup check failed' });
	}
});

// ===== REST API Endpoints for Command Center =====

// Lightweight list endpoint (no bodies)
// Accepts query params to override default intake filters
app.get('/api/intake', async (req, res) => {
	try {
		// Parse filter options from query params (all default to true)
		const filterOptions: IntakeFilterOptions = {
			excludeBacklogProject: req.query.excludeBacklogProject !== 'false',
			excludeMilestoned: req.query.excludeMilestoned !== 'false',
			excludeTriagedLabels: req.query.excludeTriagedLabels !== 'false',
			excludeStatusSet: req.query.excludeStatusSet !== 'false',
			excludeAnswered: req.query.excludeAnswered !== 'false',
			excludeMaintainerResponded: req.query.excludeMaintainerResponded !== 'false',
		};

		const data = await fetchIntakeQueue(filterOptions);

		// Seed the background poller from the first fetch, then start it
		if (!poller['initialized']) {
			poller.seedFromData(data);
			poller.start();
		}

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
// type param: 'full' (default) | 'duplicates' | 'labels' | 'response'
app.post('/api/issues/:number/analyze', async (req, res) => {
	const { number } = req.params;
	const { title, body, labels, type = 'full' } = req.body;

	try {
		const analysis = await analyzeIssue(
			{
				number: parseInt(number),
				title,
				body,
				labels: labels || [],
			},
			{ claudeSettings, repoConfig, repoDescription: repoDescription || undefined },
			type
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
			{ claudeSettings, workingDirectory: targetRepoPath, repoConfig, repoDescription: repoDescription || undefined }
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

// AI filter generation endpoint
app.post('/api/filters/ai', async (req, res) => {
	const { query } = req.body;

	if (!query || typeof query !== 'string' || query.trim() === '') {
		res.status(400).json({ error: 'Query is required' });
		return;
	}

	try {
		// Fetch available labels to help Claude use exact names
		const availableLabels = await fetchRepoLabels();
		const result = await generateAIFilter(query, availableLabels, { claudeSettings });
		res.json(result);
	} catch (error) {
		console.error('AI filter generation failed:', error);
		const isAuth = error instanceof AuthenticationRequiredError;
		res.status(isAuth ? 401 : 500).json({
			error: error instanceof Error ? error.message : 'AI filter generation failed',
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
		for await (const message of runIntakeAnalysis({
			sessionId: state.sessionId,
			claudeSettings,
			repoConfig,
			repoDescription: repoDescription || undefined,
		})) {
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
		for await (const message of sendFollowUp(prompt, state.sessionId!, {
			claudeSettings,
			repoConfig,
			repoDescription: repoDescription || undefined,
		})) {
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
		for await (const message of executeQuickAction(action, issueNumber, value, {
			claudeSettings,
			repoConfig,
		})) {
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

// SPA fallback: serve index.html for non-API routes (must be after API routes)
const indexPath = resolve(distPath, 'index.html');
if (existsSync(indexPath)) {
	app.get('*', (_req, res) => {
		res.sendFile(indexPath);
	});
}

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
	console.log(`WebSocket server ready`);
});
