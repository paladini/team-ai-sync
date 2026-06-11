# Security model

`team-ai-sync` is designed to make cross-repository file sync reviewable. It
pushes changes to branches and opens pull requests instead of modifying target
default branches directly.
On GitLab, the same review boundary is implemented with merge requests.

## Review boundary

`team-ai-sync` creates pull requests or merge requests. It does not:

- merge generated pull requests or merge requests
- bypass branch protection
- approve pull requests or merge requests
- manage repository secrets
- change target repository settings

Target repository maintainers keep control of review and merge.

## Token handling

The GitHub Action marks the `github-token` input as a secret in action logs.
The GitLab and Bitbucket packages read tokens from CI/CD variables. Tokens are
used to:

- clone target repositories
- push sync branches
- create or update pull requests or merge requests
- apply labels when the platform supports them
- request reviewers when the platform supports them

Store tokens as source repository or project secrets and grant the smallest
target repository access that supports your rollout.

## Path safety

`team-ai-sync` validates configured paths before processing target repositories.
It rejects paths that:

- are absolute
- include `..`
- reference `.git`
- resolve outside the repository root

This prevents a config file from reading or writing outside the checked-out
source and target repositories.

## Deletion safety

`deleteOrphans` defaults to `false`.

When enabled, deletion is limited to files inside configured synced directories.
`team-ai-sync` does not delete arbitrary repository files. Use a dry run before
turning on `deleteOrphans` for real sync.

## Branch safety

The sync branch is configured through `prOptions.branch`. The action validates
branch names and rejects values that are empty, absolute, contain backslashes,
contain `..`, or reference `.git`.

When updating existing sync branches, `team-ai-sync` uses a force-with-lease push so
it does not overwrite a remote branch that changed unexpectedly after the
tool inspected it.

## Recommended rollout

1. Create a small demo or pilot target set.
2. Run with `dry-run: true`.
3. Inspect logs and outputs.
4. Run real sync against the pilot targets.
5. Review generated pull requests or merge requests.
6. Expand the target list after the pilot behaves as expected.

## Sensitive files

Do not use `team-ai-sync` to distribute secrets, private keys, credentials, or
machine-specific configuration. Keep synced files limited to repository
guidance, prompts, editor settings, and other reviewable team assets.
