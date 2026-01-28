# Positron Issue Intake Dashboard

A visual dashboard for GitHub issue intake rotation, powered by Claude Code SDK.

---

## Quick Start

```bash
npx issue-intake-dashboard
```

That's it! Open http://localhost:3001 in your browser.

### Prerequisites

You need these tools installed and authenticated:

| Tool | Check | Setup |
|------|-------|-------|
| **Node.js 18+** | `node --version` | [nodejs.org](https://nodejs.org) |
| **GitHub CLI** | `gh auth status` | `gh auth login` |
| **AWS CLI** | `aws sts get-caller-identity` | `aws sso login` |

### First-time setup for Posit employees

```bash
# 1. Authenticate with GitHub (if not already)
gh auth login

# 2. Authenticate with AWS (if not already)
aws sso login

# 3. Run the dashboard
npx issue-intake-dashboard
```

---

## What This Tool Does

- Visual dashboard for Positron issue intake rotation
- Claude-powered analysis of open issues and discussions
- One-click actions to label issues and set triage status
- Follow-up questions for deeper investigation

## Authentication

### Automatic Credential Discovery

The server automatically discovers AWS credentials from the standard chain:

1. **Environment variables** - `AWS_ACCESS_KEY_ID`, etc.
2. **SSO sessions** - from `aws sso login` (cached in `~/.aws/sso/cache/`)
3. **Shared credentials** - `~/.aws/credentials` file
4. **Config profiles** - `~/.aws/config` file

If valid credentials are found, they're passed to the Claude Code subprocess, avoiding browser-based OAuth.

### Verifying Your Setup

```bash
# Check AWS credentials
aws sts get-caller-identity

# Check GitHub CLI
gh auth status
```

### If Automatic Discovery Fails

If you see "No AWS credentials found", configure credentials using one of:

```bash
# Option 1: SSO login (recommended for Posit employees)
aws sso login

# Option 2: Configure access keys
aws configure

# Option 3: Set environment variables
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  React + Vite Frontend                       │
│  ┌──────────────────────┐  ┌────────────────────────────┐   │
│  │   Intake Dashboard   │  │      Chat Interface        │   │
│  │  - Issue queue       │  │  - "Let's get caught up"   │   │
│  │  - Area breakdown    │  │  - Streaming responses     │   │
│  │  - Quick actions     │  │  - Follow-up questions     │   │
│  └──────────────────────┘  └────────────────────────────┘   │
│                            │ WebSocket                       │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                  Node.js Backend                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            Claude Code SDK Integration               │    │
│  │  - query() with intake system prompt                │    │
│  │  - Built-in tools: Read, Bash, Glob, Grep           │    │
│  │  - Session management for conversations             │    │
│  │  - Streams responses via WebSocket                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │     GitHub CLI (gh) / positron-intake-rotation      │    │
│  │  - Same scripts as intake skill                     │    │
│  │  - fetch_intake_issues.sh, fetch_discussions.sh     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

1. Frontend connects via WebSocket to backend
2. User clicks "Let's get caught up"
3. Backend spawns Claude Code SDK with intake prompt
4. SDK executes `gh` commands to fetch issues/discussions
5. Claude analyzes results and streams response back
6. Frontend renders markdown + parses structured data for tables/charts

## Development

If you want to modify the dashboard, clone the repo and run in dev mode:

```bash
git clone https://github.com/nstrayer/issue-intake-dashboard.git
cd issue-intake-dashboard
npm install
npm run dev
```

This starts:
- **Frontend** at http://localhost:3000 (with hot reload)
- **Backend** at http://localhost:3001

### Available scripts

```bash
npm run dev           # Run both frontend and backend
npm run dev:frontend  # Run frontend only
npm run dev:backend   # Run backend only
npm run build         # Build for production
npm run start         # Run production server
npx tsc --noEmit      # Type check
```

## Directory Structure

```
issue-intake-dashboard/
├── package.json              # Dependencies and scripts
├── vite.config.ts            # Vite configuration
├── index.html                # HTML entry point
├── server/
│   ├── index.ts              # Express + WebSocket server
│   ├── agent.ts              # Claude Code SDK integration
│   ├── auth.ts               # AWS credential discovery
│   └── prompts/
│       └── intake.ts         # Intake system prompt
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Main application component
│   ├── index.css             # Tailwind CSS
│   ├── components/
│   │   ├── ChatInterface/    # Main chat/interaction panel
│   │   ├── IssueQueue/       # List of issues without status
│   │   ├── QuickActions/     # Label/status action buttons
│   │   ├── AreaChart/        # Issues by area breakdown
│   │   └── StreamingMessage/ # Renders streamed Claude responses
│   ├── hooks/
│   │   ├── useAgentChat.ts   # WebSocket connection to backend
│   │   └── useIntakeData.ts  # Parsed intake data from chat
│   └── types/
│       └── intake.ts         # TypeScript types
└── scripts/                  # Symlinks to intake scripts
```

## Troubleshooting

### In-App Setup Check

The easiest way to diagnose issues is the **"Verify Setup"** button in the app header. It checks all dependencies and shows fix commands for any failures.

### Quick Diagnostic Commands

If the app won't load, run these in your terminal:

```bash
# Check Node.js version (needs 18+)
node --version

# Check GitHub CLI auth
gh auth status

# Check AWS credentials
aws sts get-caller-identity

# Test GitHub access to Positron
gh repo view posit-dev/positron --json name
```

### Common Issues

#### "No AWS credentials found"

**Cause:** AWS credentials not configured or expired.

**Fix:**
```bash
# For Posit employees using SSO:
aws sso login

# Or configure access keys:
aws configure
```

#### "JSON parsing error" / Browser popup appears

**Cause:** AWS credentials not being passed to Claude correctly.

**Fix:** Check the terminal output. You should see:
```
Loaded Claude Code settings with env config
Using Bedrock authentication
```

If you don't see this, run `aws sso login` and restart the dashboard.

#### "No issues found" or empty results

**Cause:** GitHub CLI not authenticated or doesn't have repo access.

**Fix:**
```bash
gh auth login
# Then verify:
gh repo view posit-dev/positron --json name
```

#### Page won't load / connection refused

**Cause:** Server not running.

**Fix:** Check the terminal for errors. You should see:
```
Server running on port 3001
```

#### SSO session expired

**Cause:** AWS SSO tokens expire after a period of inactivity.

**Fix:**
```bash
aws sso login
# Then restart the dashboard
npx issue-intake-dashboard
```

#### Analysis stops mid-stream

**Cause:** Server crashed or timed out.

**Fix:** Check terminal for error messages. Restart the dashboard.

## Environment Variables (Optional)

```bash
# Use a different port
PORT=8080 npx issue-intake-dashboard

# Point to a different positron repo location
POSITRON_REPO_PATH=/path/to/positron npx issue-intake-dashboard
```

For development, you can create a `.env` file:

```bash
CLAUDE_CODE_USE_BEDROCK=1
AWS_REGION=us-east-1
AWS_PROFILE=my-custom-profile
PORT=3001
```
