import { QueueItem, ClaudeAnalysis, formatAgeVerbose } from '../types/intake';

export function generateClaudeCodePrompt(
  item: QueueItem,
  body: string | undefined,
  analysis: ClaudeAnalysis | null
): string {
  const itemType = item.type === 'issue' ? 'Issue' : 'Discussion';
  const itemTypeLower = item.type;

  const lines: string[] = [
    `I'd like to continue working on this ${itemTypeLower} using the intake rotation skill.`,
    '',
    '## Item Details',
    `- **Type:** ${itemType}`,
    `- **Number:** #${item.number}`,
    `- **Title:** ${item.title}`,
    `- **URL:** ${item.url}`,
    `- **Author:** @${item.author}`,
    `- **Age:** ${formatAgeVerbose(item.ageInDays, item.ageInHours)}`,
  ];

  if (item.labels.length > 0) {
    lines.push(`- **Current Labels:** ${item.labels.join(', ')}`);
  }

  if (item.isStale) {
    lines.push(`- **Status:** Stale (needs attention)`);
  }

  lines.push('');
  lines.push('## Description');
  lines.push(body || '*No description provided*');

  if (analysis && !analysis.isLoading && !analysis.error) {
    lines.push('');
    lines.push('## AI Analysis Summary');

    if (analysis.summary) {
      lines.push('');
      lines.push('### Summary');
      lines.push(analysis.summary);
    }

    if (analysis.suggestedLabels.length > 0) {
      lines.push('');
      lines.push('### Suggested Labels');
      lines.push(analysis.suggestedLabels.map(l => `- ${l}`).join('\n'));
    }

    if (analysis.duplicates.length > 0) {
      lines.push('');
      lines.push('### Potential Duplicates');
      for (const dup of analysis.duplicates) {
        const similarity = dup.similarity > 0 ? ` (${Math.round(dup.similarity * 100)}% similar)` : '';
        lines.push(`- [#${dup.number}](${dup.url}): ${dup.title}${similarity}`);
      }
    }

    if (analysis.draftResponse) {
      lines.push('');
      lines.push('### Draft Response');
      lines.push('```');
      lines.push(analysis.draftResponse);
      lines.push('```');
    }

    if (analysis.conversationHistory && analysis.conversationHistory.length > 0) {
      lines.push('');
      lines.push('### Conversation History');
      for (const msg of analysis.conversationHistory) {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        lines.push(`**${role}:** ${msg.content}`);
        lines.push('');
      }
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('Please help me triage this item.');

  return lines.join('\n');
}
