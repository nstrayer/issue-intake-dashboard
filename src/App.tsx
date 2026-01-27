import { ChatInterface } from './components/ChatInterface/ChatInterface';
import { IssueQueue } from './components/IssueQueue/IssueQueue';
import { AreaChart } from './components/AreaChart/AreaChart';
import { useAgentChat } from './hooks/useAgentChat';
import { useIntakeData } from './hooks/useIntakeData';

function App() {
	const { messages, isLoading, isConnected, catchUp, sendMessage, executeAction } =
		useAgentChat();
	const intakeData = useIntakeData(messages);

	return (
		<div className="min-h-screen bg-[#0d1117]">
			{/* Header */}
			<header className="border-b border-gray-800 bg-[#161b22]">
				<div className="max-w-7xl mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<h1 className="text-xl font-semibold text-white">
								Positron Issue Intake
							</h1>
							<span
								className={`px-2 py-0.5 text-xs rounded-full ${isConnected
										? 'bg-green-900/50 text-green-400'
										: 'bg-red-900/50 text-red-400'
									}`}
							>
								{isConnected ? 'Connected' : 'Disconnected'}
							</span>
						</div>
						<button
							onClick={catchUp}
							disabled={isLoading || !isConnected}
							className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
						>
							{isLoading ? 'Analyzing...' : "Let's get caught up"}
						</button>
					</div>
				</div>
			</header>

			{/* Main content */}
			<main className="max-w-7xl mx-auto px-4 py-6">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Chat interface - takes up 2 columns */}
					<div className="lg:col-span-2">
						<ChatInterface
							messages={messages}
							isLoading={isLoading}
							onSendMessage={sendMessage}
						/>
					</div>

					{/* Sidebar with visualizations */}
					<div className="space-y-6">
						{/* Area breakdown chart */}
						{intakeData && Object.keys(intakeData.areaBreakdown).length > 0 && (
							<div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
								<h2 className="text-lg font-medium text-white mb-4">
									Issues by Area
								</h2>
								<AreaChart data={intakeData.areaBreakdown} />
							</div>
						)}

						{/* Quick stats */}
						{intakeData && (
							<div className="bg-[#161b22] rounded-lg border border-gray-800 p-4">
								<h2 className="text-lg font-medium text-white mb-4">
									Quick Stats
								</h2>
								<div className="grid grid-cols-2 gap-4">
									<div className="bg-[#0d1117] rounded-lg p-3">
										<div className="text-2xl font-bold text-white">
											{intakeData.issues.length}
										</div>
										<div className="text-sm text-gray-400">In Queue</div>
									</div>
									<div className="bg-[#0d1117] rounded-lg p-3">
										<div className="text-2xl font-bold text-yellow-400">
											{intakeData.unlabeledCount}
										</div>
										<div className="text-sm text-gray-400">Unlabeled</div>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Issue queue table */}
				{intakeData && intakeData.issues.length > 0 && (
					<div className="mt-6">
						<IssueQueue issues={intakeData.issues} onAction={executeAction} />
					</div>
				)}
			</main>
		</div>
	);
}

export default App;
