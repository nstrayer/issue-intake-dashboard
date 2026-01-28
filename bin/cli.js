#!/usr/bin/env node

import { spawn } from 'child_process';
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
};

console.log(`
${colors.cyan}╔════════════════════════════════════════════╗
║   Positron Issue Intake Dashboard          ║
╚════════════════════════════════════════════╝${colors.reset}
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

// Start the server (serves both API and static frontend)
const server = spawn('node', ['--import', 'tsx', 'server/index.ts'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: '1', PORT: String(port) },
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
