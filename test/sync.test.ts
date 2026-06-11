import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { syncFiles } from '../src/sync.js';
import type { SyncConfig } from '../src/types.js';

describe('syncFiles', () => {
  it('overwrites files and respects excludes', async () => {
    const { source, target } = await fixture();
    await write(source, '.editorconfig', 'source');
    await write(source, '.github/instructions/guide.md', 'guide');
    await write(source, '.github/instructions/legacy.md', 'source legacy');
    await write(target, '.editorconfig', 'target');
    await write(target, '.github/instructions/legacy.md', 'target legacy');

    const summary = await syncFiles(source, target, config({ exclude: ['.github/instructions/legacy.md'] }));

    await expect(read(target, '.editorconfig')).resolves.toBe('source');
    await expect(read(target, '.github/instructions/guide.md')).resolves.toBe('guide');
    await expect(read(target, '.github/instructions/legacy.md')).resolves.toBe('target legacy');
    expect(summary.copied).toContain('.editorconfig');
    expect(summary.skipped).toContain('.github/instructions/legacy.md');
  });

  it('skips existing files in skip mode', async () => {
    const { source, target } = await fixture();
    await write(source, '.editorconfig', 'source');
    await write(target, '.editorconfig', 'target');

    const summary = await syncFiles(source, target, config({ syncMode: 'skip', directories: [] }));

    await expect(read(target, '.editorconfig')).resolves.toBe('target');
    expect(summary.skipped).toContain('.editorconfig');
  });

  it('deletes orphan files inside configured directories only', async () => {
    const { source, target } = await fixture();
    await write(source, '.editorconfig', 'source');
    await write(source, '.github/instructions/guide.md', 'guide');
    await write(target, '.github/instructions/orphan.md', 'orphan');
    await write(target, '.github/instructions/keep.md', 'keep');
    await write(target, 'outside.md', 'outside');

    const summary = await syncFiles(
      source,
      target,
      config({ deleteOrphans: true, exclude: ['.github/instructions/keep.md'] })
    );

    await expect(read(target, '.github/instructions/guide.md')).resolves.toBe('guide');
    await expect(fs.access(path.join(target, '.github/instructions/orphan.md'))).rejects.toThrow();
    await expect(read(target, '.github/instructions/keep.md')).resolves.toBe('keep');
    await expect(read(target, 'outside.md')).resolves.toBe('outside');
    expect(summary.deleted).toContain('.github/instructions/orphan.md');
  });
});

function config(overrides: Partial<SyncConfig> = {}): SyncConfig {
  return {
    targetRepositories: ['org/repo'],
    syncMode: 'overwrite',
    deleteOrphans: false,
    files: ['.editorconfig'],
    directories: ['.github/instructions'],
    exclude: [],
    prOptions: {
      title: 'title',
      body: 'body',
      commitMessage: 'message',
      branch: 'branch',
      labels: [],
      userReviewers: [],
      teamReviewers: []
    },
    ...overrides
  };
}

async function fixture(): Promise<{ source: string; target: string }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'team-ai-sync-fixture-'));
  const source = path.join(root, 'source');
  const target = path.join(root, 'target');
  await fs.mkdir(source, { recursive: true });
  await fs.mkdir(target, { recursive: true });
  return { source, target };
}

async function write(root: string, repoPath: string, value: string): Promise<void> {
  const filePath = path.join(root, ...repoPath.split('/'));
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

async function read(root: string, repoPath: string): Promise<string> {
  return fs.readFile(path.join(root, ...repoPath.split('/')), 'utf8');
}
