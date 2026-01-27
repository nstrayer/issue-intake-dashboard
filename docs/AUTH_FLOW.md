# Authentication Flow

## Overview

This dashboard uses the **Claude Code SDK** (`@anthropic-ai/claude-code`) to interact with Claude. Authentication is handled by Claude Code's built-in OAuth flow.

## Pre-Authentication Required

**Before using this app, you must authenticate Claude Code by running `claude` in your terminal.**

When you run `claude` for the first time (or when your auth expires), a browser window will open to authenticate with claude.ai. Once authenticated, the tokens are cached and the dashboard can use them.

## How It Works

1. **First time setup**: Run `claude` in your terminal
2. **Browser opens**: Complete the OAuth flow in your browser
3. **Tokens cached**: Claude Code stores auth tokens locally
4. **App works**: The dashboard SDK uses the cached tokens

## If You See "Authentication Required" Error

If the dashboard shows an error like:

> Claude Code authentication required. Please run "claude" in your terminal to authenticate, then try again.

This means:
- You haven't authenticated Claude Code yet, OR
- Your authentication has expired

**To fix**: Open a terminal and run:
```bash
claude
```

Complete the browser OAuth flow, then refresh the dashboard and try again.

## Technical Details

The Claude Code SDK spawns the CLI as a subprocess. When the subprocess needs authentication, it outputs interactive prompts that break the SDK's JSON protocol. By requiring pre-authentication, we ensure the CLI has valid cached tokens and doesn't need to show interactive prompts.

## Authentication Methods Supported

The dashboard supports whatever authentication method you've configured for Claude Code:

### Standard OAuth (Default)
- Authenticate via claude.ai browser flow
- Tokens cached locally by Claude Code

### AWS Bedrock
If you have `CLAUDE_CODE_USE_BEDROCK=1` in your environment, the SDK uses Bedrock authentication instead.

### Google Vertex AI
If you have `CLAUDE_CODE_USE_VERTEX=1` in your environment, the SDK uses Vertex authentication instead.

## Troubleshooting

### "spawn node ENOENT" error
The SDK couldn't find Node.js. This usually means the `PATH` environment variable wasn't passed correctly. Ensure you're not passing a custom `env` option to `query()` that replaces `process.env`.

### Authentication expires frequently
Run `claude` periodically to refresh your tokens, or consider setting up an API key for long-running deployments.

### Can't open browser
If you're running in a headless environment, you'll need to authenticate on a machine with a browser first, then copy the auth tokens, or use an API key (`ANTHROPIC_API_KEY`) instead of OAuth.
