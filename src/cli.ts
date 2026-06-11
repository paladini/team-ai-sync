#!/usr/bin/env node
import path from 'node:path';
import { runSync } from './runtime.js';
import type { PlatformName, RuntimeInputs } from './types.js';

interface CliOptions {
  platform?: string;
  token?: string;
  configPath?: string;
  sourceRoot?: string;
  dryRun?: string;
}

runCli().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function runCli(): Promise<void> {
  const inputs = readRuntimeInputs(parseArgs(process.argv.slice(2)));
  const { results, failures } = await runSync(inputs);
  const output = {
    changed: results.some((result) => result.changed),
    prUrls: results.map((result) => result.prUrl).filter((url): url is string => Boolean(url)),
    syncedTargets: results.map((result) => result.repository),
    failedTargets: failures
  };

  console.log(JSON.stringify(output, null, 2));

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

function readRuntimeInputs(options: CliOptions): RuntimeInputs {
  const platform = parsePlatform(options.platform ?? env('TEAM_AI_SYNC_PLATFORM') ?? env('PLATFORM') ?? detectPlatform());
  const token = options.token ?? env('TEAM_AI_SYNC_TOKEN') ?? platformToken(platform);

  if (!token) {
    throw new Error(`Missing token. Set TEAM_AI_SYNC_TOKEN or ${platformTokenName(platform)}.`);
  }

  return {
    platform,
    token,
    configPath: options.configPath ?? env('CONFIG_PATH') ?? env('TEAM_AI_SYNC_CONFIG_PATH') ?? 'sync-config.json',
    sourceRoot: path.resolve(options.sourceRoot ?? env('SOURCE_ROOT') ?? env('TEAM_AI_SYNC_SOURCE_ROOT') ?? defaultSourceRoot()),
    dryRun: parseBoolean(options.dryRun ?? env('DRY_RUN') ?? env('TEAM_AI_SYNC_DRY_RUN') ?? 'false'),
    sourceRepo: sourceRepo(platform),
    sourceCommit: sourceCommit(platform)
  };
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const [rawName, inlineValue] = arg.startsWith('--') ? arg.slice(2).split('=', 2) : ['', undefined];
    if (!rawName) {
      continue;
    }

    const value = inlineValue ?? args[index + 1];
    if (inlineValue === undefined) {
      index += 1;
    }

    switch (rawName) {
      case 'platform':
        options.platform = value;
        break;
      case 'token':
        options.token = value;
        break;
      case 'config-path':
        options.configPath = value;
        break;
      case 'source-root':
        options.sourceRoot = value;
        break;
      case 'dry-run':
        options.dryRun = value;
        break;
      default:
        throw new Error(`Unknown option: --${rawName}`);
    }
  }

  return options;
}

function parsePlatform(value: string): PlatformName {
  if (value === 'github' || value === 'gitlab' || value === 'bitbucket') {
    return value;
  }

  throw new Error(`Invalid platform "${value}". Expected github, gitlab, or bitbucket.`);
}

function detectPlatform(): PlatformName {
  if (env('GITLAB_CI')) {
    return 'gitlab';
  }

  if (env('BITBUCKET_BUILD_NUMBER')) {
    return 'bitbucket';
  }

  if (env('GITHUB_ACTIONS')) {
    return 'github';
  }

  return 'github';
}

function platformToken(platform: PlatformName): string | undefined {
  switch (platform) {
    case 'github':
      return env('GITHUB_TOKEN');
    case 'gitlab':
      return env('GITLAB_TOKEN');
    case 'bitbucket':
      return env('BITBUCKET_TOKEN') ?? env('BITBUCKET_APP_PASSWORD');
  }
}

function platformTokenName(platform: PlatformName): string {
  switch (platform) {
    case 'github':
      return 'GITHUB_TOKEN';
    case 'gitlab':
      return 'GITLAB_TOKEN';
    case 'bitbucket':
      return 'BITBUCKET_TOKEN';
  }
}

function defaultSourceRoot(): string {
  return env('GITHUB_WORKSPACE') ?? env('CI_PROJECT_DIR') ?? env('BITBUCKET_CLONE_DIR') ?? process.cwd();
}

function sourceRepo(platform: PlatformName): string {
  switch (platform) {
    case 'github':
      return env('GITHUB_REPOSITORY') ?? 'unknown/unknown';
    case 'gitlab':
      return env('CI_PROJECT_PATH') ?? 'unknown/unknown';
    case 'bitbucket':
      return env('BITBUCKET_REPO_FULL_NAME') ?? 'unknown/unknown';
  }
}

function sourceCommit(platform: PlatformName): string {
  switch (platform) {
    case 'github':
      return env('GITHUB_SHA') ?? 'unknown';
    case 'gitlab':
      return env('CI_COMMIT_SHA') ?? 'unknown';
    case 'bitbucket':
      return env('BITBUCKET_COMMIT') ?? 'unknown';
  }
}

function parseBoolean(value: string): boolean {
  return ['1', 'true', 'yes', 'y'].includes(value.trim().toLowerCase());
}

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value : undefined;
}
