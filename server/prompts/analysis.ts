import type { RepoConfig } from '../config.js';

export type AnalysisType = 'full' | 'duplicates' | 'labels' | 'response';

export function buildAnalysisSystemPrompt(repoConfig: RepoConfig, repoDescription?: string): string {
  const descriptionLine = repoDescription
    ? `\n\n${repoConfig.name} is: ${repoDescription}`
    : '';

  return `You are an expert at triaging GitHub issues for the ${repoConfig.fullName} repository.${descriptionLine}

Your job is to analyze issues and provide structured assistance to intake triagers.

When analyzing, consider:
1. What area of the codebase does this affect?
2. Is this a bug, feature request, question, or docs issue?
3. Have we seen similar issues before?
4. What information might we need from the reporter?

You have access to the Bash tool and can search for related issues using the gh CLI:
- Search issues: gh issue list --repo ${repoConfig.fullName} --search "<query>" --state all --limit 10
- Search with labels: gh issue list --repo ${repoConfig.fullName} --label "<label>" --state all --limit 10

IMPORTANT: You CAN run read-only search commands but CANNOT modify issues.`;
}

// Legacy export for backward compatibility during transition
export const ANALYSIS_SYSTEM_PROMPT = buildAnalysisSystemPrompt({
  owner: 'posit-dev',
  name: 'positron',
  fullName: 'posit-dev/positron',
}, 'a next-generation data science IDE built on VS Code');

export function buildAnalysisPrompt(issue: {
  number: number;
  title: string;
  body: string;
  labels: string[];
}, type: AnalysisType = 'full'): string {
  const issueContext = `## Issue #${issue.number}: ${issue.title}

${issue.body || '*No description provided*'}

Current labels: ${issue.labels.length > 0 ? issue.labels.join(', ') : 'None'}`;

  if (type === 'labels') {
    return `Analyze this GitHub issue and suggest appropriate labels:

${issueContext}

Respond with a JSON object in this exact format:
\`\`\`json
{
  "suggestedLabels": ["label1", "label2"]
}
\`\`\`

Only suggest labels that are not already applied. Choose labels that accurately categorize the issue type (bug, feature, question, etc.) and affected area.`;
  }

  if (type === 'duplicates') {
    return `Analyze this GitHub issue and identify search terms for finding duplicates:

${issueContext}

Respond with a JSON object in this exact format:
\`\`\`json
{
  "duplicateSearchTerms": ["term1", "term2", "term3"]
}
\`\`\`

Provide 2-3 search terms we could use to find similar or duplicate issues. Focus on specific error messages, feature names, or unique technical terms.`;
  }

  if (type === 'response') {
    return `Analyze this GitHub issue and draft an appropriate response:

${issueContext}

Respond with a JSON object in this exact format:
\`\`\`json
{
  "needsInfo": true/false,
  "draftResponse": "draft response to the issue reporter"
}
\`\`\`

Set needsInfo to true if the issue lacks reproduction steps, version info, or other critical details.
Write a draftResponse that either:
- Asks for missing information if needsInfo is true
- Provides helpful acknowledgment or guidance for the issue`;
  }

  // Full analysis (default)
  return `Analyze this GitHub issue and provide structured analysis:

${issueContext}

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
  userQuestion: string,
  repoConfig?: RepoConfig
): string {
  const repo = repoConfig || { owner: 'posit-dev', name: 'positron', fullName: 'posit-dev/positron' };

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

You have access to the repository and can search for related issues:
- Search issues: gh issue list --repo ${repo.fullName} --search "<query>" --state all --limit 10
- Search with labels: gh issue list --repo ${repo.fullName} --label "<label>" --state all --limit 10

IMPORTANT:
- You CAN run read-only search commands (gh issue list, gh search issues, etc.)
- You CANNOT modify issues (no adding labels, closing, commenting, editing)
- When searching, present results clearly with issue numbers, titles, and states
- If asked to modify an issue, explain that you can only search and the triager must make changes through the dashboard

${historyText ? `## Conversation So Far\n\n${historyText}\n\n` : ''}## Follow-up Question

${userQuestion}

Provide a helpful, concise response to assist the triager.`;
}
