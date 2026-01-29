# triage-sidekick

GitHub issue triage dashboard with AI-powered analysis.

## Publishing to npm

1. Run `npm version patch|minor|major` (creates git commit and tag)
2. Run `npm publish` (runs build automatically via prepublishOnly)

Note: Ensure you're logged in with `npm login` if auth has expired.

## Development

- `npm run dev` - Start frontend and backend concurrently
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## Testing

Tests use Vitest with React Testing Library. Run `npm test` before committing.

### Test Structure

```
src/test/           # Test utilities
  fixtures.ts       # Factory functions: createTestItem(), createIntakeResponse()
  apiMock.ts        # mockApi() for mocking fetch in hook tests
  setup.ts          # Global test setup

src/types/__tests__/        # Pure function tests (formatAge, etc.)
src/hooks/__tests__/        # Hook tests (useIntakeQueue, useDemoMode, useAIFilter)
src/components/__tests__/   # Component tests (QueueList)
server/__tests__/           # Server tests (config parsing, API contracts, isAuthError)
```

### Testing Principles

- **Test contracts, not implementation**: Verify inputs/outputs, not mock call counts
- **Mock at module boundaries**: Use `mockApi()` for fetch, inject deps in `server/app.ts`
- **Test user-visible behavior**: Use `screen.getByText()`, not DOM structure queries

### Writing Tests

```typescript
// Use fixtures for test data
import { createTestItem } from '../../test/fixtures';
const item = createTestItem({ title: 'Bug report', labels: ['bug'] });

// Use mockApi for fetch mocking in hooks
import { mockApi, resetApiMock } from '../../test/apiMock';
mockApi({ '/api/intake': { issues: [], discussions: [] } });

// For API tests, use the testable app factory
import { createApp } from '../app.js';
const app = createApp(mockDeps);
```
