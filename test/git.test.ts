import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkoutSyncBranch, commitAll, configureCommitter, pushBranch } from '../src/git.js';

describe('git orchestration', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'team-ai-sync-git-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('updates an existing remote sync branch from a fresh single-branch clone', async () => {
    const origin = path.join(tempRoot, 'origin.git');
    const seed = path.join(tempRoot, 'seed');
    const first = path.join(tempRoot, 'first');
    const second = path.join(tempRoot, 'second');
    const verify = path.join(tempRoot, 'verify');

    await git(['init', '--bare', origin], tempRoot);
    await git(['init', '-b', 'main', seed], tempRoot);
    await configureCommitter(seed);
    await fs.writeFile(path.join(seed, 'README.md'), '# Demo\n');
    await commitAll(seed, 'initial commit');
    await git(['remote', 'add', 'origin', origin], seed);
    await git(['push', '-u', 'origin', 'main'], seed);

    await git(['clone', '--branch', 'main', '--single-branch', origin, first], tempRoot);
    await checkoutSyncBranch(first, 'chore/team-ai-sync');
    await configureCommitter(first);
    await fs.writeFile(path.join(first, 'AGENTS.md'), 'first sync\n');
    await commitAll(first, 'sync branch');
    await pushBranch(first, 'chore/team-ai-sync');

    await git(['clone', '--branch', 'main', '--single-branch', origin, second], tempRoot);
    await checkoutSyncBranch(second, 'chore/team-ai-sync');
    await configureCommitter(second);
    await fs.writeFile(path.join(second, 'AGENTS.md'), 'second sync\n');
    await commitAll(second, 'sync branch');
    await pushBranch(second, 'chore/team-ai-sync');

    await git(['clone', '--branch', 'chore/team-ai-sync', origin, verify], tempRoot);
    await expect(fs.readFile(path.join(verify, 'AGENTS.md'), 'utf8')).resolves.toBe('second sync\n');
  });
});

async function git(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', reject);
    child.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve(stdout);
        return;
      }

      reject(new Error(`git ${args.join(' ')} failed: ${stderr || stdout}`));
    });
  });
}
