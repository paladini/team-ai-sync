import * as github from '@actions/github';
import { parseRepo } from '../config.js';
import type { PlatformClient, PullRequestOptions, RepoRef } from '../types.js';

type Octokit = ReturnType<typeof github.getOctokit>;

export class GitHubPlatform implements PlatformClient {
  readonly name = 'github';
  readonly committer = {
    name: 'team-ai-sync[bot]',
    email: 'team-ai-sync[bot]@users.noreply.github.com'
  };

  private readonly octokit: Octokit;

  constructor(token: string, octokit?: Octokit) {
    this.octokit = octokit ?? github.getOctokit(token);
  }

  parseRepository(fullName: string): RepoRef {
    return parseRepo(fullName);
  }

  async getDefaultBranch(repo: RepoRef): Promise<string> {
    const response = await this.octokit.rest.repos.get({ owner: repo.owner, repo: repo.repo });
    return response.data.default_branch;
  }

  authenticatedRemoteUrl(repo: RepoRef, token: string): string {
    return `https://x-access-token:${encodeURIComponent(token)}@github.com/${repo.fullName}.git`;
  }

  async createOrUpdateChangeRequest(
    repo: RepoRef,
    options: PullRequestOptions,
    defaultBranch: string,
    body: string
  ): Promise<string> {
    const existing = await this.octokit.rest.pulls.list({
      owner: repo.owner,
      repo: repo.repo,
      state: 'open',
      head: `${repo.owner}:${options.branch}`,
      base: defaultBranch,
      per_page: 1
    });

    const pull =
      existing.data.length > 0
        ? await this.octokit.rest.pulls.update({
            owner: repo.owner,
            repo: repo.repo,
            pull_number: existing.data[0].number,
            title: options.title,
            body
          })
        : await this.octokit.rest.pulls.create({
            owner: repo.owner,
            repo: repo.repo,
            title: options.title,
            head: options.branch,
            base: defaultBranch,
            body,
            maintainer_can_modify: true
          });

    const pullNumber = pull.data.number;

    if (options.labels.length > 0) {
      await this.octokit.rest.issues.addLabels({
        owner: repo.owner,
        repo: repo.repo,
        issue_number: pullNumber,
        labels: options.labels
      });
    }

    if (options.userReviewers.length > 0 || options.teamReviewers.length > 0) {
      await this.octokit.rest.pulls.requestReviewers({
        owner: repo.owner,
        repo: repo.repo,
        pull_number: pullNumber,
        reviewers: options.userReviewers,
        team_reviewers: options.teamReviewers.map(toTeamSlug)
      });
    }

    return pull.data.html_url;
  }
}

function toTeamSlug(value: string): string {
  return value.includes('/') ? value.split('/').at(-1) ?? value : value;
}
