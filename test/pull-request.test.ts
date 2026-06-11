import { describe, expect, it, vi } from 'vitest';
import { GitHubPlatform } from '../src/platforms/github.js';

describe('pull requests', () => {
  it('creates a PR, applies labels, and requests reviewers', async () => {
    const octokit = fakeOctokit({
      pullsList: [],
      createResult: { number: 7, html_url: 'https://github.com/org/repo/pull/7' }
    });
    const platform = new GitHubPlatform('secret', octokit);

    const url = await platform.createOrUpdateChangeRequest(
      { owner: 'org', repo: 'repo', fullName: 'org/repo' },
      {
        title: 'title',
        body: 'body',
        commitMessage: 'message',
        branch: 'chore/team-ai-sync',
        labels: ['automation'],
        userReviewers: ['alice'],
        teamReviewers: ['org/platform']
      },
      'main',
      'rendered body'
    );

    expect(url).toBe('https://github.com/org/repo/pull/7');
    expect(octokit.rest.pulls.create).toHaveBeenCalledWith(
      expect.objectContaining({ head: 'chore/team-ai-sync', base: 'main', body: 'rendered body' })
    );
    expect(octokit.rest.issues.addLabels).toHaveBeenCalledWith(
      expect.objectContaining({ issue_number: 7, labels: ['automation'] })
    );
    expect(octokit.rest.pulls.requestReviewers).toHaveBeenCalledWith(
      expect.objectContaining({ pull_number: 7, reviewers: ['alice'], team_reviewers: ['platform'] })
    );
  });

  it('updates an existing PR', async () => {
    const octokit = fakeOctokit({
      pullsList: [{ number: 3 }],
      updateResult: { number: 3, html_url: 'https://github.com/org/repo/pull/3' }
    });
    const platform = new GitHubPlatform('secret', octokit);

    const url = await platform.createOrUpdateChangeRequest(
      { owner: 'org', repo: 'repo', fullName: 'org/repo' },
      {
        title: 'new title',
        body: 'body',
        commitMessage: 'message',
        branch: 'chore/team-ai-sync',
        labels: [],
        userReviewers: [],
        teamReviewers: []
      },
      'main',
      'new body'
    );

    expect(url).toBe('https://github.com/org/repo/pull/3');
    expect(octokit.rest.pulls.update).toHaveBeenCalledWith(
      expect.objectContaining({ pull_number: 3, title: 'new title', body: 'new body' })
    );
    expect(octokit.rest.pulls.create).not.toHaveBeenCalled();
  });
});

function fakeOctokit(options: {
  pullsList: Array<{ number: number }>;
  createResult?: { number: number; html_url: string };
  updateResult?: { number: number; html_url: string };
}): any {
  return {
    rest: {
      pulls: {
        list: vi.fn().mockResolvedValue({ data: options.pullsList }),
        create: vi.fn().mockResolvedValue({ data: options.createResult }),
        update: vi.fn().mockResolvedValue({ data: options.updateResult }),
        requestReviewers: vi.fn().mockResolvedValue({ data: {} })
      },
      issues: {
        addLabels: vi.fn().mockResolvedValue({ data: {} })
      }
    }
  };
}
