# Feature Spec: Generalized Sync Action

## Requirements

- REQ-001: The action exposes inputs `github-token`, `config-path`, `source-root`, and `dry-run`.
- REQ-002: The action exposes outputs `pr-urls`, `synced-targets`, `failed-targets`, and `changed`.
- REQ-003: The action reads and validates `sync-config.json`.
- REQ-004: The config supports `targetRepositories`, `syncMode`, `deleteOrphans`, `files`, `directories`, `exclude`, and `prOptions`.
- REQ-005: Config paths must be safe repository-relative paths.
- REQ-006: Each target repository is processed independently so one failure does not stop all targets.
- REQ-007: The sync engine supports file and directory copying, exclusions, skip mode, overwrite mode, and optional orphan deletion.
- REQ-008: The PR engine creates or updates one pull request per target repository.
- REQ-009: The action supports `{{sourceRepo}}` and `{{sourceCommit}}` placeholders in PR body.
- REQ-010: Dry-run mode validates and simulates changes without pushing branches or creating pull requests.
- REQ-011: The sync runtime is reusable from GitHub Actions, GitLab CI/CD Components, and Bitbucket Pipes.
- REQ-012: GitLab targets support `group/project` and `group/subgroup/project` paths and create or update merge requests.
- REQ-013: Bitbucket targets support `workspace/repo` paths and create or update pull requests.

## Acceptance Criteria

- Invalid config fails with clear messages before target processing.
- Unsafe paths such as absolute paths, `..`, and `.git` are rejected.
- No PR is opened for a target with no diff.
- Outputs are valid JSON strings for array outputs.
- CI verifies lint, tests, build, and committed `dist/`.
- GitHub Action inputs and outputs remain backward compatible.
- GitLab and Bitbucket wrappers call the shared CLI/runtime rather than duplicating sync logic.
