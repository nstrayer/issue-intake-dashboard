# Positron Issue Intake Dashboard

A visual dashboard for GitHub issue intake rotation, powered by Claude Code SDK.

## Quick Start

```bash
# From positron-work directory (sibling to positron/)
cd issue-intake-dashboard

# Install dependencies
npm install

# Ensure you have AWS credentials configured (one of):
#   - aws sso login          (if using SSO)
#   - aws configure          (for access keys)
#   - Already have ~/.aws/credentials

# Start development server
npm run dev
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
```

The server automatically discovers your existing AWS credentials - no manual `.env` setup needed.

## What This Tool Does

- Visual dashboard for Positron issue intake rotation
- Uses the same Claude-powered analysis as the CLI `/positron-intake-rotation` skill
- Streams real-time analysis of open issues, discussions, and unlabeled items
- Provides one-click actions to label issues and set triage status
- Supports follow-up questions for deeper investigation

## Requirements

- **Node.js 18+**
- **GitHub CLI** (`gh`) authenticated with `posit-dev/positron` repo access
- **AWS credentials** configured for Bedrock access (see Authentication below)

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

### "No AWS credentials found"

Run `aws sso login` or `aws configure` to set up credentials.

### "JSON parsing error" / Browser popup

AWS credentials not being passed correctly. Check server logs for credential discovery status. The server should show:
```
Checking AWS credentials...
✓ AWS credentials discovered
  Account: 123456789012
  ARN: arn:aws:iam::123456789012:user/yourname
```

### "No issues found"

Check that `gh auth status` shows you're logged into GitHub with access to `posit-dev/positron`.

### WebSocket disconnects

Backend may have crashed - check terminal for errors.

### SSO session expired

Run `aws sso login` again to refresh your session.

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
