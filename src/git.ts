import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { RepoRef } from './types.js';

export async function cloneTargetRepository(
  repo: RepoRef,
  token: string,
  defaultBranch: string,
  parentDirectory: string,
  remoteUrl = authenticatedGitHubRemoteUrl(repo.fullName, token)
): Promise<string> {
  const targetDirectory = path.join(parentDirectory, `${repo.fullName.replace(/[\\/]/g, '-')}`);
  await fs.rm(targetDirectory, { recursive: true, force: true });

  await runGit(
    [
      'clone',
      '--depth',
      '1',
      '--branch',
      defaultBranch,
      remoteUrl,
      targetDirectory
    ],
    parentDirectory,
    token
  );

  await runGit(['remote', 'set-url', 'origin', remoteUrl], targetDirectory, token);
  return targetDirectory;
}

export async function checkoutSyncBranch(targetDirectory: string, branch: string): Promise<void> {
  await runGitAllowFailure(['fetch', 'origin', `${branch}:refs/remotes/origin/${branch}`], targetDirectory);
  await runGit(['checkout', '-B', branch], targetDirectory);
}

export async function configureCommitter(
  targetDirectory: string,
  name = 'team-ai-sync[bot]',
  email = 'team-ai-sync[bot]@users.noreply.github.com'
): Promise<void> {
  await runGit(['config', 'user.name', name], targetDirectory);
  await runGit(['config', 'user.email', email], targetDirectory);
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
  const remoteHead = await getRemoteBranchHead(targetDirectory, branch);
  const lease = remoteHead ? `--force-with-lease=refs/heads/${branch}:${remoteHead}` : '--force-with-lease';
  await runGit(['push', lease, 'origin', `HEAD:${branch}`], targetDirectory);
}

async function getRemoteBranchHead(targetDirectory: string, branch: string): Promise<string | undefined> {
  const result = await runGitAllowFailure(['ls-remote', '--heads', 'origin', branch], targetDirectory);
  if (result.exitCode !== 0) {
    throw new Error(`git ls-remote failed: ${sanitize(result.stderr || result.stdout)}`);
  }

  const [sha] = result.stdout.trim().split(/\s+/);
  return sha || undefined;
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

function authenticatedGitHubRemoteUrl(fullName: string, token: string): string {
  return `https://x-access-token:${encodeURIComponent(token)}@github.com/${fullName}.git`;
}

function sanitize(value: string, secret?: string): string {
  return secret ? value.replaceAll(secret, '***').replaceAll(encodeURIComponent(secret), '***') : value;
}
