import { parseProjectPath } from '../config.js';
import type { PlatformClient, PullRequestOptions, RepoRef } from '../types.js';

interface GitLabProject {
  default_branch?: string;
}

interface GitLabMergeRequest {
  iid: number;
  web_url: string;
}

export class GitLabPlatform implements PlatformClient {
  readonly name = 'gitlab';
  readonly committer = {
    name: 'team-ai-sync[bot]',
    email: 'team-ai-sync[bot]@users.noreply.gitlab.com'
  };

  private readonly apiBaseUrl: string;
  private readonly serverUrl: string;

  constructor(private readonly token: string, options: { apiBaseUrl?: string; serverUrl?: string } = {}) {
    this.serverUrl = trimTrailingSlash(options.serverUrl ?? process.env.CI_SERVER_URL ?? 'https://gitlab.com');
    this.apiBaseUrl = trimTrailingSlash(options.apiBaseUrl ?? `${this.serverUrl}/api/v4`);
  }

  parseRepository(fullName: string): RepoRef {
    return parseProjectPath(fullName);
  }

  async getDefaultBranch(repo: RepoRef): Promise<string> {
    const project = await this.request<GitLabProject>(`/projects/${encodeURIComponent(repo.fullName)}`);
    return project.default_branch ?? 'main';
  }

  authenticatedRemoteUrl(repo: RepoRef, token: string): string {
    const base = this.serverUrl.replace(/^https?:\/\//, '');
    return `https://oauth2:${encodeURIComponent(token)}@${base}/${repo.fullName}.git`;
  }

  async createOrUpdateChangeRequest(
    repo: RepoRef,
    options: PullRequestOptions,
    defaultBranch: string,
    body: string
  ): Promise<string> {
    const project = `/projects/${encodeURIComponent(repo.fullName)}`;
    const query = new URLSearchParams({
      state: 'opened',
      source_branch: options.branch,
      target_branch: defaultBranch,
      per_page: '1'
    });
    const existing = await this.request<GitLabMergeRequest[]>(`${project}/merge_requests?${query.toString()}`);
    const payload = {
      title: options.title,
      description: body,
      labels: options.labels.join(',')
    };

    if (existing.length > 0) {
      const mergeRequest = await this.request<GitLabMergeRequest>(
        `${project}/merge_requests/${existing[0].iid}`,
        'PUT',
        payload
      );
      return mergeRequest.web_url;
    }

    const mergeRequest = await this.request<GitLabMergeRequest>(`${project}/merge_requests`, 'POST', {
      ...payload,
      source_branch: options.branch,
      target_branch: defaultBranch,
      remove_source_branch: false
    });
    return mergeRequest.web_url;
  }

  private async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      method,
      headers: {
        'PRIVATE-TOKEN': this.token,
        'Content-Type': 'application/json'
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`GitLab API ${method} ${path} failed: ${response.status} ${await response.text()}`);
    }

    return (await response.json()) as T;
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}
