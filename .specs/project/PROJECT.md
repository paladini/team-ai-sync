# team-ai-sync

## Vision

`team-ai-sync` is a public GitHub Action that lets a team maintain AI, editor, prompt, and development assets in one source repository and synchronize them to many target repositories through pull requests.

## Goals

- Provide a reusable action consumed as `uses: owner/team-ai-sync@v1`.
- Use `sync-config.json` as the public contract for target repositories, copied paths, exclusions, sync mode, orphan deletion, and pull request options.
- Keep destructive behavior explicit: files are changed through PRs, and orphan deletion only happens when configured.
- Make failures actionable with clear validation errors and per-target results.

## Non-Goals

- Hosting a service outside GitHub Actions.
- Managing secrets or creating PATs for users.
- Automatically merging generated PRs.
- Supporting non-GitHub git providers in v1.
