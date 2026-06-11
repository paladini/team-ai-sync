import { afterEach, describe, expect, it, vi } from 'vitest';
import { BitbucketPlatform } from '../src/platforms/bitbucket.js';
import { GitLabPlatform } from '../src/platforms/gitlab.js';
import type { PullRequestOptions } from '../src/types.js';

const prOptions: PullRequestOptions = {
  title: 'chore: sync',
  body: 'body',
  commitMessage: 'commit',
  branch: 'chore/team-ai-sync',
  labels: ['automation'],
  userReviewers: [],
  teamReviewers: []
};

describe('platform adapters', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a GitLab merge request when none exists', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/projects/group%2Fsubgroup%2Frepo')) {
        return json({ default_branch: 'main' });
      }

      if (url.includes('/merge_requests?')) {
        return json([]);
      }

      expect(init?.method).toBe('POST');
      expect(JSON.parse(String(init?.body))).toEqual(
        expect.objectContaining({
          source_branch: 'chore/team-ai-sync',
          target_branch: 'main',
          title: 'chore: sync',
          description: 'rendered body',
          labels: 'automation'
        })
      );
      return json({ iid: 5, web_url: 'https://gitlab.com/group/subgroup/repo/-/merge_requests/5' });
    });
    vi.stubGlobal('fetch', fetchMock);

    const platform = new GitLabPlatform('secret');
    const repo = platform.parseRepository('group/subgroup/repo');
    const defaultBranch = await platform.getDefaultBranch(repo);
    const url = await platform.createOrUpdateChangeRequest(repo, prOptions, defaultBranch, 'rendered body');

    expect(defaultBranch).toBe('main');
    expect(url).toBe('https://gitlab.com/group/subgroup/repo/-/merge_requests/5');
    expect(platform.authenticatedRemoteUrl(repo, 'secret')).toBe(
      'https://oauth2:secret@gitlab.com/group/subgroup/repo.git'
    );
  });

  it('updates an existing Bitbucket pull request', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/repositories/workspace/repo')) {
        return json({ mainbranch: { name: 'main' } });
      }

      if (url.includes('/pullrequests?')) {
        return json({ values: [{ id: 8, links: { html: { href: 'https://bitbucket.org/workspace/repo/pull-requests/8' } } }] });
      }

      expect(init?.method).toBe('PUT');
      expect(JSON.parse(String(init?.body))).toEqual(
        expect.objectContaining({
          title: 'chore: sync',
          description: 'rendered body'
        })
      );
      return json({ id: 8, links: { html: { href: 'https://bitbucket.org/workspace/repo/pull-requests/8' } } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const platform = new BitbucketPlatform('secret', { username: 'bot' });
    const repo = platform.parseRepository('workspace/repo');
    const defaultBranch = await platform.getDefaultBranch(repo);
    const url = await platform.createOrUpdateChangeRequest(repo, prOptions, defaultBranch, 'rendered body');

    expect(defaultBranch).toBe('main');
    expect(url).toBe('https://bitbucket.org/workspace/repo/pull-requests/8');
    expect(platform.authenticatedRemoteUrl(repo, 'secret')).toBe('https://bot:secret@bitbucket.org/workspace/repo.git');
  });

  it('requires a Bitbucket username for authenticated git remotes', () => {
    const platform = new BitbucketPlatform('secret');
    const repo = platform.parseRepository('workspace/repo');

    expect(() => platform.authenticatedRemoteUrl(repo, 'secret')).toThrow('Set BITBUCKET_USERNAME');
  });
});

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
