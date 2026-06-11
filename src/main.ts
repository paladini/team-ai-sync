import * as core from '@actions/core';
import * as github from '@actions/github';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig, parseRepo, renderTemplate } from './config.js';
import {
  checkoutSyncBranch,
  cloneTargetRepository,
  commitAll,
  configureCommitter,
  hasWorkingTreeChanges,
  pushBranch
} from './git.js';
import { createOrUpdatePullRequest, getDefaultBranch } from './pull-request.js';
import { syncFiles } from './sync.js';
import type { ActionInputs, TargetFailure, TargetResult } from './types.js';

export async function run(): Promise<void> {
  const inputs = readInputs();
  core.setSecret(inputs.githubToken);

  const config = await loadConfig(inputs.configPath, inputs.sourceRoot);
  const octokit = github.getOctokit(inputs.githubToken);
  const sourceRepo = process.env.GITHUB_REPOSITORY ?? 'unknown/unknown';
  const sourceCommit = process.env.GITHUB_SHA ?? 'unknown';
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'team-ai-sync-'));
  const results: TargetResult[] = [];
  const failures: TargetFailure[] = [];

  try {
    for (const targetRepository of config.targetRepositories) {
      try {
        core.startGroup(`Sync ${targetRepository}`);
        const repo = parseRepo(targetRepository);
        const defaultBranch = await getDefaultBranch(octokit, repo);
        const targetDirectory = await cloneTargetRepository(repo, inputs.githubToken, defaultBranch, tempRoot);

        await checkoutSyncBranch(targetDirectory, config.prOptions.branch);
        const summary = await syncFiles(inputs.sourceRoot, targetDirectory, config);
        const changed = await hasWorkingTreeChanges(targetDirectory);

        let prUrl: string | undefined;
        if (changed && !inputs.dryRun) {
          await configureCommitter(targetDirectory);
          await commitAll(targetDirectory, config.prOptions.commitMessage);
          await pushBranch(targetDirectory, config.prOptions.branch);
          prUrl = await createOrUpdatePullRequest(
            octokit,
            repo,
            config.prOptions,
            defaultBranch,
            renderTemplate(config.prOptions.body, sourceRepo, sourceCommit)
          );
        }

        results.push({
          repository: targetRepository,
          changed,
          prUrl,
          dryRun: inputs.dryRun,
          summary
        });

        core.info(
          `${targetRepository}: ${changed ? 'changes detected' : 'no changes'}; ` +
            `${summary.copied.length} copied, ${summary.skipped.length} skipped, ${summary.deleted.length} deleted`
        );
      } catch (error) {
        failures.push({
          repository: targetRepository,
          error: error instanceof Error ? error.message : String(error)
        });
      } finally {
        core.endGroup();
      }
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }

  setOutputs(results, failures);

  if (failures.length > 0) {
    core.setFailed(`team-ai-sync failed for ${failures.length} target(s).`);
  }
}

function readInputs(): ActionInputs {
  const sourceRootInput = core.getInput('source-root') || process.env.GITHUB_WORKSPACE || process.cwd();

  return {
    githubToken: core.getInput('github-token', { required: true }),
    configPath: core.getInput('config-path') || 'sync-config.json',
    sourceRoot: path.resolve(sourceRootInput),
    dryRun: parseBoolean(core.getInput('dry-run') || 'false')
  };
}

function parseBoolean(value: string): boolean {
  return ['1', 'true', 'yes', 'y'].includes(value.trim().toLowerCase());
}

function setOutputs(results: TargetResult[], failures: TargetFailure[]): void {
  core.setOutput(
    'pr-urls',
    JSON.stringify(results.map((result) => result.prUrl).filter((url): url is string => Boolean(url)))
  );
  core.setOutput('synced-targets', JSON.stringify(results.map((result) => result.repository)));
  core.setOutput('failed-targets', JSON.stringify(failures));
  core.setOutput('changed', results.some((result) => result.changed) ? 'true' : 'false');
}
