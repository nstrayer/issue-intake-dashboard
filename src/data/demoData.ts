import { QueueItem } from '../types/intake';

// Demo labels that match real repo structure
export const DEMO_LABELS = [
  'bug',
  'feature-request',
  'area: editor',
  'area: python',
  'area: r',
  'needs-triage',
  'status: confirmed',
  'priority: high',
];

// Helper to create a date relative to now
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function hoursAgo(hours: number): Date {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
}

// Demo issues with realistic content
export const DEMO_ISSUES: QueueItem[] = [
  {
    id: 'demo-issue-1',
    type: 'issue',
    number: 9999,
    title: 'Python debugger fails to attach when using virtual environments',
    author: 'demo-user',
    createdAt: daysAgo(3),
    labels: [],
    url: '#demo-issue-1',
    body: `## Description
When trying to debug Python code, the debugger fails to attach if the project is using a virtual environment.

## Steps to Reproduce
1. Create a new Python project with a virtual environment
2. Select the virtual environment as the interpreter
3. Set a breakpoint and start debugging
4. Observe that the debugger never connects

## Expected Behavior
The debugger should successfully attach and stop at breakpoints.

## Environment
- OS: macOS 14.0
- Positron Version: 2024.01.0
- Python Version: 3.11`,
    isStale: false,
    ageInDays: 3,
    ageInHours: 72,
  },
  {
    id: 'demo-issue-2',
    type: 'issue',
    number: 9998,
    title: 'Add support for R Shiny app previews in the IDE',
    author: 'r-enthusiast',
    createdAt: daysAgo(8),
    labels: ['feature-request', 'area: r'],
    url: '#demo-issue-2',
    body: `## Feature Request

It would be great to have built-in support for previewing Shiny applications directly in the IDE, similar to how RStudio handles this.

## Use Case
As an R developer, I frequently build Shiny applications and would like to see live previews without leaving the IDE.

## Proposed Solution
Add a "Run Shiny App" button that launches the app in an embedded browser panel.`,
    isStale: true,
    ageInDays: 8,
    ageInHours: 192,
  },
  {
    id: 'demo-issue-3',
    type: 'issue',
    number: 9997,
    title: 'Console output gets truncated with long data frames',
    author: 'data-analyst',
    createdAt: hoursAgo(6),
    labels: ['bug'],
    url: '#demo-issue-3',
    body: `## Bug Report

When printing large data frames in the console, the output is truncated unexpectedly.

## Steps to Reproduce
1. Load a data frame with 100+ columns
2. Print it to the console
3. Notice output is cut off

## Expected vs Actual
Expected: Full output or clear indication of truncation with option to expand
Actual: Output just stops mid-row`,
    isStale: false,
    ageInDays: 0,
    ageInHours: 6,
  },
];

// Demo discussions with realistic content
export const DEMO_DISCUSSIONS: QueueItem[] = [
  {
    id: 'demo-discussion-1',
    type: 'discussion',
    number: 888,
    title: 'Best practices for setting up Positron with conda environments?',
    author: 'new-user-123',
    createdAt: daysAgo(2),
    labels: [],
    url: '#demo-discussion-1',
    category: 'Q&A',
    body: `Hi everyone! I'm new to Positron and coming from a Jupyter/VSCode background.

I primarily use conda for managing my Python environments and I'm wondering what the recommended setup is for Positron.

Specifically:
1. Should I configure conda in a specific way?
2. How do I switch between different conda environments?
3. Are there any known issues with conda integration?

Thanks in advance for any guidance!`,
    isStale: false,
    ageInDays: 2,
    ageInHours: 48,
  },
  {
    id: 'demo-discussion-2',
    type: 'discussion',
    number: 887,
    title: 'Sharing: My workflow for data science projects in Positron',
    author: 'positron-fan',
    createdAt: daysAgo(5),
    labels: [],
    url: '#demo-discussion-2',
    category: 'Show and Tell',
    body: `I've been using Positron for a few months now and wanted to share my workflow that has been working really well.

## My Setup
- I use a combination of Python and R for different parts of my analysis
- Quarto documents for final reports
- Git integration for version control

## Tips
1. Use the variable explorer extensively - it's great for debugging
2. The data viewer is perfect for quick EDA
3. Custom keyboard shortcuts speed things up

What workflows are others using?`,
    isStale: false,
    ageInDays: 5,
    ageInHours: 120,
  },
];

// All demo items combined
export const ALL_DEMO_ITEMS: QueueItem[] = [...DEMO_ISSUES, ...DEMO_DISCUSSIONS];
