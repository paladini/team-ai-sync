# Getting started

This guide shows how to use `team-ai-sync` to copy shared team AI files from one
source repository into one or more target repositories through pull requests or
merge requests.

## 1. Choose a source repository

Use a source repository as the single place where your team maintains shared
files such as:

- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `.github/instructions/**`
- `.github/prompts/**`
- `.cursor/rules/**`
- `.vscode/extensions.json`
- `.editorconfig`

The source repository can be a dedicated guidance repository or an existing
platform repository owned by the team that manages shared conventions.

## 2. Add shared files

Create the files and directories you want to synchronize. For example:

```text
AGENTS.md
CLAUDE.md
.editorconfig
.github/instructions/code-review.md
.github/instructions/security.md
.github/prompts/review.prompt.md
```

Every configured source file or directory must exist before the action runs.
Missing configured paths fail the workflow before pull requests are created.

## 3. Add `sync-config.json`

Create `sync-config.json` in the source repository:

```json
{
  "targetRepositories": [
    "your-org/api-service",
    "your-org/web-app"
  ],
  "syncMode": "overwrite",
  "deleteOrphans": false,
  "files": ["AGENTS.md", "CLAUDE.md", ".editorconfig"],
  "directories": [".github/instructions", ".github/prompts"],
  "exclude": [],
  "prOptions": {
    "title": "chore: sync team AI assets",
    "body": "Synced from {{sourceRepo}} at {{sourceCommit}}.",
    "commitMessage": "chore(ai-assets): sync team assets",
    "branch": "chore/team-ai-sync",
    "labels": ["automation", "chore"],
    "userReviewers": [],
    "teamReviewers": []
  }
}
```

Replace `your-org/api-service` and `your-org/web-app` with repositories that the
token can read and write.

## 4. Create a token

Create a token for the platform you are using with access to every target
repository or project.

For GitHub, create either a fine-grained personal access token or a GitHub App
installation token with access to every target repository.

For most small demos or internal rollouts, a fine-grained PAT is enough. For
long-lived organization automation, prefer a GitHub App.

The token needs these permissions for the target repositories:

- `Contents: Read and write`
- `Pull requests: Read and write`
- `Issues: Read and write` when `prOptions.labels` is not empty
- `Metadata: Read`

If you synchronize files under `.github/workflows/**`, your organization may
also require workflow-related permission or a classic PAT with the `workflow`
scope.

## 5. Store the token as a secret

In the source repository:

1. Open **Settings**.
2. Open **Secrets and variables**.
3. Open **Actions**.
4. Create a repository secret named `TEAM_SYNC_ADMIN_PAT`.
5. Store the token value.

Never commit the token to the repository.

## 6. Add the workflow

For GitHub Actions, create `.github/workflows/sync-ai-assets.yml`:


```yaml
name: Sync AI Assets

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: paladini/team-ai-sync@v1
        with:
          github-token: ${{ secrets.TEAM_SYNC_ADMIN_PAT }}
          config-path: sync-config.json
```

The workflow only needs read access to the source repository through
`GITHUB_TOKEN`. The cross-repository writes happen through `github-token`.

For GitLab and Bitbucket examples, see [Platform packages](platforms.md).

## 7. Run a dry run first

Before creating pull requests, run a dry run:

```yaml
- uses: paladini/team-ai-sync@v1
  with:
    github-token: ${{ secrets.TEAM_SYNC_ADMIN_PAT }}
    config-path: sync-config.json
    dry-run: true
```

The dry run validates the config, clones target repositories, copies files into
temporary worktrees, and reports whether changes exist. It does not push
branches or create pull requests or merge requests.

## 8. Run the real sync

Remove `dry-run: true` or set it to `false`. The action will:

1. Read and validate `sync-config.json`.
2. Resolve each target repository's default branch.
3. Clone each target repository into a temporary directory.
4. Create or reset the configured sync branch.
5. Copy configured files and directories.
6. Commit only when the target has changes.
7. Push the sync branch.
8. Create or update one pull request or merge request per changed target repository.

## 9. Review and merge

Review the generated pull requests or merge requests in each target repository.
`team-ai-sync` never merges them automatically. Target repository owners keep
control of review, approval, and merge.
