import * as core from '@actions/core';
import path from 'node:path';
import { runSync } from './runtime.js';
import type { ActionInputs, RuntimeInputs, TargetFailure, TargetResult } from './types.js';

export async function run(): Promise<void> {
  const actionInputs = readInputs();
  core.setSecret(actionInputs.githubToken);

  const { results, failures } = await runSync(toRuntimeInputs(actionInputs), {
    info: core.info,
    startGroup: core.startGroup,
    endGroup: core.endGroup
  });

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

function toRuntimeInputs(inputs: ActionInputs): RuntimeInputs {
  return {
    platform: 'github',
    token: inputs.githubToken,
    configPath: inputs.configPath,
    sourceRoot: inputs.sourceRoot,
    dryRun: inputs.dryRun,
    sourceRepo: process.env.GITHUB_REPOSITORY ?? 'unknown/unknown',
    sourceCommit: process.env.GITHUB_SHA ?? 'unknown'
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
