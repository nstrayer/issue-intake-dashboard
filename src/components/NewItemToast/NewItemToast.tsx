import type { NewItemNotification } from '../../hooks/useNewItemNotifications';

interface NewItemToastProps {
	notification: NewItemNotification;
	onDismiss: () => void;
	onRefresh: () => void;
}

export function NewItemToast({ notification, onDismiss, onRefresh }: NewItemToastProps) {
	const { items } = notification;
	const issueCount = items.filter((i) => i.type === 'issue').length;
	const discussionCount = items.filter((i) => i.type === 'discussion').length;

	const parts: string[] = [];
	if (issueCount > 0) {
		parts.push(`${issueCount} new issue${issueCount > 1 ? 's' : ''}`);
	}
	if (discussionCount > 0) {
		parts.push(`${discussionCount} new discussion${discussionCount > 1 ? 's' : ''}`);
	}
	const summary = parts.join(' and ');

	const handleRefresh = () => {
		onRefresh();
		onDismiss();
	};

	return (
		<div
			className="fixed bottom-6 left-6 px-4 py-3 rounded-lg shadow-xl animate-slideUp z-50 max-w-sm"
			style={{
				background: 'rgba(74, 144, 226, 0.95)',
				color: 'white',
			}}
		>
			<div className="flex items-start gap-3">
				<svg
					className="w-5 h-5 flex-shrink-0 mt-0.5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
					/>
				</svg>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium">{summary}</p>
					{items.length <= 3 && (
						<ul className="mt-1 space-y-0.5">
							{items.map((item) => (
								<li key={`${item.type}-${item.number}`} className="text-xs opacity-90 truncate">
									#{item.number} {item.title}
								</li>
							))}
						</ul>
					)}
				</div>
				<div className="flex gap-1 flex-shrink-0">
					<button
						onClick={handleRefresh}
						className="px-2 py-1 text-xs font-medium rounded hover:bg-white/20 transition-colors"
						title="Refresh queue"
					>
						Refresh
					</button>
					<button
						onClick={onDismiss}
						className="px-1 py-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
						title="Dismiss"
					>
						<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	);
}
