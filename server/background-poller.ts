import { execSync } from 'child_process';
import {
	fetchIntakeQueue,
	type IntakeFilterOptions,
	type IntakeQueueData,
	DEFAULT_INTAKE_FILTERS,
} from './github.js';
import { DEFAULT_POLL_INTERVAL_SECONDS } from './intake-config.js';

export interface NewItemsEvent {
	type: 'new_items';
	issues: IntakeQueueData['issues'];
	discussions: IntakeQueueData['discussions'];
	timestamp: string;
}

type NewItemsCallback = (event: NewItemsEvent) => void;

const DEFAULT_POLL_INTERVAL_MS = DEFAULT_POLL_INTERVAL_SECONDS * 1000;

/**
 * Background poller that periodically fetches the intake queue,
 * diffs against the previous result, and notifies via callback + OS notification.
 */
export class BackgroundPoller {
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private knownIssueNumbers = new Set<number>();
	private knownDiscussionNumbers = new Set<number>();
	initialized = false;
	private filters: IntakeFilterOptions;
	private pollIntervalMs: number;
	private onNewItems: NewItemsCallback;
	private polling = false;

	constructor(opts: {
		filters?: IntakeFilterOptions;
		pollIntervalMs?: number;
		onNewItems: NewItemsCallback;
	}) {
		this.filters = opts.filters ?? DEFAULT_INTAKE_FILTERS;
		this.pollIntervalMs = opts.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
		this.onNewItems = opts.onNewItems;
	}

	/**
	 * Seed the known set from an initial fetch so we don't notify on startup.
	 */
	seedFromData(data: IntakeQueueData): void {
		this.knownIssueNumbers = new Set(data.issues.map((i) => i.number));
		this.knownDiscussionNumbers = new Set(data.discussions.map((d) => d.number));
		this.initialized = true;
	}

	start(): void {
		if (this.intervalId) return;

		console.log(
			`Background poller started (interval: ${this.pollIntervalMs / 1000}s)`
		);

		this.intervalId = setInterval(() => this.poll(), this.pollIntervalMs);
	}

	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
			console.log('Background poller stopped');
		}
	}

	/**
	 * Update the poll interval. Restarts the timer if currently running.
	 */
	setPollInterval(seconds: number): void {
		this.pollIntervalMs = seconds * 1000;
		console.log(`Poll interval updated to ${seconds}s`);

		// Restart with new interval if currently running
		if (this.intervalId) {
			this.stop();
			this.start();
		}
	}

	private async poll(): Promise<void> {
		if (this.polling) return; // skip if previous poll still running
		this.polling = true;

		try {
			const data = await fetchIntakeQueue(this.filters);

			if (!this.initialized) {
				this.seedFromData(data);
				return;
			}

			// Diff against known items
			const newIssues = data.issues.filter(
				(i) => !this.knownIssueNumbers.has(i.number)
			);
			const newDiscussions = data.discussions.filter(
				(d) => !this.knownDiscussionNumbers.has(d.number)
			);

			// Update known sets (replace entirely to handle removals)
			this.knownIssueNumbers = new Set(data.issues.map((i) => i.number));
			this.knownDiscussionNumbers = new Set(
				data.discussions.map((d) => d.number)
			);

			if (newIssues.length > 0 || newDiscussions.length > 0) {
				const event: NewItemsEvent = {
					type: 'new_items',
					issues: newIssues,
					discussions: newDiscussions,
					timestamp: new Date().toISOString(),
				};

				// Send OS notification
				sendOSNotification(newIssues.length, newDiscussions.length);

				// Notify callback (for WebSocket broadcast)
				this.onNewItems(event);
			}
		} catch (error) {
			console.error('Background poll failed:', error);
		} finally {
			this.polling = false;
		}
	}
}

/**
 * Send a native OS notification. Uses osascript on macOS,
 * notify-send on Linux. Silently fails on unsupported platforms.
 */
function sendOSNotification(
	issueCount: number,
	discussionCount: number
): void {
	const parts: string[] = [];
	if (issueCount > 0) {
		parts.push(`${issueCount} new issue${issueCount > 1 ? 's' : ''}`);
	}
	if (discussionCount > 0) {
		parts.push(
			`${discussionCount} new discussion${discussionCount > 1 ? 's' : ''}`
		);
	}
	const body = parts.join(' and ');
	const title = 'Triage Sidekick';

	try {
		if (process.platform === 'darwin') {
			execSync(
				`osascript -e 'display notification "${body}" with title "${title}"'`
			);
		} else if (process.platform === 'linux') {
			execSync(`notify-send "${title}" "${body}"`);
		}
		// Windows: could use PowerShell toast, but skipping for now
	} catch {
		// Notification is best-effort; don't crash on failure
	}
}
