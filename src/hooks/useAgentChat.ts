import { useState, useEffect, useRef, useCallback } from 'react';
import type { SDKMessage, ChatMessage } from '../types/intake';

export function useAgentChat() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isConnected, setIsConnected] = useState(false);
	const wsRef = useRef<WebSocket | null>(null);
	const currentMessageIdRef = useRef<string | null>(null);
	const accumulatedTextRef = useRef<string>('');

	useEffect(() => {
		const ws = new WebSocket('ws://localhost:3001');
		wsRef.current = ws;

		ws.onopen = () => {
			console.log('Connected to server');
			setIsConnected(true);
		};

		ws.onmessage = (event) => {
			const msg: SDKMessage = JSON.parse(event.data);
			handleSDKMessage(msg);
		};

		ws.onclose = () => {
			console.log('Disconnected from server');
			setIsConnected(false);
		};

		ws.onerror = (error) => {
			console.error('WebSocket error:', error);
		};

		return () => {
			ws.close();
		};
	}, []);

	const handleSDKMessage = useCallback((msg: SDKMessage) => {
		switch (msg.type) {
			case 'assistant':
				// Full assistant message with content
				if ('message' in msg && msg.message?.content) {
					for (const block of msg.message.content) {
						if (block.type === 'text' && block.text) {
							accumulatedTextRef.current += block.text;
							updateStreamingMessage(accumulatedTextRef.current);
						} else if (block.type === 'tool_use' && block.name) {
							accumulatedTextRef.current += `\n\n*Running: ${block.name}*\n`;
							updateStreamingMessage(accumulatedTextRef.current);
						}
					}
				}
				break;

			case 'stream_event':
				// Streaming delta events
				if (msg.event?.delta?.type === 'text_delta' && msg.event.delta.text) {
					accumulatedTextRef.current += msg.event.delta.text;
					updateStreamingMessage(accumulatedTextRef.current);
				}
				break;

			case 'result':
				// Query completed
				finalizeMessage();
				setIsLoading(false);
				break;

			case 'system':
				// System messages (init, etc.) - no action needed
				break;

			case 'error':
				// Error message
				if ('content' in msg) {
					setMessages((prev) => [
						...prev,
						{
							id: crypto.randomUUID(),
							role: 'assistant',
							content: `**Error:** ${msg.content}`,
							timestamp: new Date(),
						},
					]);
				}
				setIsLoading(false);
				break;
		}
	}, []);

	const updateStreamingMessage = useCallback((content: string) => {
		if (currentMessageIdRef.current) {
			setMessages((prev) => {
				const newMessages = [...prev];
				const streamingIndex = newMessages.findIndex(
					(m) => m.id === currentMessageIdRef.current
				);
				if (streamingIndex !== -1) {
					newMessages[streamingIndex] = {
						...newMessages[streamingIndex],
						content,
					};
				}
				return newMessages;
			});
		}
	}, []);

	const finalizeMessage = useCallback(() => {
		if (currentMessageIdRef.current) {
			setMessages((prev) => {
				const newMessages = [...prev];
				const streamingIndex = newMessages.findIndex(
					(m) => m.id === currentMessageIdRef.current
				);
				if (streamingIndex !== -1) {
					newMessages[streamingIndex] = {
						...newMessages[streamingIndex],
						isStreaming: false,
					};
				}
				return newMessages;
			});
		}
		currentMessageIdRef.current = null;
		accumulatedTextRef.current = '';
	}, []);

	const startNewAssistantMessage = useCallback(() => {
		const assistantMessageId = crypto.randomUUID();
		currentMessageIdRef.current = assistantMessageId;
		accumulatedTextRef.current = '';

		setMessages((prev) => [
			...prev,
			{
				id: assistantMessageId,
				role: 'assistant',
				content: '',
				timestamp: new Date(),
				isStreaming: true,
			},
		]);
	}, []);

	const catchUp = useCallback(() => {
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
			console.error('WebSocket not connected');
			return;
		}

		setIsLoading(true);

		// Add user message
		setMessages((prev) => [
			...prev,
			{
				id: crypto.randomUUID(),
				role: 'user',
				content: "Let's get caught up on intake",
				timestamp: new Date(),
			},
		]);

		// Start assistant message placeholder
		startNewAssistantMessage();

		wsRef.current.send(JSON.stringify({ type: 'catch_up' }));
	}, [startNewAssistantMessage]);

	const sendMessage = useCallback((prompt: string) => {
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
			console.error('WebSocket not connected');
			return;
		}

		setIsLoading(true);

		// Add user message
		setMessages((prev) => [
			...prev,
			{
				id: crypto.randomUUID(),
				role: 'user',
				content: prompt,
				timestamp: new Date(),
			},
		]);

		// Start assistant message placeholder
		startNewAssistantMessage();

		wsRef.current.send(JSON.stringify({ type: 'follow_up', prompt }));
	}, [startNewAssistantMessage]);

	const executeAction = useCallback(
		(action: string, issueNumber: number, value?: string) => {
			if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
				console.error('WebSocket not connected');
				return;
			}

			wsRef.current.send(
				JSON.stringify({ type: 'quick_action', action, issueNumber, value })
			);
		},
		[]
	);

	return {
		messages,
		isLoading,
		isConnected,
		catchUp,
		sendMessage,
		executeAction,
	};
}
