import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { runIntakeAnalysis, sendFollowUp, executeQuickAction, AuthenticationRequiredError } from './agent.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req, res) => {
	res.json({ status: 'ok' });
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
		for await (const message of runIntakeAnalysis({ sessionId: state.sessionId })) {
			ws.send(JSON.stringify(message));

			// Extract session ID from messages (SDK messages have session_id)
			if ('session_id' in message && message.session_id) {
				state.sessionId = message.session_id;
				clientStates.set(ws, state);
			}
		}
	} catch (error) {
		console.error('Error in catch up:', error);

		const isAuthError = error instanceof AuthenticationRequiredError;
		ws.send(JSON.stringify({
			type: 'error',
			isAuthError,
			content: isAuthError
				? 'Claude Code authentication required. Please run "claude" in your terminal to authenticate, then try again.'
				: (error instanceof Error ? error.message : 'Failed to analyze intake'),
		}));
	}
}

async function handleFollowUp(ws: WebSocket, state: ClientState, prompt: string) {
	try {
		for await (const message of sendFollowUp(prompt, state.sessionId!, {})) {
			ws.send(JSON.stringify(message));

			if ('session_id' in message && message.session_id) {
				state.sessionId = message.session_id;
				clientStates.set(ws, state);
			}
		}
	} catch (error) {
		console.error('Error in follow up:', error);

		const isAuthError = error instanceof AuthenticationRequiredError;
		ws.send(JSON.stringify({
			type: 'error',
			isAuthError,
			content: isAuthError
				? 'Claude Code authentication required. Please run "claude" in your terminal to authenticate, then try again.'
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
		for await (const message of executeQuickAction(action, issueNumber, value)) {
			ws.send(JSON.stringify(message));
		}
	} catch (error) {
		console.error('Error in quick action:', error);

		const isAuthError = error instanceof AuthenticationRequiredError;
		ws.send(JSON.stringify({
			type: 'error',
			isAuthError,
			content: isAuthError
				? 'Claude Code authentication required. Please run "claude" in your terminal to authenticate, then try again.'
				: (error instanceof Error ? error.message : 'Failed to execute action'),
		}));
	}
}

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
	console.log(`WebSocket server ready`);
});
