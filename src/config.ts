import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { normalizeRepoPath, resolveInside } from './path-safety.js';
import type { RepoRef, SyncConfig } from './types.js';

const repoNamePattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const defaultPrOptions = {
  title: 'chore: sync team AI assets',
  body: 'Synced from {{sourceRepo}} at {{sourceCommit}}.',
  commitMessage: 'chore(ai-assets): sync team assets',
  branch: 'chore/team-ai-sync',
  labels: ['automation', 'chore'],
  userReviewers: [],
  teamReviewers: []
};

const configSchema = z
  .object({
    targetRepositories: z.array(z.string().regex(repoNamePattern, 'Expected owner/repo')).min(1),
    syncMode: z.enum(['overwrite', 'skip']).default('overwrite'),
    deleteOrphans: z.boolean().default(false),
    files: z.array(z.string()).default([]),
    directories: z.array(z.string()).default([]),
    exclude: z.array(z.string()).default([]),
    prOptions: z
      .object({
        title: z.string().min(1).default('chore: sync team AI assets'),
        body: z.string().default('Synced from {{sourceRepo}} at {{sourceCommit}}.'),
        commitMessage: z.string().min(1).default('chore(ai-assets): sync team assets'),
        branch: z.string().min(1).default('chore/team-ai-sync'),
        labels: z.array(z.string()).default(['automation', 'chore']),
        userReviewers: z.array(z.string()).default([]),
        teamReviewers: z.array(z.string()).default([])
      })
      .default(defaultPrOptions)
  })
  .superRefine((value, context) => {
    if (value.files.length === 0 && value.directories.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'At least one file or directory must be configured.',
        path: ['files']
      });
    }
  });

export async function loadConfig(configPath: string, sourceRoot: string): Promise<SyncConfig> {
  const safeConfigPath = normalizeRepoPath(configPath, 'config-path');
  const absoluteConfigPath = resolveInside(sourceRoot, safeConfigPath);
  const raw = await fs.readFile(absoluteConfigPath, 'utf8');

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const parsed = configSchema.safeParse(parsedJson);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid sync config: ${details}`);
  }

  return {
    ...parsed.data,
    files: parsed.data.files.map((entry) => normalizeRepoPath(entry, 'files[]')),
    directories: parsed.data.directories.map((entry) => normalizeRepoPath(entry, 'directories[]')),
    exclude: parsed.data.exclude.map((entry) => normalizeRepoPath(entry, 'exclude[]')),
    prOptions: {
      ...parsed.data.prOptions,
      branch: normalizeBranchName(parsed.data.prOptions.branch)
    }
  };
}

export function parseRepo(fullName: string): RepoRef {
  if (!repoNamePattern.test(fullName)) {
    throw new Error(`Invalid repository name "${fullName}". Expected owner/repo.`);
  }

  const [owner, repo] = fullName.split('/');
  return { owner, repo, fullName };
}

export function renderTemplate(template: string, sourceRepo: string, sourceCommit: string): string {
  return template.replaceAll('{{sourceRepo}}', sourceRepo).replaceAll('{{sourceCommit}}', sourceCommit);
}

function normalizeBranchName(branch: string): string {
  const normalized = branch.trim();
  if (!normalized || normalized.startsWith('/') || normalized.endsWith('/') || normalized.includes('..')) {
    throw new Error(`Invalid pull request branch name: ${branch}`);
  }

  if (path.isAbsolute(normalized) || normalized.includes('\\') || normalized.split('/').includes('.git')) {
    throw new Error(`Invalid pull request branch name: ${branch}`);
  }

  return normalized;
}
