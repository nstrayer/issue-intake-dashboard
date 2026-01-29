import { describe, it, expect } from 'vitest';
import { isAuthError } from '../agent.js';

describe('isAuthError', () => {
  describe('detects authentication errors', () => {
    it.each([
      ['User is not authenticated'],
      ['Authentication required to continue'],
      ['Your SSO token has expired'],
      ['SSO session expired'],
      ['Expired SSO credentials'],
      ['Unable to locate credentials'],
      ['Invalid credentials provided'],
      // JSON parsing error with auth prompt in output
      ['Unexpected token A in JSON at position 0: Attempting to authenticate...'],
    ])('returns true for: "%s"', (message) => {
      expect(isAuthError(new Error(message))).toBe(true);
    });
  });

  describe('ignores non-auth errors', () => {
    it.each([
      ['Network timeout'],
      ['Rate limit exceeded'],
      ['Invalid JSON response'],
      ['Connection refused'],
      ['File not found'],
      ['Permission denied'],
    ])('returns false for: "%s"', (message) => {
      expect(isAuthError(new Error(message))).toBe(false);
    });
  });

  describe('handles edge cases', () => {
    it('returns false for null', () => {
      expect(isAuthError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isAuthError(undefined)).toBe(false);
    });

    it('returns false for plain strings', () => {
      expect(isAuthError('not authenticated')).toBe(false);
    });

    it('returns false for numbers', () => {
      expect(isAuthError(401)).toBe(false);
    });

    it('returns false for empty objects', () => {
      expect(isAuthError({})).toBe(false);
    });
  });
});
