import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import type { RepoConfig } from './config.js';

export interface SetupCheckResult {
	name: string;
	status: 'pass' | 'fail' | 'warn';
	message: string;
	details?: string;
	fixCommand?: string;
}

export interface SetupCheckResponse {
	checks: SetupCheckResult[];
	allPassed: boolean;
	hasWarnings: boolean;
	hasCriticalFailures: boolean;
}

/**
 * Execute a command and return stdout/stderr
 */
async function execCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	return new Promise((resolve) => {
		const proc = spawn(command, args);
		let stdout = '';
		let stderr = '';

		proc.stdout?.on('data', (data: Buffer) => {
			stdout += data.toString();
		});

		proc.stderr?.on('data', (data: Buffer) => {
			stderr += data.toString();
		});

		proc.on('close', (code) => {
			resolve({ stdout, stderr, exitCode: code ?? 1 });
		});

		proc.on('error', () => {
			resolve({ stdout: '', stderr: `Command not found: ${command}`, exitCode: 127 });
		});
	});
}

/**
 * Check if Claude Code CLI is installed and accessible
 */
async function checkClaudeCodeCli(): Promise<SetupCheckResult> {
	const result = await execCommand('claude', ['--version']);

	if (result.exitCode === 127) {
		return {
			name: 'Claude Code CLI',
			status: 'fail',
			message: 'Claude Code CLI not installed or not in PATH',
			details: 'The claude command is not available',
			fixCommand: 'npm install -g @anthropic-ai/claude-code',
		};
	}

	if (result.exitCode !== 0) {
		return {
			name: 'Claude Code CLI',
			status: 'fail',
			message: 'Claude Code CLI error',
			details: result.stderr || result.stdout,
		};
	}

	const version = result.stdout.trim();
	return {
		name: 'Claude Code CLI',
		status: 'pass',
		message: `Installed (${version})`,
	};
}

/**
 * Check if gh CLI is installed
 */
async function checkGhCliInstalled(): Promise<SetupCheckResult> {
	const result = await execCommand('gh', ['--version']);

	if (result.exitCode === 127) {
		return {
			name: 'GitHub CLI',
			status: 'fail',
			message: 'GitHub CLI (gh) not installed',
			details: 'The gh command is not available',
			fixCommand: 'brew install gh',
		};
	}

	if (result.exitCode !== 0) {
		return {
			name: 'GitHub CLI',
			status: 'fail',
			message: 'GitHub CLI error',
			details: result.stderr || result.stdout,
		};
	}

	const versionLine = result.stdout.split('\n')[0];
	return {
		name: 'GitHub CLI',
		status: 'pass',
		message: `Installed (${versionLine})`,
	};
}

/**
 * Check if gh CLI is authenticated
 */
async function checkGhCliAuth(): Promise<SetupCheckResult> {
	const result = await execCommand('gh', ['auth', 'status']);

	// gh auth status outputs to stderr on success
	const output = result.stdout + result.stderr;

	if (result.exitCode !== 0) {
		const notLogged = output.toLowerCase().includes('not logged');
		return {
			name: 'GitHub Authentication',
			status: 'fail',
			message: notLogged ? 'Not authenticated with GitHub' : 'Authentication check failed',
			details: output.trim(),
			fixCommand: 'gh auth login',
		};
	}

	// Extract account info from output
	const accountMatch = output.match(/Logged in to [^ ]+ account ([^\s(]+)/i);
	const account = accountMatch ? accountMatch[1] : 'unknown';

	return {
		name: 'GitHub Authentication',
		status: 'pass',
		message: `Authenticated as ${account}`,
	};
}

/**
 * Check if gh CLI has read:project scope for project board access
 */
async function checkGhProjectScope(repoConfig: RepoConfig): Promise<SetupCheckResult> {
	// Test scope by making a simple project query
	const testQuery = `query { repository(owner: "${repoConfig.owner}", name: "${repoConfig.name}") { projectsV2(first: 1) { nodes { id } } } }`;
	const result = await execCommand('gh', ['api', 'graphql', '-f', `query=${testQuery}`]);

	if (result.exitCode !== 0) {
		const output = result.stdout + result.stderr;

		if (output.includes('INSUFFICIENT_SCOPES') || output.includes('read:project')) {
			return {
				name: 'GitHub Project Scope',
				status: 'warn',
				message: 'Missing read:project scope',
				details: 'Without this scope, issue filtering will show all open issues instead of only intake items',
				fixCommand: 'gh auth refresh --scopes read:project',
			};
		}

		// Other error - could be network, permissions, etc.
		return {
			name: 'GitHub Project Scope',
			status: 'warn',
			message: 'Could not verify project access',
			details: output.trim().slice(0, 200),
		};
	}

	return {
		name: 'GitHub Project Scope',
		status: 'pass',
		message: 'read:project scope available',
	};
}

/**
 * Check if target repo is accessible
 */
function checkTargetRepo(targetRepoPath: string, repoConfig: RepoConfig): SetupCheckResult {
	if (!existsSync(targetRepoPath)) {
		return {
			name: 'Target Repository',
			status: 'fail',
			message: `Repository not found (${repoConfig.fullName})`,
			details: `Expected at: ${targetRepoPath}`,
			fixCommand: 'Set TARGET_REPO_PATH environment variable',
		};
	}

	// Check if it's a git repo
	const gitDir = resolve(targetRepoPath, '.git');
	if (!existsSync(gitDir)) {
		return {
			name: 'Target Repository',
			status: 'fail',
			message: 'Directory exists but is not a git repository',
			details: targetRepoPath,
		};
	}

	return {
		name: 'Target Repository',
		status: 'pass',
		message: `Found at ${targetRepoPath}`,
	};
}

/**
 * Check if CLAUDE.md exists in target repo
 */
function checkClaudeMdFile(targetRepoPath: string): SetupCheckResult {
	// Check for various locations where claude.md might be
	const possiblePaths = [
		resolve(targetRepoPath, 'skills', 'claude.md'),
		resolve(targetRepoPath, '.claude', 'CLAUDE.md'),
		resolve(targetRepoPath, 'CLAUDE.md'),
	];

	for (const path of possiblePaths) {
		if (existsSync(path)) {
			return {
				name: 'Claude Skills File',
				status: 'pass',
				message: `Found at ${path.replace(targetRepoPath, '.')}`,
			};
		}
	}

	return {
		name: 'Claude Skills File',
		status: 'warn',
		message: 'No CLAUDE.md file found',
		details: 'Follow-up analysis may not have full codebase context',
	};
}

export interface EnvironmentInfo {
	repo: {
		owner: string;
		name: string;
		fullName: string;
		url: string;
	};
	targetRepoPath: string;
	targetRepoExists: boolean;
	claudeSkillsFile: string | null;
	claudeCodeVersion: string | null;
	ghVersion: string | null;
	ghAuthUser: string | null;
	serverPort: string;
	nodeVersion: string;
}

/**
 * Get environment info for quick orientation
 */
export async function getEnvironmentInfo(targetRepoPath: string, repoConfig: RepoConfig): Promise<EnvironmentInfo> {
	// Get Claude Code version
	let claudeCodeVersion: string | null = null;
	try {
		const result = await execCommand('claude', ['--version']);
		if (result.exitCode === 0) {
			claudeCodeVersion = result.stdout.trim();
		}
	} catch {
		// CLI not available
	}

	// Get gh version
	let ghVersion: string | null = null;
	try {
		const result = await execCommand('gh', ['--version']);
		if (result.exitCode === 0) {
			ghVersion = result.stdout.split('\n')[0]?.replace('gh version ', '') || null;
		}
	} catch {
		// CLI not available
	}

	// Get gh auth user
	let ghAuthUser: string | null = null;
	try {
		const result = await execCommand('gh', ['auth', 'status']);
		const output = result.stdout + result.stderr;
		const accountMatch = output.match(/Logged in to [^ ]+ account ([^\s(]+)/i);
		if (accountMatch) {
			ghAuthUser = accountMatch[1];
		}
	} catch {
		// Not authenticated
	}

	// Check for Claude skills file
	let claudeSkillsFile: string | null = null;
	const possiblePaths = [
		{ path: resolve(targetRepoPath, 'skills', 'claude.md'), display: 'skills/claude.md' },
		{ path: resolve(targetRepoPath, '.claude', 'CLAUDE.md'), display: '.claude/CLAUDE.md' },
		{ path: resolve(targetRepoPath, 'CLAUDE.md'), display: 'CLAUDE.md' },
	];
	for (const { path, display } of possiblePaths) {
		if (existsSync(path)) {
			claudeSkillsFile = display;
			break;
		}
	}

	return {
		repo: {
			owner: repoConfig.owner,
			name: repoConfig.name,
			fullName: repoConfig.fullName,
			url: `https://github.com/${repoConfig.fullName}`,
		},
		targetRepoPath,
		targetRepoExists: existsSync(targetRepoPath),
		claudeSkillsFile,
		claudeCodeVersion,
		ghVersion,
		ghAuthUser,
		serverPort: process.env.PORT || '3001',
		nodeVersion: process.version,
	};
}

/**
 * Run all setup checks
 */
export async function runSetupChecks(targetRepoPath: string, repoConfig: RepoConfig): Promise<SetupCheckResponse> {
	const checks: SetupCheckResult[] = [];

	// Run CLI checks in parallel
	const [claudeResult, ghInstalledResult] = await Promise.all([
		checkClaudeCodeCli(),
		checkGhCliInstalled(),
	]);

	checks.push(claudeResult);
	checks.push(ghInstalledResult);

	// Only check gh auth if gh is installed
	if (ghInstalledResult.status === 'pass') {
		const authResult = await checkGhCliAuth();
		checks.push(authResult);

		// Only check project scope if authenticated
		if (authResult.status === 'pass') {
			const scopeResult = await checkGhProjectScope(repoConfig);
			checks.push(scopeResult);
		}
	}

	// Check target repo
	const repoResult = checkTargetRepo(targetRepoPath, repoConfig);
	checks.push(repoResult);

	// Only check claude.md if repo exists
	if (repoResult.status === 'pass') {
		const claudeMdResult = checkClaudeMdFile(targetRepoPath);
		checks.push(claudeMdResult);
	}

	const failedChecks = checks.filter((c) => c.status === 'fail');
	const warnChecks = checks.filter((c) => c.status === 'warn');

	return {
		checks,
		allPassed: failedChecks.length === 0 && warnChecks.length === 0,
		hasWarnings: warnChecks.length > 0,
		hasCriticalFailures: failedChecks.length > 0,
	};
}
