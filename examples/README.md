# Example setup

This folder shows how to configure a source repository that uses `team-ai-sync` to share AI collaboration files with multiple target repositories.

The source repository is the place where your team maintains files such as `AGENTS.md`, `CLAUDE.md`, `.github/instructions/**`, `.github/prompts/**`, `.editorconfig`, or other shared conventions. The target repositories are the repositories that should receive pull requests with those updates.

## Files in this example

```text
examples/
|-- README.md
|-- sync-ai-assets.yml
`-- sync-config.json
```

Copy these files into your source repository like this:

```text
your-source-repository/
|-- .github/
|   |-- instructions/
|   |-- prompts/
|   `-- workflows/
|       `-- sync-ai-assets.yml
|-- AGENTS.md
|-- CLAUDE.md
|-- .editorconfig
`-- sync-config.json
```

## 1. Add the workflow

Create `.github/workflows/sync-ai-assets.yml` in the source repository:

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

Before the first stable `v1` tag is published, use `paladini/team-ai-sync@main` or pin to a commit SHA.

## 2. Add the sync config

Create `sync-config.json` at the root of the source repository:

```json
{
  "targetRepositories": ["org/repo-a"],
  "syncMode": "overwrite",
  "deleteOrphans": false,
  "files": ["AGENTS.md", "CLAUDE.md", ".editorconfig"],
  "directories": [".github/instructions", ".github/prompts"],
  "exclude": [".github/instructions/legacy-prompts.md"],
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

Replace `org/repo-a` with the repositories that should receive pull requests. Every repository listed in `targetRepositories` must be accessible by the token you configure in the next step.

## 3. Create the GitHub token

GitHub recommends fine-grained personal access tokens when they work for your use case because they can be limited to specific repositories and permissions. For organization-wide, long-lived automation, a GitHub App is usually better than a personal token. See GitHub's docs on [personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) and [secrets](https://docs.github.com/en/actions/concepts/security/secrets).

For a fine-grained PAT, grant access to the target repositories and use the smallest set of permissions that matches your config:

- `Contents: Read and write` to clone the target repository, create the sync branch, and push commits.
- `Pull requests: Read and write` to create or update pull requests and request reviewers.
- `Issues: Read and write` if you use `prOptions.labels`, because pull request labels use the issues API.
- `Metadata: Read`, which GitHub includes for repository access.
- If you sync files under `.github/workflows/**`, your organization may require workflow-related permissions or a classic PAT with the `workflow` scope.

If a fine-grained PAT does not support your organization setup, use a classic PAT with the `repo` scope. Add an expiration date and rotate the token periodically.

## 4. Store the token in the source repository

In the source repository:

1. Open **Settings**.
2. Go to **Secrets and variables**.
3. Open **Actions**.
4. Create a new repository secret named `TEAM_SYNC_ADMIN_PAT`.
5. Paste the token value and save it.

The workflow references the secret with `${{ secrets.TEAM_SYNC_ADMIN_PAT }}`. Do not commit the token to the repository.

## 5. Add the shared assets

Add the files and directories listed in `sync-config.json` to the source repository. For example:

```text
AGENTS.md
CLAUDE.md
.editorconfig
.github/instructions/development-guide.md
.github/prompts/review-checklist.prompt.md
```

If a configured file or directory is missing, the action fails before opening pull requests.

## 6. Run the workflow

Commit the workflow, config, and shared assets to the source repository. Then either:

- Push to `main`, or
- Open the workflow in the GitHub Actions tab and run it manually with **Run workflow**.

For each target repository, the action will:

1. Clone the target repository.
2. Create or reset the configured branch, for example `chore/team-ai-sync`.
3. Copy the configured files and directories.
4. Commit only if something changed.
5. Push the branch.
6. Create or update a pull request.

## Optional first run: dry run

To validate the config without pushing branches or creating pull requests, add `dry-run: true` temporarily:

```yaml
- uses: paladini/team-ai-sync@v1
  with:
    github-token: ${{ secrets.TEAM_SYNC_ADMIN_PAT }}
    config-path: sync-config.json
    dry-run: true
```

Remove `dry-run: true` when the output looks right.

## Troubleshooting

- `Resource not accessible by integration`: the token does not have access to the target repository or lacks a required permission.
- `Configured file does not exist`: the file listed in `sync-config.json` is missing from the source repository.
- No pull request was created: there may be no changes compared with the target repository.
- Labels or reviewers were not applied: check `Issues`, `Pull requests`, and organization team permissions.
- Workflow files were rejected: add the workflow-related permission/scope or remove `.github/workflows/**` from the sync config.
