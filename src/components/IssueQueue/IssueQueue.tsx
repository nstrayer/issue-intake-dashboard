import { useState } from 'react';
import { QuickActions } from '../QuickActions/QuickActions';
import type { Issue } from '../../types/intake';

interface IssueQueueProps {
	issues: Issue[];
	onAction: (action: string, issueNumber: number, value?: string) => void;
}

function getAgeDays(createdAt: string): number {
	const created = new Date(createdAt);
	const now = new Date();
	const diffMs = now.getTime() - created.getTime();
	return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function getAgeDisplay(createdAt: string): string {
	const days = getAgeDays(createdAt);
	if (days === 0) return 'Today';
	if (days === 1) return 'Yesterday';
	if (days < 7) return `${days} days ago`;
	if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
	return `${Math.floor(days / 30)} months ago`;
}

function getAgeColorClass(createdAt: string): string {
	const days = getAgeDays(createdAt);
	if (days > 30) return 'text-red-400';
	if (days > 14) return 'text-yellow-400';
	return 'text-gray-400';
}

export function IssueQueue({ issues, onAction }: IssueQueueProps) {
	const [expandedIssue, setExpandedIssue] = useState<number | null>(null);

	// Sort by age (oldest first)
	const sortedIssues = [...issues].sort(
		(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
	);

	return (
		<div className="bg-[#161b22] rounded-lg border border-gray-800">
			<div className="px-4 py-3 border-b border-gray-800">
				<h2 className="text-lg font-medium text-white">
					Issue Queue ({issues.length})
				</h2>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="border-b border-gray-800 text-left text-sm text-gray-400">
							<th className="px-4 py-3 font-medium">#</th>
							<th className="px-4 py-3 font-medium">Title</th>
							<th className="px-4 py-3 font-medium">Author</th>
							<th className="px-4 py-3 font-medium">Age</th>
							<th className="px-4 py-3 font-medium">Labels</th>
							<th className="px-4 py-3 font-medium">Actions</th>
						</tr>
					</thead>
					<tbody>
						{sortedIssues.map((issue) => (
							<>
								<tr
									key={issue.number}
									className="border-b border-gray-800/50 hover:bg-[#21262d] transition-colors cursor-pointer"
									onClick={() =>
										setExpandedIssue(
											expandedIssue === issue.number ? null : issue.number
										)
									}
								>
									<td className="px-4 py-3 text-sm text-blue-400 font-mono">
										#{issue.number}
									</td>
									<td className="px-4 py-3 text-sm text-gray-200 max-w-md truncate">
										{issue.title}
									</td>
									<td className="px-4 py-3 text-sm text-gray-400">
										{issue.author}
									</td>
									<td
										className={`px-4 py-3 text-sm ${getAgeColorClass(issue.createdAt)}`}
									>
										{getAgeDisplay(issue.createdAt)}
									</td>
									<td className="px-4 py-3">
										<div className="flex flex-wrap gap-1">
											{issue.labels.length === 0 ? (
												<span className="text-xs text-gray-500 italic">
													No labels
												</span>
											) : (
												issue.labels.slice(0, 3).map((label) => (
													<span
														key={label}
														className="px-2 py-0.5 text-xs bg-gray-800 text-gray-300 rounded-full"
													>
														{label}
													</span>
												))
											)}
											{issue.labels.length > 3 && (
												<span className="text-xs text-gray-500">
													+{issue.labels.length - 3}
												</span>
											)}
										</div>
									</td>
									<td
										className="px-4 py-3"
										onClick={(e) => e.stopPropagation()}
									>
										<QuickActions
											issueNumber={issue.number}
											currentLabels={issue.labels}
											onAction={onAction}
										/>
									</td>
								</tr>
								{expandedIssue === issue.number && issue.body && (
									<tr key={`${issue.number}-expanded`}>
										<td colSpan={6} className="px-4 py-4 bg-[#0d1117]">
											<div className="text-sm text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
												{issue.body}
											</div>
										</td>
									</tr>
								)}
							</>
						))}
					</tbody>
				</table>
			</div>

			{issues.length === 0 && (
				<div className="px-4 py-8 text-center text-gray-500">
					No issues in queue
				</div>
			)}
		</div>
	);
}
