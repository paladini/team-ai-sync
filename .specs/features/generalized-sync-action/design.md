# Design: Generalized Sync Action

## Architecture

- `src/config.ts`: parse, validate, default, and normalize `sync-config.json`.
- `src/path-safety.ts`: enforce safe repository-relative paths and exclusion matching.
- `src/sync.ts`: copy files/directories into a target working tree.
- `src/git.ts`: clone, branch, diff, commit, and push target repositories.
- `src/pull-request.ts`: create or update pull requests through Octokit.
- `src/main.ts`: GitHub Action entrypoint and per-target orchestration.

## Data Flow

1. Read action inputs.
2. Parse config from `config-path`.
3. For each target repository:
   - Resolve default branch with GitHub API.
   - Clone target repository into a temporary directory.
   - Reset configured sync branch from default branch.
   - Apply sync plan into the checkout.
   - If changed, commit and either dry-run or push/create/update PR.
4. Set JSON action outputs.

## Failure Model

- Config-level validation failures stop the action.
- Target-level failures are collected in `failed-targets`.
- The action fails at the end if any target failed.
- Authentication tokens are masked through `@actions/core`.
