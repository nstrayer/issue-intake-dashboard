import { Step } from 'react-joyride';

export const tourSteps: Step[] = [
  {
    target: '[data-tour="header"]',
    title: 'Welcome to Triage Sidekick',
    content: 'Your connected repository and progress metrics live here. Track how many items need review and your overall progress.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="env-button"]',
    title: 'Environment Check',
    content: 'Click here to check your setup status and available tools. Let\'s take a look...',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="env-modal"]',
    title: 'Environment Status',
    content: 'This modal shows your environment configuration, including repository connection and tool availability.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="queue-list"]',
    title: 'Your Triage Queue',
    content: 'Issues and discussions waiting for review are listed here, organized by type. Items are sorted with oldest first by default.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="queue-item"]',
    title: 'View Details',
    content: 'Click any item to see its full details in the side panel. Let\'s select one now.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="analyze-button"]',
    title: 'AI Analysis',
    content: 'Run focused AI analysis on the selected item. Find duplicates, get label suggestions, or draft a response.',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-tour="copy-claude-code"]',
    title: 'Export to Claude Code',
    content: 'Copy the issue context to your clipboard, ready to paste into Claude Code for deeper analysis or code changes.',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-tour="filter-tabs"]',
    title: 'Filter Modes',
    content: 'Switch between Standard filters or AI-powered natural language filtering to find specific items quickly.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="help-button"]',
    title: 'Need Help?',
    content: 'Press ? anytime for keyboard shortcuts. You can restart this tour from the Help menu whenever you need a refresher.',
    placement: 'bottom',
    disableBeacon: true,
  },
];
