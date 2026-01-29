import express, { Express } from 'express';
import type { RepoConfig } from './config.js';
import type { IntakeConfig } from './intake-config.js';
import type { IntakeFilterOptions } from './github.js';

export interface AppDependencies {
  github: {
    fetchIntakeQueue: (filters: IntakeFilterOptions) => Promise<unknown>;
    fetchIssueDetails: (num: number) => Promise<unknown>;
    fetchDiscussionDetails: (num: number) => Promise<unknown>;
    applyLabel: (num: number, label: string) => Promise<void>;
    removeLabel: (num: number, label: string) => Promise<void>;
    setProjectStatus: (num: number, status: string) => Promise<void>;
    fetchRepoLabels: () => Promise<string[]>;
    searchDuplicates: (terms: string[], exclude?: number) => Promise<unknown[]>;
  };
  agent: {
    analyzeIssue: (issue: unknown, options: unknown, type: string) => Promise<unknown>;
    followUpAnalysis: (question: string, context: unknown, options: unknown) => Promise<string>;
    generateAIFilter: (query: string, labels: string[], options: unknown) => Promise<unknown>;
    AuthenticationRequiredError: new (msg?: string) => Error;
  };
  setupCheck: {
    runSetupChecks: (path: string, repo: unknown) => Promise<unknown>;
  };
  repoConfig: RepoConfig;
  intakeConfig: IntakeConfig;
  targetRepoPath: string;
  repoDescription?: string | null;
  claudeSettings?: unknown;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Config endpoint
  app.get('/api/config', (_req, res) => {
    res.json({
      repo: {
        owner: deps.repoConfig.owner,
        name: deps.repoConfig.name,
        fullName: deps.repoConfig.fullName,
        description: deps.repoDescription,
      },
      intakeCriteria: deps.intakeConfig.intakeCriteria,
    });
  });

  // Intake queue
  app.get('/api/intake', async (req, res) => {
    try {
      const filterOptions: IntakeFilterOptions = {
        excludeBacklogProject: req.query.excludeBacklogProject !== 'false',
        excludeMilestoned: req.query.excludeMilestoned !== 'false',
        excludeTriagedLabels: req.query.excludeTriagedLabels !== 'false',
        excludeStatusSet: req.query.excludeStatusSet !== 'false',
        excludeAnswered: req.query.excludeAnswered !== 'false',
        excludeMaintainerResponded: req.query.excludeMaintainerResponded !== 'false',
      };
      const result = await deps.github.fetchIntakeQueue(filterOptions);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch GitHub data' });
    }
  });

  // Issue details
  app.get('/api/issues/:number', async (req, res) => {
    try {
      const issue = await deps.github.fetchIssueDetails(parseInt(req.params.number));
      res.json(issue);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch issue details' });
    }
  });

  // Discussion details
  app.get('/api/discussions/:number', async (req, res) => {
    try {
      const discussion = await deps.github.fetchDiscussionDetails(parseInt(req.params.number));
      res.json(discussion);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch discussion details' });
    }
  });

  // Labels
  app.get('/api/labels', async (_req, res) => {
    try {
      const labels = await deps.github.fetchRepoLabels();
      res.json({ labels });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch labels' });
    }
  });

  // Apply/remove label
  app.post('/api/issues/:number/labels', async (req, res) => {
    const issueNumber = parseInt(req.params.number, 10);
    const { label, action } = req.body;

    if (!label || typeof label !== 'string') {
      return res.status(400).json({ error: 'Invalid label' });
    }

    if (action === 'add') {
      try {
        await deps.github.applyLabel(issueNumber, label);
        res.json({ success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update label';
        res.status(500).json({ error: message });
      }
    } else if (action === 'remove') {
      try {
        await deps.github.removeLabel(issueNumber, label);
        res.json({ success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update label';
        res.status(500).json({ error: message });
      }
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  });

  // Project status
  app.post('/api/issues/:number/status', async (req, res) => {
    const issueNumber = parseInt(req.params.number, 10);
    const { status } = req.body;

    if (!status || typeof status !== 'string') {
      return res.status(400).json({ error: 'Invalid status' });
    }

    try {
      await deps.github.setProjectStatus(issueNumber, status);
      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set status';
      res.status(500).json({ error: message });
    }
  });

  // Search duplicates
  app.post('/api/issues/search-duplicates', async (req, res) => {
    const { searchTerms, excludeNumber } = req.body;

    if (!Array.isArray(searchTerms) || searchTerms.length === 0) {
      return res.status(400).json({ error: 'Invalid search terms' });
    }

    try {
      const duplicates = await deps.github.searchDuplicates(searchTerms, excludeNumber || 0);
      res.json({ duplicates });
    } catch (error) {
      res.status(500).json({ error: 'Duplicate search failed' });
    }
  });

  // Analyze issue
  app.post('/api/issues/:number/analyze', async (req, res) => {
    const issueNumber = parseInt(req.params.number, 10);
    const { title, body, labels, type = 'full' } = req.body;

    try {
      const analysis = await deps.agent.analyzeIssue(
        { number: issueNumber, title, body, labels: labels || [] },
        { claudeSettings: deps.claudeSettings, repoConfig: deps.repoConfig, repoDescription: deps.repoDescription },
        type
      );
      res.json(analysis);
    } catch (error) {
      if (error instanceof deps.agent.AuthenticationRequiredError) {
        return res.status(401).json({ error: error.message, isAuthError: true });
      }
      res.status(500).json({ error: 'Analysis failed' });
    }
  });

  // AI filter
  app.post('/api/filters/ai', async (req, res) => {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({ error: 'Query is required' });
    }

    try {
      const labels = await deps.github.fetchRepoLabels();
      const criteria = await deps.agent.generateAIFilter(query, labels, { claudeSettings: deps.claudeSettings });
      res.json(criteria);
    } catch (error) {
      if (error instanceof deps.agent.AuthenticationRequiredError) {
        return res.status(401).json({ error: error.message, isAuthError: true });
      }
      res.status(500).json({ error: 'AI filter generation failed' });
    }
  });

  // Setup check
  app.get('/api/setup-check', async (_req, res) => {
    try {
      const result = await deps.setupCheck.runSetupChecks(deps.targetRepoPath, deps.repoConfig);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Setup check failed' });
    }
  });

  return app;
}
