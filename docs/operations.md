# Operations guide

This guide covers day-to-day operation after `team-ai-sync` is installed.

## Run modes

`team-ai-sync` has two practical run modes.

### Dry run

Use `dry-run: true` to validate configuration and detect changes without
pushing branches or creating pull requests or merge requests:

```yaml
- uses: paladini/team-ai-sync@v1
  with:
    github-token: ${{ secrets.TEAM_SYNC_ADMIN_PAT }}
    config-path: sync-config.json
    dry-run: true
```

A dry run still clones target repositories and copies files in temporary
worktrees. This makes it useful for testing token access, config paths, and
expected diffs.

### Real sync

Use `dry-run: false` or omit `dry-run` to push branches and create or update
pull requests:

```yaml
- uses: paladini/team-ai-sync@v1
  with:
    github-token: ${{ secrets.TEAM_SYNC_ADMIN_PAT }}
    config-path: sync-config.json
```

## Generated branches

The action creates or updates one branch per target repository. The branch name
comes from `prOptions.branch` and defaults to:

```text
chore/team-ai-sync
```

Each run resets the sync branch from the target repository's default branch,
copies configured files, commits changes, and pushes the branch with a safe
force-with-lease update.

## Pull request and merge request behavior

For each changed target repository, the action:

1. Looks for an open pull request or merge request from the configured sync branch to the target
   default branch.
2. Updates the existing pull request or merge request title and body when one exists.
3. Creates a new pull request or merge request when no matching open request exists.
4. Applies labels when `prOptions.labels` is not empty and the platform supports it.
5. Requests reviewers when `userReviewers` or `teamReviewers` are configured and the platform supports it.

`team-ai-sync` does not merge pull requests or merge requests.

## Outputs

The action exposes these outputs:

| Output | Description |
| --- | --- |
| `changed` | `true` when at least one target repository has changes. |
| `pr-urls` | JSON array of created or updated pull request URLs. |
| `synced-targets` | JSON array of target repositories processed successfully. |
| `failed-targets` | JSON array of target repositories that failed. |

Example follow-up step:

```yaml
- id: sync
  uses: paladini/team-ai-sync@v1
  with:
    github-token: ${{ secrets.TEAM_SYNC_ADMIN_PAT }}
    config-path: sync-config.json

- name: Show sync result
  run: |
    echo 'changed=${{ steps.sync.outputs.changed }}'
    echo 'pr-urls=${{ steps.sync.outputs.pr-urls }}'
    echo 'failed-targets=${{ steps.sync.outputs.failed-targets }}'
```

## Scheduling

Most teams use one of these triggers:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

Use `push` when every source update should fan out to target repositories. Use
`workflow_dispatch` when a human should decide when to sync.

You can also add a schedule:

```yaml
on:
  schedule:
    - cron: "0 12 * * 1"
  workflow_dispatch:
```

Scheduled sync works well when shared guidance changes outside the source
repository workflow, but it can create repeated runs with no changes.

## Scaling to many repositories

For larger repository fleets:

- Start with a small target set and a dry run.
- Group targets by ownership or technology stack.
- Use labels such as `automation` and `ai-guidance`.
- Keep one sync branch name for easy search and cleanup.
- Make target teams responsible for reviewing and merging generated pull
  requests.
- Watch the `failed-targets` output and workflow logs after every rollout.
