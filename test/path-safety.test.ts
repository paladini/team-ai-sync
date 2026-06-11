import { describe, expect, it } from 'vitest';
import { isExcluded, normalizeRepoPath } from '../src/path-safety.js';

describe('path safety', () => {
  it('normalizes repository paths', () => {
    expect(normalizeRepoPath('./.github\\instructions')).toBe('.github/instructions');
  });

  it('rejects absolute paths', () => {
    expect(() => normalizeRepoPath('/tmp/file')).toThrow('repository-relative');
    expect(() => normalizeRepoPath('C:\\tmp\\file')).toThrow('repository-relative');
  });

  it('rejects .git references', () => {
    expect(() => normalizeRepoPath('.git/config')).toThrow('must not reference .git');
  });

  it('matches exact paths, child paths, and globs', () => {
    expect(isExcluded('.github/instructions/legacy.md', ['.github/instructions/legacy.md'])).toBe(true);
    expect(isExcluded('.github/instructions/nested/file.md', ['.github/instructions/nested'])).toBe(true);
    expect(isExcluded('.github/instructions/foo.tmp', ['.github/**/*.tmp'])).toBe(true);
    expect(isExcluded('.github/instructions/foo.md', ['.github/**/*.tmp'])).toBe(false);
  });
});
