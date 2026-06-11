import { parseRepo } from '../config.js';
import type { PlatformClient, PullRequestOptions, RepoRef } from '../types.js';

interface BitbucketRepository {
  mainbranch?: {
    name?: string;
  };
}

interface BitbucketPullRequest {
  id: number;
  links?: {
    html?: {
      href?: string;
    };
  };
}

interface BitbucketList<T> {
  values?: T[];
}

export class BitbucketPlatform implements PlatformClient {
  readonly name = 'bitbucket';
  readonly committer = {
    name: 'team-ai-sync[bot]',
    email: 'team-ai-sync[bot]@users.noreply.bitbucket.org'
  };

  private readonly apiBaseUrl: string;
  private readonly username?: string;

  constructor(private readonly token: string, options: { apiBaseUrl?: string; username?: string } = {}) {
    this.apiBaseUrl = trimTrailingSlash(options.apiBaseUrl ?? 'https://api.bitbucket.org/2.0');
    this.username = options.username ?? process.env.BITBUCKET_USERNAME;
  }

  parseRepository(fullName: string): RepoRef {
    return parseRepo(fullName);
  }

  async getDefaultBranch(repo: RepoRef): Promise<string> {
    const repository = await this.request<BitbucketRepository>(`/repositories/${repo.owner}/${repo.repo}`);
    return repository.mainbranch?.name ?? 'main';
  }

  authenticatedRemoteUrl(repo: RepoRef, token: string): string {
    if (!this.username) {
      throw new Error('Set BITBUCKET_USERNAME when using Bitbucket API tokens with git clone and push.');
    }

    return `https://${encodeURIComponent(this.username)}:${encodeURIComponent(token)}@bitbucket.org/${repo.fullName}.git`;
  }

  async createOrUpdateChangeRequest(
    repo: RepoRef,
    options: PullRequestOptions,
    defaultBranch: string,
    body: string
  ): Promise<string> {
    const base = `/repositories/${repo.owner}/${repo.repo}/pullrequests`;
    const query = new URLSearchParams({
      q: `source.branch.name="${options.branch}" AND destination.branch.name="${defaultBranch}" AND state="OPEN"`
    });
    const existing = await this.request<BitbucketList<BitbucketPullRequest>>(`${base}?${query.toString()}`);
    const updatePayload = {
      title: options.title,
      description: body
    };
    const createPayload = {
      ...updatePayload,
      source: { branch: { name: options.branch } },
      destination: { branch: { name: defaultBranch } }
    };

    if ((existing.values?.length ?? 0) > 0) {
      const existingPullRequest = existing.values?.[0];
      if (!existingPullRequest) {
        throw new Error('Bitbucket pull request lookup returned an empty result.');
      }

      const pullRequest = await this.request<BitbucketPullRequest>(
        `${base}/${existingPullRequest.id}`,
        'PUT',
        updatePayload
      );
      return htmlUrl(pullRequest);
    }

    const pullRequest = await this.request<BitbucketPullRequest>(base, 'POST', createPayload);
    return htmlUrl(pullRequest);
  }

  private async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      method,
      headers: {
        Authorization: this.authorizationHeader(),
        'Content-Type': 'application/json'
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Bitbucket API ${method} ${path} failed: ${response.status} ${await response.text()}`);
    }

    return (await response.json()) as T;
  }

  private authorizationHeader(): string {
    if (this.username) {
      return `Basic ${Buffer.from(`${this.username}:${this.token}`).toString('base64')}`;
    }

    return `Bearer ${this.token}`;
  }
}

function htmlUrl(pullRequest: BitbucketPullRequest): string {
  return pullRequest.links?.html?.href ?? '';
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}
