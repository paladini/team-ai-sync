# team-ai-sync documentation

`team-ai-sync` keeps shared AI collaboration files, prompt files, editor
settings, and repository guidance aligned across multiple repositories through
pull requests or merge requests.

Use this documentation to install the GitHub Action, GitLab CI/CD Component, or
Bitbucket Pipe; configure sync rules; create the right token; operate the
workflow; and troubleshoot common failures.

## Guides

- [Getting started](getting-started.md): create a source repository, configure a
  workflow, and run your first sync.
- [Configuration reference](configuration.md): learn every `sync-config.json`
  field, default value, and behavior.
- [Authentication and permissions](authentication.md): choose a PAT or GitHub
  App token and grant the smallest useful permissions.
- [Operations guide](operations.md): run dry runs, update existing pull
  requests, inspect outputs, and manage repository fleets.
- [Platform packages](platforms.md): use the GitHub Action, GitLab CI/CD
  Component, or Bitbucket Pipe.
- [Security model](security.md): understand path safety, token handling, pull
  request boundaries, and safe rollout practices.
- [Public demo walkthrough](demo.md): follow the real public demo repositories,
  runs, and generated pull requests.
- [Troubleshooting](troubleshooting.md): diagnose token, permission, config,
  branch, label, reviewer, and workflow issues.

## Quick links

- Action repository: [paladini/team-ai-sync](https://github.com/paladini/team-ai-sync)
- Public source demo:
  [paladini/team-ai-sync-demo-source](https://github.com/paladini/team-ai-sync-demo-source)
- Public API target demo:
  [paladini/team-ai-sync-demo-api](https://github.com/paladini/team-ai-sync-demo-api)
- Public web target demo:
  [paladini/team-ai-sync-demo-web](https://github.com/paladini/team-ai-sync-demo-web)

## Current stable version

Use the stable v1 tag in workflows:

```yaml
- uses: paladini/team-ai-sync@v1
  with:
    github-token: ${{ secrets.TEAM_SYNC_ADMIN_PAT }}
    config-path: sync-config.json
```
