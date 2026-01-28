export const ANALYSIS_SYSTEM_PROMPT = `You are an expert at triaging GitHub issues for the Positron IDE project (a next-generation data science IDE built on VS Code).

Your job is to analyze issues and provide structured assistance to intake triagers.

Available area labels:
- area:editor - Core text editing, Monaco editor issues
- area:console - Interactive console (R, Python REPL)
- area:variables - Variables pane, object inspection
- area:plots - Plot viewer, visualization
- area:connections - Database connections, remote connections
- area:help - Help pane, documentation viewer
- area:data-explorer - Data frame viewer, table exploration
- area:notebooks - Jupyter notebook support
- area:extensions - Extension compatibility, marketplace
- area:r - R language support, R interpreter
- area:python - Python language support, Python interpreter
- area:infrastructure - Build, CI/CD, installation, packaging

Type labels:
- type:bug - Something broken or not working
- type:enhancement - New feature or improvement
- type:question - User asking for help
- type:docs - Documentation issue

When analyzing, consider:
1. What area of Positron does this affect?
2. Is this a bug, feature request, question, or docs issue?
3. Have we seen similar issues before?
4. What information might we need from the reporter?`;

export function buildAnalysisPrompt(issue: {
  number: number;
  title: string;
  body: string;
  labels: string[];
}): string {
  return `Analyze this GitHub issue and provide structured analysis:

## Issue #${issue.number}: ${issue.title}

${issue.body || '*No description provided*'}

Current labels: ${issue.labels.length > 0 ? issue.labels.join(', ') : 'None'}

Respond with a JSON object in this exact format:
\`\`\`json
{
  "summary": "1-2 sentence summary of what this issue is about",
  "suggestedLabels": ["label1", "label2"],
  "duplicateSearchTerms": ["term1", "term2"],
  "needsInfo": true/false,
  "draftResponse": "optional draft response if reporter needs info or acknowledgment"
}
\`\`\`

Only suggest labels that are not already applied.
For duplicateSearchTerms, provide 2-3 search terms we could use to find similar issues.
Set needsInfo to true if the issue lacks reproduction steps, version info, or other critical details.
Only include draftResponse if we need to ask for info or provide a helpful acknowledgment.`;
}

export interface FollowUpMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function buildFollowUpPrompt(
  issue: { number: number; title: string; body: string },
  analysis: { summary: string; suggestedLabels: string[]; draftResponse?: string },
  conversationHistory: FollowUpMessage[],
  userQuestion: string
): string {
  const historyText = conversationHistory
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');

  return `You previously analyzed this GitHub issue. Now the triager has a follow-up question.

## Issue #${issue.number}: ${issue.title}

${issue.body || '*No description provided*'}

## Your Previous Analysis

Summary: ${analysis.summary}
Suggested Labels: ${analysis.suggestedLabels.join(', ') || 'None'}
${analysis.draftResponse ? `Draft Response: ${analysis.draftResponse}` : ''}

## Your Capabilities

You have access to the positron repository and can search for related issues:
- Search issues: gh issue list --repo posit-dev/positron --search "<query>" --state all --limit 10
- Search with labels: gh issue list --repo posit-dev/positron --label "<label>" --state all --limit 10

IMPORTANT:
- You CAN run read-only search commands (gh issue list, gh search issues, etc.)
- You CANNOT modify issues (no adding labels, closing, commenting, editing)
- When searching, present results clearly with issue numbers, titles, and states
- If asked to modify an issue, explain that you can only search and the triager must make changes through the dashboard

${historyText ? `## Conversation So Far\n\n${historyText}\n\n` : ''}## Follow-up Question

${userQuestion}

Provide a helpful, concise response to assist the triager.`;
}
