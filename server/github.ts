import { spawn } from 'child_process';
import { type RepoConfig, getCachedRepoConfig, isDefaultPositronRepo } from './config.js';

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
  hasMaintainerResponse: boolean;
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
  warnings?: string[];
  activeFilters: IntakeFilterOptions;
}

// Intake filter options - all default to true (filter active)
export interface IntakeFilterOptions {
  // Issues
  excludeMilestoned: boolean;      // Exclude items with milestones
  excludeTriagedLabels: boolean;   // Exclude items with duplicate/wontfix/invalid labels
  excludeStatusSet: boolean;       // Exclude items with Status field set in main project
  // Discussions
  excludeAnswered: boolean;        // Exclude answered discussions
  excludeMaintainerResponded: boolean;  // Exclude discussions where maintainers responded but no user follow-up
}

// Project configuration for filtering
export interface ProjectFilterConfig {
  mainProjectName?: string;     // e.g., "Positron"
}

export const DEFAULT_INTAKE_FILTERS: IntakeFilterOptions = {
  excludeMilestoned: true,
  excludeTriagedLabels: true,
  excludeStatusSet: true,
  excludeAnswered: true,
  excludeMaintainerResponded: true,
};

// Default project config for Positron (backward compatibility)
const POSITRON_PROJECT_CONFIG: ProjectFilterConfig = {
  mainProjectName: 'Positron',
};

// Get project config based on repo
function getProjectConfig(repoConfig: RepoConfig): ProjectFilterConfig {
  if (isDefaultPositronRepo(repoConfig)) {
    return POSITRON_PROJECT_CONFIG;
  }
  // For other repos, no default project filtering
  return {};
}

// Verify GitHub CLI authentication on module load
async function verifyGitHubAuth(): Promise<void> {
  const repoConfig = getCachedRepoConfig();

  try {
    await execGitHub(['auth', 'status']);

    // Test if we have read:project scope by making a simple project query
    const testQuery = `
    query {
      repository(owner: "${repoConfig.owner}", name: "${repoConfig.name}") {
        projectsV2(first: 1) {
          nodes { id }
        }
      }
    }`;

    try {
      await execGitHub(['api', 'graphql', '-f', `query=${testQuery}`]);
    } catch (scopeError) {
      const errorMessage = String(scopeError);
      if (errorMessage.includes('INSUFFICIENT_SCOPES') || errorMessage.includes('read:project')) {
        console.error('\n⚠️  MISSING GITHUB SCOPE ⚠️');
        console.error('The read:project scope is required to filter intake issues correctly.');
        console.error('Run: gh auth refresh --scopes read:project');
        console.error('Until fixed, all open issues will be shown (unfiltered).\n');
      }
      // Don't throw - allow app to continue with degraded filtering
    }
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

export async function fetchIntakeQueue(
  filterOptions: IntakeFilterOptions = DEFAULT_INTAKE_FILTERS,
  projectConfig?: ProjectFilterConfig
): Promise<IntakeQueueData> {
  const warnings: string[] = [];
  const repoConfig = getCachedRepoConfig();
  const effectiveProjectConfig = projectConfig || getProjectConfig(repoConfig);

  const [issues, discussions] = await Promise.all([
    fetchIssuesInIntake(warnings, filterOptions, effectiveProjectConfig),
    fetchOpenDiscussions(filterOptions),
  ]);

  return {
    issues,
    discussions,
    fetchedAt: new Date().toISOString(),
    warnings: warnings.length > 0 ? warnings : undefined,
    activeFilters: filterOptions,
  };
}

// GraphQL query to fetch issues with project field data
function buildIntakeIssuesQuery(_owner: string, _name: string): string {
  return `
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
        milestone {
          title
        }
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
}

interface GraphQLIssueNode {
  number: number;
  title: string;
  author: { login: string } | null;
  createdAt: string;
  url: string;
  state: string;
  milestone: { title: string } | null;
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

async function fetchIssuesInIntake(
  warnings: string[],
  filterOptions: IntakeFilterOptions,
  projectConfig: ProjectFilterConfig
): Promise<GitHubIssueSummary[]> {
  const repoConfig = getCachedRepoConfig();

  try {
    // Use GraphQL to get issues with project field data
    const query = buildIntakeIssuesQuery(repoConfig.owner, repoConfig.name);
    const result = await execGitHub([
      'api', 'graphql',
      '-f', `query=${query}`,
      '-f', `owner=${repoConfig.owner}`,
      '-f', `name=${repoConfig.name}`
    ]);

    const data = JSON.parse(result);
    const issues: GraphQLIssueNode[] = data.data?.repository?.issues?.nodes || [];

    // Filter for issues that need intake attention based on filter options
    return issues
      .filter((issue) => {
        // If has milestone, it's been triaged - exclude
        if (filterOptions.excludeMilestoned && issue.milestone) {
          return false;
        }

        // If has certain labels indicating triage happened - exclude
        if (filterOptions.excludeTriagedLabels) {
          const triagedLabels = ['duplicate', 'wontfix', 'invalid'];
          const hasTriagedLabel = issue.labels?.nodes?.some(
            (l) => triagedLabels.includes(l.name.toLowerCase())
          );
          if (hasTriagedLabel) return false;
        }

        // Check main project status
        if (filterOptions.excludeStatusSet && projectConfig.mainProjectName) {
          const mainProject = issue.projectItems?.nodes?.find(
            (item) => item.project?.title === projectConfig.mainProjectName
          );
          if (mainProject) {
            const statusField = mainProject.fieldValues?.nodes?.find(
              (field) => field.field?.name === 'Status'
            );
            if (statusField?.name) return false; // Has status = triaged
          }
        }

        return true;
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
    const errorMessage = String(error);
    if (errorMessage.includes('INSUFFICIENT_SCOPES') || errorMessage.includes('read:project')) {
      console.error('\n⚠️  MISSING GITHUB SCOPE ⚠️');
      console.error('The read:project scope is required to filter intake issues correctly.');
      console.error('Run: gh auth refresh --scopes read:project');
      console.error('Until fixed, all open issues will be shown (unfiltered).\n');
      warnings.push('Missing read:project scope. Showing all open issues (unfiltered). Run: gh auth refresh --scopes read:project');
    } else {
      console.error('Failed to fetch intake issues:', error);
    }
    // Fallback to simpler query without project data
    const result = await execGitHub([
      'issue', 'list',
      '--repo', repoConfig.fullName,
      '--state', 'open',
      '--json', 'number,title,author,createdAt,labels,url,state',
      '--limit', '100'
    ]);
    return JSON.parse(result || '[]');
  }
}

// GraphQL query for open discussions
function buildOpenDiscussionsQuery(): string {
  return `
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
        comments(first: 20) {
          nodes {
            author { login }
            authorAssociation
            replies(first: 10) {
              nodes {
                author { login }
                authorAssociation
              }
            }
          }
        }
      }
    }
  }
}
`;
}

interface GraphQLCommentReply {
  author: { login: string } | null;
  authorAssociation: string;
}

interface GraphQLDiscussionComment {
  author: { login: string } | null;
  authorAssociation: string;
  replies: {
    nodes: GraphQLCommentReply[];
  } | null;
}

interface GraphQLDiscussionNode {
  number: number;
  title: string;
  author: { login: string } | null;
  createdAt: string;
  url: string;
  category: { name: string } | null;
  answer: { id: string } | null;
  comments: {
    nodes: GraphQLDiscussionComment[];
  } | null;
}

// Maintainer associations in GitHub
const MAINTAINER_ASSOCIATIONS = ['MEMBER', 'OWNER', 'COLLABORATOR'];

async function fetchOpenDiscussions(
  filterOptions: IntakeFilterOptions
): Promise<GitHubDiscussionSummary[]> {
  const repoConfig = getCachedRepoConfig();

  try {
    // Use different query based on whether we want to exclude answered discussions
    const baseQuery = buildOpenDiscussionsQuery();
    const query = filterOptions.excludeAnswered
      ? baseQuery
      : baseQuery.replace('answered: false', '');

    const result = await execGitHub([
      'api', 'graphql',
      '-f', `query=${query}`,
      '-f', `owner=${repoConfig.owner}`,
      '-f', `name=${repoConfig.name}`
    ]);

    const data = JSON.parse(result);
    const discussions: GraphQLDiscussionNode[] = data.data?.repository?.discussions?.nodes || [];

    // Check each discussion for maintainer responses (in comments or replies)
    const discussionsWithMaintainerInfo = discussions.map((disc) => {
      const hasMaintainerResponse = disc.comments?.nodes?.some((comment) => {
        // Check if the top-level comment is from a maintainer
        if (MAINTAINER_ASSOCIATIONS.includes(comment.authorAssociation)) {
          return true;
        }
        // Check if any reply within this comment thread is from a maintainer
        return comment.replies?.nodes?.some(
          (reply) => MAINTAINER_ASSOCIATIONS.includes(reply.authorAssociation)
        ) ?? false;
      }) ?? false;

      return {
        number: disc.number,
        title: disc.title,
        author: { login: disc.author?.login || 'unknown' },
        createdAt: disc.createdAt,
        category: { name: disc.category?.name || 'General' },
        url: disc.url,
        answerChosenAt: disc.answer ? new Date().toISOString() : null,
        hasMaintainerResponse,
      };
    });

    // Filter out discussions with maintainer responses if option is enabled
    if (filterOptions.excludeMaintainerResponded) {
      return discussionsWithMaintainerInfo.filter((disc) => !disc.hasMaintainerResponse);
    }

    return discussionsWithMaintainerInfo;
  } catch (error) {
    console.error('Failed to fetch discussions via GraphQL:', error);
    // Fallback to REST API (can't check maintainer responses in this path)
    try {
      const result = await execGitHub([
        'api',
        `repos/${repoConfig.fullName}/discussions`,
        '--jq', '[.[] | select(.answer == null) | {number, title, author: .user.login, createdAt: .created_at, category: .category.name, url: .html_url, answerChosenAt: .answer_chosen_at}] | .[0:50]'
      ]);
      const discussions = JSON.parse(result || '[]');
      // REST API fallback doesn't have comment data, so we can't determine maintainer responses
      return discussions.map((d: Record<string, unknown>) => ({ ...d, hasMaintainerResponse: false }));
    } catch {
      // If discussions API fails, return empty array
      console.error('Discussions API not available');
      return [];
    }
  }
}

// Fetch full issue details (with body)
export async function fetchIssueDetails(issueNumber: number): Promise<GitHubIssue> {
  const repoConfig = getCachedRepoConfig();

  const result = await execGitHub([
    'issue', 'view',
    String(issueNumber),
    '--repo', repoConfig.fullName,
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
  const repoConfig = getCachedRepoConfig();

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
        comments(first: 20) {
          nodes {
            author { login }
            authorAssociation
            replies(first: 10) {
              nodes {
                author { login }
                authorAssociation
              }
            }
          }
        }
      }
    }
  }
  `;

  const result = await execGitHub([
    'api', 'graphql',
    '-f', `query=${query}`,
    '-f', `owner=${repoConfig.owner}`,
    '-f', `name=${repoConfig.name}`,
    '-F', `number=${discussionNumber}`
  ]);

  const data = JSON.parse(result);
  const disc = data.data?.repository?.discussion;

  if (!disc) {
    throw new Error(`Discussion #${discussionNumber} not found`);
  }

  const hasMaintainerResponse = disc.comments?.nodes?.some(
    (comment: { authorAssociation: string; replies?: { nodes: { authorAssociation: string }[] } }) => {
      // Check if the top-level comment is from a maintainer
      if (MAINTAINER_ASSOCIATIONS.includes(comment.authorAssociation)) {
        return true;
      }
      // Check if any reply within this comment thread is from a maintainer
      return comment.replies?.nodes?.some(
        (reply) => MAINTAINER_ASSOCIATIONS.includes(reply.authorAssociation)
      ) ?? false;
    }
  ) ?? false;

  return {
    number: disc.number,
    title: disc.title,
    author: { login: disc.author?.login || 'unknown' },
    createdAt: disc.createdAt,
    category: { name: disc.category?.name || 'General' },
    url: disc.url,
    body: disc.body || '',
    answerChosenAt: disc.answer ? new Date().toISOString() : null,
    hasMaintainerResponse,
  };
}

let labelCache: string[] | null = null;
let labelCacheTime = 0;
const LABEL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchRepoLabels(): Promise<string[]> {
  const repoConfig = getCachedRepoConfig();

  // Cache labels for 5 minutes to avoid repeated API calls
  if (labelCache && Date.now() - labelCacheTime < LABEL_CACHE_TTL) {
    return labelCache;
  }

  const result = await execGitHub([
    'label', 'list',
    '--repo', repoConfig.fullName,
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
  const repoConfig = getCachedRepoConfig();

  // Validate label exists (prevent injection)
  const validLabels = await fetchRepoLabels();
  if (!validLabels.includes(label)) {
    throw new Error(`Invalid label: ${label}`);
  }

  await execGitHub([
    'issue', 'edit',
    String(issueNumber),
    '--repo', repoConfig.fullName,
    '--add-label', label
  ]);
}

export async function removeLabel(issueNumber: number, label: string): Promise<void> {
  const repoConfig = getCachedRepoConfig();

  await execGitHub([
    'issue', 'edit',
    String(issueNumber),
    '--repo', repoConfig.fullName,
    '--remove-label', label
  ]);
}

export async function setProjectStatus(issueNumber: number, status: string): Promise<void> {
  const repoConfig = getCachedRepoConfig();
  const projectConfig = getProjectConfig(repoConfig);

  if (!projectConfig.mainProjectName) {
    throw new Error('No main project configured for this repository');
  }

  // Update the Status field in the main project
  try {
    // Get project ID and field ID (would be cached in production)
    const projectQuery = `
    query {
      repository(owner: "${repoConfig.owner}", name: "${repoConfig.name}") {
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

    const mainProject: ProjectV2 | undefined = data.data?.repository?.projectsV2?.nodes?.find(
      (p: ProjectV2) => p.title === projectConfig.mainProjectName
    );

    if (!mainProject) {
      throw new Error(`Project "${projectConfig.mainProjectName}" not found`);
    }

    const statusField = mainProject.fields?.nodes?.find(
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
  const repoConfig = getCachedRepoConfig();

  const searchQuery = searchTerms.join(' OR ');
  const result = await execGitHub([
    'issue', 'list',
    '--repo', repoConfig.fullName,
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

// Fetch repository metadata from GitHub API
export async function fetchRepoMetadata(): Promise<{ description: string | null; topics: string[] }> {
  const repoConfig = getCachedRepoConfig();

  try {
    const result = await execGitHub([
      'api',
      `repos/${repoConfig.fullName}`,
      '--jq', '{description: .description, topics: .topics}'
    ]);

    const data = JSON.parse(result);
    return {
      description: data.description || null,
      topics: data.topics || [],
    };
  } catch (error) {
    console.error('Failed to fetch repo metadata:', error);
    return { description: null, topics: [] };
  }
}

// Initialize GitHub module - call after repo config is initialized
export function initGitHub(): void {
  // Clear label cache when switching repos
  labelCache = null;
  labelCacheTime = 0;

  // Verify auth
  verifyGitHubAuth().catch(console.error);
}
