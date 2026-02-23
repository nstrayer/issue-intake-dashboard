import { useState, useEffect, useCallback, useRef } from 'react';

interface NewItemSummary {
	type: 'issue' | 'discussion';
	number: number;
	title: string;
	author: string;
	url: string;
}

interface NewItemsEvent {
	type: 'new_items';
	issues: Array<{
		number: number;
		title: string;
		author: { login: string };
		url: string;
	}>;
	discussions: Array<{
		number: number;
		title: string;
		author: { login: string };
		url: string;
	}>;
	timestamp: string;
}

export interface NewItemNotification {
	items: NewItemSummary[];
	timestamp: Date;
}

/**
 * Hook that listens for new_items WebSocket messages from the background poller.
 * Returns the latest notification (if any) and a dismiss function.
 */
export function useNewItemNotifications(onNewItems?: () => void) {
	const [notification, setNotification] = useState<NewItemNotification | null>(null);
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

	const dismiss = useCallback(() => {
		setNotification(null);
	}, []);

	useEffect(() => {
		function connect() {
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
			wsRef.current = ws;

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					if (data.type !== 'new_items') return;

					const msg = data as NewItemsEvent;
					const items: NewItemSummary[] = [
						...msg.issues.map((i) => ({
							type: 'issue' as const,
							number: i.number,
							title: i.title,
							author: i.author.login,
							url: i.url,
						})),
						...msg.discussions.map((d) => ({
							type: 'discussion' as const,
							number: d.number,
							title: d.title,
							author: d.author.login,
							url: d.url,
						})),
					];

					if (items.length > 0) {
						setNotification({ items, timestamp: new Date(msg.timestamp) });
						onNewItems?.();
					}
				} catch {
					// Ignore non-JSON or unrelated messages
				}
			};

			ws.onclose = () => {
				// Reconnect after a delay
				reconnectTimeoutRef.current = setTimeout(connect, 5000);
			};

			ws.onerror = () => {
				ws.close();
			};
		}

		connect();

		return () => {
			clearTimeout(reconnectTimeoutRef.current);
			wsRef.current?.close();
		};
	}, [onNewItems]);

	return { notification, dismiss };
}
