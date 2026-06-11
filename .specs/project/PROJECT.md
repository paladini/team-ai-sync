# team-ai-sync

## Vision

`team-ai-sync` is a CI/CD automation tool that lets a team maintain AI, editor, prompt, and development assets in one source repository and synchronize them to many target repositories through pull requests or merge requests.

## Goals

- Provide native CI/CD packages for GitHub Actions, GitLab CI/CD Components, and Bitbucket Pipes.
- Use `sync-config.json` as the public contract for target repositories, copied paths, exclusions, sync mode, orphan deletion, and pull request options.
- Keep destructive behavior explicit: files are changed through PRs or MRs, and orphan deletion only happens when configured.
- Make failures actionable with clear validation errors and per-target results.

## Non-Goals

- Hosting a long-running service outside CI/CD.
- Managing secrets or creating PATs for users.
- Automatically merging generated PRs or MRs.
- Supporting cross-platform sync, such as GitLab CI syncing GitHub repositories.
