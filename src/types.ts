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
