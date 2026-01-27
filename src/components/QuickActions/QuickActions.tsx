import { useState } from 'react';

interface QuickActionsProps {
	issueNumber: number;
	currentLabels: string[];
	onAction: (action: string, issueNumber: number, value?: string) => void;
}

const COMMON_LABELS = [
	{ name: 'bug', color: 'red' },
	{ name: 'enhancement', color: 'blue' },
	{ name: 'area:editor', color: 'purple' },
	{ name: 'area:console', color: 'purple' },
	{ name: 'area:connections', color: 'purple' },
	{ name: 'area:data-explorer', color: 'purple' },
	{ name: 'area:notebook', color: 'purple' },
	{ name: 'area:plots', color: 'purple' },
	{ name: 'area:variables', color: 'purple' },
	{ name: 'lang:python', color: 'green' },
	{ name: 'lang:r', color: 'green' },
];

export function QuickActions({
	issueNumber,
	currentLabels,
	onAction,
}: QuickActionsProps) {
	const [showLabelDropdown, setShowLabelDropdown] = useState(false);

	const availableLabels = COMMON_LABELS.filter(
		(label) => !currentLabels.includes(label.name)
	);

	const getLabelColorClasses = (color: string) => {
		switch (color) {
			case 'red':
				return 'bg-red-900/50 text-red-300 border-red-800';
			case 'blue':
				return 'bg-blue-900/50 text-blue-300 border-blue-800';
			case 'purple':
				return 'bg-purple-900/50 text-purple-300 border-purple-800';
			case 'green':
				return 'bg-green-900/50 text-green-300 border-green-800';
			default:
				return 'bg-gray-800 text-gray-300 border-gray-700';
		}
	};

	return (
		<div className="flex items-center gap-2">
			{/* Add label dropdown */}
			<div className="relative">
				<button
					onClick={() => setShowLabelDropdown(!showLabelDropdown)}
					className="px-2 py-1 text-xs bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded border border-gray-700 transition-colors"
				>
					+ Label
				</button>

				{showLabelDropdown && (
					<div className="absolute top-full left-0 mt-1 w-48 bg-[#161b22] border border-gray-700 rounded-lg shadow-lg z-10">
						<div className="p-2 max-h-64 overflow-y-auto">
							{availableLabels.map((label) => (
								<button
									key={label.name}
									onClick={() => {
										onAction('add-label', issueNumber, label.name);
										setShowLabelDropdown(false);
									}}
									className={`w-full text-left px-2 py-1.5 text-xs rounded mb-1 border ${getLabelColorClasses(label.color)} hover:opacity-80 transition-opacity`}
								>
									{label.name}
								</button>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Set to triage button */}
			<button
				onClick={() => onAction('set-triage', issueNumber)}
				className="px-2 py-1 text-xs bg-yellow-900/50 hover:bg-yellow-800/50 text-yellow-300 rounded border border-yellow-800 transition-colors"
			>
				Triage
			</button>

			{/* View on GitHub */}
			<a
				href={`https://github.com/posit-dev/positron/issues/${issueNumber}`}
				target="_blank"
				rel="noopener noreferrer"
				className="px-2 py-1 text-xs bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded border border-gray-700 transition-colors"
			>
				View
			</a>
		</div>
	);
}
