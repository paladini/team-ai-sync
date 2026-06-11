# Design: Generalized Sync Action

## Architecture

- `src/config.ts`: parse, validate, default, and normalize `sync-config.json`.
- `src/path-safety.ts`: enforce safe repository-relative paths and exclusion matching.
- `src/sync.ts`: copy files/directories into a target working tree.
- `src/git.ts`: clone, branch, diff, commit, and push target repositories.
- `src/runtime.ts`: shared per-target orchestration used by every platform package.
- `src/platforms/*`: create or update platform-native pull requests or merge requests.
- `src/main.ts`: GitHub Action entrypoint, input parsing, and output mapping.
- `src/cli.ts`: shared CLI entrypoint for GitLab CI/CD Components and Bitbucket Pipes.

## Data Flow

1. Read GitHub Action inputs or CLI flags/environment variables.
2. Parse config from `config-path`.
3. For each target repository:
   - Resolve default branch with the platform API.
   - Clone target repository into a temporary directory.
   - Reset configured sync branch from default branch.
   - Apply sync plan into the checkout.
   - If changed, commit and either dry-run or push/create/update PR/MR.
4. Return runtime results. The GitHub Action wrapper maps them to action outputs.

## Failure Model

- Config-level validation failures stop the action.
- Target-level failures are collected in `failed-targets`.
- The process fails at the end if any target failed.
- The GitHub Action masks tokens through `@actions/core`; CLI packages avoid printing token values and sanitize git output.
