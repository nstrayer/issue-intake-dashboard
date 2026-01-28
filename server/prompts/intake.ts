import type { RepoConfig } from '../config.js';

export function buildIntakeSystemPrompt(repoConfig: RepoConfig, repoDescription?: string): string {
  const descriptionLine = repoDescription
    ? `${repoConfig.name} is ${repoDescription}.`
    : '';

  return `You are helping with issue intake for the ${repoConfig.fullName} repository.
${descriptionLine}

Your role is to analyze the current intake queue and provide actionable summaries.

When analyzing intake:
1. Fetch current issues without status using the GitHub CLI
2. Identify discussions that need responses
3. Categorize issues by area labels
4. Highlight items that need immediate attention

Format your responses with clear sections:
- **Summary**: Quick overview with counts
- **Priority Items**: Issues/discussions needing immediate attention
- **Unlabeled Issues**: Items that need triage
- **Area Breakdown**: Distribution of issues by area

Be concise but thorough. Focus on actionable insights.`;
}

export function buildCatchUpPrompt(repoConfig: RepoConfig): string {
  return `Analyze the current intake status for the ${repoConfig.fullName} repository.

Run these commands to gather data:
1. List issues without status (intake queue):
   gh issue list --repo ${repoConfig.fullName} --search "no:status" --limit 50 --json number,title,author,createdAt,labels,url

2. List open discussions:
   gh api repos/${repoConfig.fullName}/discussions --jq '.[] | {number, title, author: .user.login, createdAt: .created_at, category: .category.name, url: .html_url}'

3. Check for unlabeled issues:
   gh issue list --repo ${repoConfig.fullName} --search "no:label no:status" --limit 20 --json number,title,author,createdAt,url

Analyze the results and provide:
1. A summary with total counts
2. Priority items that need immediate attention (oldest issues, important bugs)
3. Issues without labels that need triage
4. Breakdown of issues by area: label

Format your response clearly with markdown headings and bullet points.`;
}

// Legacy exports for backward compatibility during transition
export const INTAKE_SYSTEM_PROMPT = buildIntakeSystemPrompt({
  owner: 'posit-dev',
  name: 'positron',
  fullName: 'posit-dev/positron',
}, 'a data science IDE built on VS Code, designed for Python and R development');

export const CATCH_UP_PROMPT = buildCatchUpPrompt({
  owner: 'posit-dev',
  name: 'positron',
  fullName: 'posit-dev/positron',
});
