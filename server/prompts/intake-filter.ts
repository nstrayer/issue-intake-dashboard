import type { RepoConfig } from '../config.js';
import type { IntakeFilterOptions } from '../github.js';

export const INTAKE_FILTER_SYSTEM_PROMPT = `You are an intake filter interpreter for a GitHub issue/discussion dashboard.

Your job is to interpret natural language intake criteria and generate structured filter options.

The intake filter determines which issues and discussions appear in the "intake queue" - items that need triage attention.

Available filter options:
- excludeMilestoned: boolean - Exclude items with milestones assigned
- excludeTriagedLabels: boolean - Exclude items with labels like "duplicate", "wontfix", "invalid"
- excludeStatusSet: boolean - Exclude items with a Status field set in the main project board
- excludeAnswered: boolean - Exclude discussions that have been answered
- excludeMaintainerResponded: boolean - Exclude discussions where maintainers responded but user hasn't followed up

Additionally, you can specify custom project names:
- mainProjectName: string - Name of the main project for status checking (e.g., "Positron")

Examples:
- "Show all open items" → All filters set to false
- "Exclude items in Done column" → excludeStatusSet: true with appropriate project
- "Only show issues without any triage labels" → excludeTriagedLabels: true

Respond ONLY with a JSON object containing:
1. "filterOptions" - the IntakeFilterOptions object
2. "projectConfig" - optional object with backlogProjectName and mainProjectName if specific projects mentioned
3. "explanation" - brief description of what the filter does`;

export function buildIntakeFilterPrompt(
	criteria: string,
	repoConfig: RepoConfig
): string {
	return `Interpret this intake criteria for the ${repoConfig.fullName} repository:

"${criteria}"

Generate the appropriate filter options.

Respond with a JSON object:
\`\`\`json
{
  "filterOptions": {
    "excludeMilestoned": true/false,
    "excludeTriagedLabels": true/false,
    "excludeStatusSet": true/false,
    "excludeAnswered": true/false,
    "excludeMaintainerResponded": true/false
  },
  "projectConfig": {
    "mainProjectName": "optional project name"
  },
  "explanation": "Brief description..."
}
\`\`\``;
}

export interface IntakeFilterResult {
	filterOptions: IntakeFilterOptions;
	projectConfig?: {
		mainProjectName?: string;
	};
	explanation: string;
}
