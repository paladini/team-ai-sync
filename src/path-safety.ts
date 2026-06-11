import path from 'node:path';
import { minimatch } from 'minimatch';

export function normalizeRepoPath(input: string, fieldName = 'path'): string {
  const raw = input.trim().replace(/\\/g, '/');

  if (!raw) {
    throw new Error(`${fieldName} must not be empty`);
  }

  if (path.posix.isAbsolute(raw) || path.win32.isAbsolute(input)) {
    throw new Error(`${fieldName} must be repository-relative: ${input}`);
  }

  const rawSegments = raw.split('/');
  if (rawSegments.includes('..')) {
    throw new Error(`${fieldName} must not include '..': ${input}`);
  }

  if (rawSegments.some((segment) => segment === '.git')) {
    throw new Error(`${fieldName} must not reference .git: ${input}`);
  }

  const normalized = path.posix.normalize(raw).replace(/^\.\//, '');
  if (normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
    throw new Error(`${fieldName} must point to a file or directory below the repository root: ${input}`);
  }

  return normalized;
}

export function resolveInside(root: string, repoPath: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, ...repoPath.split('/'));
  const relative = path.relative(resolvedRoot, resolvedPath);

  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Resolved path escaped source root: ${repoPath}`);
  }

  return resolvedPath;
}

export function isExcluded(repoPath: string, excludePatterns: string[]): boolean {
  const normalized = normalizeRepoPath(repoPath, 'candidate path');

  return excludePatterns.some((pattern) => {
    const normalizedPattern = normalizeRepoPath(pattern, 'exclude path');
    return (
      normalized === normalizedPattern ||
      normalized.startsWith(`${normalizedPattern}/`) ||
      minimatch(normalized, normalizedPattern, { dot: true }) ||
      minimatch(normalized, `${normalizedPattern}/**`, { dot: true })
    );
  });
}
