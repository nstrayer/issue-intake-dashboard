import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { type RepoConfig, getDefaultIntakeCriteria } from './config.js';

export interface IntakeConfig {
	intakeCriteria: string;
	version: number;
}

const CONFIG_VERSION = 1;

/**
 * Get the path to the user-specific config directory
 */
function getUserConfigDir(): string {
	return join(homedir(), '.config', 'issue-intake');
}

/**
 * Get the path to the user-specific config file for a repo
 */
function getUserConfigPath(repoConfig: RepoConfig): string {
	const configDir = getUserConfigDir();
	return join(configDir, `${repoConfig.owner}-${repoConfig.name}.json`);
}

/**
 * Get the path to the repo-local config file
 * This would be in the target repo's root if we have access to it
 */
function getRepoConfigPath(targetRepoPath?: string): string | null {
	if (!targetRepoPath || !existsSync(targetRepoPath)) {
		return null;
	}
	return join(targetRepoPath, '.issue-intake.json');
}

/**
 * Load intake config from multiple locations (priority order):
 * 1. .issue-intake.json in target repo root (team-shareable)
 * 2. ~/.config/issue-intake/{owner}-{repo}.json (user-specific)
 * 3. Default criteria based on repo
 */
export function loadIntakeConfig(repoConfig: RepoConfig, targetRepoPath?: string): IntakeConfig {
	// 1. Try repo-local config
	const repoConfigPath = getRepoConfigPath(targetRepoPath);
	if (repoConfigPath && existsSync(repoConfigPath)) {
		try {
			const content = readFileSync(repoConfigPath, 'utf-8');
			const config = JSON.parse(content) as Partial<IntakeConfig>;
			if (config.intakeCriteria) {
				console.log(`Loaded intake config from: ${repoConfigPath}`);
				return {
					intakeCriteria: config.intakeCriteria,
					version: config.version || CONFIG_VERSION,
				};
			}
		} catch (error) {
			console.warn(`Failed to load repo intake config: ${error}`);
		}
	}

	// 2. Try user-specific config
	const userConfigPath = getUserConfigPath(repoConfig);
	if (existsSync(userConfigPath)) {
		try {
			const content = readFileSync(userConfigPath, 'utf-8');
			const config = JSON.parse(content) as Partial<IntakeConfig>;
			if (config.intakeCriteria) {
				console.log(`Loaded intake config from: ${userConfigPath}`);
				return {
					intakeCriteria: config.intakeCriteria,
					version: config.version || CONFIG_VERSION,
				};
			}
		} catch (error) {
			console.warn(`Failed to load user intake config: ${error}`);
		}
	}

	// 3. Return default criteria
	return {
		intakeCriteria: getDefaultIntakeCriteria(repoConfig.fullName),
		version: CONFIG_VERSION,
	};
}

/**
 * Save intake config to user-specific location
 * We save to user config by default since repo config should be committed manually
 */
export function saveIntakeConfig(repoConfig: RepoConfig, config: IntakeConfig): void {
	const configDir = getUserConfigDir();

	// Ensure config directory exists
	if (!existsSync(configDir)) {
		mkdirSync(configDir, { recursive: true });
	}

	const configPath = getUserConfigPath(repoConfig);
	const content = JSON.stringify(
		{
			intakeCriteria: config.intakeCriteria,
			version: CONFIG_VERSION,
		},
		null,
		2
	);

	writeFileSync(configPath, content, 'utf-8');
	console.log(`Saved intake config to: ${configPath}`);
}

/**
 * Generate a template .issue-intake.json for teams to customize
 */
export function generateRepoConfigTemplate(repoConfig: RepoConfig): string {
	return JSON.stringify(
		{
			intakeCriteria: getDefaultIntakeCriteria(repoConfig.fullName),
			version: CONFIG_VERSION,
		},
		null,
		2
	);
}
