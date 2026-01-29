import { describe, it, expect } from 'vitest';
import { parseRepoIdentifier } from '../config.js';

describe('parseRepoIdentifier', () => {
  describe('valid inputs', () => {
    it.each([
      ['owner/repo', { owner: 'owner', name: 'repo', fullName: 'owner/repo' }],
      ['my-org/my-repo', { owner: 'my-org', name: 'my-repo', fullName: 'my-org/my-repo' }],
      ['git@github.com:owner/repo.git', { owner: 'owner', name: 'repo', fullName: 'owner/repo' }],
      ['https://github.com/owner/repo', { owner: 'owner', name: 'repo', fullName: 'owner/repo' }],
      ['https://github.com/owner/repo.git', { owner: 'owner', name: 'repo', fullName: 'owner/repo' }],
    ])('parses "%s"', (input, expected) => {
      expect(parseRepoIdentifier(input)).toEqual(expected);
    });
  });

  describe('invalid inputs', () => {
    it.each([
      [''],
      ['invalid'],
      ['just-one-part'],
      ['http://not-github.com/owner/repo'],
      ['/owner/repo'],
      ['owner/'],
    ])('returns null for "%s"', (input) => {
      expect(parseRepoIdentifier(input)).toBeNull();
    });
  });
});
