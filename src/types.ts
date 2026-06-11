export type SyncMode = 'overwrite' | 'skip';

export interface PullRequestOptions {
  title: string;
  body: string;
  commitMessage: string;
  branch: string;
  labels: string[];
  userReviewers: string[];
  teamReviewers: string[];
}

export interface SyncConfig {
  targetRepositories: string[];
  syncMode: SyncMode;
  deleteOrphans: boolean;
  files: string[];
  directories: string[];
  exclude: string[];
  prOptions: PullRequestOptions;
}

export interface ActionInputs {
  githubToken: string;
  configPath: string;
  sourceRoot: string;
  dryRun: boolean;
}

export type PlatformName = 'github' | 'gitlab' | 'bitbucket';

export interface RuntimeInputs {
  platform: PlatformName;
  token: string;
  configPath: string;
  sourceRoot: string;
  dryRun: boolean;
  sourceRepo: string;
  sourceCommit: string;
}

export interface RuntimeResult {
  results: TargetResult[];
  failures: TargetFailure[];
}

export interface TargetResult {
  repository: string;
  changed: boolean;
  prUrl?: string;
  dryRun?: boolean;
  summary: SyncSummary;
}

export interface TargetFailure {
  repository: string;
  error: string;
}

export interface SyncSummary {
  copied: string[];
  skipped: string[];
  deleted: string[];
}

export interface RepoRef {
  owner: string;
  repo: string;
  fullName: string;
}

export interface PlatformCommitter {
  name: string;
  email: string;
}

export interface PlatformClient {
  name: PlatformName;
  committer: PlatformCommitter;
  parseRepository(fullName: string): RepoRef;
  getDefaultBranch(repo: RepoRef): Promise<string>;
  authenticatedRemoteUrl(repo: RepoRef, token: string): string;
  createOrUpdateChangeRequest(
    repo: RepoRef,
    options: PullRequestOptions,
    defaultBranch: string,
    body: string
  ): Promise<string>;
}

export interface Logger {
  info(message: string): void;
  startGroup?(message: string): void;
  endGroup?(): void;
}
