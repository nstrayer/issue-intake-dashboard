import { spawn } from 'child_process';

// Lightweight types for list view (no bodies)
export interface GitHubIssueSummary {
  number: number;
  title: string;
  author: { login: string };
  createdAt: string;
  labels: { name: string }[];
  url: string;
  state: string;
  projectStatus?: string; // From Project v2 field
}

export interface GitHubDiscussionSummary {
  number: number;
  title: string;
  author: { login: string };
  createdAt: string;
  category: { name: string };
  url: string;
  answerChosenAt: string | null;
}

// Full types for detail view (includes bodies)
export interface GitHubIssue extends GitHubIssueSummary {
  body: string;
}

export interface GitHubDiscussion extends GitHubDiscussionSummary {
  body: string;
}

export interface IntakeQueueData {
  issues: GitHubIssueSummary[];
  discussions: GitHubDiscussionSummary[];
  fetchedAt: string;
}

const REPO = 'posit-dev/positron';
const REPO_OWNER = 'posit-dev';
const REPO_NAME = 'positron';

// Verify GitHub CLI authentication on module load
async function verifyGitHubAuth(): Promise<void> {
  try {
    await execGitHub(['auth', 'status']);
  } catch (error) {
    console.error('GitHub CLI not authenticated. Run: gh auth login');
    throw new Error('GitHub CLI authentication required');
  }
}

// Helper function for secure command execution
async function execGitHub(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('gh', args);
    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`gh command failed: ${stderr || 'Unknown error'}`));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

export async function fetchIntakeQueue(): Promise<IntakeQueueData> {
  const [issues, discussions] = await Promise.all([
    fetchIssuesInIntake(),
    fetchOpenDiscussions(),
  ]);

  return {
    issues,
    discussions,
    fetchedAt: new Date().toISOString(),
  };
}

// GraphQL query to fetch issues without Status in the Positron project
const INTAKE_ISSUES_QUERY = `
query GetIntakeIssues($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    issues(first: 100, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        number
        title
        author { login }
        createdAt
        url
        state
        labels(first: 10) {
          nodes { name }
        }
        projectItems(first: 5) {
          nodes {
            project {
              title
            }
            fieldValues(first: 10) {
              nodes {
                ... on ProjectV2ItemFieldTextValue {
                  field { ... on ProjectV2Field { name } }
                  text
                }
                ... on ProjectV2ItemFieldSingleSelectValue {
                  field { ... on ProjectV2SingleSelectField { name } }
                  name
                }
              }
            }
          }
        }
      }
    }
  }
}
`;

interface GraphQLIssueNode {
  number: number;
  title: string;
  author: { login: string } | null;
  createdAt: string;
  url: string;
  state: string;
  labels: { nodes: { name: string }[] } | null;
  projectItems: {
    nodes: {
      project: { title: string } | null;
      fieldValues: {
        nodes: {
          field?: { name: string } | null;
          name?: string;
          text?: string;
        }[];
      } | null;
    }[];
  } | null;
}

async function fetchIssuesInIntake(): Promise<GitHubIssueSummary[]> {
  try {
    // Use GraphQL to get issues with project field data
    const result = await execGitHub([
      'api', 'graphql',
      '-f', `query=${INTAKE_ISSUES_QUERY}`,
      '-f', `owner=${REPO_OWNER}`,
      '-f', `name=${REPO_NAME}`
    ]);

    const data = JSON.parse(result);
    const issues: GraphQLIssueNode[] = data.data?.repository?.issues?.nodes || [];

    // Filter for issues that need intake attention:
    // - Not in Positron Backlog project (those are already triaged)
    // - Not having Status field set in Positron project
    return issues
      .filter((issue) => {
        // If in Positron Backlog project, it's been taken care of
        const inBacklogProject = issue.projectItems?.nodes?.some(
          (item) => item.project?.title === 'Positron Backlog'
        );
        if (inBacklogProject) return false;

        // Check Positron project status
        const positronProject = issue.projectItems?.nodes?.find(
          (item) => item.project?.title === 'Positron'
        );
        if (!positronProject) return true; // Not in project = in intake

        const statusField = positronProject.fieldValues?.nodes?.find(
          (field) => field.field?.name === 'Status'
        );
        return !statusField || !statusField.name; // No status = in intake
      })
      .map((issue) => ({
        number: issue.number,
        title: issue.title,
        author: { login: issue.author?.login || 'unknown' },
        createdAt: issue.createdAt,
        labels: issue.labels?.nodes?.map((l) => ({ name: l.name })) || [],
        url: issue.url,
        state: issue.state,
        projectStatus: undefined
      }));
  } catch (error) {
    console.error('Failed to fetch intake issues:', error);
    // Fallback to simpler query without project data
    const result = await execGitHub([
      'issue', 'list',
      '--repo', REPO,
      '--state', 'open',
      '--json', 'number,title,author,createdAt,labels,url,state',
      '--limit', '100'
    ]);
    return JSON.parse(result || '[]');
  }
}

// GraphQL query for open discussions
const OPEN_DISCUSSIONS_QUERY = `
query GetOpenDiscussions($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    discussions(first: 50, states: OPEN, answered: false) {
      nodes {
        number
        title
        author { login }
        createdAt
        url
        category { name }
        answer { id }
      }
    }
  }
}
`;

interface GraphQLDiscussionNode {
  number: number;
  title: string;
  author: { login: string } | null;
  createdAt: string;
  url: string;
  category: { name: string } | null;
  answer: { id: string } | null;
}

async function fetchOpenDiscussions(): Promise<GitHubDiscussionSummary[]> {
  try {
    const result = await execGitHub([
      'api', 'graphql',
      '-f', `query=${OPEN_DISCUSSIONS_QUERY}`,
      '-f', `owner=${REPO_OWNER}`,
      '-f', `name=${REPO_NAME}`
    ]);

    const data = JSON.parse(result);
    const discussions: GraphQLDiscussionNode[] = data.data?.repository?.discussions?.nodes || [];

    return discussions.map((disc) => ({
      number: disc.number,
      title: disc.title,
      author: { login: disc.author?.login || 'unknown' },
      createdAt: disc.createdAt,
      category: { name: disc.category?.name || 'General' },
      url: disc.url,
      answerChosenAt: disc.answer ? new Date().toISOString() : null
    }));
  } catch (error) {
    console.error('Failed to fetch discussions via GraphQL:', error);
    // Fallback to REST API
    try {
      const result = await execGitHub([
        'api',
        `repos/${REPO}/discussions`,
        '--jq', '[.[] | select(.answer == null) | {number, title, author: .user.login, createdAt: .created_at, category: .category.name, url: .html_url, answerChosenAt: .answer_chosen_at}] | .[0:50]'
      ]);
      return JSON.parse(result || '[]');
    } catch {
      // If discussions API fails, return empty array
      console.error('Discussions API not available');
      return [];
    }
  }
}

// Fetch full issue details (with body)
export async function fetchIssueDetails(issueNumber: number): Promise<GitHubIssue> {
  const result = await execGitHub([
    'issue', 'view',
    String(issueNumber),
    '--repo', REPO,
    '--json', 'number,title,author,createdAt,labels,url,state,body'
  ]);
  const data = JSON.parse(result);
  return {
    number: data.number,
    title: data.title,
    author: data.author,
    createdAt: data.createdAt,
    labels: data.labels,
    url: data.url,
    state: data.state,
    body: data.body || ''
  };
}

// Fetch full discussion details (with body)
export async function fetchDiscussionDetails(discussionNumber: number): Promise<GitHubDiscussion> {
  // Use GraphQL for discussion details since REST API is limited
  const query = `
  query GetDiscussion($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      discussion(number: $number) {
        number
        title
        author { login }
        createdAt
        url
        body
        category { name }
        answer { id }
      }
    }
  }
  `;

  const result = await execGitHub([
    'api', 'graphql',
    '-f', `query=${query}`,
    '-f', `owner=${REPO_OWNER}`,
    '-f', `name=${REPO_NAME}`,
    '-F', `number=${discussionNumber}`
  ]);

  const data = JSON.parse(result);
  const disc = data.data?.repository?.discussion;

  if (!disc) {
    throw new Error(`Discussion #${discussionNumber} not found`);
  }

  return {
    number: disc.number,
    title: disc.title,
    author: { login: disc.author?.login || 'unknown' },
    createdAt: disc.createdAt,
    category: { name: disc.category?.name || 'General' },
    url: disc.url,
    body: disc.body || '',
    answerChosenAt: disc.answer ? new Date().toISOString() : null
  };
}

let labelCache: string[] | null = null;
let labelCacheTime = 0;
const LABEL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchRepoLabels(): Promise<string[]> {
  // Cache labels for 5 minutes to avoid repeated API calls
  if (labelCache && Date.now() - labelCacheTime < LABEL_CACHE_TTL) {
    return labelCache;
  }

  const result = await execGitHub([
    'label', 'list',
    '--repo', REPO,
    '--json', 'name',
    '--limit', '200'
  ]);

  const labels = JSON.parse(result || '[]');
  const labelNames: string[] = labels.map((l: { name: string }) => l.name);
  labelCache = labelNames;
  labelCacheTime = Date.now();

  return labelNames;
}

export async function applyLabel(issueNumber: number, label: string): Promise<void> {
  // Validate label exists (prevent injection)
  const validLabels = await fetchRepoLabels();
  if (!validLabels.includes(label)) {
    throw new Error(`Invalid label: ${label}`);
  }

  await execGitHub([
    'issue', 'edit',
    String(issueNumber),
    '--repo', REPO,
    '--add-label', label
  ]);
}

export async function removeLabel(issueNumber: number, label: string): Promise<void> {
  await execGitHub([
    'issue', 'edit',
    String(issueNumber),
    '--repo', REPO,
    '--remove-label', label
  ]);
}

export async function setProjectStatus(issueNumber: number, status: string): Promise<void> {
  // Update the Status field in the Positron project
  // This requires finding the project and field IDs first
  try {
    // Get project ID and field ID (would be cached in production)
    const projectQuery = `
    query {
      repository(owner: "${REPO_OWNER}", name: "${REPO_NAME}") {
        projectsV2(first: 10) {
          nodes {
            id
            title
            fields(first: 20) {
              nodes {
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  options { id name }
                }
              }
            }
          }
        }
      }
    }`;

    const result = await execGitHub(['api', 'graphql', '-f', `query=${projectQuery}`]);
    const data = JSON.parse(result);

    interface ProjectV2Field {
      id: string;
      name: string;
      options?: { id: string; name: string }[];
    }

    interface ProjectV2 {
      id: string;
      title: string;
      fields?: { nodes: ProjectV2Field[] };
    }

    const positronProject: ProjectV2 | undefined = data.data?.repository?.projectsV2?.nodes?.find(
      (p: ProjectV2) => p.title === 'Positron'
    );

    if (!positronProject) {
      throw new Error('Positron project not found');
    }

    const statusField = positronProject.fields?.nodes?.find(
      (f) => f.name === 'Status'
    );

    if (!statusField) {
      throw new Error('Status field not found in project');
    }

    const statusOption = statusField.options?.find((o) => o.name === status);
    if (!statusOption) {
      throw new Error(`Status option "${status}" not found`);
    }

    // Update the field value (simplified - would need item ID in practice)
    console.log(`Would update issue #${issueNumber} Status to "${status}" (${statusOption.id})`);
  } catch (error) {
    console.error('Failed to update project status:', error);
    throw error;
  }
}

export async function searchDuplicates(searchTerms: string[], excludeNumber: number): Promise<{ number: number; title: string; url: string; state: string }[]> {
  const searchQuery = searchTerms.join(' OR ');
  const result = await execGitHub([
    'issue', 'list',
    '--repo', REPO,
    '--search', searchQuery,
    '--json', 'number,title,state,url',
    '--limit', '10'
  ]);

  interface SearchResult {
    number: number;
    title: string;
    state: string;
    url: string;
  }

  const issues: SearchResult[] = JSON.parse(result || '[]');
  return issues
    .filter((i) => i.number !== excludeNumber)
    .slice(0, 5)
    .map((i) => ({
      number: i.number,
      title: i.title,
      url: i.url,
      state: i.state
    }));
}

// Verify auth on module initialization
verifyGitHubAuth().catch(console.error);
