import { execSync } from 'child_process';

export interface RepoConfig {
	owner: string;
	name: string;
	fullName: string; // "owner/name"
	description?: string;
}

export interface IntakeConfig {
	criteria?: string; // Natural language intake criteria
	version?: number;
}

// Default repo for backward compatibility
const DEFAULT_REPO: RepoConfig = {
	owner: 'posit-dev',
	name: 'positron',
	fullName: 'posit-dev/positron',
};

// Default intake criteria per repo
const DEFAULT_INTAKE_CRITERIA: Record<string, string> = {
	'posit-dev/positron': "Exclude items in 'Positron Backlog' project. Exclude items with Status field set in 'Positron' project.",
};

const DEFAULT_GENERIC_CRITERIA = 'Show all open items without filtering by project status.';

/**
 * Parse a GitHub repo identifier from various URL formats
 * Supports: owner/name, git@github.com:owner/name.git, https://github.com/owner/name
 */
export function parseRepoIdentifier(input: string): RepoConfig | null {
	// Direct owner/name format
	const directMatch = input.match(/^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/);
	if (directMatch) {
		return {
			owner: directMatch[1],
			name: directMatch[2],
			fullName: `${directMatch[1]}/${directMatch[2]}`,
		};
	}

	// SSH format: git@github.com:owner/repo.git
	const sshMatch = input.match(/git@github\.com:([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+?)(\.git)?$/);
	if (sshMatch) {
		return {
			owner: sshMatch[1],
			name: sshMatch[2],
			fullName: `${sshMatch[1]}/${sshMatch[2]}`,
		};
	}

	// HTTPS format: https://github.com/owner/repo or https://github.com/owner/repo.git
	const httpsMatch = input.match(/https:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+?)(\.git)?$/);
	if (httpsMatch) {
		return {
			owner: httpsMatch[1],
			name: httpsMatch[2],
			fullName: `${httpsMatch[1]}/${httpsMatch[2]}`,
		};
	}

	return null;
}

/**
 * Detect repo from git remote in the current directory
 */
export function detectRepoFromGit(cwd?: string): RepoConfig | null {
	try {
		const remoteUrl = execSync('git remote get-url origin 2>/dev/null', {
			encoding: 'utf-8',
			cwd,
			stdio: ['pipe', 'pipe', 'pipe'],
		}).trim();

		if (remoteUrl) {
			return parseRepoIdentifier(remoteUrl);
		}
	} catch {
		// Not in a git repo or no origin remote
	}
	return null;
}

/**
 * Get repository configuration using priority order:
 * 1. GITHUB_REPO environment variable (set by CLI from --repo flag or git detection)
 * 2. Auto-detect from git remote in current directory
 * 3. Default to posit-dev/positron (backward compatibility)
 */
export function getRepoConfig(): RepoConfig {
	// Check environment variable (highest priority - set by CLI)
	const envRepo = process.env.GITHUB_REPO;
	if (envRepo) {
		const parsed = parseRepoIdentifier(envRepo);
		if (parsed) {
			return parsed;
		}
	}

	// Try auto-detection from git
	const gitRepo = detectRepoFromGit();
	if (gitRepo) {
		return gitRepo;
	}

	// Default for backward compatibility
	return DEFAULT_REPO;
}

/**
 * Get default intake criteria for a repository
 */
export function getDefaultIntakeCriteria(repoFullName: string): string {
	return DEFAULT_INTAKE_CRITERIA[repoFullName] || DEFAULT_GENERIC_CRITERIA;
}

/**
 * Check if this is the default Positron repository
 */
export function isDefaultPositronRepo(config: RepoConfig): boolean {
	return config.fullName === DEFAULT_REPO.fullName;
}

// Cached config loaded at startup
let cachedConfig: RepoConfig | null = null;

/**
 * Initialize and cache the repo config
 * Call this at server startup
 */
export function initRepoConfig(): RepoConfig {
	cachedConfig = getRepoConfig();
	return cachedConfig;
}

/**
 * Get the cached repo config (must call initRepoConfig first)
 */
export function getCachedRepoConfig(): RepoConfig {
	if (!cachedConfig) {
		throw new Error('Repo config not initialized. Call initRepoConfig() first.');
	}
	return cachedConfig;
}
