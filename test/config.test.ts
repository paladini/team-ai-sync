import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig, parseProjectPath, parseRepo, renderTemplate } from '../src/config.js';

describe('config', () => {
  it('loads defaults and normalizes paths', async () => {
    const root = await tempDir();
    await fs.writeFile(
      path.join(root, 'sync-config.json'),
      JSON.stringify({
        targetRepositories: ['org/repo'],
        files: ['./.editorconfig']
      })
    );

    const config = await loadConfig('sync-config.json', root);

    expect(config.syncMode).toBe('overwrite');
    expect(config.deleteOrphans).toBe(false);
    expect(config.files).toEqual(['.editorconfig']);
    expect(config.prOptions.branch).toBe('chore/team-ai-sync');
    expect(config.prOptions.labels).toEqual(['automation', 'chore']);
  });

  it('rejects unsafe paths', async () => {
    const root = await tempDir();
    await fs.writeFile(
      path.join(root, 'sync-config.json'),
      JSON.stringify({
        targetRepositories: ['org/repo'],
        files: ['../secret']
      })
    );

    await expect(loadConfig('sync-config.json', root)).rejects.toThrow("must not include '..'");
  });

  it('rejects invalid repositories', async () => {
    expect(() => parseRepo('not-a-repo')).toThrow('Expected owner/repo');
  });

  it('accepts GitLab subgroup project paths in config', async () => {
    const root = await tempDir();
    await fs.writeFile(
      path.join(root, 'sync-config.json'),
      JSON.stringify({
        targetRepositories: ['group/subgroup/repo'],
        files: ['.editorconfig']
      })
    );

    const config = await loadConfig('sync-config.json', root);

    expect(config.targetRepositories).toEqual(['group/subgroup/repo']);
    expect(parseProjectPath('group/subgroup/repo')).toEqual({
      owner: 'group/subgroup',
      repo: 'repo',
      fullName: 'group/subgroup/repo'
    });
  });

  it('renders source placeholders', () => {
    expect(renderTemplate('From {{sourceRepo}} at {{sourceCommit}}', 'org/source', 'abc123')).toBe(
      'From org/source at abc123'
    );
  });
});

async function tempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'team-ai-sync-config-'));
}
