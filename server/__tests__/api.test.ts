import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp, AppDependencies } from '../app.js';

describe('API Contracts', () => {
  // Create mock dependencies - we test the API contract, not the implementations
  const createMockDeps = (): AppDependencies => ({
    github: {
      fetchIntakeQueue: vi.fn().mockResolvedValue({ issues: [], discussions: [], warnings: [] }),
      fetchIssueDetails: vi.fn().mockResolvedValue({ number: 1, title: 'Test' }),
      fetchDiscussionDetails: vi.fn().mockResolvedValue({ number: 1, title: 'Test' }),
      applyLabel: vi.fn().mockResolvedValue(undefined),
      removeLabel: vi.fn().mockResolvedValue(undefined),
      setProjectStatus: vi.fn().mockResolvedValue(undefined),
      fetchRepoLabels: vi.fn().mockResolvedValue(['bug', 'feature']),
      searchDuplicates: vi.fn().mockResolvedValue([]),
    },
    agent: {
      analyzeIssue: vi.fn().mockResolvedValue({ summary: 'Test', suggestedLabels: [] }),
      followUpAnalysis: vi.fn().mockResolvedValue('Response'),
      generateAIFilter: vi.fn().mockResolvedValue({ criteria: {}, explanation: 'Filter applied' }),
      AuthenticationRequiredError: class extends Error {
        constructor(msg?: string) { super(msg || 'Auth required'); this.name = 'AuthenticationRequiredError'; }
      },
    },
    setupCheck: {
      runSetupChecks: vi.fn().mockResolvedValue({ allPassed: true, checks: [] }),
    },
    repoConfig: { owner: 'test', name: 'repo', fullName: 'test/repo' },
    intakeConfig: { intakeCriteria: 'Test criteria', version: 1 },
    targetRepoPath: '/path/to/repo',
  });

  let deps: AppDependencies;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    deps = createMockDeps();
    app = createApp(deps);
  });

  describe('GET /api/health', () => {
    it('returns 200 with ok status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /api/config', () => {
    it('returns repo and intake configuration', async () => {
      const res = await request(app).get('/api/config');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('repo');
      expect(res.body).toHaveProperty('intakeCriteria');
      expect(res.body.repo.fullName).toBe('test/repo');
    });
  });

  describe('GET /api/intake', () => {
    it('returns queue data on success', async () => {
      deps.github.fetchIntakeQueue = vi.fn().mockResolvedValue({
        issues: [{ number: 1 }],
        discussions: [],
        warnings: [],
      });

      const res = await request(app).get('/api/intake');

      expect(res.status).toBe(200);
      expect(res.body.issues).toHaveLength(1);
    });

    it('returns 500 when fetch fails', async () => {
      deps.github.fetchIntakeQueue = vi.fn().mockRejectedValue(new Error('API down'));

      const res = await request(app).get('/api/intake');

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/labels', () => {
    it('returns array of labels', async () => {
      deps.github.fetchRepoLabels = vi.fn().mockResolvedValue(['bug', 'feature', 'enhancement']);

      const res = await request(app).get('/api/labels');

      expect(res.status).toBe(200);
      expect(res.body.labels).toHaveLength(3);
    });
  });

  describe('POST /api/issues/:number/labels', () => {
    it('returns 400 when label is missing', async () => {
      const res = await request(app)
        .post('/api/issues/123/labels')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/label/i);
    });

    it('returns 400 for invalid action', async () => {
      const res = await request(app)
        .post('/api/issues/123/labels')
        .send({ label: 'bug', action: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/action/i);
    });

    it('returns success when label applied', async () => {
      const res = await request(app)
        .post('/api/issues/123/labels')
        .send({ label: 'bug', action: 'add' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns success when label removed', async () => {
      const res = await request(app)
        .post('/api/issues/123/labels')
        .send({ label: 'bug', action: 'remove' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 500 with error message on failure', async () => {
      deps.github.applyLabel = vi.fn().mockRejectedValue(new Error('Invalid label: bug'));

      const res = await request(app)
        .post('/api/issues/123/labels')
        .send({ label: 'bug', action: 'add' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Invalid label: bug');
    });
  });

  describe('POST /api/issues/:number/status', () => {
    it('returns 400 when status is missing', async () => {
      const res = await request(app)
        .post('/api/issues/123/status')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status/i);
    });

    it('returns success when status is set', async () => {
      const res = await request(app)
        .post('/api/issues/123/status')
        .send({ status: 'Triage' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/issues/search-duplicates', () => {
    it('returns 400 when searchTerms missing', async () => {
      const res = await request(app)
        .post('/api/issues/search-duplicates')
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 400 when searchTerms is empty array', async () => {
      const res = await request(app)
        .post('/api/issues/search-duplicates')
        .send({ searchTerms: [] });

      expect(res.status).toBe(400);
    });

    it('returns array of potential duplicates', async () => {
      deps.github.searchDuplicates = vi.fn().mockResolvedValue([
        { number: 100, title: 'Similar issue' },
      ]);

      const res = await request(app)
        .post('/api/issues/search-duplicates')
        .send({ searchTerms: ['error', 'crash'], excludeNumber: 123 });

      expect(res.status).toBe(200);
      expect(res.body.duplicates).toHaveLength(1);
    });
  });

  describe('POST /api/issues/:number/analyze', () => {
    it('returns analysis on success', async () => {
      deps.agent.analyzeIssue = vi.fn().mockResolvedValue({
        summary: 'Bug analysis',
        suggestedLabels: ['bug'],
      });

      const res = await request(app)
        .post('/api/issues/123/analyze')
        .send({ title: 'Bug', body: 'Description', type: 'full' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('summary');
    });

    it('returns 401 with isAuthError flag on auth failure', async () => {
      deps.agent.analyzeIssue = vi.fn().mockRejectedValue(
        new deps.agent.AuthenticationRequiredError('Please sign in')
      );

      const res = await request(app)
        .post('/api/issues/123/analyze')
        .send({ title: 'Test', body: 'Test' });

      expect(res.status).toBe(401);
      expect(res.body.isAuthError).toBe(true);
    });

    it('returns 500 on other errors', async () => {
      deps.agent.analyzeIssue = vi.fn().mockRejectedValue(new Error('Unknown'));

      const res = await request(app)
        .post('/api/issues/123/analyze')
        .send({ title: 'Test', body: 'Test' });

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/filters/ai', () => {
    it('returns 400 when query is missing', async () => {
      const res = await request(app)
        .post('/api/filters/ai')
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 400 when query is empty string', async () => {
      const res = await request(app)
        .post('/api/filters/ai')
        .send({ query: '   ' });

      expect(res.status).toBe(400);
    });

    it('returns filter criteria on success', async () => {
      deps.agent.generateAIFilter = vi.fn().mockResolvedValue({
        criteria: { labelsIncludeAny: ['bug'] },
        explanation: 'Filtering for bugs',
      });

      const res = await request(app)
        .post('/api/filters/ai')
        .send({ query: 'show me bugs' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('criteria');
      expect(res.body).toHaveProperty('explanation');
    });

    it('returns 401 on auth error', async () => {
      deps.agent.generateAIFilter = vi.fn().mockRejectedValue(
        new deps.agent.AuthenticationRequiredError('Auth required')
      );

      const res = await request(app)
        .post('/api/filters/ai')
        .send({ query: 'test' });

      expect(res.status).toBe(401);
      expect(res.body.isAuthError).toBe(true);
    });
  });

  describe('GET /api/setup-check', () => {
    it('returns setup check results', async () => {
      deps.setupCheck.runSetupChecks = vi.fn().mockResolvedValue({
        allPassed: true,
        checks: [{ name: 'gh', status: 'pass' }],
      });

      const res = await request(app).get('/api/setup-check');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('allPassed');
    });

    it('returns 500 when checks fail to run', async () => {
      deps.setupCheck.runSetupChecks = vi.fn().mockRejectedValue(new Error('Failed'));

      const res = await request(app).get('/api/setup-check');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/issues/:number', () => {
    it('returns issue details on success', async () => {
      deps.github.fetchIssueDetails = vi.fn().mockResolvedValue({
        number: 123,
        title: 'Test issue',
        body: 'Description',
      });

      const res = await request(app).get('/api/issues/123');

      expect(res.status).toBe(200);
      expect(res.body.number).toBe(123);
    });

    it('returns 500 on failure', async () => {
      deps.github.fetchIssueDetails = vi.fn().mockRejectedValue(new Error('Not found'));

      const res = await request(app).get('/api/issues/999');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/discussions/:number', () => {
    it('returns discussion details on success', async () => {
      deps.github.fetchDiscussionDetails = vi.fn().mockResolvedValue({
        number: 456,
        title: 'Test discussion',
      });

      const res = await request(app).get('/api/discussions/456');

      expect(res.status).toBe(200);
      expect(res.body.number).toBe(456);
    });
  });
});
