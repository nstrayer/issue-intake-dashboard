# Positron Issue Intake Dashboard

A visual dashboard for GitHub issue intake rotation, powered by Claude Code SDK.

---

## For Positron Maintainers: Getting Started

### Prerequisites

Before you begin, make sure you have:

1. **Node.js 18+** - Check with `node --version`
2. **GitHub CLI** - Check with `gh --version`
3. **AWS CLI** - Check with `aws --version`

### Step-by-Step Setup

#### 1. Clone the repository

```bash
# Clone to your positron-work directory (or wherever you keep Positron-related projects)
git clone https://github.com/nstrayer/issue-intake-dashboard.git
cd issue-intake-dashboard
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Authenticate with GitHub

The dashboard uses `gh` (GitHub CLI) to fetch issues and discussions. Make sure you're logged in:

```bash
# Check if already authenticated
gh auth status

# If not authenticated, log in:
gh auth login
```

When prompted, select:
- **GitHub.com** (not Enterprise)
- **HTTPS** protocol
- Authenticate with your browser

Verify you have access to the Positron repo:
```bash
gh repo view posit-dev/positron --json name
```

#### 4. Configure AWS credentials for Claude

The dashboard uses Claude via AWS Bedrock. You need valid AWS credentials:

```bash
# Option A: SSO login (recommended for Posit employees)
aws sso login

# Option B: If you have access keys configured
aws configure
```

Verify your credentials work:
```bash
aws sts get-caller-identity
```

You should see output with your Account ID and ARN.

#### 5. Start the dashboard

```bash
npm run dev
```

This starts both:
- **Frontend** at http://localhost:3000
- **Backend** at http://localhost:3001

Open http://localhost:3000 in your browser.

#### 6. Verify your setup (optional)

Click the **"Verify Setup"** button in the app header. This runs automated checks for:
- Node.js version
- GitHub CLI authentication
- AWS credentials
- Access to the Positron repository

If any check fails, the modal shows the specific issue and a **copy-able fix command** you can run in your terminal. After fixing, click "Re-run Checks" to confirm.

Once all checks pass, click "Let's get caught up" to start the intake analysis.

---

## What This Tool Does

- Visual dashboard for Positron issue intake rotation
- Uses the same Claude-powered analysis as the CLI `/positron-intake-rotation` skill
- Streams real-time analysis of open issues, discussions, and unlabeled items
- Provides one-click actions to label issues and set triage status
- Supports follow-up questions for deeper investigation

## Requirements Summary

- **Node.js 18+**
- **GitHub CLI** (`gh`) authenticated with `posit-dev/positron` repo access
- **AWS credentials** configured for Bedrock access

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

```bash
# Run frontend only
npm run dev:frontend

# Run backend only
npm run dev:backend

# Run both (default)
npm run dev

# Type check
npx tsc --noEmit

# Build for production
npm run build
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

**Fix:** Check the terminal where you ran `npm run dev`. You should see:
```
Checking AWS credentials...
✓ AWS credentials discovered
  Account: 123456789012
  ARN: arn:aws:iam::123456789012:user/yourname
```

If you don't see this, run `aws sso login` and restart the server.

#### "No issues found" or empty results

**Cause:** GitHub CLI not authenticated or doesn't have repo access.

**Fix:**
```bash
gh auth login
# Then verify:
gh repo view posit-dev/positron --json name
```

#### Page won't load / connection refused

**Cause:** Backend server not running.

**Fix:** Check the terminal for errors. Make sure both servers started:
```
[frontend] VITE v6.0.7  ready in 500ms
[backend]  Server running on port 3001
```

#### SSO session expired

**Cause:** AWS SSO tokens expire after a period of inactivity.

**Fix:**
```bash
aws sso login
# Then restart the dev server
npm run dev
```

#### WebSocket disconnects / analysis stops mid-stream

**Cause:** Backend crashed or timed out.

**Fix:** Check terminal for error messages. Restart with `npm run dev`.

## Environment Variables (Optional)

The server auto-discovers credentials, but you can override with a `.env` file:

```bash
# Only needed if automatic discovery doesn't work
CLAUDE_CODE_USE_BEDROCK=1
AWS_REGION=us-east-1
AWS_PROFILE=my-custom-profile

# Server port (default: 3001)
PORT=3001
```
