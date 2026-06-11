import { BitbucketPlatform } from './bitbucket.js';
import { GitHubPlatform } from './github.js';
import { GitLabPlatform } from './gitlab.js';
import type { PlatformClient, PlatformName } from '../types.js';

export function createPlatform(name: PlatformName, token: string): PlatformClient {
  switch (name) {
    case 'github':
      return new GitHubPlatform(token);
    case 'gitlab':
      return new GitLabPlatform(token);
    case 'bitbucket':
      return new BitbucketPlatform(token);
  }
}
