import { vi } from 'vitest';

type MockResponse = {
  ok?: boolean;
  status?: number;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
};

type MockConfig = {
  [urlPattern: string]: unknown | Error | MockResponse | (() => unknown);
};

/**
 * Simple fetch mock that matches URL patterns.
 * Returns the configured response for matching URLs.
 */
export function mockApi(config: MockConfig) {
  const mockFetch = vi.fn(async (url: string, _options?: RequestInit) => {
    // Find matching pattern
    for (const [pattern, response] of Object.entries(config)) {
      if (url.includes(pattern)) {
        // Function case - call it to get the response
        const resolvedResponse = typeof response === 'function' ? response() : response;

        // Promise case - await it
        const finalResponse = resolvedResponse instanceof Promise
          ? await resolvedResponse
          : resolvedResponse;

        // Error case
        if (finalResponse instanceof Error) {
          throw finalResponse;
        }

        // Full response object
        if (finalResponse && typeof finalResponse === 'object' && 'ok' in finalResponse) {
          return finalResponse as Response;
        }

        // Simple JSON response
        return {
          ok: true,
          status: 200,
          json: async () => finalResponse,
          text: async () => JSON.stringify(finalResponse),
        } as Response;
      }
    }

    // No match - return 404
    return {
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    } as Response;
  });

  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}

export function resetApiMock() {
  vi.unstubAllGlobals();
}
