#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Colors for output
const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { repo: null, help: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--repo' || arg === '-r') {
      result.repo = args[i + 1];
      i++;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg.startsWith('--repo=')) {
      result.repo = arg.slice('--repo='.length);
    }
  }

  return result;
}

// Parse repo from various URL formats
function parseRepoIdentifier(input) {
  if (!input) return null;

  // Direct owner/name format
  const directMatch = input.match(/^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (directMatch) {
    return `${directMatch[1]}/${directMatch[2]}`;
  }

  // SSH format: git@github.com:owner/repo.git
  const sshMatch = input.match(/git@github\.com:([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+?)(\.git)?$/);
  if (sshMatch) {
    return `${sshMatch[1]}/${sshMatch[2]}`;
  }

  // HTTPS format: https://github.com/owner/repo
  const httpsMatch = input.match(/https:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+?)(\.git)?$/);
  if (httpsMatch) {
    return `${httpsMatch[1]}/${httpsMatch[2]}`;
  }

  return null;
}

// Detect repo from git remote
function detectRepoFromGit() {
  try {
    const remoteUrl = execSync('git remote get-url origin 2>/dev/null', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return parseRepoIdentifier(remoteUrl);
  } catch {
    return null;
  }
}

// Get repo config with priority: CLI flag > git remote > env var > default
function getRepoConfig(cliArgs) {
  // 1. CLI --repo flag (highest priority)
  if (cliArgs.repo) {
    const parsed = parseRepoIdentifier(cliArgs.repo);
    if (parsed) {
      return { repo: parsed, source: 'CLI flag' };
    }
    console.error(`${colors.red}Error: Invalid repo format: ${cliArgs.repo}${colors.reset}`);
    console.error(`Expected format: owner/name, git@github.com:owner/name.git, or https://github.com/owner/name`);
    process.exit(1);
  }

  // 2. Auto-detect from git remote
  const gitRepo = detectRepoFromGit();
  if (gitRepo) {
    return { repo: gitRepo, source: 'git remote' };
  }

  // 3. Environment variable
  const envRepo = process.env.GITHUB_REPO;
  if (envRepo) {
    const parsed = parseRepoIdentifier(envRepo);
    if (parsed) {
      return { repo: parsed, source: 'GITHUB_REPO env' };
    }
  }

  // 4. Default for backward compatibility
  return { repo: 'posit-dev/positron', source: 'default' };
}

function showHelp() {
  console.log(`
${colors.cyan}Triage Sidekick${colors.reset}
Your AI-in-the-loop sidekick for GitHub issue triage

${colors.bold}Usage:${colors.reset}
  npx triage-sidekick [options]

${colors.bold}Options:${colors.reset}
  --repo, -r <owner/name>  GitHub repository to analyze
                           Accepts: owner/name, git@github.com:owner/name.git,
                           or https://github.com/owner/name
  --help, -h               Show this help message

${colors.bold}Repository Detection:${colors.reset}
  If --repo is not specified, the dashboard will:
  1. Try to detect the repo from git remote origin in the current directory
  2. Fall back to GITHUB_REPO environment variable
  3. Default to posit-dev/positron

${colors.bold}Examples:${colors.reset}
  ${colors.dim}# Run from a git repository (auto-detects)${colors.reset}
  cd ~/my-project && npx triage-sidekick

  ${colors.dim}# Specify a repository explicitly${colors.reset}
  npx triage-sidekick --repo facebook/react

  ${colors.dim}# Use environment variable${colors.reset}
  GITHUB_REPO=owner/repo npx triage-sidekick
`);
}

// Main
const cliArgs = parseArgs();

if (cliArgs.help) {
  showHelp();
  process.exit(0);
}

const { repo, source } = getRepoConfig(cliArgs);
const [owner, name] = repo.split('/');

console.log(`
${colors.cyan}╔════════════════════════════════════════════╗
║   Triage Sidekick                          ║
╚════════════════════════════════════════════╝${colors.reset}

${colors.dim}Repository:${colors.reset} ${colors.bold}${repo}${colors.reset} ${colors.dim}(${source})${colors.reset}
`);

// Check if dist exists (frontend needs to be built)
const distPath = join(rootDir, 'dist');
if (!existsSync(distPath)) {
  console.error(`${colors.red}Error: Frontend not built.${colors.reset}`);
  console.error(`Run ${colors.cyan}npm run build${colors.reset} first, or use ${colors.cyan}npm run dev${colors.reset} for development.`);
  process.exit(1);
}

const port = process.env.PORT || 3001;

console.log(`${colors.dim}Starting server...${colors.reset}`);
console.log(`${colors.green}Dashboard will be available at:${colors.reset} http://localhost:${port}\n`);

// Start the server with repo config passed via environment
const server = spawn('node', ['--import', 'tsx', 'server/index.ts'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    FORCE_COLOR: '1',
    PORT: String(port),
    GITHUB_REPO: repo,
  },
});

// Handle process cleanup
const cleanup = () => {
  server.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

server.on('error', (err) => {
  console.error(`${colors.red}Server error:${colors.reset}`, err.message);
  process.exit(1);
});

server.on('exit', (code) => {
  process.exit(code || 0);
});
