# Configuration reference

`team-ai-sync` reads a JSON config file from the source repository. The default
path is `sync-config.json`, but you can override it with the `config-path`
input.

## Complete example

```json
{
  "targetRepositories": ["org/repo-a", "org/repo-b"],
  "syncMode": "overwrite",
  "deleteOrphans": false,
  "files": ["AGENTS.md", "CLAUDE.md", ".editorconfig"],
  "directories": [".github/instructions", ".github/prompts"],
  "exclude": [".github/instructions/legacy.md"],
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

## Top-level fields

| Field | Required | Default | Description |
| --- | --- | --- | --- |
| `targetRepositories` | yes | | Target repositories or projects. Use `owner/repo` on GitHub and Bitbucket, or `group/project` and `group/subgroup/project` on GitLab. |
| `syncMode` | no | `overwrite` | How existing target files are handled. |
| `deleteOrphans` | no | `false` | Whether files removed from synced source directories are removed from target directories. |
| `files` | no | `[]` | Individual repository-relative files to sync. |
| `directories` | no | `[]` | Repository-relative directories to sync recursively. |
| `exclude` | no | `[]` | Repository-relative paths or glob patterns to skip. |
| `prOptions` | no | defaults below | Pull request, branch, commit, label, and reviewer options. |

At least one entry must be present in `files` or `directories`.

## `targetRepositories`

Use platform-native repository paths:

```json
{
  "targetRepositories": [
    "acme/api",
    "acme/web",
    "platform/backend/service"
  ]
}
```

GitHub and Bitbucket use `owner/repo` or `workspace/repo`. GitLab also supports
subgroups, such as `platform/backend/service`.

Each repository is processed independently. If one target fails, `team-ai-sync`
continues processing the remaining targets and reports failures in the
`failed-targets` output when the package supports CI outputs.

## `syncMode`

`syncMode` accepts two values:

- `overwrite`: copy configured files from the source into the target, replacing
  target files when paths already exist.
- `skip`: copy only files that do not already exist in the target.

Use `overwrite` for central policy files that must stay aligned. Use `skip` for
starter files that teams may customize after first sync.

## `deleteOrphans`

When `deleteOrphans` is `true`, the action removes files from synced target
directories when those files no longer exist in the matching source directory.

Deletion only applies inside directories listed in `directories`. Individual
paths listed in `files` are not used as deletion scopes.

Use this option carefully. Start with a dry run before enabling real sync.

## `files`

Use `files` for exact files:

```json
{
  "files": ["AGENTS.md", "CLAUDE.md", ".editorconfig"]
}
```

Each configured file must exist in the source repository and must be a file.

## `directories`

Use `directories` for recursive sync:

```json
{
  "directories": [".github/instructions", ".github/prompts"]
}
```

Each configured directory must exist in the source repository and must be a
directory. Files are copied recursively with their relative paths preserved.

## `exclude`

Use `exclude` to skip exact paths, directory trees, or glob patterns:

```json
{
  "exclude": [
    ".github/instructions/legacy.md",
    ".github/prompts/experimental/**"
  ]
}
```

Exclusions apply to both `files` and recursively discovered directory files.

## `prOptions`

`prOptions` controls the generated branch, commit, pull request or merge
request, labels, and reviewers.

| Field | Default | Description |
| --- | --- | --- |
| `title` | `chore: sync team AI assets` | Pull request title. |
| `body` | `Synced from {{sourceRepo}} at {{sourceCommit}}.` | Pull request body. |
| `commitMessage` | `chore(ai-assets): sync team assets` | Commit message used in each target repository. |
| `branch` | `chore/team-ai-sync` | Branch pushed to each target repository. |
| `labels` | `["automation", "chore"]` | Labels added to generated pull requests or merge requests when supported by the platform. |
| `userReviewers` | `[]` | GitHub usernames requested as reviewers. Other platforms may ignore this field. |
| `teamReviewers` | `[]` | GitHub team names or slugs requested as reviewers. Other platforms may ignore this field. |

The `body` field supports these placeholders:

- `{{sourceRepo}}`: the source repository from the workflow context.
- `{{sourceCommit}}`: the source commit SHA from the workflow context.

## Path safety

All configured paths must be repository-relative. The action rejects:

- absolute paths
- `..` path traversal
- `.git` path segments
- paths that resolve outside the source or target repository root

This validation applies before target repositories are processed.
