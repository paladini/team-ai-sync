import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { RepoRef } from './types.js';

export async function cloneTargetRepository(
  repo: RepoRef,
  token: string,
  defaultBranch: string,
  parentDirectory: string
): Promise<string> {
  const targetDirectory = path.join(parentDirectory, `${repo.owner}-${repo.repo}`);
  await fs.rm(targetDirectory, { recursive: true, force: true });

  await runGit(
    [
      'clone',
      '--depth',
      '1',
      '--branch',
      defaultBranch,
      authenticatedRemoteUrl(repo.fullName, token),
      targetDirectory
    ],
    parentDirectory,
    token
  );

  await runGit(['remote', 'set-url', 'origin', authenticatedRemoteUrl(repo.fullName, token)], targetDirectory, token);
  return targetDirectory;
}

export async function checkoutSyncBranch(targetDirectory: string, branch: string): Promise<void> {
  await runGit(['checkout', '-B', branch], targetDirectory);
}

export async function configureCommitter(targetDirectory: string): Promise<void> {
  await runGit(['config', 'user.name', 'team-ai-sync[bot]'], targetDirectory);
  await runGit(['config', 'user.email', 'team-ai-sync[bot]@users.noreply.github.com'], targetDirectory);
}

export async function hasWorkingTreeChanges(targetDirectory: string): Promise<boolean> {
  const status = await runGit(['status', '--porcelain'], targetDirectory);
  return status.trim().length > 0;
}

export async function commitAll(targetDirectory: string, message: string): Promise<void> {
  await runGit(['add', '-A'], targetDirectory);
  const diffExit = await runGitAllowFailure(['diff', '--cached', '--quiet'], targetDirectory);
  if (diffExit.exitCode === 0) {
    return;
  }

  await runGit(['commit', '-m', message], targetDirectory);
}

export async function pushBranch(targetDirectory: string, branch: string): Promise<void> {
  await runGit(['push', '--force-with-lease', 'origin', `HEAD:${branch}`], targetDirectory);
}

async function runGit(args: string[], cwd: string, secret?: string): Promise<string> {
  const result = await runGitAllowFailure(args, cwd, secret);
  if (result.exitCode !== 0) {
    throw new Error(`git ${args[0]} failed: ${sanitize(result.stderr || result.stdout, secret)}`);
  }

  return result.stdout;
}

async function runGitAllowFailure(
  args: string[],
  cwd: string,
  secret?: string
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
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
      resolve({
        exitCode: exitCode ?? 1,
        stdout: sanitize(stdout, secret),
        stderr: sanitize(stderr, secret)
      });
    });
  });
}

function authenticatedRemoteUrl(fullName: string, token: string): string {
  return `https://x-access-token:${encodeURIComponent(token)}@github.com/${fullName}.git`;
}

function sanitize(value: string, secret?: string): string {
  return secret ? value.replaceAll(secret, '***') : value;
}
